import { useState, useEffect, useRef } from 'react';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from '@/components/ui/resizable';
import { 
  MessageSquare, 
  Send, 
  X, 
  RotateCcw, 
  User, 
  Clock, 
  Trash2, 
  Search, 
  Filter,
  MoreVertical,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Building2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closed_by: string | null;
  user_email?: string;
  user_name?: string;
  user_avatar?: string;
  last_message?: string;
  company_name?: string;
}

interface SupportMessage {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  sender_id: string;
}

export default function AdminSupport() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserInfo, setShowUserInfo] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTickets();
    const cleanupInterval = setInterval(cleanupOldTickets, 3600000); // 1 hour
    return () => clearInterval(cleanupInterval);
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      
      const channel = supabase
        .channel(`admin-ticket-${selectedTicket.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages',
            filter: `ticket_id=eq.${selectedTicket.id}`
          },
          (payload) => {
            setMessages(prev => {
              const exists = prev.find(m => m.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new as SupportMessage];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedTicket]);

  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else if (scrollRef.current) {
      const scrollAreaElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollAreaElement) {
        scrollAreaElement.scrollTop = scrollAreaElement.scrollHeight;
      }
    }
  }, [messages]);

  const fetchTickets = async () => {
    try {
      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(ticketsData?.map(t => t.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch organization names
      const orgIds = [...new Set(ticketsData?.map(t => t.organization_id).filter(id => !!id) || [])];
      let orgMap = new Map<string, string>();
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);
        orgMap = new Map(orgs?.map(o => [o.id, o.name]) || []);
      }

      const enrichedTickets = (ticketsData || []).map(ticket => ({
        ...ticket,
        user_email: profileMap.get(ticket.user_id)?.email || 'Desconhecido',
        user_name: profileMap.get(ticket.user_id)?.full_name || 'Usuário',
        user_avatar: profileMap.get(ticket.user_id)?.avatar_url,
        company_name: ticket.organization_id ? orgMap.get(ticket.organization_id) : undefined
      }));

      setTickets(enrichedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Erro ao carregar tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const cleanupOldTickets = async () => {
    try {
      await supabase.rpc('cleanup_old_support_tickets');
    } catch (error) {
      console.error('Error cleaning up tickets:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || sendingMessage) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);

    try {
      // Optimistic update
      const tempId = crypto.randomUUID();
      const optimisticMsg = {
        id: tempId,
        message: messageText,
        is_admin: true,
        created_at: new Date().toISOString(),
        sender_id: user?.id || ''
      };
      setMessages(prev => [...prev, optimisticMsg]);

      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user?.id,
          message: messageText,
          is_admin: true
        });

      if (error) throw error;
      
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);

      fetchTickets(); // Refresh list to update positions
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
      // Revert optimistic update
      setMessages(prev => prev.filter(m => m.message !== messageText));
    } finally {
      setSendingMessage(false);
    }
  };

  const closeTicket = async () => {
    if (!selectedTicket) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user?.id
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      toast.success('Ticket finalizado com sucesso');
      setSelectedTicket(prev => prev ? { ...prev, status: 'closed', closed_at: new Date().toISOString() } : null);
      fetchTickets();
    } catch (error) {
      console.error('Error closing ticket:', error);
      toast.error('Erro ao fechar ticket');
    }
  };

  const reopenTicket = async () => {
    if (!selectedTicket) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: 'open',
          closed_at: null,
          closed_by: null
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      toast.success('Ticket reaberto');
      setSelectedTicket(prev => prev ? { ...prev, status: 'open', closed_at: null } : null);
      fetchTickets();
    } catch (error) {
      console.error('Error reopening ticket:', error);
      toast.error('Erro ao reabrir ticket');
    }
  };

  const deleteTicket = async () => {
    if (!selectedTicket) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', selectedTicket.id);

      if (error) throw error;

      toast.success('Ticket removido');
      setSelectedTicket(null);
      fetchTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error('Erro ao excluir ticket');
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filter === 'open') return t.status === 'open';
    if (filter === 'closed') return t.status === 'closed';
    return true;
  }).sort((a, b) => {
    if (a.status === 'open' && b.status !== 'open') return -1;
    if (a.status !== 'open' && b.status === 'open') return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const getMessageDateHeader = (date: string, nextDate?: string) => {
    const current = new Date(date);
    if (!nextDate) return null;
    const next = new Date(nextDate);
    
    if (isSameDay(current, next)) return null;

    let dateText = format(next, "d 'de' MMMM", { locale: ptBR });
    if (isToday(next)) dateText = 'Hoje';
    else if (isYesterday(next)) dateText = 'Ontem';

    return (
      <div className="flex items-center justify-center my-6">
        <div className="bg-muted px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {dateText}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background/50">
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          
          {/* TICKET LIST PANEL */}
          <ResizablePanel defaultSize={25} minSize={20} className="border-r bg-card/30 backdrop-blur-sm">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Suporte
                  </h2>
                  <Badge variant="outline" className="font-mono">{tickets.length}</Badge>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar tickets..." 
                    className="pl-9 bg-muted/50 border-none transition-all focus:bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
                  {(['all', 'open', 'closed'] as const).map((f) => (
                    <Button 
                      key={f}
                      variant="ghost" 
                      size="sm" 
                      className={`flex-1 capitalize text-xs h-8 ${filter === f ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                      onClick={() => setFilter(f)}
                    >
                      {f === 'all' ? 'Todos' : f === 'open' ? 'Abertos' : 'Finalizados'}
                    </Button>
                  ))}
                </div>
              </div>

              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-muted-foreground">Sincronizando atendimento...</p>
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <div className="bg-muted p-4 rounded-full w-fit mx-auto mb-4">
                      <Search className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium">Nenhum ticket encontrado</p>
                    <p className="text-xs">Tente mudar os filtros de busca</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {filteredTickets.map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`p-4 cursor-pointer transition-all hover:bg-accent/50 relative border-l-2 ${selectedTicket?.id === ticket.id ? 'bg-accent border-l-primary' : 'border-l-transparent'}`}
                      >
                        <div className="flex items-start gap-4">
                          <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                            <AvatarImage src={ticket.user_avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary uppercase">
                              {ticket.user_name?.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="font-semibold text-sm truncate">{ticket.subject}</p>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {format(new Date(ticket.updated_at), 'HH:mm')}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-2">
                              {ticket.user_name}
                            </p>
                            <div className="flex items-center justify-between">
                              <Badge 
                                variant="secondary" 
                                className={`text-[9px] px-1.5 h-4 font-bold uppercase transition-colors ${
                                  ticket.status === 'open' 
                                    ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {ticket.status === 'open' ? 'Aberto' : 'Finalizado'}
                              </Badge>
                              {ticket.status === 'open' && (
                                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* CHAT AREA PANEL */}
          <ResizablePanel defaultSize={50} minSize={30}>
            {selectedTicket ? (
              <div className="h-full flex flex-col bg-background">
                {/* Chat Header */}
                <header className="h-16 px-6 border-b flex items-center justify-between bg-card/20 backdrop-blur-sm z-10">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-9 w-9 border">
                      <AvatarImage src={selectedTicket.user_avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedTicket.user_name?.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-sm leading-none mb-1 capitalize">{selectedTicket.subject}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Atendimento em curso com {selectedTicket.user_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={showUserInfo ? 'text-primary bg-primary/10' : 'text-muted-foreground'}
                      onClick={() => setShowUserInfo(!showUserInfo)}
                    >
                      <Info className="h-5 w-5" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {selectedTicket.status === 'open' ? (
                          <DropdownMenuItem onClick={closeTicket} className="text-green-500">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Finalizar Ticket
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={reopenTicket}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reabrir Ticket
                          </DropdownMenuItem>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive font-medium">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir Histórico
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Ticket Permanentemente?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação removerá o ticket "{selectedTicket.subject}" e todas as mensagens do banco de dados. Esta operação não pode ser revertida.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Voltar</AlertDialogCancel>
                              <AlertDialogAction onClick={deleteTicket} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Confirmar Exclusão
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </header>

                {/* Messages Container */}
                <div 
                  className="flex-1 overflow-y-auto bg-[url('/grid.svg')] bg-repeat"
                >
                  <ScrollArea className="h-full" ref={scrollRef}>
                    <div className="p-6 space-y-6">
                      {/* First Date Header */}
                      {messages.length > 0 && (
                        <div className="flex items-center justify-center mb-6">
                          <div className="bg-muted px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {isToday(new Date(messages[0].created_at)) ? 'Hoje' : format(new Date(messages[0].created_at), "d 'de' MMMM", { locale: ptBR })}
                          </div>
                        </div>
                      )}

                      {messages.map((msg, index) => (
                        <div key={msg.id}>
                          {index > 0 && getMessageDateHeader(messages[index-1].created_at, msg.created_at)}
                          <div className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex items-end gap-2 max-w-[85%] group`}>
                              {!msg.is_admin && (
                                <Avatar className="h-8 w-8 mb-1 border shadow-sm shrink-0">
                                  <AvatarImage src={selectedTicket.user_avatar} />
                                </Avatar>
                              )}
                                  <div className={cn(
                                    "flex flex-col gap-1",
                                    msg.is_admin ? "items-end" : "items-start"
                                  )}>
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                        {msg.is_admin ? "SUPORTE QUALIFY" : (selectedTicket.user_name || "CLIENTE")}
                                      </span>
                                      <span className="text-[9px] font-bold text-muted-foreground/30 font-mono">
                                        {format(new Date(msg.created_at), 'HH:mm')}
                                      </span>
                                    </div>
                                    <div className={`
                                      px-5 py-3.5 rounded-[1.5rem] text-sm shadow-sm transition-all group-hover:shadow-md
                                      ${msg.is_admin 
                                        ? 'bg-primary text-primary-foreground rounded-br-none shadow-xl shadow-primary/10' 
                                        : 'bg-card border border-primary/5 text-foreground rounded-bl-none'}
                                    `}>
                                      <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.message}</p>
                                    </div>
                                  </div>
                              {msg.is_admin && (
                                <Avatar className="h-8 w-8 mb-1 border shadow-sm shrink-0">
                                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                                  <AvatarFallback className="bg-primary text-primary-foreground">AD</AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} className="h-4" />
                    </div>
                  </ScrollArea>
                </div>

                {/* Chat Footer / Input */}
                <footer className="p-6 bg-card/30 backdrop-blur-md border-t">
                  {selectedTicket.status === 'open' ? (
                    <div className="flex flex-col gap-3">
                      <div className="bg-background/80 border rounded-xl shadow-inner focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Digite aqui sua resposta..."
                          className="w-full bg-transparent p-4 min-h-[50px] max-h-[200px] outline-none text-sm resize-none scroll-m-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          style={{ height: 'auto' }}
                          rows={1}
                        />
                        <div className="px-4 py-2 flex items-center justify-between border-t bg-muted/5">
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                            <kbd className="px-1.5 py-0.5 rounded bg-muted border">Enter</kbd> para enviar
                            <span className="mx-1">•</span>
                            <kbd className="px-1.5 py-0.5 rounded bg-muted border">Shift+Enter</kbd> para quebrar linha
                          </div>
                          <Button 
                            onClick={sendMessage} 
                            disabled={sendingMessage || !newMessage.trim()}
                            className="h-10 w-10 p-0 rounded-full shadow-lg shadow-primary/20"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-4 bg-muted/30 rounded-xl border-2 border-dashed border-border/50">
                      <div className="flex flex-col items-center text-center gap-2">
                        <AlertCircle className="h-6 w-6 text-muted-foreground/50" />
                        <p className="text-sm font-medium text-muted-foreground">Este ticket foi finalizado em {selectedTicket.closed_at && format(new Date(selectedTicket.closed_at), "dd/MM/yyyy")}</p>
                        <Button variant="link" onClick={reopenTicket} className="text-primary h-auto p-0 text-xs">
                          Reabrir para responder
                        </Button>
                      </div>
                    </div>
                  )}
                </footer>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-background/50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none" />
                <div className="text-center space-y-6 relative z-10 max-w-sm px-6">
                  <div className="w-24 h-24 bg-card rounded-3xl shadow-xl flex items-center justify-center mx-auto border-2 border-primary/20 rotate-6 group-hover:rotate-0 transition-transform duration-500">
                    <MessageSquare className="h-10 w-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Central de Atendimento</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Selecione um ticket na lista lateral para gerenciar o suporte, visualizar o histórico de mensagens e responder aos usuários em tempo real.
                    </p>
                  </div>
                  <Badge variant="outline" className="animate-pulse bg-primary/5 border-primary/20 text-primary uppercase text-[10px] tracking-widest px-4 py-1">
                    Aguardando seleção
                  </Badge>
                </div>
              </div>
            )}
          </ResizablePanel>

          {/* USER INFO PANEL (TOGGLEABLE) */}
          {selectedTicket && showUserInfo && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={25} minSize={20} className="bg-card/30 backdrop-blur-sm border-l overflow-y-auto">
                <div className="p-8">
                  <div className="flex flex-col items-center text-center mb-8">
                    <div className="relative mb-4">
                      <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary/20 shadow-2xl">
                        <AvatarImage src={selectedTicket.user_avatar} />
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                          {selectedTicket.user_name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 p-1.5 bg-background rounded-full border shadow-sm">
                        <div className="h-3 w-3 rounded-full bg-green-500 ring-4 ring-green-500/10" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-black text-xl tracking-tight leading-none text-foreground group cursor-default">
                        {selectedTicket.user_name}
                      </h3>
                      <p className="text-xs text-muted-foreground font-bold opacity-60 uppercase tracking-widest break-all">
                        {selectedTicket.user_email}
                      </p>
                    </div>

                    {selectedTicket.company_name && (
                      <div className="mt-5 flex items-center justify-center gap-2.5 px-5 py-2.5 bg-primary/[0.03] rounded-2xl border border-primary/10 shadow-sm transition-all hover:bg-primary/5 cursor-default">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[11px] font-black text-primary uppercase tracking-widest truncate max-w-[150px]">
                          {selectedTicket.company_name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="bg-background/40 border border-primary/5 rounded-2xl p-4 text-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block mb-1">Tickets</span>
                      <span className="text-xl font-black leading-none italic">
                        {tickets.filter(t => t.user_id === selectedTicket.user_id).length}
                      </span>
                    </div>
                    <div className="bg-background/40 border border-primary/5 rounded-2xl p-4 text-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block mb-1">Status</span>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full inline-block",
                        selectedTicket.status === 'open' ? "text-green-500 bg-green-500/5" : "text-muted-foreground bg-muted/20"
                      )}>
                        {selectedTicket.status === 'open' ? 'Aberto' : 'Resolvido'}
                      </span>
                    </div>
                  </div>

                  <Separator className="mb-6" />

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Informações do Ticket
                      </h4>
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted-foreground font-medium">Assunto Original</span>
                          <span className="text-sm font-medium bg-muted/30 p-2 rounded-lg border">{selectedTicket.subject}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted-foreground font-medium">Data de Criação</span>
                          <span className="text-sm font-medium">{format(new Date(selectedTicket.created_at), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted-foreground font-medium">ID do Ticket</span>
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted p-1 px-2 rounded w-fit">{selectedTicket.id}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                        <User className="h-3 w-3" />
                        Outros Tickets do Usuário
                      </h4>
                      <ScrollArea className="h-48 rounded-xl border bg-muted/10">
                        <div className="p-3 space-y-2">
                          {tickets
                            .filter(t => t.user_id === selectedTicket.user_id && t.id !== selectedTicket.id)
                            .map(prevTicket => (
                              <div key={prevTicket.id} className="p-2.5 rounded-lg bg-background border flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedTicket(prevTicket)}>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold truncate mb-0.5">{prevTicket.subject}</p>
                                  <span className="text-[9px] text-muted-foreground">{format(new Date(prevTicket.created_at), "dd/MM/yyyy")}</span>
                                </div>
                                <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                              </div>
                            ))
                          }
                          {tickets.filter(t => t.user_id === selectedTicket.user_id).length <= 1 && (
                            <div className="text-center py-8">
                              <p className="text-[10px] text-muted-foreground italic">Primeiro atendimento deste usuário</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}