import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { SocialPlatform, ContentType } from '@/lib/social-media-mock';

export type SocialPostStatus = 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'published' | 'failed' | 'rejected';

export interface SocialPostRow {
  id: string;
  organization_id: string;
  client_id: string | null;
  created_by: string | null;
  content: string;
  media_urls: string[];
  platforms: SocialPlatform[];
  content_type: ContentType;
  hashtags: string[];
  scheduled_at: string | null;
  status: SocialPostStatus;
  approval_token: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  published_at: string | null;
  metrics: Record<string, number> | null;
  notes: string | null;
  late_post_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  client_name?: string;
}

interface PostFilters {
  status?: string;
  platform?: string;
  clientId?: string;
  search?: string;
  month?: Date;
}

export function useSocialPosts(filters?: PostFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const getOrgId = async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();
    return data?.current_organization_id ?? null;
  };

  const postsQuery = useQuery({
    queryKey: ['social-posts', user?.id, filters],
    queryFn: async () => {
      const orgId = await getOrgId();
      if (!orgId) return [];

      let query = supabase
        .from('social_posts' as any)
        .select('*, clients!social_posts_client_id_fkey(company_name)')
        .eq('organization_id', orgId)
        .order('scheduled_at', { ascending: false, nullsFirst: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.clientId && filters.clientId !== 'all') {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters?.search) {
        query = query.ilike('content', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data || []) as any[]).map((row: any) => ({
        ...row,
        media_urls: Array.isArray(row.media_urls) ? row.media_urls : [],
        platforms: Array.isArray(row.platforms) ? row.platforms : [],
        hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
        client_name: row.clients?.company_name || null,
      })) as SocialPostRow[];
    },
    enabled: !!user,
  });

  const createPost = useMutation({
    mutationFn: async (params: {
      post: {
        content: string;
        media_urls?: string[];
        platforms: SocialPlatform[];
        content_type: ContentType;
        hashtags?: string[];
        scheduled_at?: string;
        status?: SocialPostStatus;
        client_id?: string | null;
        notes?: string;
      };
      silent?: boolean;
    }) => {
      const orgId = await getOrgId();
      if (!orgId || !user) throw new Error('Organização não encontrada');

      const { data, error } = await supabase
        .from('social_posts' as any)
        .insert({
          ...params.post,
          organization_id: orgId,
          created_by: user.id,
          media_urls: params.post.media_urls || [],
          hashtags: params.post.hashtags || [],
          status: params.post.status || 'draft',
        } as any)
        .select()
        .single();

      if (error) throw error;
      return { data: data as unknown as SocialPostRow, silent: params.silent };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      if (!result.silent) {
        toast({ title: 'Post criado com sucesso!' });
      }
    },
    onError: (err: any, variables) => {
      console.error('Erro ao criar post:', err);
      if (variables.silent) return;

      let message = 'Ocorreu um erro inesperado ao criar o post.';
      if (err.message?.includes('schema cache')) {
        message = 'Erro de sincronização com o banco de dados. Por favor, recarregue a página.';
      } else if (err.message) {
        message = err.message;
      }
      toast({ title: 'Erro ao criar post', description: message, variant: 'destructive' });
    },
  });

  const updatePost = useMutation({
    mutationFn: async (params: {
      post: Partial<SocialPostRow> & { id: string };
      silent?: boolean;
    }) => {
      const { client_name, ...cleanUpdates } = params.post as any;
      const { data, error } = await supabase
        .from('social_posts' as any)
        .update(cleanUpdates as any)
        .eq('id', params.post.id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as unknown as SocialPostRow, silent: params.silent };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      if (!result.silent) {
        toast({ title: 'Post atualizado com sucesso!' });
      }
    },
    onError: (err: any, variables) => {
      console.error('Erro ao atualizar post:', err);
      if (variables.silent) return;

      let message = 'Não foi possível salvar as alterações do post.';
      if (err.message?.includes('schema cache')) {
        message = 'Erro de sincronização. Por favor, recarregue a página.';
      } else if (err.message) {
        message = err.message;
      }
      toast({ title: 'Erro ao atualizar post', description: message, variant: 'destructive' });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('social_posts' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      toast({ title: 'Post excluído!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir post', description: err.message, variant: 'destructive' });
    },
  });

  const deleteAllPosts = useMutation({
    mutationFn: async (clientId?: string) => {
      const orgId = await getOrgId();
      if (!orgId) throw new Error('Organização não encontrada');

      let query = supabase
        .from('social_posts' as any)
        .delete()
        .eq('organization_id', orgId);

      if (clientId && clientId !== 'all') {
        query = query.eq('client_id', clientId);
      }

      const { error } = await query;
      if (error) throw error;
      
      // Reset usage count for social_posts in usage_tracking for the current month
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      await supabase
        .from('usage_tracking')
        .update({ usage_count: 0 } as any)
        .eq('organization_id', orgId)
        .eq('feature_type', 'social_posts')
        .eq('period_start', monthStart);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['usage-tracking'] });
      toast({ title: 'Histórico e contagem resetados com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao resetar dados', description: err.message, variant: 'destructive' });
    },
  });

  const sendForApproval = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('social_posts' as any)
        .update({
          status: 'pending_approval',
          approval_token: crypto.randomUUID(),
        } as any)
        .eq('id', id)
        .select('approval_token')
        .single();

      if (error) throw error;
      return data as unknown as { approval_token: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      const url = `${window.location.origin}/approve/${data.approval_token}`;
      navigator.clipboard.writeText(url).then(() => {
        toast({ title: 'Link de aprovação copiado!', description: 'Envie o link ao cliente para aprovação.' });
      }).catch(() => {
        toast({ title: 'Link de aprovação gerado', description: url });
      });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao enviar para aprovação', description: err.message, variant: 'destructive' });
    },
  });

  const publishPost = useMutation({
    mutationFn: async (params: { postId: string; publishNow: boolean; silent?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('social-publish', {
        body: { post_id: params.postId, publish_now: params.publishNow },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return { data, silent: params.silent };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      if (!result.silent) {
        const msg = result.data.status === 'published' ? 'Post publicado com sucesso!' : 'Post agendado com sucesso!';
        toast({ title: msg });
      }
    },
    onError: (err: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      console.error('Erro ao publicar/agendar post:', err);
      
      if (variables.silent) return;

      toast({
        title: 'Erro no agendamento',
        description: 'Não conseguimos processar o agendamento agora. Verifique sua conexão e tente novamente.',
        variant: 'destructive'
      });
    },
  });

  const syncPosts = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('social-sync-posts');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      if (data?.synced > 0) {
        toast({ title: `${data.synced} post(s) atualizado(s)!` });
      }
    },
    onError: (err: any) => {
      console.error('Sync posts error:', err);
    },
  });

  return {
    posts: postsQuery.data || [],
    isLoading: postsQuery.isLoading,
    createPost,
    updatePost,
    deletePost,
    deleteAllPosts,
    sendForApproval,
    publishPost,
    syncPosts,
    refetch: postsQuery.refetch,
  };
}

