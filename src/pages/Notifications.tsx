import { useState, useEffect } from 'react';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, MessageSquare, CheckCheck, Send, X, RotateCcw, MessageSquareHeart, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  feedback_id: string | null;
  isRead: boolean;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

interface SupportMessage {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  sender_id: string;
}

interface UserFeedback {
  id: string;
  type: string;
  subject: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const feedbackTypes = [
  { value: 'general', label: 'Geral' },
  { value: 'bug', label: 'Reportar Bug' },
  { value: 'feature', label: 'Sugestão de Funcionalidade' },
  { value: 'support', label: 'Suporte Técnico' },
];

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  
  // Feedback state
  const [userFeedbacks, setUserFeedbacks] = useState<UserFeedback[]>([]);
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchTickets();
      fetchUserFeedbacks();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      
      // Subscribe to realtime messages
      const channel = supabase
        .channel(`ticket-${selectedTicket.id}`)
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

  const fetchNotifications = async () => {
    try {
      // Fetch notifications based on user type
      const { data: notifs, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch read status
      const { data: reads } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', user?.id);

      const readIds = new Set(reads?.map(r => r.notification_id) || []);

      setNotifications(
        (notifs || []).map(n => ({
          ...n,
          isRead: readIds.has(n.id)
        }))
      );
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
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

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notification_reads')
        .upsert({
          notification_id: notificationId,
          user_id: user?.id
        });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      const inserts = unreadIds.map(id => ({
        notification_id: id,
        user_id: user?.id
      }));

      await supabase.from('notification_reads').upsert(inserts);

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('Todas as notificações marcadas como lidas');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const createTicket = async () => {
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) {
      toast.error('Preencha o assunto e a mensagem');
      return;
    }

    setCreatingTicket(true);
    try {
      // Get organization_id from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user?.id)
        .single();

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id,
          organization_id: profileData?.organization_id,
          subject: newTicketSubject.trim()
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create first message
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user?.id,
          message: newTicketMessage.trim(),
          is_admin: false
        });

      if (messageError) throw messageError;

      toast.success('Ticket de suporte criado com sucesso');
      setNewTicketSubject('');
      setNewTicketMessage('');
      setShowNewTicketForm(false);
      fetchTickets();
      setSelectedTicket(ticket);
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Erro ao criar ticket');
    } finally {
      setCreatingTicket(false);
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
          is_admin: false
        });

      if (error) throw error;
      setNewMessage('');
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

  const submitFeedback = async () => {
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      toast.error('Preencha o assunto e a mensagem');
      return;
    }

    setSendingFeedback(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user?.id)
        .single();

      const { error } = await supabase.from('feedbacks').insert({
        user_id: user?.id,
        user_email: user?.email,
        organization_id: profileData?.organization_id,
        type: feedbackType,
        subject: feedbackSubject.trim(),
        message: feedbackMessage.trim(),
      });

      if (error) throw error;

