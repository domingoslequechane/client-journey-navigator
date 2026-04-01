import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Send, 
  LifeBuoy, 
  Search, 
  MessageSquare, 
  Plus, 
  ChevronRight, 
  HeadphonesIcon, 
  Loader2, 
  MoreVertical, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  X,
  Building,
  Building2,
  Info,
  History,
  ThumbsUp,
  MessageSquareHeart,
  Star,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { AnimatedContainer } from "@/components/ui/animated-container";

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  organization_id?: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  message: string;
  sender_id: string;
  is_admin: boolean;
  created_at: string;
}

interface Feedback {
  id: string;
  user_id: string;
  message: string;
  type: string;
  status: string;
  created_at: string;
}

export default function SupportFeedback() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [ticketDraft, setTicketDraft] = useState({ subject: "", message: "" });
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(true);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [userFeedbacks, setUserFeedbacks] = useState<Feedback[]>([]);
  const [activeTab, setActiveTab] = useState("support");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (user) {
      fetchTickets();
      fetchProfileInfo();
      fetchUserFeedbacks();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      
      const channel = supabase
        .channel(`user-ticket-${selectedTicket.id}`)
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

  const fetchProfileInfo = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profile?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', profile.organization_id)
        .single();
      setCompanyName(org?.name || null);
    }
  };

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Erro ao carregar seus tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserFeedbacks(data || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
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

  const createTicket = async () => {
    if (!ticketDraft.subject.trim() || !ticketDraft.message.trim()) return;
    setCreatingTicket(true);
    try {
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          subject: ticketDraft.subject,
          user_id: user?.id,
          status: 'open'
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      const { error: msgError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user?.id,
          message: ticketDraft.message,
          is_admin: false
        });

      if (msgError) throw msgError;

      toast.success('Chamado aberto com sucesso!');
      setTicketDraft({ subject: "", message: "" });
      setShowNewTicketForm(false);
      fetchTickets();
      setSelectedTicket(ticket);
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Erro ao abrir o chamado');
    } finally {
      setCreatingTicket(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user?.id,
          message: newMessage,
          is_admin: false
        });

      if (error) throw error;

      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);

      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    if (!selectedTicket) return;
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'closed' })
        .eq('id', selectedTicket.id);

      if (error) throw error;
      toast.success('Ticket finalizado');
      setSelectedTicket({ ...selectedTicket, status: 'closed' });
      fetchTickets();
    } catch (error) {
      toast.error('Erro ao fechar ticket');
    }
  };

  const reopenTicket = async () => {
    if (!selectedTicket) return;
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'open' })
        .eq('id', selectedTicket.id);

      if (error) throw error;
      toast.success('Ticket reaberto');
      setSelectedTicket({ ...selectedTicket, status: 'open' });
      fetchTickets();
    } catch (error) {
      toast.error('Erro ao reabrir ticket');
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-full flex flex-col bg-background/50 overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <header className="flex items-center justify-between p-4 border-b bg-card/30 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl">
              <LifeBuoy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight">Suporte & Feedback</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">
                Central de Atendimento
              </p>
            </div>
          </div>

          <TabsList className="bg-muted/50 border-none p-1 h-10 rounded-xl">
            <TabsTrigger value="support" className="rounded-lg px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Suporte
            </TabsTrigger>
            <TabsTrigger value="feedback" className="rounded-lg px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Feedback
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-none h-8 px-4 rounded-full font-bold">
              Online
            </Badge>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="support" className="h-full m-0 p-0 border-none">
            <ResizablePanelGroup direction="horizontal">
              {/* TICKETS LIST */}
              <ResizablePanel defaultSize={25} minSize={20} className="bg-card/20 backdrop-blur-md border-r">
                <div className="h-full flex flex-col">
                  <div className="p-6 border-b space-y-4">
                    <Button 
                      onClick={() => setShowNewTicketForm(true)} 
                      className="w-full h-12 rounded-lg gap-2 font-black uppercase text-xs tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/10"
                    >
                      <Plus className="h-4 w-4" />
                      Novo Chamado
                    </Button>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                      <Input placeholder="Buscar chamado..." className="pl-10 h-10 rounded-lg border-none bg-muted/30 focus:bg-muted/50 text-xs font-medium" />
                    </div>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    {loading ? (
                      <div className="p-8 text-center space-y-3 opacity-30">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</span>
                      </div>
                    ) : tickets.length === 0 ? (
                      <div className="p-12 text-center space-y-4 opacity-20">
                        <MessageSquare className="h-10 w-10 mx-auto" />
                        <p className="text-xs font-bold uppercase tracking-wider italic">Nenhum chamado aberto</p>
                      </div>
                    ) : (
                      <div className="p-3 space-y-2">
                        {[...tickets].sort((a, b) => {
                          if (a.status === 'open' && b.status !== 'open') return -1;
                          if (a.status !== 'open' && b.status === 'open') return 1;
                          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                        }).map(ticket => (
                          <div
                            key={ticket.id}
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setShowNewTicketForm(false);
                            }}
                            className={cn(
                              "p-4 rounded-xl cursor-pointer transition-all border-2 group",
                              selectedTicket?.id === ticket.id 
                                ? "bg-primary/[0.08] border-primary/20 shadow-lg shadow-primary/[0.02]" 
                                : "bg-card/40 border-transparent hover:bg-muted/50"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h4 className="text-xs font-black truncate max-w-[150px] tracking-tight">{ticket.subject}</h4>
                              <Badge className={cn(
                                "text-[9px] font-black px-1.5 h-4 border-none shadow-none uppercase",
                                ticket.status === 'open' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                              )}>
                                {ticket.status === 'open' ? 'Ativo' : 'Resolvido'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold opacity-40 uppercase tracking-wider">
                              <span>{format(new Date(ticket.updated_at), 'dd/MM HH:mm')}</span>
                              <ChevronRight className={cn("h-3 w-3 transition-transform", selectedTicket?.id === ticket.id && "translate-x-1")} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* CHAT AREA */}
              <ResizablePanel defaultSize={50} minSize={30}>
                {showNewTicketForm ? (
                  <div className="h-full flex flex-col bg-background">
                    <header className="h-16 px-6 border-b flex items-center justify-between bg-card/20">
                      <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                        <Plus className="h-4 w-4 text-primary" />
                        ABRIR NOVO CHAMADO
                      </h3>
                      <Button variant="ghost" size="icon" onClick={() => setShowNewTicketForm(false)} className="rounded-full h-8 w-8">
                        <X className="h-4 w-4" />
                      </Button>
                    </header>
                    <div className="flex-1 p-8 max-w-2xl mx-auto w-full space-y-8 overflow-y-auto">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Assunto do Chamado</label>
                          <Input 
                            value={ticketDraft.subject}
                            onChange={(e) => setTicketDraft({ ...ticketDraft, subject: e.target.value })}
                            placeholder="Ex: Problema com pagamento, Bug na dashboard..."
                            className="h-12 text-base font-bold rounded-lg border-none bg-muted/40 focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Descrição do Problema</label>
                          <textarea
                            value={ticketDraft.message}
                            onChange={(e) => setTicketDraft({ ...ticketDraft, message: e.target.value })}
                            placeholder="Descreva detalhadamente o que está acontecendo..."
                            className="w-full min-h-[220px] bg-muted/40 border-none rounded-xl p-6 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none font-medium transition-all"
                          />
                        </div>
                      </div>
                      <Button 
                        className="w-full h-14 text-base font-black tracking-widest shadow-2xl shadow-primary/20 rounded-lg mt-4"
                        onClick={createTicket}
                        disabled={creatingTicket || !ticketDraft.subject.trim() || !ticketDraft.message.trim()}
                      >
                        {creatingTicket ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-3" />}
                        ENVIAR CHAMADO AGORA
                      </Button>
                    </div>
                  </div>
                ) : selectedTicket ? (
                  <div className="h-full flex flex-col bg-background">
                    <header className="h-16 px-6 border-b flex items-center justify-between bg-card/20 backdrop-blur-md z-10 shrink-0">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                          <HeadphonesIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm tracking-tight truncate max-w-[300px] leading-none mb-1">{selectedTicket.subject}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider opacity-60">#{selectedTicket.id.substring(0, 8)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn("rounded-full h-9 w-9 transition-all", showUserInfo ? "bg-primary/10 text-primary" : "text-muted-foreground")}
                          onClick={() => setShowUserInfo(!showUserInfo)}
                        >
                          <Info className="h-5 w-5" />
                        </Button>
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        {selectedTicket.status === 'open' ? (
                          <Button variant="outline" size="sm" onClick={closeTicket} className="h-8 font-black uppercase text-[10px] tracking-widest border-green-500/20 text-green-500 hover:bg-green-500/5 rounded-full px-4 transition-all">
                            Resolvido
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={reopenTicket} className="h-8 font-black uppercase text-[10px] tracking-widest rounded-full px-4 hover:bg-primary/5 transition-all">
                            Reabrir
                          </Button>
                        )}
                      </div>
                    </header>

                    <ScrollArea ref={scrollRef} className="flex-1 bg-gradient-to-b from-background to-background/50">
                      <div className="max-w-4xl mx-auto p-8 space-y-10 pb-20">
                        {messages.length > 0 && (
                          <div className="flex justify-center mb-10">
                            <Badge variant="outline" className="bg-muted/30 border-none py-1.5 px-6 rounded-full text-[10px] font-black uppercase tracking-widest opacity-60">
                              Ticket Aberto em {format(new Date(selectedTicket.created_at), "dd 'de' MMMM", { locale: ptBR })}
                            </Badge>
                          </div>
                        )}

                        {messages.map((msg, idx) => (
                          <div 
                            key={msg.id} 
                            className={cn(
                              "flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500",
                              msg.is_admin ? "items-start" : "items-end"
                            )}
                            style={{ animationDelay: `${idx * 40}ms` }}
                          >
                            <div className={cn(
                              "flex gap-3 max-w-[85%] group items-end",
                              msg.is_admin ? "flex-row" : "flex-row-reverse"
                            )}>
                              {msg.is_admin && (
                                <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-lg shrink-0">
                                  <AvatarImage src="/support-avatar.png" />
                                  <AvatarFallback className="bg-primary/5 text-primary text-xs font-black">SP</AvatarFallback>
                                </Avatar>
                              )}
                              
                              <div className={cn(
                                "flex flex-col gap-1.5",
                                msg.is_admin ? "items-start" : "items-end"
                              )}>
                                <div className="flex items-center gap-2 mb-1 px-1">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                    {msg.is_admin ? "SUPORTE QUALIFY" : (user?.user_metadata?.full_name || "CLIENTE")}
                                  </span>
                                  <span className="text-[9px] font-bold text-muted-foreground/30 font-mono">
                                    {format(new Date(msg.created_at), 'HH:mm')}
                                  </span>
                                </div>
                                <div className={cn(
                                  "px-6 py-4 rounded-2xl text-sm leading-relaxed shadow-sm transition-all group-hover:shadow-md",
                                  msg.is_admin 
                                    ? "bg-card border border-primary/5 text-foreground rounded-bl-none" 
                                    : "bg-primary text-primary-foreground rounded-br-none shadow-xl shadow-primary/10"
                                )}>
                                  {msg.message}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} className="h-4" />
                      </div>
                    </ScrollArea>

                    <footer className="p-4 border-t bg-card/10 backdrop-blur-md shrink-0">
                      {selectedTicket.status === 'closed' ? (
                        <div className="flex items-center justify-center h-14 bg-muted/20 rounded-lg border border-dashed border-primary/10">
                          <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
                             Este chamado está finalizado.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 max-w-4xl mx-auto px-4">
                          <Input
                            placeholder="Digite sua resposta aqui..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            className="h-14 border-none shadow-none focus:ring-0 text-sm font-medium bg-transparent placeholder:opacity-50"
                          />
                          <Button 
                            size="icon" 
                            disabled={sending || !newMessage.trim()} 
                            onClick={sendMessage}
                            className="h-12 w-12 rounded-lg shrink-0 shadow-lg shadow-primary/20 transition-all hover:scale-110 active:scale-90"
                          >
                            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                          </Button>
                        </div>
                      )}
                    </footer>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-8 bg-background relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
                    <div className="relative">
                      <div className="w-24 h-24 bg-card rounded-[2rem] shadow-2xl flex items-center justify-center mx-auto border border-primary/5 -rotate-3 transition-transform hover:rotate-0 duration-700">
                        <LifeBuoy className="h-12 w-12 text-primary" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg ring-4 ring-background animate-bounce">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="max-w-xs space-y-3">
                      <h3 className="text-2xl font-black tracking-tight">Atendimento</h3>
                      <p className="text-sm text-muted-foreground font-medium italic leading-relaxed opacity-60">
                        Nossa equipe está pronta para ajudar. Selecione um atendimento ao lado ou comece um novo agora.
                      </p>
                    </div>
                    <Button onClick={() => setShowNewTicketForm(true)} className="h-14 px-8 rounded-lg gap-3 shadow-2xl shadow-primary/10 font-black uppercase tracking-[0.2em] hover:scale-105 transition-transform text-xs">
                      <Plus className="h-5 w-5" />
                      Novo Chamado
                    </Button>
                  </div>
                )}
              </ResizablePanel>

              {/* USER INFO PANEL */}
              {selectedTicket && showUserInfo && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20} className="bg-card/30 backdrop-blur-md border-l overflow-y-auto hidden lg:block">
                    <div className="p-8">
                      <div className="flex flex-col items-center text-center mb-10">
                        <div className="relative mb-6">
                          <Avatar className="h-28 w-28 border-4 border-background ring-8 ring-primary/5 shadow-2xl">
                            <AvatarImage src={user?.user_metadata?.avatar_url} />
                            <AvatarFallback className="text-3xl bg-primary/10 text-primary uppercase font-black">
                              {user?.email?.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 bg-green-500 h-6 w-6 rounded-full border-4 border-background shadow-lg" />
                        </div>
                        
                        <div className="space-y-1.5">
                          <h3 className="font-black text-xl tracking-tight leading-none group cursor-default">
                             {user?.user_metadata?.full_name || 'Seu Nome'}
                          </h3>
                          <p className="text-xs text-muted-foreground font-bold opacity-60 uppercase tracking-widest">{user?.email}</p>
                        </div>

                        {companyName && (
                          <div className="mt-5 flex items-center justify-center gap-2.5 px-5 py-2.5 bg-primary/[0.03] rounded-2xl border border-primary/10 shadow-sm transition-all hover:bg-primary/5 cursor-default">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[11px] font-black text-primary uppercase tracking-widest truncate max-w-[150px]">
                              {companyName}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-10">
                        <div className="bg-background/40 border border-primary/5 rounded-2xl p-4 text-center">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block mb-1">Status</span>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full inline-block",
                            selectedTicket.status === 'open' ? "text-green-500 bg-green-500/5" : "text-muted-foreground bg-muted/20"
                          )}>
                            {selectedTicket.status === 'open' ? 'Em Aberto' : 'Resolvido'}
                          </span>
                        </div>
                        <div className="bg-background/40 border border-primary/5 rounded-2xl p-4 text-center">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block mb-1">Total Tiks</span>
                          <span className="text-xl font-black leading-none italic">{tickets.length}</span>
                        </div>
                      </div>

                      <Separator className="mb-10 opacity-30" />

                      <div className="space-y-10">
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/50 mb-6 flex items-center justify-center gap-2">
                             DETALHES
                          </h4>
                          <div className="space-y-6">
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] ml-1">Assunto Principal</span>
                              <div className="bg-muted/20 p-4 rounded-lg border border-primary/5 text-xs font-bold leading-relaxed shadow-inner">
                                {selectedTicket.subject}
                              </div>
                            </div>
                            <div className="flex items-center justify-between px-1">
                              <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">Criado em</span>
                              <span className="text-xs font-black italic">{format(new Date(selectedTicket.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-primary/10 to-transparent rounded-xl p-6 border border-primary/10 relative overflow-hidden">
                          <Sparkles className="absolute -top-2 -right-2 h-16 w-16 text-primary opacity-[0.03] -rotate-12" />
                          <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-primary/20 p-2 rounded-xl">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                              </div>
                              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">SUPORTE AGÊNCIAS</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic opacity-80">
                              "Nossa prioridade é o seu sucesso. Conte conosco para resolver qualquer obstáculo técnico em sua jornada."
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </TabsContent>

          <TabsContent value="feedback" className="h-full m-0 p-8 overflow-hidden bg-background/30">
            <AnimatedContainer animation="fade-up" className="h-full">
              <div className="grid lg:grid-cols-2 gap-12 h-full max-w-7xl mx-auto">
                <div className="flex flex-col h-full space-y-8">
                  <header>
                    <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 mb-2">
                      <MessageSquareHeart className="h-8 w-8 text-primary" />
                      Seus Feedbacks
                    </h2>
                    <p className="text-sm text-muted-foreground font-medium opacity-60 underline decoration-primary/20 underline-offset-4 decoration-2">Sua opinião molda o futuro de nossa plataforma.</p>
                  </header>
                  
                  <ScrollArea className="flex-1 rounded-2xl border bg-card/20 border-primary/5 p-8 shadow-2xl shadow-primary/[0.02]">
                    {userFeedbacks.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-6">
                        <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center opacity-20">
                          <MessageSquareHeart className="h-12 w-12" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] opacity-20 italic">Aguardando seu primeiro feedback...</p>
                      </div>
                    ) : (
                      <div className="space-y-6 pb-6">
                        {userFeedbacks.map(fb => (
                          <Card key={fb.id} className="border-none bg-background/50 hover:bg-background transition-all duration-500 overflow-hidden group p-8 rounded-xl shadow-sm hover:shadow-2xl hover:shadow-primary/[0.03]">
                            <div className="flex items-center justify-between mb-5">
                              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest h-6 px-4 bg-primary/5 border-none text-primary">
                                {fb.type}
                              </Badge>
                              <Badge className={cn(
                                "border-none h-6 px-4 text-[9px] uppercase font-black tracking-[0.2em] shadow-none",
                                fb.status === 'resolved' ? "bg-green-500/10 text-green-500" : "bg-muted/40 text-muted-foreground"
                              )}>
                                {fb.status === 'resolved' ? 'Resolvido' : 'Em Análise'}
                              </Badge>
                            </div>
                            <p className="text-sm font-bold leading-relaxed text-foreground/80 mb-6 group-hover:text-foreground transition-colors italic">
                              "{fb.message}"
                            </p>
                            <div className="flex items-center gap-2 opacity-30">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">
                                {format(new Date(fb.created_at), "dd 'de' MMMM", { locale: ptBR })}
                              </span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                <div className="flex flex-col justify-center space-y-12 lg:pl-12">
                  <div className="space-y-6 group">
                    <div className="bg-primary/10 w-fit p-4 rounded-xl transition-transform group-hover:rotate-12">
                      <Sparkles className="h-8 w-8 text-primary shadow-2xl" />
                    </div>
                    <div className="space-y-4">
                      <h2 className="text-5xl font-black tracking-tighter leading-[0.9]">MOLDE A<br />PLATAFORMA</h2>
                      <p className="text-muted-foreground font-medium italic opacity-70 border-l-4 border-primary/20 pl-6 py-2">
                        "Cada sugestão, crítica ou elogio é transformado em melhorias reais. Sinta-se parte do nosso desenvolvimento."
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <Button variant="outline" className="h-20 rounded-xl border-2 border-primary/5 flex items-center justify-between px-8 group hover:bg-primary hover:text-primary-foreground hover:border-transparent transition-all duration-500 shadow-xl shadow-transparent hover:shadow-primary/20">
                      <div className="flex items-center gap-5">
                        <div className="bg-primary/5 p-3 rounded-2xl group-hover:bg-white/10">
                          <Star className="h-6 w-6 text-primary group-hover:text-white" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-black text-xs uppercase tracking-widest mb-1">Elogiar</h4>
                          <p className="text-[10px] font-medium opacity-60">Conte o que amou.</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500" />
                    </Button>

                    <Button variant="outline" className="h-20 rounded-xl border-2 border-primary/5 flex items-center justify-between px-8 group hover:bg-primary hover:text-primary-foreground hover:border-transparent transition-all duration-500 shadow-xl shadow-transparent hover:shadow-primary/20">
                      <div className="flex items-center gap-5">
                        <div className="bg-primary/5 p-3 rounded-2xl group-hover:bg-white/10">
                          <Sparkles className="h-6 w-6 text-primary group-hover:text-white" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-black text-xs uppercase tracking-widest mb-1">Sugestão</h4>
                          <p className="text-[10px] font-medium opacity-60">Ideias para o futuro.</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </AnimatedContainer>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
