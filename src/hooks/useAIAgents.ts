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
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AIAgent[];
    },
    enabled: !!orgId,
  });

  const createAgent = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!orgId) throw new Error('Organização não encontrada');

      const { data, error } = await supabase
        .from('ai_agents')
        .insert({
          organization_id: orgId,
          name,
          status: 'inactive',
        } as any)
        .select('*')
        .single();

      if (error) throw error;
      return data as unknown as AIAgent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast.success('Agente criado com sucesso!');
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
        .eq('id', agentId)
        .eq('organization_id', orgId);

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

  return {
    agents: agentsQuery.data || [],
    isLoading: agentsQuery.isLoading,
    createAgent,
    deleteAgent,
    refetch: agentsQuery.refetch,
  };
}
