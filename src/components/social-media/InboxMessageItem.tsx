import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, AtSign } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PlatformIcon } from './PlatformIcon';
import type { SocialMessage } from '@/hooks/useSocialMessages';
import type { SocialPlatform } from '@/lib/social-media-mock';
import { cn } from '@/lib/utils';

interface InboxMessageItemProps {
  message: SocialMessage;
  isSelected: boolean;
  onClick: () => void;
}

export function InboxMessageItem({ message, isSelected, onClick }: InboxMessageItemProps) {
  const initials = message.sender_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 border-b border-border transition-colors hover:bg-muted/50",
        isSelected && "bg-muted",
        !message.is_read && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={message.sender_avatar_url || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn("text-sm truncate", !message.is_read && "font-semibold")}>
              {message.sender_name}
            </span>
            <PlatformIcon platform={message.platform as SocialPlatform} size="sm" />
            {message.message_type === 'comment' ? (
              <AtSign className="h-3 w-3 text-muted-foreground shrink-0" />
            ) : (
              <MessageCircle className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>

          <p className={cn(
            "text-xs truncate",
            message.is_read ? "text-muted-foreground" : "text-foreground"
          )}>
            {message.content}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(message.received_at), { addSuffix: true, locale: ptBR })}
            </span>
            {!message.is_read && (
              <Badge variant="default" className="h-4 px-1.5 text-[10px]">Nova</Badge>
            )}
            {message.replied_at && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">Respondida</Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
