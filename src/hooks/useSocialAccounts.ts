import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { SocialPlatform } from '@/lib/social-media-mock';

export interface SocialAccount {
  id: string;
  organization_id: string;
  client_id: string | null;
  platform: SocialPlatform;
  account_name: string;
  username: string;
  avatar_url: string | null;
  is_connected: boolean;
  followers_count: number;
  late_account_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined from clients table
  is_social_locked?: boolean;
  social_disconnection_count?: number;
}

type SocialAccountInsert = Omit<SocialAccount, 'id' | 'created_at' | 'updated_at'>;

export function useSocialAccounts(clientId?: string | null) {
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

  const accountsQuery = useQuery({
    queryKey: ['social-accounts', user?.id, clientId],
    queryFn: async () => {
      const orgId = await getOrgId();
      if (!orgId) return [];

      let query = supabase
        .from('social_accounts')
        .select(`
          *,
          clients!social_accounts_client_id_fkey (
            is_social_locked,
            social_disconnection_count
          )
        `)
        .eq('organization_id', orgId)
        .order('platform');

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((acc: any) => ({
        ...acc,
        is_social_locked: acc.clients?.is_social_locked || false,
        social_disconnection_count: acc.clients?.social_disconnection_count || 0,
      })) as SocialAccount[];
    },
    enabled: !!user,
  });

  const createAccount = useMutation({
    mutationFn: async (account: Omit<SocialAccountInsert, 'organization_id'>) => {
      const orgId = await getOrgId();
      if (!orgId) throw new Error('Organização não encontrada');

      const { data, error } = await supabase
        .from('social_accounts')
        .insert({ ...account, organization_id: orgId } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SocialAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['clients-with-social-status'] });
      queryClient.invalidateQueries({ queryKey: ['usage-tracking'] });
      toast({ title: 'Conta conectada com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao conectar conta', description: err.message, variant: 'destructive' });
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SocialAccount> & { id: string }) => {
      const { data, error } = await supabase
        .from('social_accounts')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SocialAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['clients-with-social-status'] });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { data: accountData, error: fetchError } = await supabase
        .from('social_accounts')
        .select(`
          *,
          clients (
            is_social_locked
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError || !accountData) throw new Error('Conta não encontrada');
      
      const acc = accountData as any;
      
      if (acc.clients?.is_social_locked) {
        throw new Error('Este cliente atingiu o limite de 3 desconexões e está bloqueado.');
      }

      if (acc.late_account_id) {
        try {
          await supabase.functions.invoke('social-disconnect', {
            body: { late_account_id: acc.late_account_id },
          });
        } catch (err) {
          console.error('Failed to disconnect from Late.dev API:', err);
        }
      }

      if (acc.client_id) {
        const { data: relatedPosts } = await supabase
          .from('social_posts')
          .select('id, platforms')
          .eq('client_id', acc.client_id);

        if (relatedPosts) {
          for (const post of relatedPosts as any[]) {
            const postPlatforms = post.platforms as string[];
            if (postPlatforms.length === 1 && postPlatforms[0] === acc.platform) {
              await supabase.from('social_posts').delete().eq('id', post.id);
            } else if (postPlatforms.includes(acc.platform)) {
              await supabase
                .from('social_posts')
                .update({ platforms: postPlatforms.filter(p => p !== acc.platform) } as any)
                .eq('id', post.id);
            }
          }
        }
      }

      const { error: deleteError } = await supabase
        .from('social_accounts')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Disconnection handled by deleting the account above
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['clients-with-social-status'] });
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['usage-tracking'] });
      toast({ title: 'Conta removida e registros apagados!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao remover conta', description: err.message, variant: 'destructive' });
    },
  });

  const connectPlatform = useMutation({
    mutationFn: async ({ platform, clientId: cId }: { platform: SocialPlatform; clientId: string }) => {
      const redirectUrl = `${window.location.origin}/app/social-media`;
      
      const { data, error } = await supabase.functions.invoke('social-connect', {
        body: { platform, redirect_url: redirectUrl, client_id: cId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return { ...data, clientId: cId } as { authUrl: string; profileId: string; clientId: string };
    },
    onSuccess: (data) => {
      const popup = window.open(data.authUrl, 'social-connect', 'width=600,height=700');
      
      const checkPopup = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          
          const syncToast = toast({
            title: 'Sincronizando conta...',
            description: 'Aguarde enquanto buscamos a nova conexão.',
          });
          
          // Delay to give Late API time to register the account
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          try {
            const result = await syncAccounts.mutateAsync(data.clientId);
            
            // Retry once if no accounts were synced (timing issue)
            if (result?.synced === 0) {
              await new Promise(resolve => setTimeout(resolve, 4000));
              const retryResult = await syncAccounts.mutateAsync(data.clientId);
              if (retryResult?.synced === 0) {
                toast({
                  title: 'Conta não encontrada',
                  description: 'A conexão foi concluída, mas a conta ainda não apareceu. Tente sincronizar manualmente em alguns instantes.',
                  variant: 'destructive'
                });
              }
            }
          } catch (err) {
            console.error('Sync after connection failed:', err);
            toast({ title: 'Erro ao sincronizar contas', description: 'Tente sincronizar manualmente.', variant: 'destructive' });
          }
          
          // Always invalidate queries regardless of sync result
          queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
          queryClient.invalidateQueries({ queryKey: ['clients-with-social-status'] });
          queryClient.invalidateQueries({ queryKey: ['usage-tracking'] });
        }
      }, 1000);
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao conectar plataforma', description: err.message, variant: 'destructive' });
    },
  });

  const syncAccounts = useMutation({
    mutationFn: async (syncClientId?: string) => {
      try {
        const { data, error } = await supabase.functions.invoke('social-sync-accounts', {
          body: syncClientId ? { client_id: syncClientId } : {},
        });

        if (error) return { synced: 0, error: error.message };
        return data;
      } catch (err) {
        return { synced: 0, error: 'Network error' };
      }
    },
    onSuccess: (data) => {
      if (data?.synced > 0) {
        queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['clients-with-social-status'] });
        toast({ title: `${data.synced} conta(s) sincronizada(s)!` });
      }
    },
    onError: (err: any) => {
      console.warn('[social-sync-accounts] Background sync failed silently:', err);
    },
  });

  return {
    accounts: accountsQuery.data || [],
    isLoading: accountsQuery.isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    connectPlatform,
    syncAccounts,
    refetch: accountsQuery.refetch,
  };
}