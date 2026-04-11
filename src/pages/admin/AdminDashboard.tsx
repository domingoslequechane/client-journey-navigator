import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users, Building2, CreditCard, MessageSquare, TrendingUp,
  AlertCircle, Sparkles, Activity, Clock, ArrowUpRight, ArrowDownRight,
  Minus, HeadphonesIcon, Bell, Wallet
} from 'lucide-react';
import { NotificationCreator } from '@/components/admin/NotificationCreator';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  totalUsers: number;
  totalOrganizations: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  expiredSubscriptions: number;
  pendingFeedbacks: number;
  totalFeedbacks: number;
  openTickets: number;
  mrr: number;
  totalRevenue: number;
  churnRate: number;
}

interface GrowthDataPoint {
  month: string;
  users: number;
  organizations: number;
}

interface RecentUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
}

interface RecentTicket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  user_name?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [prevStats, setPrevStats] = useState<DashboardStats | null>(null);
  const prevStatsRef = useRef<DashboardStats | null>(null);

  const fetchGrowthData = useCallback(async () => {
    const months: GrowthDataPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date).toISOString();
      const end = endOfMonth(date).toISOString();

      const [{ count: users }, { count: orgs }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('created_at', start).lte('created_at', end),
        supabase.from('organizations').select('*', { count: 'exact', head: true })
          .gte('created_at', start).lte('created_at', end),
      ]);

      months.push({
        month: format(date, 'MMM', { locale: ptBR }),
        users: users || 0,
        organizations: orgs || 0,
      });
    }
    setGrowthData(months);
  }, []);

  const fetchRecentActivity = useCallback(async () => {
    const [{ data: users }, { data: ticketsData }] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, created_at')
        .order('created_at', { ascending: false }).limit(5),
      supabase.from('support_tickets').select('id, subject, status, created_at, user_id')
        .order('created_at', { ascending: false }).limit(5),
    ]);

    setRecentUsers(users || []);

    if (ticketsData && ticketsData.length > 0) {
      const userIds = [...new Set(ticketsData.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles').select('id, full_name').in('id', userIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));
      setRecentTickets(ticketsData.map(t => ({
        ...t,
        user_name: profileMap.get(t.user_id) || 'Utilizador',
      })));
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const [
        { count: totalUsers },
        { count: totalOrganizations },
        { data: subscriptions },
        { data: payments },
        { count: pendingFeedbacks },
        { count: totalFeedbacks },
        { count: openTickets },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('status, organization_id'),
        supabase.from('payment_history').select('amount, status'),
        supabase.from('feedbacks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('feedbacks').select('*', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);

      const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0;
      const trialingSubscriptions = subscriptions?.filter(s => s.status === 'trialing').length || 0;
      const expiredSubscriptions = subscriptions?.filter(s =>
        s.status === 'expired' || s.status === 'cancelled'
      ).length || 0;

      // Simplified MRR: (Average revenue per sub - let's assume 30 for now or calculate from payments)
      // Actually, let's just sum payments in the last month for a better estimate or just show total revenue
      const totalRevenue = payments?.filter(p => p.status === 'confirmed' || p.status === 'paid')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
      
      const mrr = activeSubscriptions * 29.90; // Fallback estimate
      const churnRate = totalOrganizations > 0 ? (expiredSubscriptions / totalOrganizations) * 100 : 0;

      const newStats: DashboardStats = {
        totalUsers: totalUsers || 0,
        totalOrganizations: totalOrganizations || 0,
        activeSubscriptions,
        trialingSubscriptions,
        expiredSubscriptions,
        pendingFeedbacks: pendingFeedbacks || 0,
        totalFeedbacks: totalFeedbacks || 0,
        openTickets: openTickets || 0,
        mrr,
        totalRevenue,
        churnRate,
      };

      setPrevStats(prevStatsRef.current);
      setStats(newStats);
      prevStatsRef.current = newStats;
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchGrowthData();
    fetchRecentActivity();

    const profilesChannel = supabase.channel('admin-profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchStats(); fetchRecentActivity();
      }).subscribe();

    const orgsChannel = supabase.channel('admin-orgs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organizations' }, () => {
        fetchStats();
      }).subscribe();

    const subsChannel = supabase.channel('admin-subs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => {
        fetchStats();
      }).subscribe();

    const feedbacksChannel = supabase.channel('admin-feedbacks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks' }, () => {
        fetchStats();
      }).subscribe();

    const membersChannel = supabase.channel('admin-members-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organization_members' }, () => {
        fetchStats();
      }).subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(orgsChannel);
      supabase.removeChannel(subsChannel);
      supabase.removeChannel(feedbacksChannel);
    };
  }, [fetchStats, fetchGrowthData, fetchRecentActivity]);

  const getTrend = (current: number, previous: number | null | undefined) => {
    if (previous == null) return null;
    const diff = current - previous;
    if (diff === 0) return { icon: Minus, color: 'text-muted-foreground', label: 'Sem mudança' };
    if (diff > 0) return { icon: ArrowUpRight, color: 'text-emerald-500', label: `+${diff}` };
    return { icon: ArrowDownRight, color: 'text-rose-500', label: `${diff}` };
  };

  const statCards = [
    {
      title: 'MRR (Previsto)',
      value: stats?.mrr || 0,
      displayValue: `$${(stats?.mrr || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}`,
      prev: prevStats?.mrr,
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      action: () => navigate('/admin/finance'),
    },
    {
      title: 'Receita Total',
      value: stats?.totalRevenue || 0,
      displayValue: `$${(stats?.totalRevenue || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}`,
      prev: prevStats?.totalRevenue,
      icon: Wallet,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      action: () => navigate('/admin/finance'),
    },
    {
      title: 'Taxa de Churn',
      value: stats?.churnRate || 0,
      displayValue: `${(stats?.churnRate || 0).toFixed(1)}%`,
      prev: prevStats?.churnRate,
      icon: Activity,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      action: () => navigate('/admin/finance'),
    },
    {
      title: 'Utilizadores',
      value: stats?.totalUsers || 0,
      displayValue: stats?.totalUsers || 0,
      prev: prevStats?.totalUsers,
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      action: () => navigate('/admin/users'),
    },
    {
      title: 'Assinaturas Activas',
      value: stats?.activeSubscriptions || 0,
      displayValue: stats?.activeSubscriptions || 0,
      prev: prevStats?.activeSubscriptions,
      icon: CreditCard,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      action: () => navigate('/admin/subscriptions'),
    },
    {
      title: 'Em Período de Teste',
      value: stats?.trialingSubscriptions || 0,
      displayValue: stats?.trialingSubscriptions || 0,
      prev: prevStats?.trialingSubscriptions,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      action: () => navigate('/admin/subscriptions'),
    },
    {
      title: 'Tickets Abertos',
      value: stats?.openTickets || 0,
      displayValue: stats?.openTickets || 0,
      prev: prevStats?.openTickets,
      icon: HeadphonesIcon,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      action: () => navigate('/admin/support'),
    },
  ];

  const now = new Date();

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8">

      {/* Header */}
      <AnimatedContainer animation="fade-up">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground mt-1 text-xs md:text-sm">
              {format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })} &bull; Visão geral
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationCreator />
          </div>
        </div>
      </AnimatedContainer>

      {/* KPI Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.slice(0, 4).map((card, index) => {
          const trend = getTrend(card.value, card.prev);
          return (
            <AnimatedContainer key={card.title} animation="fade-up" delay={0.05 * (index + 1)}>
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${card.action ? 'hover:border-primary/40' : ''}`}
                onClick={card.action || undefined}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-7 md:h-8 w-20" />
                  ) : (
                    <div className="flex items-end justify-between">
                      <p className="text-xl md:text-3xl font-bold">{card.displayValue}</p>
                      {trend && (
                        <div className={`flex items-center gap-1 text-xs font-medium ${trend.color}`}>
                          <trend.icon className="h-3.5 w-3.5" />
                          <span>{trend.label}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </AnimatedContainer>
          );
        })}
      </div>

      {/* Secondary KPI Row */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3">
        {statCards.slice(4).map((card, index) => {
          const trend = getTrend(card.value, card.prev);
          return (
            <AnimatedContainer key={card.title} animation="fade-up" delay={0.05 * (index + 5)}>
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${card.action ? 'hover:border-primary/40' : ''}`}
                onClick={card.action || undefined}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${card.bgColor} shrink-0`}>
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted-foreground truncate">{card.title}</p>
                      {loading ? (
                        <Skeleton className="h-7 w-12 mt-1" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold">{card.displayValue}</p>
                          {trend && (
                            <span className={`text-xs font-medium ${trend.color} flex items-center gap-0.5`}>
                              <trend.icon className="h-3 w-3" />
                              {trend.label}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedContainer>
          );
        })}
      </div>

      {/* Growth Chart + Activity Feed */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">

        {/* Growth Chart */}
        <AnimatedContainer animation="fade-up" delay={0.3} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Crescimento — Últimos 6 Meses
              </CardTitle>
              <CardDescription>Novos utilizadores e organizações por mês</CardDescription>
            </CardHeader>
            <CardContent>
              {growthData.length === 0 ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={growthData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOrgs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                    />
                    <Area type="monotone" dataKey="users" name="Utilizadores" stroke="#3b82f6" strokeWidth={2} fill="url(#colorUsers)" dot={{ r: 4, fill: '#3b82f6' }} />
                    <Area type="monotone" dataKey="organizations" name="Organizações" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorOrgs)" dot={{ r: 4, fill: '#8b5cf6' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </AnimatedContainer>

        {/* Activity Feed */}
        <AnimatedContainer animation="fade-up" delay={0.35}>
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Actividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-1 overflow-y-auto max-h-[300px]">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))
              ) : recentUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma actividade recente</p>
              ) : (
                recentUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs bg-blue-500/10 text-blue-600">
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : (user.email?.charAt(0).toUpperCase() || '?')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{user.full_name || user.email || 'Utilizador'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {user.created_at
                          ? format(new Date(user.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })
                          : '—'}
                      </p>
                    </div>
                    <Badge className="text-[9px] bg-blue-500/10 text-blue-500 border-0 shrink-0">Novo</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Recent Support Tickets */}
      {recentTickets.length > 0 && (
        <AnimatedContainer animation="fade-up" delay={0.4}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HeadphonesIcon className="h-4 w-4 text-primary" />
                  Últimos Tickets de Suporte
                </CardTitle>
                <CardDescription>Tickets criados recentemente</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/support')} className="text-xs">
                Ver todos
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentTickets.map(ticket => (
                  <div key={ticket.id} className="flex items-start xs:items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">{ticket.user_name} &bull; {format(new Date(ticket.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                    <Badge
                      className={ticket.status === 'open'
                        ? 'bg-emerald-500/10 text-emerald-500 border-0 shrink-0 ml-3'
                        : 'bg-muted text-muted-foreground border-0 shrink-0 ml-3'}
                    >
                      {ticket.status === 'open' ? 'Aberto' : 'Fechado'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>
      )}
    </div>
  );
}
