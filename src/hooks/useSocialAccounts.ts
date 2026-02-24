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
        .from('social_accounts' as any)
        .select('*')
        .eq('organization_id', orgId)
        .order('platform');

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SocialAccount[];
    },
    enabled: !!user,
  });

  const createAccount = useMutation({
    mutationFn: async (account: Omit<SocialAccountInsert, 'organization_id'>) => {
      const orgId = await getOrgId();
      if (!orgId) throw new Error('Organização não encontrada');

      const { data, error } = await supabase
        .from('social_accounts' as any)
        .insert({ ...account, organization_id: orgId } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SocialAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      toast({ title: 'Conta conectada com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao conectar conta', description: err.message, variant: 'destructive' });
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SocialAccount> & { id: string }) => {
      const { data, error } = await supabase
        .from('social_accounts' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SocialAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('social_accounts' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      toast({ title: 'Conta removida!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao remover conta', description: err.message, variant: 'destructive' });
    },
  });

  // Connect platform via Late.dev OAuth — now requires clientId
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
      // Open OAuth URL in a popup
      const popup = window.open(data.authUrl, 'social-connect', 'width=600,height=700');
      
      // Poll for popup close and sync accounts for this client
      const checkPopup = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          try {
            await syncAccounts.mutateAsync(data.clientId);
          } catch {
            // Silently handle sync errors
          }
        }
      }, 1000);
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao conectar plataforma', description: err.message, variant: 'destructive' });
    },
  });

  // Sync accounts from Late.dev — now accepts optional clientId
  const syncAccounts = useMutation({
    mutationFn: async (syncClientId?: string) => {
      const { data, error } = await supabase.functions.invoke('social-sync-accounts', {
        body: syncClientId ? { client_id: syncClientId } : {},
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      if (data?.synced > 0) {
        toast({ title: `${data.synced} conta(s) sincronizada(s)!` });
      }
    },
    onError: (err: any) => {
      console.error('Sync error:', err);
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
