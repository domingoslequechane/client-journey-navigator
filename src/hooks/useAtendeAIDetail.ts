import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
    // Poll every 8 seconds to keep sidebar fresh
    refetchInterval: 8000,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });

  // ─── Realtime for conversations (sidebar updates) ───
  useEffect(() => {
    if (!instanceId || !orgId) return;

    const channel = supabase
      .channel(`conversations_${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'atende_ai_conversations',
          filter: `instance_id=eq.${instanceId}`,
        },
        () => {
          // Refetch the full list to get proper ordering
          queryClient.invalidateQueries({ queryKey: ['atende-ai-conversations', instanceId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'atende_ai_messages',
        },
        () => {
          // Any new message in any conversation → refresh conversation list for updated previews
          queryClient.invalidateQueries({ queryKey: ['atende-ai-conversations', instanceId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [instanceId, orgId, queryClient]);

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
    mutationFn: async ({ to, text, conversationId }: { to: string; text: string; conversationId?: string }) => {
      const current = queryClient.getQueryData<AtendeAIInstance>(['atende-ai-instance', instanceId]);
      const evolutionId = current?.evolution_instance_id;

      if (!evolutionId) throw new Error('Instância não sincronizada.');

      // 1. Send the message via WhatsApp
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

      // 2. Persist the sent message to the database so it survives page reloads
      if (conversationId && orgId) {
        try {
          await (supabase
            .from('atende_ai_messages' as any)
            .insert({
              conversation_id: conversationId,
              organization_id: orgId,
              role: 'assistant',
              content: text,
              created_at: new Date().toISOString(),
            }) as any);
        } catch (saveErr) {
          console.warn('[sendMessage] Failed to persist message locally:', saveErr);
          // Don't throw — the WhatsApp message was already sent successfully
        }

        // 3. Activate human intervention pause — stop the AI from replying
        //    while a human agent is handling the conversation
        const pauseDuration = current?.human_pause_duration ?? 60; // minutes
        if (pauseDuration > 0) {
          const pausedUntil = new Date(Date.now() + pauseDuration * 60 * 1000).toISOString();
          try {
            await (supabase
              .from('atende_ai_conversations' as any)
              .update({ paused_until: pausedUntil })
              .eq('id', conversationId) as any);
            console.log(`[sendMessage] AI paused for ${pauseDuration}min on conversation ${conversationId}`);
          } catch (pauseErr) {
            console.warn('[sendMessage] Failed to set pause:', pauseErr);
          }
        }
      }

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
// este hook faz polling na base de dados (Supabase) para verificar o estado
// da conexão e obter o QR code. Nunca chama a Evolution Go API directamente
// do frontend — tudo passa pelas Edge Functions e pelo webhook.
// ─────────────────────────────────────────────────────────────────────────────

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
    if (!active || !instanceId || !evolutionInstanceId || isConnected || !orgId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        // Ler estado directamente da base de dados (actualizado pelo webhook)
        const { data: instance } = await (supabase
          .from('atende_ai_instances' as any)
          .select('whatsapp_connected, qr_code_base64, connected_number, status, evolution_instance_id')
          .eq('id', instanceId)
          .single() as any);

        if (!instance) return;

        // Se o webhook já marcou como conectado → actualizar cache e parar polling
        if (instance.whatsapp_connected) {
          queryClient.setQueryData<AtendeAIInstance | null>(
            ['atende-ai-instance', instanceId],
            (prev) =>
              prev
                ? {
                    ...prev,
                    whatsapp_connected: true,
                    status: 'active',
                    connected_number: instance.connected_number ?? prev.connected_number,
                  }
                : prev
          );
          queryClient.invalidateQueries({ queryKey: ['atende-ai-instances'] });
          toast.success('WhatsApp conectado com sucesso!');

          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          // ─── Enviar mensagem de boas-vindas FROM "Quali" ─────────────────
          // Agente Quali (ID: dv6J6yCE2Nle | +258847969224) — conta oficial
          // da Qualify que confirma todas as novas conexões na plataforma.
          const newlyConnectedNumber = instance.connected_number;
          if (newlyConnectedNumber && orgId) {
            (async () => {
              try {
                const QUALI_EVOLUTION_ID = 'dv6J6yCE2Nle';

                const welcomeText =
                  `Olá! 👋 Aqui é a *Quali*, da equipa *Qualify*.\n\n` +
                  `✅ A sua conta WhatsApp foi *conectada com sucesso* à plataforma Qualify e já está a processar mensagens em tempo real.\n\n` +
                  `Se tiver alguma dúvida sobre a plataforma, estamos aqui para ajudar! 🚀\n\n` +
                  `_— Quali da Qualify_`;

                const { error } = await supabase.functions.invoke('whatsapp-agent-instance', {
                  body: {
                    instance_id: QUALI_EVOLUTION_ID,
                    action: 'send-text',
                    to: newlyConnectedNumber,
                    text: welcomeText,
                    organization_id: orgId,
                  },
                });

                if (error) {
                  console.warn('[ConnectionPoller] Mensagem de boas-vindas da Quali falhou:', error);
                } else {
                  console.log(`[ConnectionPoller] Quali (${QUALI_EVOLUTION_ID}) enviou boas-vindas para ${newlyConnectedNumber}`);
                }
              } catch (sendErr) {
                console.warn('[ConnectionPoller] Erro ao enviar mensagem de boas-vindas:', sendErr);
              }
            })();
          }

          return;
        }

        // QR code salvo pelo webhook → enviar para a UI
        if (instance.qr_code_base64 && onStatusUpdate) {
          onStatusUpdate({ qrCode: instance.qr_code_base64 });
        }
      } catch {
        // Silencioso — não interromper a UI com erros de polling
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 4000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, instanceId, evolutionInstanceId, isConnected, queryClient, orgId]);
}

// ─────────────────────────────────────────────────────────────────────────────
// useAtendeAIMessages — mensagens de uma conversa individual (REALTIME)
// ─────────────────────────────────────────────────────────────────────────────
export function useAtendeAIMessages(conversationId: string | undefined) {
  const { organizationId: orgId } = useOrganization();
  const queryClient = useQueryClient();

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
    // Fast polling as fallback every 5 seconds
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    // Keep showing current data while refetching to prevent flicker
    placeholderData: keepPreviousData,
  });

  // ─── Realtime subscription for new messages ───
  useEffect(() => {
    if (!conversationId || !orgId) return;

    const channel = supabase
      .channel(`messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'atende_ai_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.new) {
            // Immediately add the new message to the cache
            queryClient.setQueryData<AtendeAIMessage[]>(
              ['atende-ai-messages', conversationId],
              (prev) => {
                const existing = prev || [];
                // Avoid duplicates
                if (existing.some((m: any) => m.id === (payload.new as any).id)) {
                  return existing;
                }
                return [...existing, payload.new as AtendeAIMessage];
              }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'atende_ai_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.new) {
            queryClient.setQueryData<AtendeAIMessage[]>(
              ['atende-ai-messages', conversationId],
              (prev) => {
                if (!prev) return prev;
                return prev.map((m: any) =>
                  m.id === (payload.new as any).id ? (payload.new as AtendeAIMessage) : m
                ) as AtendeAIMessage[];
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, orgId, queryClient]);

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
  };
}
