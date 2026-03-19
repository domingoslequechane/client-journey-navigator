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

interface ConversationViewProps {
  conversation: AIAgentConversation;
}

export function ConversationView({ conversation }: ConversationViewProps) {
  const { messages, isLoading } = useAIAgentMessages(conversation.id);

  // Filter out system messages for display
  const visibleMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');

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
            <Badge
              variant="outline"
              className={cn(
                'shrink-0',
                conversation.status === 'open'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {conversation.status === 'open' ? 'Aberta' : 'Encerrada'}
            </Badge>
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
                    {message.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-2.5',
                        message.role === 'assistant'
                          ? 'bg-muted text-foreground rounded-tl-sm'
                          : 'bg-primary text-primary-foreground rounded-tr-sm'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
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
