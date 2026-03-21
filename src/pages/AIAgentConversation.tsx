import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  Bot,
  User,
  Phone,
  Clock,
  MessageSquare,
  RefreshCw,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useHeader } from '@/contexts/HeaderContext';
import { useAIAgentMessages } from '@/hooks/useAIAgentDetail';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { AI_CHANNEL_LABELS } from '@/types';
import type { AIAgentConversation as ConversationType } from '@/types';
import { formatWhatsAppText } from '@/lib/whatsappFormatter';

function safeFormat(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isValid(d)) return '';
    return format(d, fmt, { locale: ptBR });
  } catch {
    return '';
  }
}

export default function AIAgentConversation() {
  const { agentId, conversationId } = useParams<{
    agentId: string;
    conversationId: string;
  }>();
  const navigate = useNavigate();
  const { setBackAction, setCustomTitle } = useHeader();
  const { organizationId: orgId } = useOrganization();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch conversation details using raw RPC to avoid type mismatch
  const { data: conversation, isLoading: convLoading } = useQuery({
    queryKey: ['ai-agent-conversation', conversationId],
    queryFn: async () => {
      if (!conversationId || !orgId) return null;

      const { data, error } = await (supabase as any)
        .from('ai_agent_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('organization_id', orgId)
        .single();

      if (error) throw error;
      return data as ConversationType;
    },
    enabled: !!conversationId && !!orgId,
  });

  // Fetch messages
  const { messages, isLoading: msgsLoading } =
    useAIAgentMessages(conversationId);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-refresh messages every 8s
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: ['ai-agent-messages', conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ai-agent-conversation', conversationId],
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [conversationId, queryClient]);

  // Header
  useEffect(() => {
    setBackAction(
      () => () => navigate(`/app/ai-agents/${agentId}`)
    );
    setCustomTitle(conversation?.contact_name || 'Conversa');

    return () => {
      setBackAction(null);
      setCustomTitle(null);
    };
  }, [conversation, agentId, navigate, setBackAction, setCustomTitle]);

  const visibleMessages = messages.filter(
    (m) => m.role === 'user' || m.role === 'assistant' || m.role === 'system'
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['ai-agent-messages', conversationId],
    });
    queryClient.invalidateQueries({
      queryKey: ['ai-agent-conversation', conversationId],
    });
  };

  if (convLoading || msgsLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="p-4 border-b">
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}
            >
              <Skeleton
                className={cn(
                  'rounded-2xl',
                  i % 2 === 0 ? 'h-12 w-[60%]' : 'h-16 w-[70%]'
                )}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <AlertCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground text-lg">Conversa não encontrada</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate(`/app/ai-agents/${agentId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Agente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ─── Chat Header ─── */}
      <div className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 hidden md:flex"
            onClick={() => navigate(`/app/ai-agents/${agentId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Contact info */}
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">
              {conversation.contact_name}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              {conversation.contact_phone && (
                <span className="flex items-center gap-0.5">
                  <Phone className="h-3 w-3" />
                  {conversation.contact_phone}
                </span>
              )}
              <span>•</span>
              <span>{AI_CHANNEL_LABELS[conversation.channel]}</span>
              {conversation.created_at && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {safeFormat(conversation.created_at, 'dd/MM/yyyy')}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            {conversation.waiting_human && (
              <Badge
                variant="secondary"
                className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px] hidden sm:inline-flex"
              >
                <Shield className="h-3 w-3 mr-1" />
                Humano
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                'text-[10px]',
                conversation.status === 'open'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {conversation.status === 'open' ? 'Aberta' : 'Encerrada'}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Messages Area ─── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div
          className="max-w-3xl mx-auto px-4 py-6 space-y-3"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        >
          {/* Date separator */}
          {visibleMessages.length > 0 && visibleMessages[0].created_at && (
            <div className="flex items-center justify-center mb-4">
              <span className="text-[11px] bg-muted/80 text-muted-foreground px-3 py-1 rounded-full">
                {safeFormat(visibleMessages[0].created_at, "d 'de' MMMM, yyyy")}
              </span>
            </div>
          )}

          {visibleMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma mensagem nesta conversa
              </p>
            </div>
          ) : (
            visibleMessages.map((message, index) => {
              const isUser = message.role === 'user';
              const isSystem = message.role === 'system';

              // Show date separator between days
              let showDateSep = false;
              if (index > 0 && message.created_at && visibleMessages[index - 1].created_at) {
                try {
                  const currDate = new Date(message.created_at);
                  const prevDate = new Date(visibleMessages[index - 1].created_at);
                  showDateSep = isValid(currDate) && isValid(prevDate) && currDate.toDateString() !== prevDate.toDateString();
                } catch {
                  showDateSep = false;
                }
              }

              return (
                <div key={message.id}>
                  {showDateSep && (
                    <div className="flex items-center justify-center my-4">
                      <span className="text-[11px] bg-muted/80 text-muted-foreground px-3 py-1 rounded-full">
                        {safeFormat(message.created_at, "d 'de' MMMM, yyyy")}
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      'flex gap-2 max-w-[85%] sm:max-w-[75%]',
                      isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    )}
                  >
                    {/* Avatar */}
                    {!isUser && (
                      <div
                        className={cn(
                          'h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1',
                          isSystem
                            ? 'bg-orange-500/15 border border-orange-500/20'
                            : 'bg-primary/10 border border-primary/15'
                        )}
                      >
                        {isSystem ? (
                          <User className="h-3.5 w-3.5 text-orange-600" />
                        ) : (
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className={cn(
                        'rounded-2xl px-3.5 py-2.5 shadow-sm',
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : isSystem
                            ? 'bg-orange-50 dark:bg-orange-950/30 text-foreground border border-orange-200 dark:border-orange-800/40 rounded-tl-sm'
                            : 'bg-card text-foreground border border-border rounded-tl-sm'
                      )}
                    >
                      {isSystem && (
                        <p className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 mb-1 uppercase tracking-wider flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Intervenção Humana
                        </p>
                      )}

                      {/* Quoted message */}
                      {message.quoted_message_content && (
                        <div className="mb-2 pl-2 border-l-2 border-primary/30 text-[11px] opacity-70 italic line-clamp-2">
                          {message.quoted_message_content}
                        </div>
                      )}

                      <p className="text-[13px] whitespace-pre-wrap leading-relaxed">
                        {formatWhatsAppText(message.content)}
                      </p>

                      <p
                        className={cn(
                          'text-[10px] mt-1.5 text-right',
                          isUser
                            ? 'text-primary-foreground/60'
                            : 'text-muted-foreground'
                        )}
                      >
                        {safeFormat(message.created_at, 'HH:mm')}
                      </p>
                    </div>

                    {/* User avatar */}
                    {isUser && (
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1 border">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ─── Footer info bar ─── */}
      <div className="border-t bg-muted/30 px-4 py-2.5 text-center">
        <p className="text-[11px] text-muted-foreground">
          {visibleMessages.length} mensagens • As mensagens são gerenciadas pelo agente de IA
        </p>
      </div>
    </div>
  );
}
