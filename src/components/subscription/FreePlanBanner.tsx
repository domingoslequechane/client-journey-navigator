import { Link } from 'react-router-dom';
import { useSubscription, PlanType } from '@/hooks/useSubscription';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, Sparkles, Info, Clock } from 'lucide-react';

// Plan names mapping
const planNames: Record<PlanType, string> = {
  free: 'Bússola',
  starter: 'Lança',
  pro: 'Arco',
  agency: 'Catapulta',
};

export function FreePlanBanner() {
  const { loading, isPaidPlan, isTrialing, trialDaysLeft, planType, isActive } = useSubscription();
  const { isAdmin, loading: roleLoading } = useUserRole();

  // Don't show if loading or user has an active paid subscription
  if (loading || roleLoading || (isPaidPlan && isActive)) {
    return null;
  }

  const currentPlanName = planNames[planType] || planNames.free;

  // Show trial banner if user is in trial period
  if (isTrialing && trialDaysLeft > 0) {
    return (
      <div className="rounded-lg p-4 mb-6 bg-primary/10 border border-primary/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="p-2 rounded-full bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-primary">
                Período de Teste - Plano {currentPlanName}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'} restantes
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isAdmin 
                ? 'Você tem acesso completo durante o período de teste. Assine para continuar após o término.'
                : 'Sua organização está no período de teste. Converse com o administrador sobre os planos.'
              }
            </p>
          </div>
          
          {isAdmin && (
            <Link to="/app/upgrade">
              <Button 
                size="sm" 
                className="gap-2 shrink-0"
              >
                <Sparkles className="h-4 w-4" />
                Assinar Agora
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Show free plan banner for non-trial free users
  if (planType === 'free' || !isPaidPlan) {
    return (
      <div className="rounded-lg p-4 mb-6 bg-muted/50 border border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="p-2 rounded-full bg-muted">
            <Rocket className="h-5 w-5 text-muted-foreground" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">
              Você está no plano gratuito
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isAdmin 
                ? 'Faça upgrade para desbloquear mais clientes, contratos e funcionalidades avançadas.'
                : 'Converse com o administrador da sua organização para fazer upgrade.'
              }
            </p>
          </div>
          
          {isAdmin ? (
            <Link to="/app/upgrade">
              <Button 
                size="sm" 
                variant="outline"
                className="gap-2 shrink-0"
              >
                <Sparkles className="h-4 w-4" />
                Ver Planos
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <Info className="h-4 w-4" />
              Apenas admins
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
