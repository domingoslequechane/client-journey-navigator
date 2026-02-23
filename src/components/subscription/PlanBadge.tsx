import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlanType } from '@/hooks/usePlanLimits';

interface PlanBadgeProps {
  planType: PlanType;
  className?: string;
}

const planConfig: Record<PlanType, { label: string; codename: string; color: string; bgColor: string }> = {
  free: { 
    label: 'Legado', 
    codename: 'Legado',
    color: 'hsl(142, 71%, 35%)',
    bgColor: 'hsl(142, 71%, 45%, 0.15)',
  },
  starter: { 
    label: 'Iniciante', 
    codename: 'Lança',
    color: 'hsl(217, 91%, 50%)',
    bgColor: 'hsl(217, 91%, 60%, 0.15)',
  },
  pro: { 
    label: 'Pro', 
    codename: 'Arco',
    color: 'hsl(270, 91%, 55%)',
    bgColor: 'hsl(270, 91%, 65%, 0.15)',
  },
  agency: { 
    label: 'Agência', 
    codename: 'Catapulta',
    color: 'hsl(25, 95%, 43%)',
    bgColor: 'hsl(25, 95%, 53%, 0.15)',
  },
};

export function PlanBadge({ planType, className }: PlanBadgeProps) {
  const config = planConfig[planType];
  
  return (
    <Badge 
      variant="outline" 
      className={cn('border-0', className)}
      style={{ 
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      {config.codename}
    </Badge>
  );
}
