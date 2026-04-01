import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  MessageSquare,
  HeadphonesIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  BarChart2,
  Building2,
  Wallet,
  Download,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AdminAIChat } from './AdminAIChat';

const ADMIN_SIDEBAR_COLLAPSED_KEY = 'qualify-admin-sidebar-collapsed';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Financeiro', href: '/admin/finance', icon: Wallet },
  { name: 'Análise', href: '/admin/analytics', icon: BarChart2 },
  { name: 'Agências', href: '/admin/agencies', icon: Building2 },
  { name: 'Utilizadores', href: '/admin/users', icon: Users },
  { name: 'Assinaturas', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'Feedbacks', href: '/admin/feedbacks', icon: MessageSquare, badgeKey: 'feedbacks' },
  { name: 'Suporte', href: '/admin/support', icon: HeadphonesIcon, badgeKey: 'tickets' },
  { name: 'Configurações', href: '/admin/settings', icon: Settings },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isInternalAdmin, isLoading: permissionsLoading } = usePermissions();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({ feedbacks: 0, tickets: 0 });
  const navRef = useRef<HTMLElement>(null);

  const handleScroll = () => {
    if (navRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = navRef.current;
      setShowScrollIndicator(scrollHeight > clientHeight && scrollTop + clientHeight < scrollHeight - 5);
    }
  };

  // Fetch badge counts
  const fetchBadges = async () => {
    const [{ count: feedbacks }, { count: tickets }] = await Promise.all([
      supabase.from('feedbacks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ]);
    setBadges({ feedbacks: feedbacks || 0, tickets: tickets || 0 });
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    const timeoutId = setTimeout(handleScroll, 350);
    return () => {
      window.removeEventListener('resize', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    fetchBadges();
    // Refresh badges every 30 seconds
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setLogoutDialogOpen(false);
    navigate('/auth');
  };

  // Real-time listener for support messages
  useEffect(() => {
    const channel = supabase
      .channel('admin-support-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: 'is_admin=eq.false'
        },
        async (payload) => {
          const soundEnabled = localStorage.getItem('admin-sound-enabled') !== 'false';
          const notificationsEnabled = localStorage.getItem('admin-notifications-enabled') !== 'false';

          if (soundEnabled) {
            const audio = new Audio('/universfield-notification.mp3');
            audio.play().catch(e => console.log('Audio play failed:', e));
          }

          if (notificationsEnabled) {
            toast.info('Nova mensagem de suporte recebida!', {
              description: payload.new.message?.substring(0, 50) + '...',
              action: {
                label: 'Ver',
                onClick: () => navigate('/admin/support')
              }
            });
          }
          
          // Refresh badges to show new unread
          fetchBadges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  console.log('AdminLayout: State', { isInternalAdmin, permissionsLoading, userId: user?.id });

  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-48 mx-auto" />
          <p className="text-sm text-muted-foreground animate-pulse">Verificando credenciais de admin...</p>
        </div>
      </div>
    );
  }

  if (!isInternalAdmin) {
    console.warn('AdminLayout: Access Denied', { role: user?.email, isInternalAdmin });
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta área.
          </p>
          <Button asChild>
            <Link to="/app">Voltar ao App</Link>
          </Button>
        </div>
      </div>
    );
  }

  const NavItem = ({ item, isActive }: { item: typeof navigation[0]; isActive: boolean }) => {
    const badgeCount = item.badgeKey ? badges[item.badgeKey] || 0 : 0;
    const content = (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="relative shrink-0">
          <item.icon className="h-5 w-5" />
          {collapsed && badgeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 flex items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white">
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </div>
        {!collapsed && (
          <>
            <span className="flex-1">{item.name}</span>
            {badgeCount > 0 && (
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                isActive ? 'bg-white/20 text-white' : 'bg-destructive/15 text-destructive'
              )}>
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">{item.name}</TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Sidebar */}
        <div className={cn(
          "flex h-screen flex-col bg-card border-r border-border transition-all duration-300 overflow-hidden",
          collapsed ? "w-16" : "w-64"
        )}>
          <div className={cn(
            "flex h-16 items-center gap-2 px-4 border-b border-border shrink-0",
            collapsed && "justify-center px-2"
          )}>
            <div className="h-8 w-8 rounded-lg bg-destructive flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-destructive-foreground" />
            </div>
            {!collapsed && <span className="font-bold text-xl">Admin</span>}
          </div>
          
          <div className="flex-1 relative flex flex-col overflow-hidden">
            <nav
              ref={navRef}
              onScroll={handleScroll}
              className="flex-1 px-2 py-4 space-y-1 overflow-y-auto custom-scrollbar"
            >
              {navigation.map((item) => {
                const isActive = location.pathname === item.href ||
                  (item.href !== '/admin' && location.pathname.startsWith(item.href));
                return <NavItem key={item.name} item={item} isActive={isActive} />;
              })}
            </nav>
            {showScrollIndicator && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none flex items-end justify-center pb-2">
                <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce" />
              </div>
            )}
          </div>

          <div className="p-2 border-t border-border space-y-1 shrink-0">
            {/* Theme Toggle & Install App */}
            <div className={cn("flex flex-col gap-1", collapsed && "items-center")}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full flex justify-center">
                      <ThemeToggle variant="ghost" size="icon" className="h-10 w-10" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">Alternar Tema</TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-3 px-3 py-1">
                  <ThemeToggle />
                  <span className="text-sm font-medium text-muted-foreground">Alternar Tema</span>
                </div>
              )}

              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/app"
                      className="flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
                    >
                      <Download className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">Instalar App</TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  to="/app"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
                >
                  <Download className="h-5 w-5" />
                  Instalar App
                </Link>
              )}
            </div>

            {user && (
              <div className={cn("pt-2 border-t border-border mt-2", collapsed && "px-1")}>
                {!collapsed && (
                  <p className="px-3 py-1 text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                )}
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-center px-2 py-2.5 h-auto text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setLogoutDialogOpen(true)}
                      >
                        <LogOut className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Sair</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 px-3 py-2.5 h-auto text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setLogoutDialogOpen(true)}
                  >
                    <LogOut className="h-5 w-5" />
                    Sair
                  </Button>
                )}
              </div>
            )}

            {/* Logout Confirmation Dialog */}
            <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar Saída</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja sair da sua conta?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleSignOut}>
                    Sair
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "w-full mt-2 text-muted-foreground hover:bg-accent",
                collapsed ? "justify-center px-2" : "justify-start gap-3 px-3"
              )}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  Recolher Menu
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative">
          <Outlet />
          
          {/* Assistente de IA Especialista para Admin */}
          <AdminAIChat />
        </main>
      </div>
    </TooltipProvider>
  );
}
