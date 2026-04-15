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
  Menu,
  X,
  Newspaper,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AdminAIChat } from './AdminAIChat';
import { ScrollToTop } from '@/components/ScrollToTop';

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
  { name: 'Assinaturas', href: '/admin/subscriptions', icon: CreditCard, badgeKey: 'transfers' },
  { name: 'Feedbacks', href: '/admin/feedbacks', icon: MessageSquare, badgeKey: 'feedbacks' },
  { name: 'Suporte', href: '/admin/support', icon: HeadphonesIcon, badgeKey: 'tickets' },
  { name: 'Insights', href: '/admin/insights', icon: Newspaper },
  { name: 'Configurações', href: '/admin/settings', icon: Settings },
];

// Bottom tab items (most important 4 for mobile quick access)
const bottomNavItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Assinaturas', href: '/admin/subscriptions', icon: CreditCard, badgeKey: 'transfers' },
  { name: 'Suporte', href: '/admin/support', icon: HeadphonesIcon, badgeKey: 'tickets' },
  { name: 'Agências', href: '/admin/agencies', icon: Building2 },
  { name: 'Insights', href: '/admin/insights', icon: Newspaper },
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({ feedbacks: 0, tickets: 0, transfers: 0 });
  const navRef = useRef<HTMLElement>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Close drawer on navigation
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileDrawerOpen]);

  // PWA Install Logic
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstalled(false);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      toast.success('App instalado com sucesso!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleScroll = () => {
    if (navRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = navRef.current;
      setShowScrollIndicator(scrollHeight > clientHeight && scrollTop + clientHeight < scrollHeight - 5);
    }
  };

  const fetchBadges = async () => {
    const [{ count: feedbacks }, { count: tickets }, { count: transfers }] = await Promise.all([
      (supabase as any).from('feedbacks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      (supabase as any).from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      (supabase as any).from('manual_payment_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    setBadges({ feedbacks: feedbacks || 0, tickets: tickets || 0, transfers: transfers || 0 });
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
    const channel = (supabase as any)
      .channel('admin-support-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: 'is_admin=eq.false' },
        async (payload: any) => {
          const soundEnabled = localStorage.getItem('admin-sound-enabled') !== 'false';
          const notificationsEnabled = localStorage.getItem('admin-notifications-enabled') !== 'false';
          if (soundEnabled) {
            const audio = new Audio('/universfield-notification.mp3');
            audio.play().catch(e => console.log('Audio play failed:', e));
          }
          if (notificationsEnabled) {
            toast.info('Nova mensagem de suporte recebida!', {
              description: payload.new.message?.substring(0, 50) + '...',
              action: { label: 'Ver', onClick: () => navigate('/admin/support') }
            });
          }
          fetchBadges();
        }
      ).subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, []);

  useEffect(() => {
    const paymentChannel = (supabase as any)
      .channel('admin-payments-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'manual_payment_requests' },
        async (payload: any) => {
          const soundEnabled = localStorage.getItem('admin-sound-enabled') !== 'false';
          const notificationsEnabled = localStorage.getItem('admin-notifications-enabled') !== 'false';
          if (soundEnabled) {
            const audio = new Audio('/universfield-notification.mp3');
            audio.play().catch(e => console.log('Audio play failed:', e));
          }
          if (notificationsEnabled) {
            toast.info('Novo Comprovativo de Pagamento!', {
              description: `A agência enviou um comprovativo no valor de $${payload.new.amount_usd}. Clique para rever.`,
              action: { label: 'Rever', onClick: () => navigate('/admin/subscriptions') }
            });
          }
          fetchBadges();
        }
      ).subscribe();
    return () => { (supabase as any).removeChannel(paymentChannel); };
  }, []);

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p>
          <Button asChild><Link to="/app">Voltar ao App</Link></Button>
        </div>
      </div>
    );
  }

  // Desktop NavItem component
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

  const totalBadges = Object.values(badges).reduce((a, b) => a + b, 0);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="bg-background font-sans min-h-screen relative">
        <ScrollToTop />
        {/* Mobile Header (Floating) */}
        <div className={cn(
          "fixed top-3 left-1/2 -translate-x-1/2 z-[200] md:hidden w-[calc(100%-2rem)] max-w-lg transition-all duration-300 border rounded-2xl flex flex-col overflow-hidden",
          mobileDrawerOpen ? "shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl" : "shadow-xl border-primary/20 bg-primary backdrop-blur-lg"
        )}>
          <div className={cn(
            "flex items-center justify-between py-2 px-4 w-full transition-colors",
            mobileDrawerOpen ? "bg-primary text-primary-foreground" : "text-primary-foreground"
          )}>
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-white flex items-center justify-center shrink-0">
                <span className="text-primary font-extrabold text-base">Q</span>
              </div>
              <span className="font-bold text-lg whitespace-nowrap">Qualify - Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle variant="ghost" size="icon" className="h-9 w-9 text-current hover:bg-black/10 hover:text-white" />
              <button
                onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                className="relative h-9 w-9 flex items-center justify-center rounded-lg text-current hover:bg-black/10 hover:text-white transition-colors"
                aria-label="Abrir menu"
              >
                {mobileDrawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                {totalBadges > 0 && !mobileDrawerOpen && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow">
                    {totalBadges > 9 ? '9+' : totalBadges}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile Navigation Dropdown */}
          {mobileDrawerOpen && (
            <div className="w-full bg-transparent animate-in slide-in-from-top-4 duration-300 border-t border-border/10">
              <div className="overflow-y-auto max-h-[70vh] px-2 py-4 space-y-4">
                <nav className="space-y-1">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href ||
                      (item.href !== '/admin' && location.pathname.startsWith(item.href));
                    const badgeCount = item.badgeKey ? badges[item.badgeKey] || 0 : 0;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1">{item.name}</span>
                        {badgeCount > 0 && (
                          <span className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                            isActive ? 'bg-white/20 text-white' : 'bg-destructive/15 text-destructive'
                          )}>
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>

                <div className="pt-4 border-t border-border/50 space-y-1">
                  {!isInstalled && deferredPrompt ? (
                    <button
                      onClick={handleInstallApp}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition-colors text-left"
                    >
                      <Download className="h-5 w-5" />
                      Instalar App
                    </button>
                  ) : (
                    <a
                      href="/"
                      target="_blank"
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      Abrir App
                    </a>
                  )}
                  <Link
                    to="/app"
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
                    onClick={() => setMobileDrawerOpen(false)}
                  >
                    <Download className="h-5 w-5" />
                    Voltar ao App
                  </Link>
                  {user && (
                    <>
                      <p className="px-3 py-2 text-xs text-muted-foreground truncate">{user.email}</p>
                      <button
                        onClick={() => { setMobileDrawerOpen(false); setLogoutDialogOpen(true); }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <LogOut className="h-5 w-5" />
                        Sair
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row min-h-screen w-full">
          {/* ── Desktop Sidebar ───────────────────────────────────────────── */}
          <div className={cn(
            "hidden md:flex h-screen sticky top-0 flex-col bg-card border-r border-border transition-all duration-300 overflow-hidden",
            collapsed ? "w-16" : "w-64"
          )}>
            <div className={cn(
              "flex h-16 items-center gap-2 px-4 border-b border-border shrink-0",
              collapsed && "justify-center px-2"
            )}>
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-bold text-lg">Q</span>
              </div>
              {!collapsed && <span className="font-bold text-xl whitespace-nowrap">Qualify - Admin</span>}
            </div>

            <div className="flex-1 relative flex flex-col overflow-hidden">
              <nav
                ref={navRef}
                onScroll={handleScroll}
                className="flex-1 px-2 py-4 space-y-1 overflow-y-auto"
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
                      <Link to="/app" className="flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all">
                        <Download className="h-5 w-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">Voltar ao App</TooltipContent>
                  </Tooltip>
                ) : (
                  <Link to="/app" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all">
                    <Download className="h-5 w-5" />
                    Voltar ao App
                  </Link>
                )}
              </div>

              {user && (
                <div className={cn("pt-2 border-t border-border mt-2", collapsed && "px-1")}>
                  {!collapsed && (
                    <p className="px-3 py-1 text-xs text-muted-foreground truncate">{user.email}</p>
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

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed(!collapsed)}
                className={cn(
                  "w-full mt-2 text-muted-foreground hover:bg-accent",
                  collapsed ? "justify-center px-2" : "justify-start gap-3 px-3"
                )}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" />Recolher Menu</>}
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col pt-20 md:pt-0 overflow-y-auto">
            {/* Main Content Area */}
            <main className="flex-1 w-full relative px-4 md:px-0 flex flex-col">
              <Outlet />
              <AdminAIChat />
            </main>
          </div>
        </div>

        {/* Global Logout Dialog */}
        <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Saída</DialogTitle>
              <DialogDescription>Tem certeza que deseja sair da sua conta?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleSignOut}>Sair</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
