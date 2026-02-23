import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UsageIndicator } from './UsageIndicator';
import { usePlanLimits, PlanType } from '@/hooks/usePlanLimits';
import { useUserRole } from '@/hooks/useUserRole';
import { Link } from 'react-router-dom';
import { TrendingUp, Loader2 } from 'lucide-react';

const PLAN_NAMES: Record<PlanType, string> = {
  free: 'Legado',
  starter: 'Lança',
  pro: 'Arco',
  agency: 'Catapulta',
};

export function PlanUsageCard() {
  const { isAdmin } = useUserRole();
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
            </div>
            {isAdmin && planType !== 'agency' && (
              <Link to="/app/upgrade">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Upgrade
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
            label="Clientes Ativos"
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
