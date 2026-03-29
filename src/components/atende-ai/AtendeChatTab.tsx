import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Search, User, Clock, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AI_CHANNEL_LABELS } from '@/types';
import type { AtendeAIInstance, AtendeAIConversation } from '@/types';

interface AtendeChatTabProps {
  instance: AtendeAIInstance;
  conversations: AtendeAIConversation[];
  isLoading: boolean;
}

export function AtendeChatTab({ instance, conversations: allConversations, isLoading }: AtendeChatTabProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const conversations = useMemo(() => {
    if (!searchQuery) return allConversations;
    return allConversations.filter(conv =>
      conv.contact_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allConversations, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar conversa por contacto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{conversations.length} conversas</span>
        <span>•</span>
        <span>{conversations.filter(c => c.status === 'open').length} abertas</span>
      </div>

      {/* Conversations List */}
      <div className="grid gap-2 grid-cols-1">
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <Card
              key={conversation.id}
              className="hover:shadow-sm transition-all cursor-pointer group"
              onClick={() => navigate(`/app/atende-ai/${instance.id}/conversations/${conversation.id}`)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{conversation.contact_name}</p>
                      {conversation.status === 'open' && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{AI_CHANNEL_LABELS[conversation.channel]}</span>
                      <span>•</span>
                      <span>{conversation.message_count || 0} msgs</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(conversation.last_message_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  {/* Channel badge + arrow */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                      {conversation.status === 'open' ? 'Aberta' : 'Encerrada'}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
