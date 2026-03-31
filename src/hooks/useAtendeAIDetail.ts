import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import type { AtendeAIInstance, AtendeAIConversation, AtendeAIMessage } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// useAtendeAIDetail — gestão da instância individual
// ─────────────────────────────────────────────────────────────────────────────
export function useAtendeAIDetail(instanceId: string | undefined) {
  const { organizationId: orgId } = useOrganization();
  const queryClient = useQueryClient();

  // ─── Fetch instance ───
  const instanceQuery = useQuery({
    queryKey: ['atende-ai-instance', instanceId],
    queryFn: async () => {
      if (!instanceId || !orgId) return null;

      const { data, error } = await (supabase
        .from('atende_ai_instances' as any)
        .select('*')
        .eq('id', instanceId)
        .eq('organization_id', orgId)
        .single() as any);

      if (error) throw error;
      return data as AtendeAIInstance;
    },
    enabled: !!instanceId && !!orgId,
  });

  // ─── Fetch conversations ───
  const conversationsQuery = useQuery({
    queryKey: ['atende-ai-conversations', instanceId],
    queryFn: async () => {
      if (!instanceId || !orgId) return [];

      const { data, error } = await (supabase
        .from('atende_ai_conversations' as any)
        .select('*')
        .eq('instance_id', instanceId)
        .eq('organization_id', orgId)
        .order('last_message_at', { ascending: false }) as any);

      if (error) throw error;
      return (data || []) as AtendeAIConversation[];
    },
    enabled: !!instanceId && !!orgId,
  });

  // ─── Update config ───
  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<AtendeAIInstance>) => {
      if (!instanceId) throw new Error('ID da instância ausente');

      const { data, error } = await (supabase
        .from('atende_ai_instances' as any)
        .update(updates)
        .eq('id', instanceId)
        .select()
        .single() as any);

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

  // ─── WhatsApp instance actions (connect / status / disconnect) ───
  const instanceAction = useMutation({
    mutationFn: async ({
      action,
      phone,
    }: {
      action: 'connect' | 'status' | 'disconnect' | 'get-qr' | 'debug-auth';
      phone?: string;
    }) => {
      const current = queryClient.getQueryData<AtendeAIInstance>(['atende-ai-instance', instanceId]);
      const evolutionId = current?.evolution_instance_id;
      const instanceToken = (current as any)?.instance_api_key;
      const baseUrl = (import.meta.env.VITE_EVOLUTION_URL || '').replace(/\/$/, "");

      if (!evolutionId || !orgId) {
        console.error('[useAtendeAIDetail] Missing requirements:', { evolutionId, orgId });
        throw new Error(
          !evolutionId 
            ? 'Instância não sincronizada com Evolution Go. Clique em "Sincronizar" primeiro.'
            : 'Sessão expirada. Por favor, faça login novamente.'
        );
      }

      console.log('[useAtendeAIDetail] Invoking whatsapp-agent-instance:', { 
        action, 
        instance_id: evolutionId, 
        orgId 
      });

      // --- Ações da instância (connect / status / disconnect / get-qr) ---
      const { data, error } = await supabase.functions.invoke('whatsapp-agent-instance', {
        body: { instance_id: evolutionId, action, phone, organization_id: orgId },
      });

      if (error) {
        console.error('[useAtendeAIDetail] Edge Function error:', error);
        throw error;
      }
      if (data?.error) {
        console.error('[useAtendeAIDetail] API error:', data.error);
        throw new Error(data.error);
      }
      
      console.log('[useAtendeAIDetail] API Success:', data);
      return data;
    },
    onSuccess: (data, { action }) => {
      // Actualizar cache imediatamente se o servidor retornou estado de conexão
      if (data?.whatsapp_connected !== undefined) {
        queryClient.setQueryData<AtendeAIInstance | null>(
          ['atende-ai-instance', instanceId],
          (prev) =>
            prev
              ? {
                  ...prev,
                  whatsapp_connected: data.whatsapp_connected!,
                  status: data.whatsapp_connected ? 'active' : 'inactive',
                  connected_number: data.connected_number ?? prev.connected_number,
                }
              : prev
        );
      }
      queryClient.invalidateQueries({ queryKey: ['atende-ai-instances'] });
      
      if (action === 'status') {
        const isNowConnected = data?.isConnected || data?.whatsapp_connected;
        toast.success(isNowConnected ? 'WhatsApp conectado e sincronizado!' : 'Sincronizado. WhatsApp continua desconectado.');
      } else if (action === 'disconnect') {
        toast.success('WhatsApp desconectado');
      }
    },
    onError: (err: any) => {
      toast.error('Erro: ' + err.message);
    },
  });

  // ─── Send message ───
  const sendMessage = useMutation({
    mutationFn: async ({ to, text }: { to: string; text: string }) => {
      const current = queryClient.getQueryData<AtendeAIInstance>(['atende-ai-instance', instanceId]);
      const evolutionId = current?.evolution_instance_id;

      if (!evolutionId) throw new Error('Instância não sincronizada.');

      const { data, error } = await supabase.functions.invoke('whatsapp-agent-instance', {
        body: { 
          instance_id: evolutionId, 
          action: 'send-text', 
          to, 
          text,
          organization_id: orgId 
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, { to }) => {
      // Re-fetch messages for the active conversation
      queryClient.invalidateQueries({ queryKey: ['atende-ai-messages'] });
      queryClient.invalidateQueries({ queryKey: ['atende-ai-conversations', instanceId] });
    },
    onError: (err: any) => {
      toast.error('Erro ao enviar mensagem: ' + err.message);
    },
  });

  // ─── Realtime Updates from Database ───
  useEffect(() => {
    if (!instanceId) return;

    const channel = supabase
      .channel(`instance_details_${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'atende_ai_instances',
          filter: `id=eq.${instanceId}`,
        },
        (payload) => {
          if (payload.new) {
            queryClient.setQueryData<AtendeAIInstance | null>(
              ['atende-ai-instance', instanceId],
              (prev) => (prev ? { ...prev, ...payload.new } : (payload.new as AtendeAIInstance))
            );
            queryClient.invalidateQueries({ queryKey: ['atende-ai-instances'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [instanceId, queryClient]);

  return {
    instance: instanceQuery.data ?? null,
    isLoading: instanceQuery.isLoading,
    conversations: conversationsQuery.data ?? [],
    conversationsLoading: conversationsQuery.isLoading,
    updateConfig,
    instanceAction,
    sendMessage,
    refetchInstance: instanceQuery.refetch,
    refetchConversations: conversationsQuery.refetch,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useAtendeAIConnectionPoller — polling automático enquanto desconectado
//
// Enquanto a aba Conexão estiver visível e o WhatsApp não estiver conectado,
// este hook chama directamente a Evolution Go API (GET /instance/qr) a cada
// 5 segundos e actualiza o cache/UI quando a conexão for estabelecida.
// ─────────────────────────────────────────────────────────────────────────────
const EVOLUTION_GO_URL = (import.meta.env.VITE_EVOLUTION_URL || '').replace(/\/$/, '');

export function useAtendeAIConnectionPoller(
  instanceId: string | undefined,
  evolutionInstanceId: string | undefined,
  isConnected: boolean,
  active: boolean,
  onStatusUpdate?: (data: any) => void
) {
  const { organizationId: orgId } = useOrganization();
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Limpar se: aba inactiva, sem instância, ou já conectado
    if (!active || !instanceId || !evolutionInstanceId || isConnected || !orgId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        // Get the instance_api_key from the cached instance data
        const cachedInstance = queryClient.getQueryData<AtendeAIInstance>(['atende-ai-instance', instanceId]);
        const apikey = (cachedInstance as any)?.instance_api_key;

        if (!apikey || !EVOLUTION_GO_URL) {
          // Fallback: use Edge Function if no API key available
          const { data } = await supabase.functions.invoke('whatsapp-agent-instance', {
            body: { instance_id: evolutionInstanceId, action: 'status', organization_id: orgId },
          });

          if (data?.isConnected) {
            queryClient.setQueryData<AtendeAIInstance | null>(
              ['atende-ai-instance', instanceId],
              (prev) =>
                prev
                  ? {
                      ...prev,
                      whatsapp_connected: true,
                      status: 'active',
                      connected_number: data.owner ?? prev.connected_number,
                    }
                  : prev
            );
            queryClient.invalidateQueries({ queryKey: ['atende-ai-instances'] });
            toast.success('✅ WhatsApp conectado com sucesso!');

            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          } else if (onStatusUpdate) {
            onStatusUpdate(data);
          }
          return;
        }

        // Direct call to Evolution Go API - Check status first
        const statusRes = await fetch(`${EVOLUTION_GO_URL}/instance/status`, {
          method: 'GET',
          headers: { apikey },
        });

        const statusData = await statusRes.json();
        
        // Check if the instance is connected (Evolution Go returns status info)
        const isConnectedNow = 
          statusData?.connected === true || 
          statusData?.status === 'open' || 
          statusData?.status === 'CONNECTED' ||
          statusData?.instance?.status === 'open' ||
          statusData?.instance?.state === 'open' ||
          statusData?.state === 'open';
        
        if (isConnectedNow) {
          console.log('✅ Connection detected via poller:', statusData);
          queryClient.setQueryData<AtendeAIInstance | null>(
            ['atende-ai-instance', instanceId],
            (prev) =>
              prev
                ? {
                    ...prev,
                    whatsapp_connected: true,
                    status: 'active',
                    connected_number: statusData?.owner ?? statusData?.instance?.owner ?? prev.connected_number,
                  }
                : prev
          );
          queryClient.invalidateQueries({ queryKey: ['atende-ai-instances'] });
          toast.success('✅ WhatsApp conectado com sucesso!');

          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        // If not connected, get updated QR/Pairing code
        const qrRes = await fetch(`${EVOLUTION_GO_URL}/instance/qr`, {
          method: 'GET',
          headers: { apikey },
        });
        const qrData = await qrRes.json();

        if (onStatusUpdate) {
          const qrBase64 = qrData?.data?.Qrcode || qrData?.qrcode || qrData?.base64 || qrData?.qr || qrData?.code;
          const pairingCode = qrData?.data?.PairingCode || qrData?.pairingCode || qrData?.pairing_code;
          if (qrBase64 || pairingCode) {
            onStatusUpdate({ qrCode: qrBase64, pairingCode });
          }
        }
      } catch {
        // Silencioso — não interromper a UI com erros de polling
      }
    };

    // Primeiro poll imediato
    poll();
    intervalRef.current = setInterval(poll, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, instanceId, evolutionInstanceId, isConnected, queryClient]);
}

// ─────────────────────────────────────────────────────────────────────────────
// useAtendeAIMessages — mensagens de uma conversa individual
// ─────────────────────────────────────────────────────────────────────────────
export function useAtendeAIMessages(conversationId: string | undefined) {
  const { organizationId: orgId } = useOrganization();

  const messagesQuery = useQuery({
    queryKey: ['atende-ai-messages', conversationId],
    queryFn: async () => {
      if (!conversationId || !orgId) return [];

      const { data, error } = await (supabase
        .from('atende_ai_messages' as any)
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true }) as any);

      if (error) throw error;
      return (data || []) as AtendeAIMessage[];
    },
    enabled: !!conversationId && !!orgId,
  });

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
  };
}
