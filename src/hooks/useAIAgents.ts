import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import type { AIAgent } from '@/types';

export function useAIAgents() {
  const { organizationId: orgId } = useOrganization();
  const queryClient = useQueryClient();

  const agentsQuery = useQuery({
    queryKey: ['ai-agents', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('ai_agents')
        .select(`
          *,
          clients (
            company_name
          )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AIAgent[];
    },
    enabled: !!orgId,
  });

  const createAgent = useMutation({
    mutationFn: async ({ name, client_id, instructions, welcome_message, company_name }: { name: string, client_id: string, instructions?: string, welcome_message?: string, company_name?: string }) => {
      if (!orgId) throw new Error('Organização não encontrada');

      const { data, error } = await supabase
        .from('ai_agents')
        .insert({
          organization_id: orgId,
          name,
          client_id,
          instructions,
          welcome_message,
          company_name,
          status: 'inactive',
          whatsapp_connected: false
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AIAgent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast.success('Agente criado e configurado!');
    },
    onError: (err: any) => {
      toast.error('Erro ao criar agente: ' + err.message);
    },
  });

  const deleteAgent = useMutation({
    mutationFn: async (agentId: string) => {
      const { error } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast.success('Agente removido com sucesso!');
    },
    onError: (err: any) => {
      toast.error('Erro ao remover agente: ' + err.message);
    },
  });

  const updateAgent = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<AIAgent> }) => {
      const { data, error } = await supabase
        .from('ai_agents')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select('*')
        .single();

      if (error) throw error;
      return data as unknown as AIAgent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
    },
    onError: (err: any) => {
      toast.error('Erro ao atualizar agente: ' + err.message);
    },
  });

  const refreshQR = useMutation({
    mutationFn: async (agentId: string) => {
      // Simulação para o sistema legado
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast.success('Solicitação de novo QR Code enviada!');
    },
  });

  return {
    agents: agentsQuery.data || [],
    isLoading: agentsQuery.isLoading,
    createAgent,
    deleteAgent,
    updateAgent,
    refreshQR,
  };
}
