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
    <div className={cn('p-6 rounded-xl border transition-all hover:shadow-lg', variantStyles[variant], className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {trend && (
            <div className="flex items-center gap-1.5">
              {trend.isPositive ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              <span className={cn('text-sm font-medium', trend.isPositive ? 'text-success' : 'text-destructive')}>+{trend.value}%</span>
              {trend.label && <span className="text-sm text-muted-foreground">{trend.label}</span>}
            </div>
          )}
        </div>
        <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', iconVariantStyles[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
