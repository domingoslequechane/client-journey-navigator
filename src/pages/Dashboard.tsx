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
import { Users, TrendingUp, TrendingDown, Award, ArrowRight, DollarSign, Flame, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
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
  const { currencySymbol } = useOrganizationCurrency();
  const financeStats = useQuickFinanceStats();

  useEffect(() => {
    if (!roleLoading) {
      fetchData();
    }
  }, [roleLoading]);

  const fetchData = async () => {
    try {
      // Fetch clients
      const { data, error } = await supabase
        .from('clients')
        .select('*')
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

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 md:p-8">
      {/* Onboarding Tutorial */}
      <OnboardingTutorial />
      
      {/* Free Plan Banner */}
      <FreePlanBanner />

      <AnimatedContainer animation="fade-up" delay={0} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8" data-tutorial="dashboard">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('title')}</h1>
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
            <h2 className="text-lg font-semibold">{t('financeOverview.title', 'Resumo Financeiro do Mês')}</h2>
            <Link to="/app/finance">
              <Button variant="ghost" size="sm">
                {t('financeOverview.viewDetails', 'Ver detalhes')} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard
              title={t('financeOverview.income', 'Receitas')}
              value={`${currencySymbol} ${financeStats.monthlyIncome.toLocaleString()}`}
              description={t('financeOverview.thisMonth', 'Este mês')}
              icon={TrendingUp}
              variant="success"
            />
            <StatsCard
              title={t('financeOverview.expenses', 'Despesas')}
              value={`${currencySymbol} ${financeStats.monthlyExpenses.toLocaleString()}`}
              description={t('financeOverview.thisMonth', 'Este mês')}
              icon={TrendingDown}
              variant="warning"
            />
            <StatsCard
              title={t('financeOverview.balance', 'Saldo')}
              value={`${currencySymbol} ${financeStats.netBalance.toLocaleString()}`}
              description={t('financeOverview.net', 'Líquido')}
              icon={Wallet}
              variant={financeStats.netBalance >= 0 ? 'success' : 'warning'}
            />
          </div>
        </AnimatedContainer>
      )}

      {/* Stats Cards - Show relevant stats based on role */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <AnimatedContainer animation="fade-up" delay={0.05}>
          <StatsCard 
            title={t('stats.totalClients')} 
            value={totalClients}
            description={t('stats.totalClientsDesc')}
            icon={Users}
            variant="info"
          />
        </AnimatedContainer>
        <AnimatedContainer animation="fade-up" delay={0.1}>
          <StatsCard 
            title={t('stats.expectedRevenue')} 
            value={`${currencySymbol} ${fixedRevenue.toLocaleString()}`}
            description={t('stats.expectedRevenueDesc')}
            icon={DollarSign}
            variant="success"
          />
        </AnimatedContainer>
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
        <AnimatedContainer animation="fade-up" delay={0.25}>
          <RevenueChart clients={clients} currencySymbol={currencySymbol} />
        </AnimatedContainer>
        <AnimatedContainer animation="fade-up" delay={0.3}>
          <FunnelChart clients={clients} />
        </AnimatedContainer>
      </div>

      {/* Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <AnimatedContainer animation="fade-up" delay={0.35}>
          <SourcePieChart clients={clients} />
        </AnimatedContainer>
        <AnimatedContainer animation="fade-up" delay={0.4}>
          <HighlightClientCard clients={clients} currencySymbol={currencySymbol} />
        </AnimatedContainer>
        <AnimatedContainer animation="fade-up" delay={0.45}>
          <AISuggestionCard clients={clients} />
        </AnimatedContainer>
      </div>
    </div>
  );
}
