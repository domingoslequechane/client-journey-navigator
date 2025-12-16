import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { SALES_FUNNEL_STAGES, OPERATIONAL_FLOW_STAGES, ALL_STAGES } from '@/types';
import { Users, TrendingUp, Target, Award, ArrowRight, UserPlus, Kanban, Workflow, CheckSquare, Phone, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

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
    { title: 'Ver Funil de Vendas', description: 'Kanban visual da jornada do cliente', icon: Kanban, href: '/app/sales-funnel', color: 'text-success' },
    { title: 'Ver Fluxo Operacional', description: 'Acompanhe clientes em produção e retenção', icon: Workflow, href: '/app/operational-flow', color: 'text-purple-500' },
    { title: 'Checklists de Processo', description: 'Acompanhe as tarefas por fase', icon: CheckSquare, href: '/app/checklists', color: 'text-rose-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral da jornada dos seus clientes</p>
        </div>
        {/* Botão 'Novo Cliente' removido conforme solicitado */}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard 
          title="Total de Clientes" 
          value={totalClients}
          description="Na base de dados"
          icon={Users}
          variant="info"
        />
        <StatsCard 
          title="Clientes Ativos" 
          value={activeClients}
          description="Em execução ou fidelização"
          icon={TrendingUp}
          variant="success"
        />
        <StatsCard 
          title="Leads Qualificados" 
          value={qualifiedLeads}
          description="Prontos para fechamento"
          icon={Target}
          variant="warning"
        />
        <StatsCard 
          title="Taxa de Conversão" 
          value={`${conversionRate}%`}
          description="Leads → Clientes"
          icon={Award}
          variant="primary"
        />
      </div>

      {/* Sales Funnel Overview */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Funil de Vendas por Fase</h2>
            <p className="text-sm text-muted-foreground">Distribuição dos clientes no funil de vendas</p>
          </div>
          <Link to="/app/sales-funnel">
            <Button variant="ghost" size="sm" className="gap-2">
              Ver Funil de Vendas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SALES_FUNNEL_STAGES.map((stage) => {
            const dbStages: Record<string, string> = {
              prospecting: 'prospeccao',
              qualification: 'reuniao',
              closing: 'contratacao',
            };
            const count = clients.filter(c => c.current_stage === dbStages[stage.id]).length;
            return (
              <div 
                key={stage.id} 
                className={cn(
                  "p-6 rounded-xl border-2 text-center transition-all hover:scale-105",
                  stage.borderColor,
                  stage.color
                )}
              >
                <div className="text-4xl font-bold mb-2">{count}</div>
                <div className="text-sm font-medium">{stage.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Clients */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Clientes Recentes</h2>
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
              recentClients.map((client) => {
                const mappedStage = getStageFromDb(client.current_stage);
                const stage = ALL_STAGES.find(s => s.id === mappedStage);
                const bantScore = (client.bant_budget || 0) + (client.bant_authority || 0) + (client.bant_need || 0) + (client.bant_timeline || 0);
                
                return (
                  <Link key={client.id} to={`/app/clients/${client.id}`}>
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
                              <span className="text-sm font-medium text-primary">{Number(client.monthly_budget).toLocaleString()} MT</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-6">Ações Rápidas</h2>
          
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Link key={action.href} to={action.href}>
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}