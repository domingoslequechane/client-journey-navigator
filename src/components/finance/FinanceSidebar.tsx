import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  FolderKanban, 
  Target, 
  FileBarChart 
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/app/finance', icon: LayoutDashboard, key: 'dashboard' },
  { name: 'Lançamentos', href: '/app/finance/transactions', icon: ArrowLeftRight, key: 'transactions' },
  { name: 'Projetos', href: '/app/finance/projects', icon: FolderKanban, key: 'projects' },
  { name: 'Metas', href: '/app/finance/goals', icon: Target, key: 'goals' },
  { name: 'Relatórios', href: '/app/finance/reports', icon: FileBarChart, key: 'reports' },
];

export function FinanceSidebar() {
  const location = useLocation();
  const { t } = useTranslation('finance');

  return (
    <nav className="flex gap-1 overflow-x-auto pb-2 md:pb-0">
      {navigation.map((item) => {
        const isActive = location.pathname === item.href || 
          (item.href === '/app/finance' && location.pathname === '/app/finance');
        
        return (
          <Link
            key={item.key}
            to={item.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
