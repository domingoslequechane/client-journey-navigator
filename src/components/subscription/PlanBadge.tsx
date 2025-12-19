import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlanType } from '@/hooks/usePlanLimits';

interface PlanBadgeProps {
  planType: PlanType;
  className?: string;
}

const planConfig: Record<PlanType, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  free: { label: 'Grátis', variant: 'secondary' },
  starter: { label: 'Iniciante', variant: 'outline' },
  pro: { label: 'Pro', variant: 'default' },
  agency: { label: 'Agência', variant: 'default' },
};

export function PlanBadge({ planType, className }: PlanBadgeProps) {
  const config = planConfig[planType];
  
  return (
    <Badge 
      variant={config.variant} 
      className={cn(
        planType === 'agency' && 'bg-gradient-to-r from-primary to-orange-400 text-primary-foreground border-0',
        planType === 'pro' && 'bg-primary text-primary-foreground',
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
