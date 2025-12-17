import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bell, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface NotificationCreatorProps {
  feedbackId?: string;
  targetUserId?: string;
  defaultTitle?: string;
  defaultMessage?: string;
  onSuccess?: () => void;
}

export function NotificationCreator({ 
  feedbackId, 
  targetUserId, 
  defaultTitle = '', 
  defaultMessage = '',
  onSuccess 
}: NotificationCreatorProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [message, setMessage] = useState(defaultMessage);
  const [type, setType] = useState<'general' | 'admin_only' | 'user_specific'>(
    targetUserId ? 'user_specific' : 'general'
  );
  const [selectedUserId, setSelectedUserId] = useState<string>(targetUserId || '');
  const [users, setUsers] = useState<User[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open && type === 'user_specific' && !targetUserId) {
      fetchUsers();
    }
  }, [open, type]);

  useEffect(() => {
    if (targetUserId) {
      setSelectedUserId(targetUserId);
      setType('user_specific');
    }
  }, [targetUserId]);

  useEffect(() => {
    setTitle(defaultTitle);
    setMessage(defaultMessage);
  }, [defaultTitle, defaultMessage]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Preencha o título e a mensagem');
      return;
    }

    if (type === 'user_specific' && !selectedUserId) {
      toast.error('Selecione um usuário');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: title.trim(),
          message: message.trim(),
          type,
          target_user_id: type === 'user_specific' ? selectedUserId : null,
          feedback_id: feedbackId || null,
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Notificação enviada com sucesso');
      setOpen(false);
      setTitle('');
      setMessage('');
      setSelectedUserId('');
      onSuccess?.();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Erro ao enviar notificação');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bell className="h-4 w-4 mr-2" />
          Enviar Notificação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Notificação</DialogTitle>
          <DialogDescription>
            Envie uma notificação para os usuários do sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">Destinatário</Label>
            <Select 
              value={type} 
              onValueChange={(v) => setType(v as any)}
              disabled={!!targetUserId}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Todos os Usuários</SelectItem>
                <SelectItem value="admin_only">Apenas Administradores</SelectItem>
                <SelectItem value="user_specific">Usuário Específico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'user_specific' && !targetUserId && (
            <div className="space-y-2">
              <Label htmlFor="user">Usuário</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email || 'Usuário'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da notificação"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Conteúdo da notificação"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}