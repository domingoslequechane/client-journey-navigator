import { StatsCard } from '@/components/dashboard/StatsCard';
import { dashboardStats, mockClients } from '@/data/mockData';
import { JOURNEY_STAGES } from '@/types';
import { Users, TrendingUp, DollarSign, Target, Calendar, ArrowUpRight, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AIButton } from '@/components/ui/ai-button';
import { useState } from 'react';

export default function Dashboard() {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const recentClients = mockClients.slice(0, 5);

  const handleAIAnalysis = () => {
    setIsLoadingAi(true);
    setTimeout(() => {
      setAiInsight(
        "📊 **Análise do Pipeline:**\n\n" +
        "• Você tem 2 leads na fase de **Descoberta** - recomendo priorizar o acompanhamento para converter para Atração.\n\n" +
        "• O lead **Clínica Vida Saudável** está há 3 dias aguardando proposta - risco de perda. Envie a proposta hoje!\n\n" +
        "• Excelente taxa de conversão de 62.5% - acima da média do mercado (45%).\n\n" +
        "• **Sugestão:** Aproveite o sucesso da Farmácia Central para solicitar mais 2 indicações esta semana."
      );
      setIsLoadingAi(false);
    }, 2000);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do seu pipeline de clientes</p>
        </div>
        <AIButton onClick={handleAIAnalysis} isLoading={isLoadingAi}>
          Análise Geral
        </AIButton>
      </div>

      {/* AI Insight */}
      {aiInsight && (
        <div className="mb-8 bg-gradient-to-r from-primary/10 to-chart-5/10 border border-primary/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-lg">🤖</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Insights do Assistente de IA</h3>
              <div className="text-sm text-muted-foreground whitespace-pre-line">{aiInsight}</div>
            </div>
            <button 
              onClick={() => setAiInsight(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard 
          title="Total de Clientes" 
          value={dashboardStats.totalClients}
          icon={Users}
          trend={{ value: 25, isPositive: true }}
        />
        <StatsCard 
          title="Clientes Ativos" 
          value={dashboardStats.activeClients}
          icon={TrendingUp}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard 
          title="Receita Mensal" 
          value={`${(dashboardStats.totalRevenue / 1000).toFixed(0)}k MT`}
          icon={DollarSign}
          trend={{ value: 18, isPositive: true }}
        />
        <StatsCard 
          title="Taxa de Conversão" 
          value={`${dashboardStats.conversionRate}%`}
          icon={Target}
          trend={{ value: 5, isPositive: true }}
        />
      </div>

      {/* Pipeline Overview & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Distribution */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Distribuição do Pipeline</h2>
            <Link to="/app/pipeline">
              <Button variant="ghost" size="sm" className="gap-2">
                Ver Pipeline
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {JOURNEY_STAGES.map((stage) => {
              const count = dashboardStats.clientsByStage[stage.id];
              const percentage = (count / dashboardStats.totalClients) * 100;
              
              return (
                <div key={stage.id} className="flex items-center gap-4">
                  <div className="w-28 text-sm font-medium">{stage.name}</div>
                  <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                    <div 
                      className={`h-full ${stage.color} flex items-center justify-end pr-3 transition-all duration-500`}
                      style={{ width: `${Math.max(percentage, 10)}%` }}
                    >
                      <span className="text-xs font-bold text-primary-foreground">{count}</span>
                    </div>
                  </div>
                  <div className="w-12 text-sm text-muted-foreground text-right">
                    {percentage.toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Atividade Recente</h2>
            <Link to="/app/clients">
              <Button variant="ghost" size="sm" className="gap-2">
                Ver Todos
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentClients.map((client) => {
              const stage = JOURNEY_STAGES.find(s => s.id === client.stage);
              return (
                <div key={client.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-semibold text-sm">
                      {client.companyName.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{client.companyName}</p>
                    <p className="text-xs text-muted-foreground">{stage?.name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(client.lastContact).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
