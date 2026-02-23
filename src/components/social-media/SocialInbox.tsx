import { useState, useMemo } from 'react';
import { Search, MessageCircle, AtSign, Inbox, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSocialMessages } from '@/hooks/useSocialMessages';
import { InboxMessageItem } from './InboxMessageItem';
import { InboxConversation } from './InboxConversation';
import { cn } from '@/lib/utils';
import type { SocialPlatform } from '@/lib/social-media-mock';
import { PLATFORM_CONFIG } from '@/lib/social-media-mock';
import { PlatformIcon } from './PlatformIcon';

interface SocialInboxProps {
  selectedClient?: string;
}

type TypeFilter = 'all' | 'dm' | 'comment';

export function SocialInbox({ selectedClient }: SocialInboxProps) {
  const clientId = selectedClient !== 'all' ? selectedClient : undefined;
  const { messages, isLoading, unreadCount, markAsRead, replyToMessage, fetchMessages } = useSocialMessages(clientId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      if (typeFilter !== 'all' && m.message_type !== typeFilter) return false;
      if (platformFilter !== 'all' && m.platform !== platformFilter) return false;
      if (searchQuery && !m.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) && !m.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [messages, typeFilter, platformFilter, searchQuery]);

  const selectedMessage = messages.find(m => m.id === selectedId) || null;

  const handleReply = (id: string, content: string) => {
    replyToMessage.mutate({ messageId: id, replyContent: content });
  };

  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id);
  };

  // Get unique platforms from messages
  const availablePlatforms = useMemo(() => {
    const platforms = new Set(messages.map(m => m.platform));
    return Array.from(platforms) as SocialPlatform[];
  }, [messages]);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
      <div className="flex h-full">
        {/* Left panel - Message list */}
        <div className={cn(
          "w-full md:w-[360px] md:border-r border-border flex flex-col shrink-0",
          selectedMessage && "hidden md:flex"
        )}>
          {/* Filters header */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">Mensagens</h3>
                {unreadCount > 0 && (
                  <Badge variant="default" className="h-5 px-1.5 text-xs">{unreadCount}</Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => fetchMessages.mutate()}
                disabled={fetchMessages.isPending}
              >
                <RefreshCw className={cn("h-4 w-4", fetchMessages.isPending && "animate-spin")} />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar mensagens..."
                className="pl-8 h-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setTypeFilter('all')}
              >
                Todas
              </Button>
              <Button
                variant={typeFilter === 'dm' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5 gap-1"
                onClick={() => setTypeFilter('dm')}
              >
                <MessageCircle className="h-3 w-3" /> DMs
              </Button>
              <Button
                variant={typeFilter === 'comment' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5 gap-1"
                onClick={() => setTypeFilter('comment')}
              >
                <AtSign className="h-3 w-3" /> Comentários
              </Button>

              {availablePlatforms.length > 1 && (
                <>
                  <div className="w-px h-5 bg-border mx-1" />
                  {availablePlatforms.map(p => (
                    <Button
                      key={p}
                      variant={platformFilter === p ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setPlatformFilter(platformFilter === p ? 'all' : p)}
                    >
                      <PlatformIcon platform={p} size="sm" />
                    </Button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Message list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma mensagem encontrada</p>
              </div>
            ) : (
              filteredMessages.map(msg => (
                <InboxMessageItem
                  key={msg.id}
                  message={msg}
                  isSelected={msg.id === selectedId}
                  onClick={() => {
                    setSelectedId(msg.id);
                    if (!msg.is_read) markAsRead.mutate(msg.id);
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel - Conversation detail */}
        <div className={cn(
          "flex-1 flex flex-col",
          !selectedMessage && "hidden md:flex"
        )}>
          {selectedMessage ? (
            <InboxConversation
              message={selectedMessage}
              onBack={() => setSelectedId(null)}
              onMarkAsRead={handleMarkAsRead}
              onReply={handleReply}
              isReplying={replyToMessage.isPending}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Selecione uma mensagem para visualizar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
