import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  ArrowLeftRight, 
  FolderKanban, 
  Target, 
  FileBarChart 
} from 'lucide-react';

const navigation = [
  { name: 'Lançamentos', href: '/app/finance', icon: ArrowLeftRight, key: 'transactions' },
  { name: 'Projetos', href: '/app/finance/projects', icon: FolderKanban, key: 'projects' },
  { name: 'Metas', href: '/app/finance/goals', icon: Target, key: 'goals' },
  { name: 'Relatórios', href: '/app/finance/reports', icon: FileBarChart, key: 'reports' },
];

export function FinanceSidebar() {
  const location = useLocation();
  const { t } = useTranslation('finance');

  return (
    <nav className="flex gap-1 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
      {navigation.map((item) => {
        const isActive = item.key === 'transactions' 
          ? (location.pathname === '/app/finance' || location.pathname === '/app/finance/transactions')
          : location.pathname === item.href;
        
        return (
          <Link
            key={item.key}
            to={item.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-w-fit',
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
