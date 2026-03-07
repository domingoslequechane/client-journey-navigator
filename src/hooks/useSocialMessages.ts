import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import type { SocialPlatform } from '@/lib/social-media-mock';

export interface SocialMessage {
  id: string;
  organization_id: string;
  social_account_id: string;
  client_id: string | null;
  platform: SocialPlatform;
  message_type: 'dm' | 'comment';
  post_id: string | null;
  sender_name: string;
  sender_username: string | null;
  sender_avatar_url: string | null;
  content: string;
  reply_content: string | null;
  replied_at: string | null;
  is_read: boolean;
  external_id: string | null;
  received_at: string;
  created_at: string;
}

export function useSocialMessages(clientId?: string | null) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ['social-messages', organizationId, clientId],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('social_messages' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .order('received_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SocialMessage[];
    },
    enabled: !!organizationId,
  });

  const unreadCountQuery = useQuery({
    queryKey: ['social-messages-unread', organizationId, clientId],
    queryFn: async () => {
      if (!organizationId) return 0;

      let query = supabase
        .from('social_messages' as any)
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_read', false);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!organizationId,
  });

  const markAsRead = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('social_messages' as any)
        .update({ is_read: true } as any)
        .eq('id', messageId)
        .eq('organization_id', organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-messages'] });
      queryClient.invalidateQueries({ queryKey: ['social-messages-unread'] });
    },
  });

  const replyToMessage = useMutation({
    mutationFn: async ({ messageId, replyContent }: { messageId: string; replyContent: string }) => {
      // Call edge function to send reply via Late.dev
      const { data, error } = await supabase.functions.invoke('social-reply-message', {
        body: { message_id: messageId, reply_content: replyContent, organization_id: organizationId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-messages'] });
      toast({ title: 'Resposta enviada!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao enviar resposta', description: err.message, variant: 'destructive' });
    },
  });

  const fetchMessages = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('social-fetch-messages', {
        body: { organization_id: organizationId }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['social-messages'] });
      queryClient.invalidateQueries({ queryKey: ['social-messages-unread'] });
      if (data?.fetched > 0) {
        toast({ title: `${data.fetched} nova(s) mensagem(ns) recebida(s)!` });
      }
    },
    onError: (err: any) => {
      console.error('Fetch messages error:', err);
    },
  });

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    unreadCount: unreadCountQuery.data || 0,
    markAsRead,
    replyToMessage,
    fetchMessages,
    refetch: messagesQuery.refetch,
  };
}
