import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Bot, Phone, Clock, Shield, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AI_CHANNEL_LABELS } from '@/types';
import { useAtendeAIMessages, useAtendeAIDetail } from '@/hooks/useAtendeAIDetail';
import type { AtendeAIConversation } from '@/types';
import { formatWhatsAppText } from '@/lib/whatsappFormatter';

interface AtendeConversationViewProps {
  conversation: AtendeAIConversation;
}

export function AtendeConversationView({ conversation }: AtendeConversationViewProps) {
  const { messages, isLoading } = useAtendeAIMessages(conversation.id);
  const { toggleVerification, instance } = useAtendeAIDetail(conversation.instance_id);

  const isVerifying = toggleVerification.isPending;
  const isVerified = conversation.is_verified;
  const isVerificationEnabled = instance?.ai_verification_enabled;

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
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{conversation.contact_name}</h3>
                {isVerified && (
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-500" title="Contacto Verificado" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {conversation.contact_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {conversation.contact_phone}
                  </span>
                )}
                <span>•</span>
                <Badge variant="outline" className="text-[10px]">
                  {AI_CHANNEL_LABELS[conversation.channel]}
                </Badge>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Início: {format(new Date(conversation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>

            {isVerificationEnabled && (
              <Button
                size="sm"
                variant={isVerified ? "default" : "outline"}
                onClick={() => toggleVerification.mutate({ conversationId: conversation.id, isVerified: !isVerified })}
                disabled={isVerifying}
                className={cn(
                  "h-8 gap-2 text-[10px] font-bold uppercase tracking-wider rounded-full px-4 transition-all",
                  isVerified 
                    ? "bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg shadow-blue-500/20" 
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-blue-600 hover:border-blue-200"
                )}
              >
                {isVerifying ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  isVerified ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />
                )}
                {isVerified ? 'Verificado' : 'Verificar'}
              </Button>
            )}
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
                  Aguardando humano
                </Badge>
              )}
              {conversation.paused_until && new Date(conversation.paused_until) > new Date() && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 whitespace-nowrap">
                  IA em pausa
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
                          Intervenção humana
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
                      <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-1 overflow-hidden border border-zinc-100 dark:border-zinc-800">
                        {conversation.profile_picture_url ? (
                          <img src={conversation.profile_picture_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                        )}
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
