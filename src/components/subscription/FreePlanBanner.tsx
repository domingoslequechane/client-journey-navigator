import { Link } from 'react-router-dom';
import { useSubscription, PlanType } from '@/hooks/useSubscription';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Rocket, Sparkles, Info } from 'lucide-react';

// Plan names mapping
const planNames: Record<PlanType, string> = {
  free: 'Legado',
  starter: 'Lança',
  pro: 'Arco',
  agency: 'Catapulta',
};

export function FreePlanBanner() {
  const { loading, isPaidPlan, isActive, isTrialing, hasAccess } = useSubscription();
  const { isAdmin, loading: roleLoading } = useUserRole();

  // Don't show if loading, or user has access (active subscription or valid trial), or paid plan is active
  if (loading || roleLoading || hasAccess || (isPaidPlan && isActive)) {
    return null;
  }

  // Show upgrade banner for users without active subscription
  return (
    <div className="rounded-lg p-4 mb-6 bg-primary/5 border border-primary/20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="p-2 rounded-full bg-primary/10">
          <Rocket className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-primary">
            Desbloqueie mais recursos!
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAdmin 
              ? 'Assine um plano e tenha acesso a mais clientes, contratos e recursos de IA.'
              : 'Converse com o administrador da sua organização para assinar.'
            }
          </p>
        </div>
        
        {isAdmin ? (
          <Link to="/app/upgrade">
            <Button 
              size="sm" 
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
