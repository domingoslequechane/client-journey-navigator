import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { OnboardingTutorial } from '@/components/onboarding/OnboardingTutorial';
import { DashboardSkeleton } from '@/components/ui/loading-skeleton';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { SALES_FUNNEL_STAGES, OPERATIONAL_FLOW_STAGES, ALL_STAGES } from '@/types';
import { Users, TrendingUp, Target, Award, ArrowRight, UserPlus, Kanban, Workflow, CheckSquare, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';

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

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { currencySymbol } = useOrganizationCurrency();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
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
    };
    return stageMap[dbStage] || dbStage;
  };

  const recentClients = clients.slice(0, 3);
  const totalClients = clients.length;
  const activeClients = clients.filter(c => ['producao', 'trafego', 'retencao'].includes(c.current_stage)).length;
  const qualifiedLeads = clients.filter(c => c.qualification === 'qualified' || c.qualification === 'hot').length;
  const conversionRate = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0;

  const quickActions = [
    { title: 'Adicionar Novo Cliente', description: 'Cadastre um novo lead no sistema', icon: UserPlus, href: '/app/new-client', color: 'text-primary' },
    { title: 'Ver Funil de Vendas', description: 'Kanban visual da jornada do cliente', icon: Kanban, href: '/app/sales-funnel', color: 'text-success' },
    { title: 'Ver Fluxo Operacional', description: 'Acompanhe clientes em produção e retenção', icon: Workflow, href: '/app/operational-flow', color: 'text-chart-5' },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 md:p-8">
      {/* Onboarding Tutorial */}
      <OnboardingTutorial />
      
      {/* Trial Banner */}
      <TrialBanner />

      <AnimatedContainer animation="fade-up" delay={0} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8" data-tutorial="dashboard">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Visão geral da jornada dos seus clientes</p>
        </div>
      </AnimatedContainer>

      {/* Stats Cards */}
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
            title="Clientes Ativos" 
            value={activeClients}
            description="Em execução ou fidelização"
            icon={TrendingUp}
            variant="success"
          />
        </AnimatedContainer>
        <AnimatedContainer animation="fade-up" delay={0.15}>
          <StatsCard 
            title="Leads Qualificados" 
            value={qualifiedLeads}
            description="Prontos para fechamento"
            icon={Target}
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

      {/* Sales Funnel Overview */}
      <AnimatedContainer animation="fade-up" delay={0.25} className="bg-card border border-border rounded-xl p-4 md:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
          <div>
            <h2 className="text-base md:text-lg font-semibold">Funil de Vendas por Fase</h2>
            <p className="text-xs md:text-sm text-muted-foreground">Distribuição dos clientes no funil de vendas</p>
          </div>
          <Link to="/app/sales-funnel">
            <Button variant="ghost" size="sm" className="gap-2 w-full sm:w-auto">
              Ver Funil de Vendas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          {SALES_FUNNEL_STAGES.map((stage, index) => {
            const dbStages: Record<string, string> = {
              prospecting: 'prospeccao',
              qualification: 'reuniao',
              closing: 'contratacao',
            };
            const count = clients.filter(c => c.current_stage === dbStages[stage.id]).length;
            return (
              <AnimatedContainer 
                key={stage.id}
                animation="scale-in"
                delay={0.3 + (index * 0.1)}
                className={cn(
                  "p-3 md:p-6 rounded-xl border-2 text-center transition-all hover:scale-105",
                  stage.borderColor,
                  stage.color
                )}
              >
                <div className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">{count}</div>
                <div className="text-xs md:text-sm font-medium">{stage.name}</div>
              </AnimatedContainer>
            );
          })}
        </div>
      </AnimatedContainer>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent Clients */}
        <AnimatedContainer animation="slide-right" delay={0.4} className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-base md:text-lg font-semibold">Clientes Recentes</h2>
            <Link to="/app/clients">
              <Button variant="ghost" size="sm" className="text-primary">
                Ver todos
              </Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentClients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado</p>
            ) : (
              recentClients.map((client, index) => {
                const mappedStage = getStageFromDb(client.current_stage);
                const stage = ALL_STAGES.find(s => s.id === mappedStage);
                const bantScore = (client.bant_budget || 0) + (client.bant_authority || 0) + (client.bant_need || 0) + (client.bant_timeline || 0);
                
                return (
                  <AnimatedContainer 
                    key={client.id} 
                    animation="fade-up" 
                    delay={0.5 + (index * 0.1)}
                  >
                    <Link to={`/app/clients/${client.id}`}>
                      <div className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary font-semibold text-sm">
                              {client.company_name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium truncate">{client.company_name}</p>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">{client.contact_name}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{client.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={client.qualification === 'hot' ? 'default' : 'secondary'} className="text-xs">
                                {QUALIFICATION_LABELS[client.qualification]}
                              </Badge>
                              {client.source && (
                                <Badge variant="outline" className="text-xs">
                                  {SOURCE_LABELS[client.source] || client.source}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-xs text-muted-foreground">BANT Score</span>
                              <span className="text-xs text-muted-foreground">{bantScore}/40</span>
                            </div>
                            <Progress value={(bantScore / 40) * 100} className="h-1 mt-1" />
                            {client.monthly_budget && (
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-muted-foreground">Orçamento Mensal</span>
                                <span className="text-sm font-medium text-primary">{currencySymbol} {Number(client.monthly_budget).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </AnimatedContainer>
                );
              })
            )}
          </div>
        </AnimatedContainer>

        {/* Quick Actions */}
        <AnimatedContainer animation="slide-left" delay={0.4} className="bg-card border border-border rounded-xl p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold mb-4 md:mb-6">Ações Rápidas</h2>
          
          <div className="space-y-3">
            {quickActions.map((action, index) => (
              <AnimatedContainer key={action.href} animation="fade-up" delay={0.5 + (index * 0.1)}>
                <Link to={action.href}>
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className={cn("h-10 w-10 rounded-lg bg-muted flex items-center justify-center", action.color)}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{action.title}</p>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </AnimatedContainer>
            ))}
          </div>
        </AnimatedContainer>
      </div>
    </div>
  );
}
