import { useState, useMemo, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MessageSquare, 
  Search, 
  User, 
  Clock, 
  Send, 
  Paperclip, 
  MoreVertical,
  ChevronLeft,
  Circle,
  Filter,
  MessageCircle,
  CheckCheck
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAtendeAIMessages } from '@/hooks/useAtendeAIDetail';
import type { AtendeAIInstance, AtendeAIConversation, AtendeAIMessage } from '@/types';

interface AtendeChatTabProps {
  instance: AtendeAIInstance;
  conversations: AtendeAIConversation[];
  isLoading: boolean;
  sendMessage?: any;
}

export function AtendeChatTab({ instance, conversations: allConversations, isLoading, sendMessage }: AtendeChatTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter conversations
  const conversations = useMemo(() => {
    let filtered = allConversations;
    if (searchQuery) {
      filtered = allConversations.filter(conv =>
        conv.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.contact_phone?.includes(searchQuery)
      );
    }
    // Sort by last message (descending)
    return [...filtered].sort((a, b) => 
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );
  }, [allConversations, searchQuery]);

  // Selected conversation
  const selectedConv = useMemo(() => 
    conversations.find(c => c.id === selectedConvId), 
    [conversations, selectedConvId]
  );

  // Messages for selected conversation
  const { messages, isLoading: messagesLoading } = useAtendeAIMessages(selectedConvId || undefined);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConv?.contact_phone || !sendMessage) return;
    
    try {
      await sendMessage.mutateAsync({
        to: selectedConv.contact_phone,
        text: newMessage.trim()
      });
      setNewMessage('');
    } catch (e) {
      // Error is handled by the mutation's onError (toast)
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-[380px,1fr] gap-0 h-[650px] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-[#0c0c0c]">
        <div className="border-r border-zinc-100 dark:border-zinc-800 p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
        <div className="flex flex-col items-center justify-center">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[350px,1fr] lg:grid-cols-[380px,1fr] h-[700px] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-[#0c0c0c] shadow-sm">
      
      {/* ─── Sidebar: Contacts List ─── */}
      <div className={cn(
        "flex flex-col border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-black/20",
        selectedConvId ? "hidden md:flex" : "flex"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 space-y-4 border-b border-zinc-100 dark:border-zinc-800 pb-6">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-[#ff7a00] transition-colors" />
            <Input
              placeholder="Buscar conversa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus-visible:ring-[#ff7a00]/20"
            />
          </div>
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <MessageCircle className="h-3 w-3" />
              Conversas Recentes
            </p>
            <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-400">
              <span>{conversations.length} total</span>
              <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span className="text-emerald-500">{conversations.filter(c => c.status === 'open').length} abertas</span>
            </div>
          </div>
        </div>

        {/* List of Conversations */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <MessageSquare className="h-10 w-10 text-zinc-200 dark:text-zinc-800 mb-2" />
                <p className="text-xs text-zinc-400">Nenhum contato encontrado</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all relative group",
                    selectedConvId === conv.id 
                      ? "bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800" 
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                      <User className="h-6 w-6 text-zinc-400" />
                    </div>
                    {conv.status === 'open' && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 shadow-sm" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "font-bold text-sm truncate",
                        selectedConvId === conv.id ? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"
                      )}>
                        {conv.contact_name}
                      </p>
                      <span className="text-[10px] text-zinc-400 font-medium shrink-0">
                        {format(new Date(conv.last_message_at), 'HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-zinc-400 truncate pr-4">
                        {conv.contact_phone || 'Sem número'}
                      </p>
                      {conv.waiting_human ? (
                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-500/20">
                          Aguardando
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-0.5 text-zinc-300 dark:text-zinc-700">
                           <CheckCheck className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedConvId === conv.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#ff7a00] rounded-r-full" />
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ─── Main Content: Chat Window ─── */}
      <div className={cn(
        "flex flex-col bg-white dark:bg-[#080808]",
        !selectedConvId ? "hidden md:flex" : "flex"
      )}>
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="h-[72px] px-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-[#0c0c0c]">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedConvId(null)}
                  className="md:hidden h-8 w-8 text-zinc-400"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                  <User className="h-5 w-5 text-zinc-400" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                    {selectedConv.contact_name}
                  </h3>
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-tight">
                    Online
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                  <Clock className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Content */}
            <div className="flex-1 overflow-hidden relative group">
              {/* Subtle background pattern - like WhatsApp */}
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none" 
                   style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cubes.png')` }} />
              
              <div ref={scrollRef} className="h-full overflow-y-auto p-6 scroll-smooth scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <div className="space-y-4 min-h-full flex flex-col justify-end">
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                          <Skeleton className="h-12 w-[240px] rounded-2xl" />
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                      <MessageSquare className="h-12 w-12 mb-3" />
                      <p className="text-sm font-medium">Inicie o chat hoje</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.role === 'assistant';
                      return (
                        <div 
                          key={msg.id || idx} 
                          className={cn(
                            "flex w-full animate-in fade-in duration-300",
                            isMe ? "justify-end" : "justify-start"
                          )}
                        >
                          <div className={cn(
                            "max-w-[85%] md:max-w-[70%] lg:max-w-[60%] px-4 py-2.5 rounded-2xl shadow-sm text-sm relative group/msg",
                            isMe 
                              ? "bg-[#ff7a00] text-white rounded-tr-none" 
                              : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-800 rounded-tl-none"
                          )}>
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <span className={cn(
                              "text-[9px] mt-1 block opacity-60 text-right font-medium",
                              isMe ? "text-white" : "text-zinc-500"
                            )}>
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-6 bg-white dark:bg-[#0c0c0c] border-t border-zinc-100 dark:border-zinc-800">
               <div className="flex items-end gap-3 max-w-5xl mx-auto">
                 <div className="flex shrink-0 gap-1 pb-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-[#ff7a00] hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-xl transition-all">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                 </div>
                 
                 <div className="flex-1 relative">
                    <textarea
                      placeholder="Sua mensagem..."
                      rows={1}
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3 px-5 text-sm outline-none focus:border-[#ff7a00]/50 focus:ring-4 focus:ring-[#ff7a00]/5 transition-all resize-none max-h-[150px] min-h-[46px] block scrollbar-hide"
                    />
                 </div>

                 <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessage?.isPending}
                    className="h-[46px] w-[46px] rounded-2xl bg-[#ff7a00] hover:bg-[#e66e00] text-white shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center shrink-0 active:scale-95"
                 >
                   {sendMessage?.isPending ? (
                     <Circle className="h-4 w-4 animate-pulse fill-white" />
                   ) : (
                     <Send className="h-5 w-5" />
                   )}
                 </Button>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/30 dark:bg-black/20">
             <div className="relative mb-8">
               <div className="w-24 h-24 rounded-3xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-xl border border-zinc-200 dark:border-zinc-800 rotate-6 group-hover:rotate-12 transition-transform duration-500">
                 <MessageSquare className="h-10 w-10 text-[#ff7a00]" />
               </div>
               <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[#ff7a00] flex items-center justify-center shadow-lg text-white -rotate-12">
                 <Send className="h-5 w-5" />
               </div>
             </div>
             <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Central de Atendimento</h3>
             <p className="text-sm text-zinc-500 max-w-[320px] mx-auto leading-relaxed mb-8">
               Selecione uma conversa ao lado para visualizar o histórico de mensagens e responder seus clientes em tempo real.
             </p>
             <div className="flex items-center gap-4 py-3 px-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm animate-pulse">
                <div className="flex -space-x-3">
                   {[...Array(3)].map((_, i) => (
                     <div key={i} className="h-8 w-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <User className="h-4 w-4 text-zinc-400" />
                     </div>
                   ))}
                </div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Aguardando interação</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
