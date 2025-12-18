import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Building2,
  Kanban,
  Sparkles,
  Workflow,
  MoreHorizontal,
  GraduationCap,
  Users,
  MessageSquare,
  Bell,
  Settings,
  CreditCard,
  Sun,
  Moon,
  LogOut,
  X
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { canSeeSalesFunnel, canSeeOperationalFlow, canSeeClients, canSeeTeam, isAdmin } = useUserRole();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);

  // Build main navigation based on role permissions
  const navigation = useMemo(() => {
    const items = [
      { name: 'Home', href: '/app', icon: LayoutDashboard, show: true },
    ];

    // Add Sales Funnel if available
    if (canSeeSalesFunnel) {
      items.push({ name: 'Funil', href: '/app/sales-funnel', icon: Kanban, show: true });
    }

    // Always show Operational Flow in main nav if user has access
    if (canSeeOperationalFlow) {
      items.push({ name: 'Fluxo', href: '/app/operational-flow', icon: Workflow, show: true });
    }

    // AI Assistant for everyone
    items.push({ name: 'IA', href: '/app/ai-assistant', icon: Sparkles, show: true });

    return items;
  }, [canSeeSalesFunnel, canSeeOperationalFlow]);

  // Build "More" menu items
  const moreItems = useMemo(() => {
    const items: { name: string; href: string; icon: typeof GraduationCap; show: boolean }[] = [];

    // Add Clients to more menu on mobile
    if (canSeeClients) {
      items.push({ name: 'Clientes', href: '/app/clients', icon: Building2, show: true });
    }

    items.push(
      { name: 'Academia', href: '/app/academia', icon: GraduationCap, show: true },
      { name: 'Notificações', href: '/app/notifications', icon: Bell, show: true },
      { name: 'Suporte', href: '/app/support', icon: MessageSquare, show: true },
    );

    if (canSeeTeam) {
      items.push({ name: 'Equipe', href: '/app/team', icon: Users, show: true });
    }

    if (isAdmin) {
      items.push({ name: 'Configurações', href: '/app/settings', icon: Settings, show: true });
      items.push({ name: 'Assinatura', href: '/app/subscription', icon: CreditCard, show: true });
    }

    return items;
  }, [canSeeTeam, isAdmin, canSeeClients]);

  const handleNavigate = (href: string) => {
    setMoreOpen(false);
    navigate(href);
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    setMoreOpen(false);
    await signOut();
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/app' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
          
          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px] text-muted-foreground"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>

      {/* More Drawer */}
      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle>Menu</DrawerTitle>
            <DrawerClose asChild>
              <button className="p-2 rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </DrawerClose>
          </DrawerHeader>
          
          <div className="px-4 pb-8 space-y-2">
            {/* Navigation items */}
            {moreItems.filter(item => item.show).map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigate(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}

            {/* Divider */}
            <div className="h-px bg-border my-4" />

            {/* Theme toggle */}
            <button
              onClick={handleToggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-muted text-foreground text-left"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              <span className="font-medium">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-destructive/10 text-destructive text-left"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
