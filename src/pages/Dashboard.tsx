import { StatsCard } from '@/components/dashboard/StatsCard';
import { dashboardStats, mockClients } from '@/data/mockData';
import { SALES_FUNNEL_STAGES, OPERATIONAL_FLOW_STAGES, ALL_STAGES, TEMPERATURE_LABELS, SOURCE_LABELS } from '@/types';
import { Users, TrendingUp, Target, Award, Calendar, ArrowRight, UserPlus, Kanban, Workflow, CheckSquare, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const recentClients = mockClients.slice(0, 3);
  const salesFunnelClients = mockClients.filter(c => ['prospecting', 'qualification', 'closing'].includes(c.stage));
  const operationalClients = mockClients.filter(c => ['production', 'campaigns', 'retention'].includes(c.stage));

  const quickActions = [
    { title: 'Adicionar Novo Cliente', description: 'Cadastre um novo lead ou cliente', icon: UserPlus, href: '/app/new-client', color: 'text-info' },
    { title: 'Ver Funil de Vendas', description: 'Kanban visual da jornada do cliente', icon: Kanban, href: '/app/sales-funnel', color: 'text-success' },
    { title: 'Ver Fluxo Operacional', description: 'Acompanhe clientes em produção e retenção', icon: Workflow, href: '/app/operational-flow', color: 'text-purple-500' },
    { title: 'Checklists de Processo', description: 'Acompanhe as tarefas por fase', icon: CheckSquare, href: '/app/checklists', color: 'text-rose-500' },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral da jornada dos seus clientes</p>
        </div>
        <Link to="/app/new-client">
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard 
          title="Total de Clientes" 
          value={dashboardStats.totalClients}
          description="Na base de dados"
          icon={Users}
          trend={{ value: 12, isPositive: true, label: 'este mês' }}
          variant="info"
        />
        <StatsCard 
          title="Clientes Ativos" 
          value={dashboardStats.activeClients}
          description="Em execução ou fidelização"
          icon={TrendingUp}
          variant="success"
        />
        <StatsCard 
          title="Leads Qualificados" 
          value={dashboardStats.qualifiedLeads}
          description="Prontos para fechamento"
          icon={Target}
          variant="warning"
        />
        <StatsCard 
          title="Taxa de Conversão" 
          value={`${dashboardStats.conversionRate}%`}
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
            const count = mockClients.filter(c => c.stage === stage.id).length;
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
            {recentClients.map((client) => {
              const stage = ALL_STAGES.find(s => s.id === client.stage);
              return (
                <div key={client.id} className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-semibold text-sm">
                        {client.companyName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium truncate">{client.companyName}</p>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">{client.contactName}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{client.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={client.temperature === 'hot' ? 'default' : 'secondary'} className="text-xs">
                          {TEMPERATURE_LABELS[client.temperature]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {SOURCE_LABELS[client.source]}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">Progresso</span>
                        <span className="text-xs text-muted-foreground">{client.progress}/9</span>
                      </div>
                      <Progress value={(client.progress / 9) * 100} className="h-1 mt-1" />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">Orçamento Mensal</span>
                        <span className="text-sm font-medium text-primary">{client.monthlyBudget.toLocaleString()} MT</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
