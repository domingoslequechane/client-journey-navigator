import { cn } from '@/lib/utils';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  variant?: 'default' | 'info' | 'success' | 'warning' | 'primary';
  className?: string;
}

const variantStyles = {
  default: 'bg-card border-border',
  info: 'bg-info/10 border-info/20',
  success: 'bg-success/10 border-success/20',
  warning: 'bg-warning/10 border-warning/20',
  primary: 'bg-primary/10 border-primary/20',
};

const iconVariantStyles = {
  default: 'bg-muted text-muted-foreground',
  info: 'bg-info/20 text-info',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  primary: 'bg-primary/20 text-primary',
};

export function StatsCard({ title, value, description, icon: Icon, trend, variant = 'default', className }: StatsCardProps) {
  return (
    <div className={cn('p-3 md:p-6 rounded-xl border transition-all hover:shadow-lg', variantStyles[variant], className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 md:space-y-2 min-w-0">
          <p className="text-xs md:text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-xl md:text-3xl font-bold">{value}</p>
          {description && <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">{description}</p>}
          {trend && (
            <div className="flex items-center gap-1.5">
              {trend.isPositive ? <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-success" /> : <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-destructive" />}
              <span className={cn('text-xs md:text-sm font-medium', trend.isPositive ? 'text-success' : 'text-destructive')}>+{trend.value}%</span>
              {trend.label && <span className="text-xs md:text-sm text-muted-foreground hidden sm:inline">{trend.label}</span>}
            </div>
          )}
        </div>
        <div className={cn('h-8 w-8 md:h-12 md:w-12 rounded-lg md:rounded-xl flex items-center justify-center shrink-0', iconVariantStyles[variant])}>
          <Icon className="h-4 w-4 md:h-6 md:w-6" />
        </div>
      </div>
    </div>
  );
}
