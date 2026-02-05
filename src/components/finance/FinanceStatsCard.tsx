import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface FinanceStatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  variant?: 'default' | 'income' | 'expense' | 'balance';
}

export function FinanceStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
}: FinanceStatsCardProps) {
  const variantStyles = {
    default: 'bg-card',
    income: 'bg-emerald-500/10 border-emerald-500/20',
    expense: 'bg-destructive/10 border-destructive/20',
    balance: 'bg-primary/10 border-primary/20',
  };

  const iconStyles = {
    default: 'text-muted-foreground bg-muted',
    income: 'text-emerald-500 bg-emerald-500/20',
    expense: 'text-destructive bg-destructive/20',
    balance: 'text-primary bg-primary/20',
  };

  const valueStyles = {
    default: 'text-foreground',
    income: 'text-emerald-500',
    expense: 'text-destructive',
    balance: 'text-primary',
  };

  return (
    <Card className={cn('transition-all hover:shadow-md', variantStyles[variant])}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn('text-2xl font-bold', valueStyles[variant])}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend !== undefined && (
              <p className={cn(
                'text-xs font-medium',
                trend >= 0 ? 'text-emerald-500' : 'text-destructive'
              )}>
                {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs ano anterior
              </p>
            )}
          </div>
          <div className={cn('p-2 rounded-lg', iconStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
