import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import {
  StatsCard,
  RevenueChart,
  FunnelChart,
  SourcePieChart,
  HighlightClientCard,
  AISuggestionCard
} from '@/components/dashboard';
import { FreePlanBanner } from '@/components/subscription/FreePlanBanner';
import { OnboardingTutorial } from '@/components/onboarding/OnboardingTutorial';
import { DashboardSkeleton } from '@/components/ui/loading-skeleton';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { SALES_FUNNEL_STAGES, OPERATIONAL_FLOW_STAGES, ALL_STAGES } from '@/types';
import { Users, TrendingUp, TrendingDown, Award, ArrowRight, DollarSign, Flame, Wallet, LayoutDashboard, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import { useOrganization } from '@/hooks/useOrganization';
import { useUserRole } from '@/hooks/useUserRole';
import { useQuickFinanceStats } from '@/hooks/finance';
import { formatPhoneNumber } from '@/lib/phone-utils';
import { useTranslatedLabels } from '@/hooks/useTranslatedLabels';

type Client = Tables<'clients'>;

export default function Dashboard() {
  const { t } = useTranslation('dashboard');
  const { qualificationLabels, sourceLabels } = useTranslatedLabels();
  const {
    role: userRole,
    loading: roleLoading,
    canSeeSalesFunnel: canSeeSales,
    canSeeOperationalFlow: canSeeOperations,
    canAddClient,
    getVisibleStages,
    canManageFinance
  } = useUserRole();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { currencySymbol, organizationId, loading: orgLoading } = useOrganization();
  const financeStats = useQuickFinanceStats();

  useEffect(() => {
    if (!roleLoading && organizationId) {
      fetchData();
    }
  }, [roleLoading, organizationId]);

  const fetchData = async () => {
    if (!organizationId) return;
    try {
      // Fetch clients
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageFromDb = (dbStage: string) => {
    const stageMap: Record<string, string> = {
      prospeccao: 'prospecting',
      reuniao: 'qualification',
      contratacao: 'closing',
      producao: 'production',
      trafego: 'campaigns',
      retencao: 'retention',
      fidelizacao: 'loyalty',
    };
    return stageMap[dbStage] || dbStage;
  };

  // Filter recent clients based on role's responsible stages
  const recentClients = useMemo(() => {
    const visibleStages = getVisibleStages();
    const filteredClients = visibleStages
      ? clients.filter(c => visibleStages.includes(c.current_stage))
      : clients;
    return filteredClients.slice(0, 3);
  }, [clients, getVisibleStages]);

  const totalClients = clients.length;
  // Clientes activos = não pausados
  const activeClients = clients.filter(c => !c.paused).length;
  const hotLeads = clients.filter(c => c.qualification === 'hot').length;

  // Taxa de conversão = clientes que chegaram a contratação ou além
  const convertedClients = clients.filter(c =>
    ['contratacao', 'producao', 'trafego', 'retencao', 'fidelizacao'].includes(c.current_stage)
  ).length;
  const conversionRate = totalClients > 0 ? Math.round((convertedClients / totalClients) * 100) : 0;

  // Sales funnel clients
  const salesFunnelClients = clients.filter(c => ['prospeccao', 'reuniao', 'contratacao'].includes(c.current_stage)).length;

  // Operational flow clients
  const operationalClients = clients.filter(c => ['producao', 'trafego', 'retencao', 'fidelizacao'].includes(c.current_stage)).length;

  // Calculate fixed revenue - apenas clientes operacionais (contratos fechados) não pausados
  const operationalStages = ['producao', 'trafego', 'retencao', 'fidelizacao'];
  const fixedRevenue = useMemo(() => {
    return clients
      .filter(c => c.monthly_budget && !c.paused && operationalStages.includes(c.current_stage))
      .reduce((sum, c) => sum + Number(c.monthly_budget || 0), 0);
  }, [clients]);

  if (loading || orgLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 md:p-8 pt-4 md:pt-8">
      {/* Onboarding Tutorial */}
      <OnboardingTutorial />

      {/* Free Plan Banner */}
      <FreePlanBanner />

      <AnimatedContainer animation="fade-up" delay={0} className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-10" data-tutorial="dashboard">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-7 w-7 md:h-8 md:w-8 text-primary" />
            {t('title')}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {canSeeSales && canSeeOperations
              ? t('subtitle.full')
              : canSeeSales
                ? t('subtitle.sales')
                : t('subtitle.operations')}
          </p>
        </div>
      </AnimatedContainer>

      {/* Finance Summary Section - FIRST */}
      {canManageFinance && (
        <AnimatedContainer animation="fade-up" delay={0.05} className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              {t('financeOverview.title')}
            </h2>
            <Link to="/app/finance">
              <Button variant="ghost" size="sm" className="h-8">
                {t('financeOverview.viewDetails')} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard
              title={t('financeOverview.income')}
              value={`${currencySymbol} ${financeStats.monthlyIncome.toLocaleString()}`}
              description={t('financeOverview.thisMonth')}
              icon={TrendingUp}
              variant="success"
            />
            <StatsCard
              title={t('financeOverview.expenses')}
              value={`${currencySymbol} ${financeStats.monthlyExpenses.toLocaleString()}`}
              description={t('financeOverview.thisMonth')}
              icon={TrendingDown}
              variant="warning"
            />
            <StatsCard
              title={t('financeOverview.balance')}
              value={`${currencySymbol} ${financeStats.netBalance.toLocaleString()}`}
              description={t('financeOverview.net')}
              icon={Wallet}
              variant={financeStats.netBalance >= 0 ? 'success' : 'warning'}
            />
          </div>
        </AnimatedContainer>
      )}

      {/* Stats Cards - Show relevant stats based on role */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-10">
        <AnimatedContainer animation="fade-up" delay={0.05}>
          <StatsCard
            title={t('stats.totalClients')}
            value={totalClients}
            description={t('stats.totalClientsDesc')}
            icon={Building2}
            variant="info"
          />
        </AnimatedContainer>
        {canManageFinance ? (
          <AnimatedContainer animation="fade-up" delay={0.1}>
            <StatsCard
              title={t('stats.expectedRevenue')}
              value={`${currencySymbol} ${fixedRevenue.toLocaleString()}`}
              description={t('stats.expectedRevenueDesc')}
              icon={Wallet}
              variant="success"
            />
          </AnimatedContainer>
        ) : (
          <AnimatedContainer animation="fade-up" delay={0.1}>
            <StatsCard
              title={t('stats.activeClients')}
              value={activeClients}
              description={t('stats.activeClientsDesc')}
              icon={TrendingUp}
              variant="success"
            />
          </AnimatedContainer>
        )}
        <AnimatedContainer animation="fade-up" delay={0.15}>
          <StatsCard
            title={t('stats.hotLeads')}
            value={hotLeads}
            description={t('stats.hotLeadsDesc')}
            icon={Flame}
            variant="warning"
          />
        </AnimatedContainer>
        <AnimatedContainer animation="fade-up" delay={0.2}>
          <StatsCard
            title={t('stats.conversionRate')}
            value={`${conversionRate}%`}
            description={t('stats.conversionRateDesc')}
            icon={Award}
            variant="primary"
          />
        </AnimatedContainer>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        {canManageFinance ? (
          <AnimatedContainer animation="fade-up" delay={0.25}>
            <RevenueChart clients={clients} currencySymbol={currencySymbol} />
          </AnimatedContainer>
        ) : (
          <AnimatedContainer animation="fade-up" delay={0.25}>
            <FunnelChart clients={clients} />
          </AnimatedContainer>
        )}
        <AnimatedContainer animation="fade-up" delay={0.3}>
          {canManageFinance ? (
            <FunnelChart clients={clients} />
          ) : (
            <SourcePieChart clients={clients} />
          )}
        </AnimatedContainer>
      </div>

      {/* Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <AnimatedContainer animation="fade-up" delay={0.35}>
          {canManageFinance ? (
            <SourcePieChart clients={clients} />
          ) : (
            <HighlightClientCard clients={clients} currencySymbol={currencySymbol} showBudget={false} />
          )}
        </AnimatedContainer>
        <AnimatedContainer animation="fade-up" delay={0.4}>
          {canManageFinance ? (
            <HighlightClientCard clients={clients} currencySymbol={currencySymbol} showBudget={true} />
          ) : (
            <AISuggestionCard clients={clients} />
          )}
        </AnimatedContainer>
        <AnimatedContainer animation="fade-up" delay={0.45}>
          {canManageFinance ? (
            <AISuggestionCard clients={clients} />
          ) : (
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 flex flex-col items-center justify-center p-6 text-center h-full">
              <TrendingUp className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold mb-1">{t('focusedGrowth.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('focusedGrowth.description')}</p>
            </Card>
          )}
        </AnimatedContainer>
      </div>
    </div>
  );
}

