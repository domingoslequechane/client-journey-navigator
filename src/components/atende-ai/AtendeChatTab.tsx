import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
  CheckCheck,
  Check,
  Video,
  Phone,
  Smile,
  Mic,
  Eraser
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAtendeAIMessages } from '@/hooks/useAtendeAIDetail';
import { supabase } from '@/integrations/supabase/client';
import type { AtendeAIInstance, AtendeAIConversation, AtendeAIMessage } from '@/types';

interface AtendeChatTabProps {
  instance: AtendeAIInstance;
  conversations: AtendeAIConversation[];
  isLoading: boolean;
  sendMessage?: any;
  clearHistory?: any;
}

export function AtendeChatTab({ instance, conversations: allConversations, isLoading, sendMessage, clearHistory }: AtendeChatTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isClearHistoryOpen, setIsClearHistoryOpen] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<AtendeAIMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const knownMsgIds = useRef<Set<string>>(new Set());
  const prevMsgCount = useRef(0);

  const fetchedPics = useRef<Set<string>>(new Set());

  // Handle conversation change and fetch profile pictures if missing
  useEffect(() => {
    setOptimisticMessages([]);
  }, [selectedConvId]);

  // Auto-fetch profile pictures for contacts in the background
  useEffect(() => {
    // Only process up to 10 at a time to avoid rate limits
    const missingPics = allConversations
      .filter(c => c.contact_phone && !c.profile_picture_url && !fetchedPics.current.has(c.id))
      .slice(0, 10);
      
    missingPics.forEach(conv => {
      fetchedPics.current.add(conv.id);
      supabase.functions.invoke('whatsapp-agent-instance', {
        body: {
          action: 'fetch-profile-pic',
          instance_id: instance.id,
          organization_id: instance.organization_id,
          number: conv.contact_phone,
          conversation_id: conv.id
        }
      }).catch(console.error);
    });
  }, [allConversations, instance.id, instance.organization_id]);

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

  // Clear optimistic messages when real messages update and contain our sent message
  useEffect(() => {
    if (messages && optimisticMessages.length > 0) {
      setOptimisticMessages(prev => 
        prev.filter(opt => !messages.some(m => 
          m.content === opt.content && 
          m.role === opt.role &&
          Math.abs(new Date(m.created_at).getTime() - new Date(opt.created_at).getTime()) < 60000
        ))
      );
    }
  }, [messages, optimisticMessages.length]);

  // Ensure messages are sorted chronologically (oldest at top, newest at bottom)
  const displayMessages = useMemo(() => {
    const all = [...(messages || []), ...optimisticMessages];
    return all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, optimisticMessages]);

  // Track which messages are already known (to skip animation on them)
  useEffect(() => {
    // On first load or conversation switch, mark all as known
    if (prevMsgCount.current === 0 && displayMessages.length > 0) {
      displayMessages.forEach(m => knownMsgIds.current.add(m.id));
    }
    prevMsgCount.current = displayMessages.length;
  }, [displayMessages]);

  // Reset known IDs when switching conversations
  useEffect(() => {
    knownMsgIds.current.clear();
    prevMsgCount.current = 0;
  }, [selectedConvId]);

  // Auto-scroll to bottom smoothly
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      // Use smooth scroll only if user is near the bottom already, otherwise jump
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (isNearBottom || prevMsgCount.current <= 1) {
        requestAnimationFrame(() => {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        });
      }
    }
  }, [displayMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConv?.contact_phone || !sendMessage || !selectedConvId) return;
    
    const content = newMessage.trim();
    setNewMessage('');

    // Add optimistic message for instant feedback
    const tempMsg: any = {
      id: `temp-${Date.now()}`,
      content,
      role: 'assistant',
      created_at: new Date().toISOString(),
      status: 'pending'
    };
    
    setOptimisticMessages(prev => [...prev, tempMsg]);
    
    try {
      await sendMessage.mutateAsync({
        to: selectedConv.contact_phone,
        text: content,
        conversationId: selectedConvId
      });
      // Message persisted to DB — remove optimistic version (the real one will arrive via Realtime)
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } catch (e) {
      // Remove on error
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    }
  };
  
  const handleClearHistory = async () => {
    if (!selectedConvId || !clearHistory) return;
    try {
      await clearHistory.mutateAsync(selectedConvId);
      setIsClearHistoryOpen(false);
    } catch (e) {
      // Error handled by toast in mutation
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-[380px,1fr] gap-0 h-full min-h-[600px] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-[#0c0c0c]">
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
    <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] lg:grid-cols-[320px,1fr] h-full border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-[#0c0c0c] shadow-sm">
      
      {/* ─── Sidebar: Contacts List ─── */}
      <div className={cn(
        "flex flex-col min-h-0 border-r border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#0c0c0c]",
        selectedConvId ? "hidden md:flex" : "flex"
      )}>
        {/* Sidebar Header */}
        <div className="p-3 space-y-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Chats</h2>
            <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-400">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 rounded-full">
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 rounded-full">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="relative group px-1 pb-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-[#ff7a00] transition-colors" />
            <Input
              placeholder="Buscar conversa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-[#ff7a00]/30"
            />
          </div>
        </div>

        {/* List of Conversations */}
        <ScrollArea className="flex-1">
          <div className="space-y-0 pb-2 pt-1">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <MessageSquare className="h-10 w-10 text-zinc-200 dark:text-zinc-800 mb-2" />
                <p className="text-xs text-zinc-400">Nenhum contato encontrado</p>
              </div>
            ) : (
              conversations.map((conv, idx) => (
                <div key={conv.id} className="px-2">
                  <button
                    onClick={() => setSelectedConvId(conv.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-2xl transition-all relative group",
                      selectedConvId === conv.id 
                        ? "bg-orange-50 dark:bg-zinc-800/80" 
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    )}
                  >
                    <div className="relative shrink-0">
                      <div className="h-[50px] w-[50px] rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                        {conv.profile_picture_url ? (
                          <img src={conv.profile_picture_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
                        )}
                      </div>
                      {conv.status === 'open' && (
                        <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 shadow-sm" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-left border-b border-zinc-100 dark:border-zinc-800/50 pb-3 pt-1 group-last:border-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={cn(
                          "font-semibold text-[15px] truncate",
                          selectedConvId === conv.id ? "text-zinc-900 dark:text-white" : "text-zinc-800 dark:text-zinc-200"
                        )}>
                          {conv.contact_name}
                        </p>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium shrink-0">
                          {format(new Date(conv.last_message_at), 'HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate pr-4">
                          {conv.contact_phone || 'Sem número'}
                        </p>
                        {conv.waiting_human ? (
                          <Badge variant="outline" className="h-[18px] px-1.5 text-[9px] bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-500/20 font-bold">
                            AGUARDANDO
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-0.5 text-zinc-400">
                             <CheckCheck className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ─── Main Content: Chat Window ─── */}
      <div className={cn(
        "flex flex-col bg-white dark:bg-[#0c0c0c] border-l border-zinc-100 dark:border-zinc-800/50",
        !selectedConvId ? "hidden md:flex" : "flex"
      )}>
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="h-[68px] px-4 md:px-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-[#0c0c0c] z-20 shadow-sm relative">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedConvId(null)}
                  className="md:hidden h-9 w-9 text-zinc-500 -ml-2"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden cursor-pointer">
                  {selectedConv.profile_picture_url ? (
                    <img src={selectedConv.profile_picture_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                  )}
                </div>
                <div className="flex flex-col cursor-pointer">
                  <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white leading-snug">
                    {selectedConv.contact_name}
                  </h3>
                  <p className="text-[12px] text-zinc-500 dark:text-zinc-400 font-medium">
                    {selectedConv.contact_phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 md:gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsClearHistoryOpen(true)}
                  className="h-10 w-10 text-zinc-500 hover:text-red-500 dark:hover:text-red-400 rounded-full transition-colors"
                  title="Limpar histórico"
                >
                  <Eraser className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-full">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages Content */}
            <div className="flex-1 min-h-0 overflow-hidden relative group bg-[#efeae2] dark:bg-[#050505]">
              {/* WhatsApp-style subtle background pattern */}
              <div className="absolute inset-0 opacity-40 dark:opacity-[0.03] pointer-events-none mix-blend-overlay" 
                   style={{ backgroundImage: `url('https://static.whatsapp.net/rsrc.php/v3/yl/r/r_QOD1oP42U.png')`, backgroundRepeat: 'repeat', backgroundSize: '400px' }} />
              
              <div ref={scrollRef} className="absolute inset-0 overflow-y-auto p-5 md:p-8 scroll-smooth scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 z-10 flex flex-col">
                <div className="mt-auto" />
                <div className="flex flex-col pb-2 shrink-0">
                  {messagesLoading && !displayMessages.length ? (
                    <div className="space-y-4 w-full mt-auto">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                          <Skeleton className={cn("h-12 w-[240px]", i % 2 === 0 ? "rounded-r-2xl rounded-bl-2xl rounded-tl-sm" : "rounded-l-2xl rounded-br-2xl rounded-tr-sm")} />
                        </div>
                      ))}
                    </div>
                  ) : displayMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center mt-auto">
                      <div className="bg-[#ff7a00]/10 p-4 rounded-full mb-3">
                        <MessageSquare className="h-8 w-8 text-[#ff7a00]" />
                      </div>
                      <p className="text-[15px] font-medium text-zinc-700 dark:text-zinc-300">Nenhuma mensagem</p>
                      <p className="text-[13px] text-zinc-500 mt-1 max-w-[250px]">Envie uma mensagem para iniciar a conversa com este contato.</p>
                    </div>
                  ) : (
                    <>
                      {/* Optional Date Badge could go here */}
                      <div className="flex justify-center mb-6 mt-auto">
                        <span className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm text-zinc-500 dark:text-zinc-400 text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-sm border border-zinc-200/50 dark:border-zinc-700/50">
                          HOJE
                        </span>
                      </div>

                      {displayMessages.map((msg, idx) => {
                        const isMe = msg.role === 'assistant';
                        const prevMsg = idx > 0 ? displayMessages[idx - 1] : null;
                        
                        const isFirstInGroup = !prevMsg || prevMsg.role !== msg.role;
                        
                        // Spacing between messages
                        const marginTop = isFirstInGroup && idx !== 0 ? "mt-4" : idx === 0 ? "mt-0" : "mt-1.5";

                        // Border radius for tails - standard WhatsApp style
                        let borderRadius = "rounded-[18px]";
                        if (isMe) {
                          borderRadius += isFirstInGroup ? " rounded-tr-sm" : "";
                        } else {
                          borderRadius += isFirstInGroup ? " rounded-tl-sm" : "";
                        }

                        // Check if this message is new (not yet in our known set)
                        const isNewMsg = !knownMsgIds.current.has(msg.id);
                        if (isNewMsg && msg.id) {
                          knownMsgIds.current.add(msg.id);
                        }

                        return (
                          <div 
                            key={msg.id || idx} 
                            className={cn(
                              "flex w-full transition-all",
                              isNewMsg ? "chat-msg-enter" : "",
                              isMe ? "justify-end pl-12 md:pl-20" : "justify-start pr-12 md:pr-20",
                              marginTop
                            )}
                          >
                            <div className={cn(
                              "px-4 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.1)] dark:shadow-none relative group/msg flex flex-col w-fit max-w-[90%] md:max-w-[80%]",
                              isMe 
                                ? "bg-[#ff7a00] text-white" 
                                : "bg-white dark:bg-[#18181b] border dark:border-zinc-800/80 text-[#111b21] dark:text-[#e9edef]",
                              borderRadius
                            )}>
                              {/* Tail SVG simulation for first message in group */}
                              {isFirstInGroup && (
                                <svg 
                                  viewBox="0 0 8 13" 
                                  className={cn(
                                    "absolute top-0 w-2 h-[13px]",
                                    isMe ? "-right-[7px] text-[#ff7a00]" : "-left-[7px] text-white dark:text-[#18181b]"
                                  )}
                                >
                                  {isMe ? (
                                    <path fill="currentColor" d="M8 0L0 0v13c0-2.5 1.5-4 4-6l4-5V0z" />
                                  ) : (
                                    <>
                                      <path fill="currentColor" d="M0 0h8v13C8 10.5 6.5 9 4 7L0 2V0z" />
                                      {/* Add border stroke for dark mode incoming tail if needed */}
                                      <path fill="transparent" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" className="dark:text-zinc-800" d="M0 0h8v13C8 10.5 6.5 9 4 7L0 2V0z" />
                                    </>
                                  )}
                                </svg>
                              )}
                              
                              <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                                <p className="leading-[1.5] whitespace-pre-wrap text-[15px] break-words pt-1">
                                  {msg.content}
                                </p>
                                
                                <div className={cn(
                                  "flex items-center gap-1 self-end ml-auto shrink-0",
                                  isMe ? "text-white/80" : "text-[#687782] dark:text-zinc-500"
                                )}>
                                  <span className="text-[11px] font-medium leading-none">
                                    {format(new Date(msg.created_at), 'HH:mm')}
                                  </span>
                                  {isMe && (
                                    (msg as any).status === 'pending' ? (
                                      <Clock className="h-[11px] w-[11px] text-white/70" />
                                    ) : (msg as any).status === 'sent' ? (
                                      <Check className="h-[14px] w-[14px] -ml-0.5 text-white/90" />
                                    ) : (
                                      <CheckCheck className="h-[14px] w-[14px] -ml-0.5 text-white" />
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-3 bg-zinc-50 dark:bg-[#0c0c0c] z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.02)] dark:shadow-none border-t border-zinc-200/50 dark:border-zinc-800/50">
               <div className="flex items-end gap-2 max-w-5xl mx-auto">
                 <div className="flex shrink-0 gap-1 pb-[3px]">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-full transition-all">
                      <Smile className="h-[22px] w-[22px]" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-full transition-all">
                      <Paperclip className="h-[20px] w-[20px] -rotate-45" />
                    </Button>
                 </div>
                 
                 <div className="flex-1 relative bg-white dark:bg-[#18181b] rounded-3xl border border-zinc-200/80 dark:border-zinc-800 focus-within:ring-1 focus-within:ring-[#ff7a00]/30 transition-shadow">
                    <textarea
                      placeholder="Mensagem"
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
                      className="w-full bg-transparent border-none rounded-3xl py-[11px] px-5 text-[15px] outline-none resize-none max-h-[150px] min-h-[44px] block scrollbar-hide text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-500"
                    />
                 </div>

                 <div className="flex shrink-0 pb-[3px] pl-1">
                   {newMessage.trim() ? (
                     <Button 
                        onClick={handleSendMessage}
                        disabled={sendMessage?.isPending}
                        className="h-[42px] w-[42px] rounded-full bg-[#ff7a00] hover:bg-[#e66e00] text-white shadow-sm disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center shrink-0 active:scale-95"
                     >
                       {sendMessage?.isPending ? (
                         <Circle className="h-5 w-5 animate-pulse fill-white" />
                       ) : (
                         <Send className="h-[18px] w-[18px] ml-0.5" />
                       )}
                     </Button>
                   ) : (
                     <Button variant="ghost" size="icon" className="h-[42px] w-[42px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-full transition-all">
                       <Mic className="h-[22px] w-[22px]" />
                     </Button>
                   )}
                 </div>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50 dark:bg-[#050505]">
             <div className="relative mb-6">
               <div className="w-32 h-32 rounded-full bg-zinc-100 dark:bg-[#0c0c0c] flex items-center justify-center shadow-inner border border-zinc-200/50 dark:border-zinc-800/50">
                 <MessageSquare className="h-12 w-12 text-zinc-300 dark:text-zinc-800" />
               </div>
               <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#ff7a00] flex items-center justify-center shadow-lg text-white">
                 <CheckCheck className="h-5 w-5" />
               </div>
             </div>
             <h3 className="text-2xl font-light text-zinc-900 dark:text-white mb-3">Atendimento ao Cliente</h3>
             <p className="text-[15px] text-zinc-500 max-w-[380px] mx-auto leading-relaxed mb-8">
               Envie e receba mensagens dos seus clientes diretamente por aqui. Selecione um contato na lista para iniciar.
             </p>
             <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-600 text-sm font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sincronizado com WhatsApp
             </div>
          </div>
        )}
      </div>

      {/* ─── Clear History Confirmation ─── */}
      <AlertDialog open={isClearHistoryOpen} onOpenChange={setIsClearHistoryOpen}>
        <AlertDialogContent className="bg-white dark:bg-[#0c0c0c] border-zinc-200 dark:border-zinc-800 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Eraser className="h-5 w-5 text-red-500" />
              Limpar histórico de conversa?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] text-zinc-500 dark:text-zinc-400 pt-2">
              Isso apagará permanentemente todas as mensagens enviadas e recebidas para o contato <strong>{selectedConv?.contact_name}</strong>. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-xl border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearHistory}
              disabled={clearHistory?.isPending}
              className="rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {clearHistory?.isPending ? 'Limpando...' : 'Sim, limpar histórico'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

