import { useState, useEffect, useMemo } from 'react';
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
import { Users, TrendingUp, Target, Award, ArrowRight, UserPlus, Kanban, Workflow, Phone, Loader2, DollarSign, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import { useUserRole } from '@/hooks/useUserRole';
import { formatPhoneNumber } from '@/lib/phone-utils';

type Client = Tables<'clients'>;

const QUALIFICATION_LABELS: Record<string, string> = {
  cold: 'Frio',
  warm: 'Morno',
  hot: 'Quente',
  qualified: 'Qualificado',
};

const SOURCE_LABELS: Record<string, string> = {
  google_maps: 'Google Maps',
  social_media: 'Redes Sociais',
  referral: 'Indicação',
  visit: 'Visita Presencial',
  inbound: 'Inbound',
  other: 'Outro',
};

// Stages each role is responsible for
const SALES_STAGES = ['prospeccao', 'reuniao', 'contratacao'];
const OPERATIONS_STAGES = ['producao', 'trafego'];
const CAMPAIGN_STAGES = ['trafego', 'retencao', 'fidelizacao'];

export default function Dashboard() {
  const { 
    role: userRole, 
    loading: roleLoading, 
    canSeeSalesFunnel: canSeeSales, 
    canSeeOperationalFlow: canSeeOperations,
    canAddClient,
    getVisibleStages
  } = useUserRole();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { currencySymbol } = useOrganizationCurrency();

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
  const qualifiedLeads = clients.filter(c => c.qualification === 'qualified' || c.qualification === 'hot').length;
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

  // Quick actions based on role
  const quickActions = useMemo(() => {
    const allActions = [
      { title: 'Novo Cliente', description: 'Cadastre um novo lead no sistema', icon: UserPlus, href: '/app/new-client', color: 'text-primary', show: canAddClient },
      { title: 'Funil de Vendas', description: 'Kanban visual da jornada do cliente', icon: Kanban, href: '/app/sales-funnel', color: 'text-success', show: canSeeSales },
      { title: 'Fluxo Operacional', description: 'Acompanhe clientes em produção', icon: Workflow, href: '/app/operational-flow', color: 'text-chart-5', show: canSeeOperations },
    ];

    return allActions.filter(action => action.show);
  }, [canAddClient, canSeeSales, canSeeOperations]);

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
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {canSeeSales && canSeeOperations 
              ? 'Visão geral da jornada dos seus clientes' 
              : canSeeSales 
                ? 'Visão geral do funil de vendas'
                : 'Visão geral do fluxo operacional'}
          </p>
        </div>
      </AnimatedContainer>

      {/* Stats Cards - Show relevant stats based on role */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <AnimatedContainer animation="fade-up" delay={0.05}>
          <StatsCard 
            title="Total de Clientes" 
            value={totalClients}
            description="Na base de dados"
            icon={Users}
            variant="info"
          />
        </AnimatedContainer>
        <AnimatedContainer animation="fade-up" delay={0.1}>
          <StatsCard 
            title="Receita Prevista" 
            value={`${currencySymbol} ${fixedRevenue.toLocaleString()}`}
            description="Este mês"
            icon={DollarSign}
            variant="success"
          />
        </AnimatedContainer>
        <AnimatedContainer animation="fade-up" delay={0.15}>
          <StatsCard 
            title="Leads Quentes" 
            value={hotLeads}
            description="Prontos para fechar"
            icon={Flame}
            variant="warning"
          />
        </AnimatedContainer>
        <AnimatedContainer animation="fade-up" delay={0.2}>
          <StatsCard 
            title="Taxa de Conversão" 
            value={`${conversionRate}%`}
            description="Leads → Clientes"
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