export function useApprovalPost(token?: string) {
  const queryClient = useQueryClient();

  const postQuery = useQuery({
    queryKey: ['approval-post', token],
    queryFn: async () => {
      if (!token) return null;
      
      // Buscar post via token de aprovação
      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .eq('approval_token', token)
        .maybeSingle();

      if (error) throw error;
      
      const row = data as any;
      if (!row) return null;

      return {
        ...row,
        media_urls: Array.isArray(row.media_urls) ? row.media_urls : [],
        platforms: Array.isArray(row.platforms) ? row.platforms : [],
        hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
      };
    },
    enabled: !!token,
  });

  const approvePost = useMutation({
    mutationFn: async (approverName: string) => {
      if (!token) throw new Error('Token missing');
      
      // Aprovar post via token
      const { error } = await supabase
        .from('social_posts')
        .update({ 
          status: 'approved', 
          approved_by: approverName,
          approved_at: new Date().toISOString()
        } as any)
        .eq('approval_token', token);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-post', token] });
    },
  });

  const rejectPost = useMutation({
    mutationFn: async ({ reason, approverName }: { reason: string; approverName: string }) => {
      if (!token) throw new Error('Token missing');
      
      // Rejeitar post via token
      const { error } = await supabase
        .from('social_posts')
        .update({ 
          status: 'rejected', 
          approved_by: approverName,
          rejection_reason: reason,
          approved_at: new Date().toISOString()
        } as any)
        .eq('approval_token', token);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-post', token] });
    },
  });

  return {
    post: postQuery.data,
    isLoading: postQuery.isLoading,
    error: postQuery.error,
    approvePost: approvePost.mutateAsync,
    rejectPost: rejectPost.mutateAsync,
    refetch: postQuery.refetch,
  };
}