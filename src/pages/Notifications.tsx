import { useState, useEffect } from 'react';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
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

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      // Fetch notifications - RLS should handle visibility but we also filter client-side
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

      // Client-side filter to ensure users only see their notifications
      // General: visible to all
      // User-specific: only if target_user_id matches current user
      // Admin-only: only visible to organization admins (handled by RLS)
      const filteredNotifs = (notifs || []).filter(n => {
        if (n.type === 'general') return true;
        if (n.type === 'user_specific') return n.target_user_id === user?.id;
        if (n.type === 'admin_only') return true; // RLS handles this
        return false;
      });

      setNotifications(
        filteredNotifs.map(n => ({
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

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <AnimatedContainer animation="fade-up" className="mb-4">
        <div className="flex items-center justify-between">
          <div className="hidden md:block">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Bell className="h-7 w-7 md:h-8 md:w-8 text-primary" />
              Notificações
            </h1>
            <p className="text-muted-foreground">Avisos e comunicados do sistema</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="fade-up" delay={0.1}>
        {notifications.length === 0 ? (
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
    </div>
  );
}
