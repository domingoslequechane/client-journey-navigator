import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import type { AIAgent, AIAgentConversation, AIAgentMessage } from '@/types';

export function useAIAgentDetail(agentId: string | undefined) {
  const { organizationId: orgId } = useOrganization();
  const queryClient = useQueryClient();

  // ─── Fetch agent ───
  const agentQuery = useQuery({
    queryKey: ['ai-agent', agentId],
    queryFn: async () => {
      if (!agentId || !orgId) return null;

      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', agentId)
        .eq('organization_id', orgId)
        .single();

      if (error) throw error;
      return data as unknown as AIAgent;
    },
    enabled: !!agentId && !!orgId,
  });

  // ─── Fetch conversations ───
  const conversationsQuery = useQuery({
    queryKey: ['ai-agent-conversations', agentId],
    queryFn: async () => {
      if (!agentId || !orgId) return [];

      const { data, error } = await supabase
        .from('ai_agent_conversations')
        .select('*')
        .eq('agent_id', agentId)
        .eq('organization_id', orgId)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AIAgentConversation[];
    },
    enabled: !!agentId && !!orgId,
  });

  // ─── Update config ───
  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<AIAgent>) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-agent-config', {
        body: { agent_id: agentId, ...updates },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.agent as AIAgent;
    },
    onSuccess: (updatedAgent) => {
      queryClient.setQueryData(['ai-agent', agentId], updatedAgent);
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (err: any) => {
      toast.error('Erro ao salvar: ' + err.message);
    },
  });

  // ─── WhatsApp instance actions ───
  const instanceAction = useMutation({
    mutationFn: async (action: 'connect' | 'status' | 'disconnect') => {
      const { data, error } = await supabase.functions.invoke('whatsapp-agent-instance', {
        body: { agent_id: agentId, action },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, action) => {
      queryClient.invalidateQueries({ queryKey: ['ai-agent', agentId] });
      if (action === 'disconnect') {
        toast.success('WhatsApp desconectado');
      }
    },
    onError: (err: any) => {
      toast.error('Erro: ' + err.message);
    },
  });

  return {
    agent: agentQuery.data || null,
    isLoading: agentQuery.isLoading,
    conversations: conversationsQuery.data || [],
    conversationsLoading: conversationsQuery.isLoading,
    updateConfig,
    instanceAction,
    refetchAgent: agentQuery.refetch,
    refetchConversations: conversationsQuery.refetch,
  };
}

// ─── Separate hook for messages (used inside ConversationView) ───
export function useAIAgentMessages(conversationId: string | undefined) {
  const { organizationId: orgId } = useOrganization();

  const messagesQuery = useQuery({
    queryKey: ['ai-agent-messages', conversationId],
    queryFn: async () => {
      if (!conversationId || !orgId) return [];

      const { data, error } = await supabase
        .from('ai_agent_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as AIAgentMessage[];
    },
    enabled: !!conversationId && !!orgId,
  });

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
  };
}
