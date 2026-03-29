import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import type { AtendeAIInstance, AtendeAIConversation, AtendeAIMessage } from '@/types';

export function useAtendeAIDetail(instanceId: string | undefined) {
  const { organizationId: orgId } = useOrganization();
  const queryClient = useQueryClient();

  // ─── Fetch instance ───
  const instanceQuery = useQuery({
    queryKey: ['atende-ai-instance', instanceId],
    queryFn: async () => {
      if (!instanceId || !orgId) return null;

      const { data, error } = await supabase
        .from('atende_ai_instances' as any)
        .select('*')
        .eq('id', instanceId)
        .eq('organization_id', orgId)
        .single();

      if (error) throw error;
      return data as unknown as AtendeAIInstance;
    },
    enabled: !!instanceId && !!orgId,
  });

  // ─── Fetch conversations ───
  const conversationsQuery = useQuery({
    queryKey: ['atende-ai-conversations', instanceId],
    queryFn: async () => {
      if (!instanceId || !orgId) return [];

      const { data, error } = await supabase
        .from('atende_ai_conversations' as any)
        .select('*')
        .eq('instance_id', instanceId)
        .eq('organization_id', orgId)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AtendeAIConversation[];
    },
    enabled: !!instanceId && !!orgId,
  });

  // ─── Update config ───
  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<AtendeAIInstance>) => {
      if (!instanceId) throw new Error("ID da instância ausente");
      
      const { data, error } = await supabase
        .from('atende_ai_instances' as any)
        .update(updates)
        .eq('id', instanceId)
        .select()
        .single();

      if (error) throw error;
      return data as AtendeAIInstance;
    },
    onSuccess: (updatedInstance) => {
      queryClient.setQueryData(['atende-ai-instance', instanceId], updatedInstance);
      queryClient.invalidateQueries({ queryKey: ['atende-ai-instances'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (err: any) => {
      toast.error('Erro ao salvar: ' + err.message);
    },
  });

  // ─── WhatsApp instance actions ───
  // Re-utilizes the evolution go connection function
  const instanceAction = useMutation({
    mutationFn: async ({ action, phone }: { action: 'connect' | 'status' | 'disconnect', phone?: string }) => {
      // Get the evolution_instance_id from the cache
      const currentInstance = queryClient.getQueryData<AtendeAIInstance>(['atende-ai-instance', instanceId]);
      const targetEvolutionId = currentInstance?.evolution_instance_id;
      
      if (!targetEvolutionId) {
         throw new Error('Instância EvoGo não encontrada no cache local');
      }

      const { data, error } = await supabase.functions.invoke('whatsapp-agent-instance', {
        body: { instance_id: targetEvolutionId, action, phone },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['atende-ai-instance', instanceId] });
      queryClient.invalidateQueries({ queryKey: ['atende-ai-instances'] });
      if (action === 'disconnect') {
        toast.success('WhatsApp desconectado');
      }
    },
    onError: (err: any) => {
      toast.error('Erro: ' + err.message);
    },
  });

  return {
    instance: instanceQuery.data || null,
    isLoading: instanceQuery.isLoading,
    conversations: conversationsQuery.data || [],
    conversationsLoading: conversationsQuery.isLoading,
    updateConfig,
    instanceAction,
    refetchInstance: instanceQuery.refetch,
    refetchConversations: conversationsQuery.refetch,
  };
}

// ─── Separate hook for messages (used inside ConversationView) ───
export function useAtendeAIMessages(conversationId: string | undefined) {
  const { organizationId: orgId } = useOrganization();

  const messagesQuery = useQuery({
    queryKey: ['atende-ai-messages', conversationId],
    queryFn: async () => {
      if (!conversationId || !orgId) return [];

      const { data, error } = await supabase
        .from('atende_ai_messages' as any)
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as AtendeAIMessage[];
    },
    enabled: !!conversationId && !!orgId,
  });

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
  };
}
