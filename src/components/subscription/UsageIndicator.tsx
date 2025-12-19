import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UsageIndicatorProps {
  current: number;
  max: number | null;
  label: string;
  className?: string;
}

export function UsageIndicator({ current, max, label, className }: UsageIndicatorProps) {
  if (max === null) {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{current} / ∞</span>
        </div>
        <Progress value={0} className="h-2" />
      </div>
    );
  }

  const percentage = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= max;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          'font-medium',
          isAtLimit && 'text-destructive',
          isNearLimit && !isAtLimit && 'text-warning'
        )}>
          {current} / {max}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={cn(
          'h-2',
          isAtLimit && '[&>div]:bg-destructive',
          isNearLimit && !isAtLimit && '[&>div]:bg-warning'
        )} 
      />
    </div>
  );
}
