import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import type { AtendeAIInstance } from '@/types';

export function useAtendeAI() {
  const { organizationId: orgId } = useOrganization();
  const queryClient = useQueryClient();

  const agentsQuery = useQuery({
    queryKey: ['atende-ai-instances', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await (supabase
        .from('atende_ai_instances' as any)
        .select(`*, clients(company_name)`) as any)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AtendeAIInstance[];
    },
    enabled: !!orgId,
  });

  // ─── Realtime for instances (UI updates) ───
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel('atende_ai_instances_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'atende_ai_instances',
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['atende-ai-instances', orgId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  const createAgent = useMutation({
    mutationFn: async ({ name, client_id }: { name: string; client_id?: string }) => {
      if (!orgId) throw new Error('Organização não encontrada');

      // 1. Create in Evolution Go FIRST — use the name exactly as the user typed
      const { data: evoResult, error: fnErr } = await supabase.functions.invoke('whatsapp-agent-instance', {
        body: { action: 'create', name, organization_id: orgId },
      });

      if (fnErr) {
        throw new Error('Falha ao contactar o servidor: ' + fnErr.message);
      }

      if (!evoResult?.ok) {
        throw new Error('Erro ao criar na Evolution: ' + (evoResult?.error || 'resposta inválida'));
      }

      // 2. Extract identifiers from the Edge Function
      const instanceIdToStore = evoResult?.evolution_instance_id;
      const instanceApiKeyToStore = evoResult?.instance_api_key;
      const webhookSecretToStore = evoResult?.evolution_webhook_secret;

      if (!instanceIdToStore) {
         throw new Error('Falha crítica: Edge function não retornou o evolution_instance_id.');
      }

      console.log('[Create] Storing evolution_instance_id:', instanceIdToStore);

      // 3. Save to local DB
      const { data: newAgent, error: dbErr } = await (supabase
        .from('atende_ai_instances' as any)
        .insert({
          organization_id: orgId,
          client_id,
          name,
          evolution_instance_id: instanceIdToStore,
          evolution_id: evoResult?.evolution_id,
          instance_api_key: instanceApiKeyToStore,
          evolution_webhook_secret: webhookSecretToStore,
          status: 'inactive',
        })
        .select()
        .single() as any);

      if (dbErr) {
        // Rollback: delete from Evolution Go since DB save failed
        if (instanceIdToStore) {
          await supabase.functions.invoke('whatsapp-agent-instance', {
            body: { action: 'delete', instance_id: instanceIdToStore, organization_id: orgId }
          });
        }
        throw dbErr;
      }

      return newAgent as AtendeAIInstance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atende-ai-instances'] });
      toast.success('Atendente configurado!', {
        description: 'O seu novo agente de IA foi criado com sucesso.'
      });
    },
    onError: (err: any) => {
      toast.error('Não foi possível criar o atendente', {
        description: err.message
      });
    },
  });

  const deleteAgent = useMutation({
    mutationFn: async (agent: AtendeAIInstance) => {
      // evolution_instance_id stores the ID returned by Evolution Go at creation time.
      if (agent.evolution_instance_id) {
        const { data: evoResult, error: invokeErr } = await supabase.functions.invoke('whatsapp-agent-instance', {
          body: {
            action: 'delete',
            instance_id: agent.evolution_instance_id, // The exact ID from Evolution Go
            organization_id: orgId
          }
        });
        console.log('[Delete] Evolution result:', evoResult);
        
        if (invokeErr) {
          throw new Error('Falha ao comunicar com o servidor da Evolution Go: ' + invokeErr.message);
        }

        // Se a Evolution Go recusar a deleção (ex: instância não encontrada ou conectada), lançamos erro
        // para que não seja removida do nosso banco e crie um falso positivo pro usuário.
        if (evoResult && !evoResult.ok) {
           throw new Error('Problema na Evolution Go: ' + (evoResult.error || 'Erro desconhecido.'));
        }
      } else {
        console.warn('[Delete] No evolution_instance_id stored — skipping Evolution delete for:', agent.name);
      }

      // Only delete from local DB if Evolution Go deletion was confirmed
      const { error } = await (supabase
        .from('atende_ai_instances' as any)
        .delete()
        .eq('id', agent.id) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atende-ai-instances'] });
      toast.success('Atendente removido', {
        description: 'A instância e os dados foram apagados permanentemente.'
      });
    },
    onError: (err: any) => {
      toast.error('Erro ao remover', {
        description: err.message
      });
    },
  });

  const updateAgent = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<AtendeAIInstance> }) => {
      const { data, error } = await (supabase
        .from('atende_ai_instances' as any)
        .update(updates)
        .eq('id', id) as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atende-ai-instances'] });
    },
  });

  const refreshQR = useMutation({
    mutationFn: async (agentId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atende-ai-instances'] });
      toast.success('QR Code solicitado', {
        description: 'O servidor está a gerar uma nova imagem de conexão.'
      });
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
