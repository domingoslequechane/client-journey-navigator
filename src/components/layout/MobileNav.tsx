import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Kanban,
  Sparkles,
  Settings
} from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/app', icon: LayoutDashboard },
  { name: 'Funil', href: '/app/sales-funnel', icon: Kanban },
  { name: 'Clientes', href: '/app/clients', icon: Users },
  { name: 'IA', href: '/app/ai-assistant', icon: Sparkles },
  { name: 'Config', href: '/app/settings', icon: Settings },
];

export function MobileNav() {
  const location = useLocation();

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
