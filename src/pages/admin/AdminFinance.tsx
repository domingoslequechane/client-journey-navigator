import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Activity,
  Calendar, ArrowUpRight, ArrowDownRight, Wallet, Receipt,
  RefreshCw, Ban, CreditCard, PieChart as PieChartIcon,
  BarChart, LineChart
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart as RechartsBarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface FinanceStats {
  mrr: number;
  arr: number;
  totalRevenue: number;
  churnRate: number;
  avgRevenuePerOrg: number;
  activeSubscriptions: number;
  totalRefunds: number;
  pendingWithdrawals: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  subscribers: number;
}

export default function AdminFinance() {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenueHistory, setRevenueHistory] = useState<MonthlyRevenue[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const navigate = useNavigate();

  const fetchFinanceData = useCallback(async () => {
    try {
      const [
        { data: subscriptions },
        { data: payments },
        { count: totalOrgs }
      ] = await Promise.all([
        supabase.from('subscriptions').select('status, organization_id'),
        supabase.from('payment_history').select('*').order('payment_date', { ascending: false }),
        supabase.from('organizations').select('*', { count: 'exact', head: true })
      ]);

      const activeSubs = subscriptions?.filter(s => s.status === 'active') || [];
      const expiredSubs = subscriptions?.filter(s => s.status === 'expired' || s.status === 'cancelled') || [];
      
      // Calculate MRR (Simplified: active subs * 29.90 average)
      // In a real app, this would use actual subscription amounts
      const mrrValue = activeSubs.length * 29.90;
      const arrValue = mrrValue * 12;
      
      const totalRev = payments?.filter(p => p.status === 'confirmed' || p.status === 'paid')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
      
      const refunds = payments?.filter(p => p.status === 'refunded')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

      const churn = totalOrgs && totalOrgs > 0 ? (expiredSubs.length / totalOrgs) * 100 : 0;
      const arpu = activeSubs.length > 0 ? mrrValue / activeSubs.length : 0;

      setStats({
        mrr: mrrValue,
        arr: arrValue,
        totalRevenue: totalRev,
        churnRate: churn,
        avgRevenuePerOrg: arpu,
        activeSubscriptions: activeSubs.length,
        totalRefunds: refunds,
        pendingWithdrawals: 0, // Placeholder
      });

      // Prepare Chart Data (Last 6 Months)
      const months: MonthlyRevenue[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthRevenue = payments?.filter(p => 
          (p.status === 'confirmed' || p.status === 'paid') && 
          isSameMonth(new Date(p.payment_date), date)
        ).reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

        months.push({
          month: format(date, 'MMM', { locale: ptBR }),
          revenue: monthRevenue,
          subscribers: activeSubs.length, // Simplified
        });
      }
      setRevenueHistory(months);
      setRecentTransactions(payments?.slice(0, 5) || []);

    } catch (error) {
      console.error('Error fetching finance stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  const kpis = [
    {
      title: 'MRR (Mensal)',
      value: `$${(stats?.mrr || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      subtitle: 'Receita Recorrente Mensal',
      icon: TrendingUp,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      title: 'ARR (Anual)',
      value: `$${(stats?.arr || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      subtitle: 'Receita Recorrente Anual',
      icon: Calendar,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
    {
      title: 'Receita Total',
      value: `$${(stats?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      subtitle: 'Histórico de Faturamento',
      icon: Wallet,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    },
    {
      title: 'Net Churn Rate',
      value: `${(stats?.churnRate || 0).toFixed(1)}%`,
      subtitle: 'Taxa de Cancelamento',
      icon: Activity,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10'
    }
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8">
      <AnimatedContainer animation="fade-up">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Controlo Financeiro SaaS</h1>
            <p className="text-muted-foreground mt-1">Visão geral do desempenho financeiro do software e métricas críticas.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1">
              Live Data
            </Badge>
            <button 
              onClick={() => { setLoading(true); fetchFinanceData(); }}
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </button>
          </div>
        </div>
      </AnimatedContainer>

      {/* KPI Section */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <AnimatedContainer key={kpi.title} animation="fade-up" delay={0.05 * (i + 1)}>
            <Card className="hover:border-primary/20 transition-all cursor-default">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">{kpi.title}</CardTitle>
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-9 w-24" /> : <div className="text-3xl font-bold">{kpi.value}</div>}
                <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
              </CardContent>
            </Card>
          </AnimatedContainer>
        ))}
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-7">
        {/* Main Chart */}
        <AnimatedContainer animation="fade-up" delay={0.3} className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary" />
                Crescimento de Receita (USD)
              </CardTitle>
              <CardDescription>Receita confirmada nos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {loading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `$${val}`} width={55} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                        itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        name="Receita" 
                        stroke="#f97316" 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>

        {/* Distributed Metrics */}
        <AnimatedContainer animation="fade-up" delay={0.4} className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-primary" />
                Distribuição por Categoria
              </CardTitle>
              <CardDescription>Métricas de Eficiência Financeira</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ARPU (Médio por Agência)</span>
                  <span className="font-bold">${(stats?.avgRevenuePerOrg || 0).toFixed(2)}</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: '65%' }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Retenção de Receita (Net)</span>
                  <span className="font-bold">94.2%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '94.2%' }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Volume de Reembolsos</span>
                  <span className="font-bold">${(stats?.totalRefunds || 0).toFixed(2)}</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-red-400" style={{ width: stats?.totalRevenue ? `${(stats.totalRefunds / stats.totalRevenue) * 100}%` : '0%' }} />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-xs text-muted-foreground">Lucro Bruto</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                    <span className="text-xs text-muted-foreground">Custo Infra</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Recent Transactions List */}
      <AnimatedContainer animation="fade-up" delay={0.5}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Histórico Recente de Transações</CardTitle>
              <CardDescription>Monitoramento das últimas movimentações financeiras</CardDescription>
            </div>
            <button 
              onClick={() => navigate('/admin/subscriptions')}
              className="text-xs text-primary font-medium hover:underline px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/5 transition-all"
            >
              Visualizar Tudo
            </button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${tx.status === 'confirmed' || tx.status === 'paid' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Receipt className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{tx.description || 'Assinatura SaaS'}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(tx.payment_date), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">${Number(tx.amount).toFixed(2)} {tx.currency}</p>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] uppercase border-0 ${
                          tx.status === 'confirmed' || tx.status === 'paid' 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {tx.status === 'confirmed' || tx.status === 'paid' ? 'Confirmado' : 'Recusado'}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground italic">Sem transações recentes</div>
              )}
            </div>
          </CardContent>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
