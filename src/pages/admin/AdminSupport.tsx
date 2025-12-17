import { useState, useEffect } from 'react';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Send, X, RotateCcw, User, Clock, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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

  useEffect(() => {
    fetchTickets();
    cleanupOldTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      
      // Subscribe to realtime messages
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
            setMessages(prev => [...prev, payload.new as SupportMessage]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    try {
      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch user info for each ticket
      const userIds = [...new Set(ticketsData?.map(t => t.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enrichedTickets = (ticketsData || []).map(ticket => ({
        ...ticket,
        user_email: profileMap.get(ticket.user_id)?.email || 'Desconhecido',
        user_name: profileMap.get(ticket.user_id)?.full_name || 'Usuário'
      }));

      setTickets(enrichedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
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
      // Call the cleanup function
      const { error } = await supabase.rpc('cleanup_old_support_tickets');
      if (error) console.error('Cleanup error:', error);
    } catch (error) {
      console.error('Error cleaning up old tickets:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user?.id,
          message: newMessage.trim(),
          is_admin: true
        });

      if (error) throw error;
      setNewMessage('');
      
      // Update ticket's updated_at
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
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

      toast.success('Ticket fechado');
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

      toast.success('Ticket excluído');
      setSelectedTicket(null);
      fetchTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error('Erro ao excluir ticket');
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filter === 'open') return t.status === 'open';
    if (filter === 'closed') return t.status === 'closed';
    return true;
  });

  const openCount = tickets.filter(t => t.status === 'open').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;

  return (
    <div className="p-6 space-y-6">
      <AnimatedContainer animation="fade-up">
        <div>
          <h1 className="text-3xl font-bold">Suporte Técnico</h1>
          <p className="text-muted-foreground">Gerencie os tickets de suporte dos usuários</p>
        </div>
      </AnimatedContainer>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <AnimatedContainer animation="fade-up" delay={0.1}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{tickets.length}</p>
                  <p className="text-sm text-muted-foreground">Total de Tickets</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer animation="fade-up" delay={0.15}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Clock className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openCount}</p>
                  <p className="text-sm text-muted-foreground">Tickets Abertos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>

        <AnimatedContainer animation="fade-up" delay={0.2}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-muted">
                  <X className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{closedCount}</p>
                  <p className="text-sm text-muted-foreground">Tickets Fechados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Tickets List */}
        <AnimatedContainer animation="fade-up" delay={0.25}>
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tickets</CardTitle>
              <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
                <TabsList className="w-full">
                  <TabsTrigger value="all" className="flex-1">Todos</TabsTrigger>
                  <TabsTrigger value="open" className="flex-1">Abertos</TabsTrigger>
                  <TabsTrigger value="closed" className="flex-1">Fechados</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Carregando...
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Nenhum ticket</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredTickets.map(ticket => (
                      <div
                        key={ticket.id}
                        className={`p-3 cursor-pointer hover:bg-accent transition-colors ${selectedTicket?.id === ticket.id ? 'bg-accent' : ''}`}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate flex-1">{ticket.subject}</span>
                          <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'} className="text-xs ml-2">
                            {ticket.status === 'open' ? 'Aberto' : 'Fechado'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">{ticket.user_name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(ticket.updated_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </AnimatedContainer>

        {/* Chat Area */}
        <AnimatedContainer animation="fade-up" delay={0.3} className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            {selectedTicket ? (
              <>
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {selectedTicket.user_name} ({selectedTicket.user_email})
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {selectedTicket.status === 'open' ? (
                        <Button variant="outline" size="sm" onClick={closeTicket}>
                          <X className="h-4 w-4 mr-1" />
                          Fechar
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={reopenTicket}>
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Reabrir
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Ticket</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O ticket e todas as mensagens serão excluídos permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={deleteTicket}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.is_admin
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{msg.message}</p>
                            <p className={`text-xs mt-1 ${msg.is_admin ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {msg.is_admin ? 'Você (Admin)' : selectedTicket.user_name} • {format(new Date(msg.created_at), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite sua resposta..."
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      />
                      <Button onClick={sendMessage} disabled={sendingMessage || !newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                  <p>Selecione um ticket para visualizar</p>
                </div>
              </CardContent>
            )}
          </Card>
        </AnimatedContainer>
      </div>
    </div>
  );
}