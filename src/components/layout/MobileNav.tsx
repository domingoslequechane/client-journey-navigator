import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import {
  LayoutDashboard,
  Building2,
  Kanban,
  Sparkles,
  Workflow
} from 'lucide-react';

export function MobileNav() {
  const location = useLocation();
  const { canSeeSalesFunnel, canSeeOperationalFlow, canSeeClients } = useUserRole();

  // Build navigation based on role permissions
  const navigation = useMemo(() => {
    const items = [
      { name: 'Home', href: '/app', icon: LayoutDashboard, show: true },
    ];

    // Add Sales Funnel or Operational Flow based on role
    if (canSeeSalesFunnel) {
      items.push({ name: 'Funil', href: '/app/sales-funnel', icon: Kanban, show: true });
    }
    if (canSeeOperationalFlow && !canSeeSalesFunnel) {
      items.push({ name: 'Fluxo', href: '/app/operational-flow', icon: Workflow, show: true });
    }

    // Clients for sales/admin
    if (canSeeClients) {
      items.push({ name: 'Clientes', href: '/app/clients', icon: Building2, show: true });
    }

    // AI Assistant for everyone
    items.push({ name: 'IA', href: '/app/ai-assistant', icon: Sparkles, show: true });

    return items;
  }, [canSeeSalesFunnel, canSeeOperationalFlow, canSeeClients]);

  return (
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
      </div>
    </nav>
  );
}