      toast.success('Feedback enviado com sucesso!');
      setFeedbackType('general');
      setFeedbackSubject('');
      setFeedbackMessage('');
      fetchUserFeedbacks();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Erro ao enviar feedback');
    } finally {
      setSendingFeedback(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pendente' },
      reviewed: { variant: 'outline', label: 'Em Análise' },
      resolved: { variant: 'default', label: 'Resolvido' },
    };
    const s = statuses[status] || statuses.pending;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const openTickets = tickets.filter(t => t.status === 'open');
  const closedTickets = tickets.filter(t => t.status === 'closed');

  return (
    <div className="p-4 md:p-6 space-y-6">
      <AnimatedContainer animation="fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Notificações</h1>
            <p className="text-muted-foreground">Mensagens e suporte técnico</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </AnimatedContainer>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notifications" className="relative">
            Notificações
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="feedback">
            Feedback
          </TabsTrigger>
          <TabsTrigger value="support" className="relative">
            Suporte
            {openTickets.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {openTickets.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <AnimatedContainer animation="fade-up" delay={0.1}>
            {loading ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Carregando...
                </CardContent>
              </Card>
            ) : notifications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma notificação</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification, index) => (
                  <AnimatedContainer key={notification.id} animation="fade-up" delay={0.05 * index}>
                    <Card 
                      className={`cursor-pointer transition-colors ${!notification.isRead ? 'border-primary/50 bg-primary/5' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-full ${!notification.isRead ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Bell className={`h-4 w-4 ${!notification.isRead ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{notification.title}</h4>
                              {!notification.isRead && (
                                <Badge variant="default" className="text-xs">Nova</Badge>
                              )}
                              <Badge variant="outline" className="text-xs capitalize">
                                {notification.type === 'general' ? 'Geral' : 
                                 notification.type === 'admin_only' ? 'Administradores' : 'Pessoal'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(notification.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedContainer>
                ))}
              </div>
            )}
          </AnimatedContainer>
        </TabsContent>

        <TabsContent value="feedback">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Send Feedback Form */}
            <AnimatedContainer animation="fade-up" delay={0.1}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquareHeart className="h-5 w-5" />
                    Enviar Feedback
                  </CardTitle>
                  <CardDescription>
                    Compartilhe sua opinião, reporte problemas ou sugira melhorias
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Feedback</Label>
                    <Select value={feedbackType} onValueChange={setFeedbackType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {feedbackTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Assunto</Label>
                    <Input
                      value={feedbackSubject}
                      onChange={(e) => setFeedbackSubject(e.target.value)}
                      placeholder="Resumo do seu feedback"
                      maxLength={200}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem</Label>
                    <Textarea
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Descreva seu feedback em detalhes..."
                      rows={5}
                      maxLength={2000}
                    />
                  </div>

                  <Button 
                    onClick={submitFeedback} 
                    disabled={sendingFeedback} 
                    className="w-full"
                  >
                    {sendingFeedback && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar Feedback
                  </Button>
                </CardContent>
              </Card>
            </AnimatedContainer>

            {/* Previous Feedbacks */}
            <AnimatedContainer animation="fade-up" delay={0.2}>
              <Card>
                <CardHeader>
                  <CardTitle>Seus Feedbacks</CardTitle>
                  <CardDescription>
                    Acompanhe o status dos feedbacks enviados
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    {userFeedbacks.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">
                        <MessageSquareHeart className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Nenhum feedback enviado</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {userFeedbacks.map(fb => (
                          <div key={fb.id} className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{fb.subject}</span>
                              {getStatusBadge(fb.status)}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{fb.message}</p>
                            {fb.admin_notes && (
                              <div className="bg-muted p-2 rounded text-sm">
                                <span className="font-medium">Resposta: </span>
                                {fb.admin_notes}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(fb.created_at), "dd/MM/yyyy 'às' HH:mm")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </AnimatedContainer>
          </div>
        </TabsContent>

        <TabsContent value="support">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Tickets List */}
            <AnimatedContainer animation="fade-up" delay={0.1}>
              <Card className="md:col-span-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Tickets</CardTitle>
                    <Button size="sm" onClick={() => setShowNewTicketForm(true)}>
                      Novo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    {tickets.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Nenhum ticket</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {tickets.map(ticket => (
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
                            <p className="text-xs text-muted-foreground">
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
            <AnimatedContainer animation="fade-up" delay={0.2} className="md:col-span-2">
              <Card className="h-[500px] flex flex-col">
                {showNewTicketForm ? (
                  <>
                    <CardHeader className="pb-3 border-b">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Novo Ticket</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setShowNewTicketForm(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 space-y-4">
                      <div>
                        <label className="text-sm font-medium">Assunto</label>
                        <Input
                          value={newTicketSubject}
                          onChange={(e) => setNewTicketSubject(e.target.value)}
                          placeholder="Descreva brevemente o problema"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium">Mensagem</label>
                        <textarea
                          value={newTicketMessage}
                          onChange={(e) => setNewTicketMessage(e.target.value)}
                          placeholder="Descreva seu problema em detalhes..."
                          className="w-full h-40 mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <Button onClick={createTicket} disabled={creatingTicket} className="w-full">
                        {creatingTicket ? 'Criando...' : 'Criar Ticket'}
                      </Button>
                    </CardContent>
                  </>
                ) : selectedTicket ? (
                  <>
                    <CardHeader className="pb-3 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                          <CardDescription>
                            {selectedTicket.status === 'open' ? 'Ticket aberto' : 'Ticket fechado'}
                          </CardDescription>
                        </div>
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
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                          {messages.map(msg => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                  msg.sender_id === user?.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm">{msg.message}</p>
                                <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                  {msg.is_admin ? 'Suporte' : 'Você'} • {format(new Date(msg.created_at), 'HH:mm')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      {selectedTicket.status === 'open' && (
                        <div className="p-4 border-t">
                          <div className="flex gap-2">
                            <Input
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Digite sua mensagem..."
                              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            />
                            <Button onClick={sendMessage} disabled={sendingMessage || !newMessage.trim()}>
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="flex-1 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                      <p>Selecione um ticket ou crie um novo</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </AnimatedContainer>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}