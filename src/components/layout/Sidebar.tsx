import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Kanban,
  UserPlus,
  CheckSquare,
  Sparkles,
  Settings,
  Home,
  Workflow,
  UsersRound
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Funil de Vendas', href: '/app/sales-funnel', icon: Kanban },
  { name: 'Fluxo Operacional', href: '/app/operational-flow', icon: Workflow },
  { name: 'Clientes', href: '/app/clients', icon: Users },
  { name: 'Novo Cliente', href: '/app/new-client', icon: UserPlus },
  { name: 'Checklists', href: '/app/checklists', icon: CheckSquare },
  { name: 'Equipe', href: '/app/team', icon: UsersRound },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-64 flex-col bg-card border-r border-border">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">Q</span>
        </div>
        <span className="font-bold text-xl">Qualify</span>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-1">
        <Link
          to="/app/ai-assistant"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            location.pathname === '/app/ai-assistant'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Sparkles className="h-5 w-5" />
          Assistente IA
        </Link>
        <Link
          to="/app/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Settings className="h-5 w-5" />
          Configurações
        </Link>
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Home className="h-5 w-5" />
          Voltar ao Site
        </Link>
      </div>
    </div>
  );
}
