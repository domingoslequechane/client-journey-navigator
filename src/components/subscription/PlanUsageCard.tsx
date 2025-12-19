import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UsageIndicator } from './UsageIndicator';
import { usePlanLimits, PlanType } from '@/hooks/usePlanLimits';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscription } from '@/hooks/useSubscription';
import { Link } from 'react-router-dom';
import { TrendingUp, Loader2, Clock } from 'lucide-react';

const PLAN_NAMES: Record<PlanType, string> = {
  free: 'Gratuito',
  starter: 'Lança',
  pro: 'Arco',
  agency: 'Catapulta',
};

export function PlanUsageCard() {
  const { isAdmin } = useUserRole();
  const { isTrialing, trialDaysLeft } = useSubscription();
  const {
    loading,
    planType,
    limits,
    usage,
    canAddClient,
    canGenerateContract,
    canAccessAI,
    canInviteTeamMember,
  } = usePlanLimits();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasAnyLimit = limits.maxClients !== null || 
    limits.maxContractsPerMonth !== null || 
    limits.maxAIMessagesPerMonth !== null ||
    limits.maxTeamMembers !== null;

  if (!hasAnyLimit) {
    return null;
  }

  const isNearAnyLimit = !canAddClient || !canGenerateContract || !canAccessAI || !canInviteTeamMember;

  return (
    <Card className={isNearAnyLimit ? 'border-warning/50' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">
              Uso do Plano {PLAN_NAMES[planType]}
            </CardTitle>
            {isTrialing && trialDaysLeft > 0 && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                Trial - {trialDaysLeft}d
              </Badge>
            )}
          </div>
          {isAdmin && (planType !== 'agency' || isTrialing) && (
            <Link to="/app/upgrade">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <TrendingUp className="h-3 w-3" />
                {isTrialing ? 'Assinar' : 'Upgrade'}
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {limits.maxClients !== null && (
          <UsageIndicator
            current={usage.clientsCount}
            max={limits.maxClients}
            label="Clientes"
          />
        )}
        
        {limits.maxContractsPerMonth !== null && (
          <UsageIndicator
            current={usage.contractsThisMonth}
            max={limits.maxContractsPerMonth}
            label="Contratos (mês)"
          />
        )}
        
        {limits.maxAIMessagesPerMonth !== null && (
          <UsageIndicator
            current={usage.aiMessagesThisMonth}
            max={limits.maxAIMessagesPerMonth}
            label="Mensagens IA (mês)"
          />
        )}
        
        {limits.maxTeamMembers !== null && (
          <UsageIndicator
            current={usage.teamMembersCount}
            max={limits.maxTeamMembers}
            label="Membros da Equipe"
          />
        )}
      </CardContent>
    </Card>
  );
}
