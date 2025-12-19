import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, Lock, Info } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import type { PlanType } from '@/hooks/usePlanLimits';

interface UpgradePromptProps {
  feature: string;
  currentPlan: PlanType;
  requiredPlan?: PlanType;
  variant?: 'card' | 'inline' | 'modal';
}

const planNames: Record<PlanType, string> = {
  free: 'Grátis',
  starter: 'Iniciante',
  pro: 'Pro',
  agency: 'Agência',
};

export function UpgradePrompt({ feature, currentPlan, requiredPlan, variant = 'card' }: UpgradePromptProps) {
  const { isAdmin } = useUserRole();

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border border-border">
        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground">
          {feature} não está disponível no plano {planNames[currentPlan]}.
        </span>
        {isAdmin ? (
          <Link to="/app/upgrade">
            <Button variant="link" size="sm" className="h-auto p-0">
              Fazer upgrade <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" /> Fale com o admin
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-2">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg">Limite Atingido</CardTitle>
        <CardDescription>
          {feature} não está disponível no plano {planNames[currentPlan]}.
          {requiredPlan && (
            <> Faça upgrade para o plano {planNames[requiredPlan]} ou superior.</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        {isAdmin ? (
          <Link to="/app/upgrade">
            <Button className="gap-2">
              Ver Planos
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Info className="h-4 w-4" />
            Apenas o administrador pode alterar o plano
          </p>
        )}
      </CardContent>
    </Card>
  );
}
