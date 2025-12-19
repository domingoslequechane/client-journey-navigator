import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { PlanType } from '@/hooks/usePlanLimits';

interface LimitReachedCardProps {
  feature: string;
  current: number;
  limit: number;
  planType: PlanType;
  description?: string;
  variant?: 'card' | 'inline' | 'banner';
}

const PLAN_NAMES: Record<PlanType, string> = {
  free: 'Gratuito',
  starter: 'Lança',
  pro: 'Arco',
  agency: 'Catapulta',
};

export function LimitReachedCard({ 
  feature, 
  current, 
  limit, 
  planType,
  description,
  variant = 'card'
}: LimitReachedCardProps) {
  const { isAdmin } = useUserRole();

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
        <Lock className="h-4 w-4 text-destructive shrink-0" />
        <div className="flex-1">
          <span className="text-destructive font-medium">Limite atingido:</span>{' '}
          <span className="text-muted-foreground">{current}/{limit} {feature}</span>
        </div>
        {isAdmin && (
          <Link to="/app/upgrade">
            <Button size="sm" variant="outline" className="shrink-0">
              Upgrade
            </Button>
          </Link>
        )}
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="font-medium">Você atingiu o limite de {feature}</p>
            <p className="text-sm text-muted-foreground">
              {description || `Seu plano ${PLAN_NAMES[planType]} permite até ${limit} ${feature}.`}
            </p>
          </div>
        </div>
        {isAdmin ? (
          <Link to="/app/upgrade">
            <Button className="w-full sm:w-auto">
              Fazer Upgrade
            </Button>
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">
            Fale com um administrador para fazer upgrade.
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Limite de {feature} atingido</h3>
            <p className="text-muted-foreground mt-1">
              {description || `Você utilizou ${current} de ${limit} ${feature} disponíveis no plano ${PLAN_NAMES[planType]}.`}
            </p>
          </div>
          {isAdmin ? (
            <Link to="/app/upgrade" className="w-full">
              <Button className="w-full gap-2">
                <TrendingUp className="h-4 w-4" />
                Fazer Upgrade
              </Button>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              Fale com um administrador da sua organização para fazer upgrade do plano.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
