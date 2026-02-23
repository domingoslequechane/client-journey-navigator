import { useState } from 'react';
import { ArrowLeft, Send, CheckCheck, AtSign, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
import { PlatformIcon } from './PlatformIcon';
import type { SocialMessage } from '@/hooks/useSocialMessages';
import type { SocialPlatform } from '@/lib/social-media-mock';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InboxConversationProps {
  message: SocialMessage;
  onBack: () => void;
  onMarkAsRead: (id: string) => void;
  onReply: (id: string, content: string) => void;
  isReplying: boolean;
}

export function InboxConversation({ message, onBack, onMarkAsRead, onReply, isReplying }: InboxConversationProps) {
  const [replyText, setReplyText] = useState('');

  const initials = message.sender_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    onReply(message.id, replyText.trim());
    setReplyText('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={message.sender_avatar_url || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{message.sender_name}</span>
            <PlatformIcon platform={message.platform as SocialPlatform} size="sm" />
          </div>
          {message.sender_username && (
            <p className="text-xs text-muted-foreground">@{message.sender_username}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs gap-1">
            {message.message_type === 'comment' ? (
              <><AtSign className="h-3 w-3" /> Comentário</>
            ) : (
              <><MessageCircle className="h-3 w-3" /> DM</>
            )}
          </Badge>
          {!message.is_read && (
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => onMarkAsRead(message.id)}>
              <CheckCheck className="h-3 w-3" /> Marcar como lida
            </Button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Original message */}
        <div className="flex gap-3 max-w-[80%]">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={message.sender_avatar_url || undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {format(new Date(message.received_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Reply if exists */}
        {message.reply_content && (
          <div className="flex gap-3 max-w-[80%] ml-auto flex-row-reverse">
            <div>
              <div className="rounded-lg bg-primary text-primary-foreground p-3">
                <p className="text-sm whitespace-pre-wrap">{message.reply_content}</p>
              </div>
              {message.replied_at && (
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {format(new Date(message.replied_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reply input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2 items-end">
          <AutoResizeTextarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escreva sua resposta..."
            className="min-h-[40px] max-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendReply();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleSendReply}
            disabled={!replyText.trim() || isReplying}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
