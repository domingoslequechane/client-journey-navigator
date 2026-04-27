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
      toast.success('Configurações salvas', {
        description: 'As alterações do seu atendente foram aplicadas com sucesso.'
      });
    },
    onError: (err: any) => {
      toast.error('Erro ao salvar', {
        description: 'Não foi possível atualizar as configurações: ' + err.message
      });
    },
  });

  // ─── WhatsApp instance actions (connect / status / disconnect) ───
  const instanceAction = useMutation({
    mutationFn: async ({
      action,
      phone,
      silent = false,
    }: {
      action: 'connect' | 'status' | 'disconnect' | 'get-qr' | 'debug-auth';
      phone?: string;
      silent?: boolean;
    }) => {
      const current = queryClient.getQueryData<AtendeAIInstance>(['atende-ai-instance', instanceId]);
      const evolutionId = current?.evolution_instance_id;

      if (!evolutionId || !orgId) {
        console.error('[useAtendeAIDetail] Missing requirements:', { evolutionId, orgId });
        throw new Error(
          !evolutionId 
            ? 'Instância não sincronizada com Evolution Go. Recrie o atendente para obter as credenciais corretas.'
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
    onSuccess: (data, { action, silent }) => {
      // Actualizar cache imediatamente se o servidor retornou estado de conexão
      if (data?.whatsapp_connected !== undefined || data?.isConnected !== undefined) {
        queryClient.setQueryData<AtendeAIInstance | null>(
          ['atende-ai-instance', instanceId],
          (prev) =>
            prev
              ? {
                  ...prev,
                  whatsapp_connected: (data.whatsapp_connected !== undefined ? data.whatsapp_connected : data.isConnected) ?? prev.whatsapp_connected,
                  status: (data.whatsapp_connected || data.isConnected) ? 'active' : 'inactive',
                  connected_number: data.connected_number ?? prev.connected_number,
                  profile_picture: data.profile_picture ?? prev.profile_picture,
                }
              : prev
        );
      }
      queryClient.invalidateQueries({ queryKey: ['atende-ai-instances'] });
      
      if (silent) return;

      if (action === 'status') {
        const isNowConnected = data?.isConnected || data?.whatsapp_connected;
        if (isNowConnected) {
          toast.success('Conexão ativa!', {
            description: 'O seu WhatsApp está sincronizado e pronto para operar.'
          });
        } else {
          toast.info('Sincronização realizada', {
            description: 'A instância foi atualizada, mas o WhatsApp continua desconectado.'
          });
        }
      } else if (action === 'disconnect') {
        toast.success('Aparelho desconectado', {
          description: 'A conexão com o WhatsApp foi encerrada com sucesso.'
        });
      }
    },
    onError: (err: any, { silent }) => {
      if (silent) return;
      toast.error('Ação interrompida', {
        description: err.message
      });
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
      toast.error('Falha no envio', {
        description: 'Não foi possível enviar a mensagem: ' + err.message
      });
    },
  });

  // ─── Clear history ───
  const clearHistory = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!conversationId || !orgId) throw new Error('Dados ausentes');

      const { error } = await (supabase
        .from('atende_ai_messages' as any)
        .delete()
        .eq('conversation_id', conversationId)
        .eq('organization_id', orgId) as any);

      if (error) throw error;

      // Reset message count in conversation
      await supabase
        .from('atende_ai_conversations')
        .update({ message_count: 0 })
        .eq('id', conversationId);

      return conversationId;
    },
    onSuccess: (_, conversationId) => {
      // Limpa cache de mensagens
      queryClient.setQueryData(['atende-ai-messages', conversationId], []);
      // Invalida lista de conversas para atualizar o preview/contador no sidebar
      queryClient.invalidateQueries({ queryKey: ['atende-ai-conversations', instanceId] });
      
      toast.success('Histórico limpo', {
        description: 'Todas as mensagens desta conversa foram removidas.'
      });
    },
    onError: (err: any) => {
      toast.error('Erro ao limpar histórico', {
        description: err.message
      });
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
    clearHistory,
    refetchInstance: instanceQuery.refetch,
    refetchConversations: conversationsQuery.refetch,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useAtendeAIConnectionPoller — polling automático enquanto desconectado
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
  const statusCheckRef = useRef({ lastRun: 0, pending: false });
  const connectionHandledRef = useRef(false);
  const lastInstanceRef = useRef<string | undefined>(undefined);
  const lastDisconnectRef = useRef(0);
  const awaitingQRCodeRef = useRef(false);
  const STATUS_CHECK_INTERVAL = 2500;

  useEffect(() => {
    if (lastInstanceRef.current !== instanceId) {
      lastInstanceRef.current = instanceId;
      connectionHandledRef.current = false;
    }

    if (!active || !instanceId || !evolutionInstanceId || !orgId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const hydrateStatusCache = (data: any) => {
      if (!instanceId || !orgId || !data) return;
      const updates: Partial<AtendeAIInstance> = {};
      const connectionFlag = data.whatsapp_connected ?? data.isConnected;

      if (typeof connectionFlag === 'boolean') {
        updates.whatsapp_connected = connectionFlag;
        updates.status = connectionFlag ? 'active' : 'inactive';
      }
      if ('connected_number' in data) {
        updates.connected_number = data.connected_number ?? null;
      }
      if ('profile_picture' in data) {
        updates.profile_picture = data.profile_picture ?? null;
      }
      if (!Object.keys(updates).length) return;

      queryClient.setQueryData<AtendeAIInstance | null>(['atende-ai-instance', instanceId], (prev) =>
        prev ? { ...prev, ...updates } : prev
      );
      queryClient.setQueryData<AtendeAIInstance[] | undefined>(['atende-ai-instances', orgId], (prev) =>
        prev ? prev.map((item) => (item.id === instanceId ? { ...item, ...updates } : item)) : prev
      );
    };

    const runStatusCheck = async () => {
      if (!instanceId || !evolutionInstanceId || !orgId) return null;
      if (statusCheckRef.current.pending) return null;
      const now = Date.now();
      if (now - statusCheckRef.current.lastRun < STATUS_CHECK_INTERVAL) return null;
      
      statusCheckRef.current.pending = true;
      try {
        const { data, error } = await supabase.functions.invoke('whatsapp-agent-instance', {
          body: {
            action: 'status',
            instance_id: evolutionInstanceId,
            organization_id: orgId,
          },
        });
        statusCheckRef.current.lastRun = Date.now();
        if (error) {
          console.warn('[ConnectionPoller] status check failed:', error);
          return null;
        }
        const isConnectedNow = (data?.whatsapp_connected ?? data?.isConnected) ?? false;
        return {
          isConnected: isConnectedNow,
          connected_number: data?.connected_number ?? null,
          profile_picture: data?.profile_picture ?? null,
        };
      } catch (statusErr) {
        console.warn('[ConnectionPoller] status check error:', statusErr);
        return null;
      } finally {
        statusCheckRef.current.pending = false;
      }
    };

    const finalizeConnection = (
      instance: AtendeAIInstance,
      overrides?: { connected_number?: string | null; profile_picture?: string | null }
    ) => {
      if (!instanceId || !orgId || connectionHandledRef.current) return;
      connectionHandledRef.current = true;
      awaitingQRCodeRef.current = false;
      lastDisconnectRef.current = 0;
      const updates: Partial<AtendeAIInstance> = { whatsapp_connected: true, status: 'active' };
      if (overrides?.connected_number !== undefined) updates.connected_number = overrides.connected_number;
      else if (instance.connected_number !== undefined) updates.connected_number = instance.connected_number;
      if (overrides?.profile_picture !== undefined) updates.profile_picture = overrides.profile_picture;
      else if (instance.profile_picture !== undefined) updates.profile_picture = instance.profile_picture;
      hydrateStatusCache(updates);
      queryClient.invalidateQueries({ queryKey: ['atende-ai-instance', instanceId] });
      queryClient.invalidateQueries({ queryKey: ['atende-ai-instances', orgId] });
      toast.success('Conexão estabelecida!', { description: 'O seu WhatsApp foi vinculado com sucesso.' });
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

      const num = overrides?.connected_number ?? instance.connected_number;
      if (num) {
        (async () => {
          try {
            await supabase.functions.invoke('whatsapp-agent-instance', {
              body: {
                instance_id: evolutionInstanceId,
                action: 'send-text',
                to: num,
                text: `Olá! Aqui é a *Quali*, da equipa *Qualify*.\n\nA sua conta WhatsApp foi *conectada com sucesso* e já está a processar mensagens em tempo real.\n\nSe tiver alguma dúvida, estamos aqui! Bom trabalho!\n\n_- Quali da Qualify_`,
                organization_id: orgId,
              },
            });
          } catch (e) { console.warn('[Poller] boas-vindas erro:', e); }
        })();
      }
    };

    const poll = async () => {
      try {
        const statusUpdate = await runStatusCheck();
        if (statusUpdate !== null) {
          if (statusUpdate.isConnected && !connectionHandledRef.current) {
            const { data: inst } = await (supabase
              .from('atende_ai_instances' as any)
              .select('whatsapp_connected, qr_code_base64, connected_number, status, evolution_instance_id')
              .eq('id', instanceId)
              .single() as any);
            if (inst) finalizeConnection(inst, { connected_number: statusUpdate.connected_number, profile_picture: statusUpdate.profile_picture });
            return;
          }
          if (!statusUpdate.isConnected) {
            connectionHandledRef.current = false;
            awaitingQRCodeRef.current = false;
            hydrateStatusCache({ whatsapp_connected: false, isConnected: false });
          }
        }
        const { data: instQR } = await (supabase
          .from('atende_ai_instances' as any)
          .select('qr_code_base64')
          .eq('id', instanceId)
          .single() as any);
        if (instQR?.qr_code_base64 && onStatusUpdate) {
          awaitingQRCodeRef.current = true;
          onStatusUpdate({ qrCode: instQR.qr_code_base64 });
        } else {
          awaitingQRCodeRef.current = false;
        }
      } catch { /* silencioso */ }
    };

    const channel = supabase
      .channel(`instance-conn-${instanceId}`)
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'atende_ai_instances', filter: `id=eq.${instanceId}` },
        (payload: any) => {
          const upd = payload.new;
          if (upd?.qr_code_base64 && onStatusUpdate) {
            awaitingQRCodeRef.current = true;
            onStatusUpdate({ qrCode: upd.qr_code_base64 });
          }
          if (upd?.whatsapp_connected === true && !connectionHandledRef.current) {
            finalizeConnection(upd as AtendeAIInstance, { connected_number: upd.connected_number ?? null, profile_picture: upd.profile_picture ?? null });
          } else if (upd?.whatsapp_connected === false) {
            connectionHandledRef.current = false;
            awaitingQRCodeRef.current = false;
            hydrateStatusCache({ whatsapp_connected: false, isConnected: false });
          }
        }
      )
      .subscribe();

    poll();
    intervalRef.current = setInterval(poll, 4000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [active, instanceId, evolutionInstanceId, isConnected, queryClient, orgId]);
}

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
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });

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
            queryClient.setQueryData<AtendeAIMessage[]>(
              ['atende-ai-messages', conversationId],
              (prev) => {
                const existing = prev || [];
                if (existing.some((m: any) => m.id === (payload.new as any).id)) {
                  return existing;
                }
                return [...existing, payload.new as AtendeAIMessage];
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
