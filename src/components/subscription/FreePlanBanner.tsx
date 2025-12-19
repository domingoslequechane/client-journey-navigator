import { Link } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Rocket, Sparkles } from 'lucide-react';

export function FreePlanBanner() {
  const { loading, isPaidPlan, planType } = useSubscription();

  // Don't show if loading or user has a paid plan
  if (loading || isPaidPlan) {
    return null;
  }

  return (
    <div className="rounded-lg p-4 mb-6 bg-primary/10 border border-primary/20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="p-2 rounded-full bg-primary/10">
          <Rocket className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-primary">
            Você está no plano gratuito
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Faça upgrade para desbloquear mais clientes, contratos e funcionalidades avançadas.
          </p>
        </div>
        
        <Link to="/app/upgrade">
          <Button 
            size="sm" 
            className="gap-2 shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            Ver Planos
          </Button>
        </Link>
      </div>
    </div>
  );
}
