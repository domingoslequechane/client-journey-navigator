import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Bot, Phone, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AI_CHANNEL_LABELS } from '@/types';
import { useAIAgentMessages } from '@/hooks/useAIAgentDetail';
import type { AIAgentConversation } from '@/types';
import { formatWhatsAppText } from '@/lib/whatsappFormatter';

interface ConversationViewProps {
  conversation: AIAgentConversation;
}

export function ConversationView({ conversation }: ConversationViewProps) {
  const { messages, isLoading } = useAIAgentMessages(conversation.id);

  // include system messages (sent by human) for display
  const visibleMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system');

  return (
    <div className="space-y-4">
      {/* Conversation Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">{conversation.contact_name}</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {conversation.contact_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {conversation.contact_phone}
                  </span>
                )}
                <span>•</span>
                <Badge variant="outline" className="text-[10px]">
                  {AI_CHANNEL_LABELS[conversation.channel]}
                </Badge>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Início: {format(new Date(conversation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge
                variant="outline"
                className={cn(
                  conversation.status === 'open'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {conversation.status === 'open' ? 'Aberta' : 'Encerrada'}
              </Badge>
              {conversation.waiting_human && (
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20 whitespace-nowrap">
                  Aguardando Humano
                </Badge>
              )}
              {conversation.paused_until && new Date(conversation.paused_until) > new Date() && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 whitespace-nowrap">
                  IA em Pausa
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {visibleMessages.length} mensagens
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 p-4">
                {visibleMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3',
                      message.role === 'assistant' ? 'justify-start' : 'justify-end'
                    )}
                  >
                    {message.role !== 'user' && (
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                        message.role === 'system' ? "bg-orange-500/10" : "bg-primary/10"
                      )}>
                        {message.role === 'system' ? (
                          <User className="h-4 w-4 text-orange-600" />
                        ) : (
                          <Bot className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-2.5',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : message.role === 'system'
                            ? 'bg-orange-50 text-orange-950 border border-orange-200 rounded-tl-sm'
                            : 'bg-muted text-foreground rounded-tl-sm'
                      )}
                    >
                      {message.role === 'system' && (
                        <p className="text-[10px] font-semibold text-orange-600 mb-1 uppercase tracking-wider">
                          Intervenção Humana
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{formatWhatsAppText(message.content)}</p>
                      <p className={cn(
                        'text-[10px] mt-1.5',
                        message.role === 'assistant'
                          ? 'text-muted-foreground'
                          : 'text-primary-foreground/70'
                      )}>
                        {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
