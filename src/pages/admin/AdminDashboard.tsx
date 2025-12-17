import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Building2, CreditCard, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';
import { NotificationCreator } from '@/components/admin/NotificationCreator';

interface DashboardStats {
  totalUsers: number;
  totalOrganizations: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  expiredSubscriptions: number;
  pendingFeedbacks: number;
  totalFeedbacks: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch all stats in parallel
        const [
          { count: totalUsers },
          { count: totalOrganizations },
          { data: subscriptions },
          { count: pendingFeedbacks },
          { count: totalFeedbacks },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('organizations').select('*', { count: 'exact', head: true }),
          supabase.from('subscriptions').select('status'),
          supabase.from('feedbacks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('feedbacks').select('*', { count: 'exact', head: true }),
        ]);

        const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0;
        const trialingSubscriptions = subscriptions?.filter(s => s.status === 'trialing').length || 0;
        const expiredSubscriptions = subscriptions?.filter(s => 
          s.status === 'expired' || s.status === 'cancelled'
        ).length || 0;

        setStats({
          totalUsers: totalUsers || 0,
          totalOrganizations: totalOrganizations || 0,
          activeSubscriptions,
          trialingSubscriptions,
          expiredSubscriptions,
          pendingFeedbacks: pendingFeedbacks || 0,
          totalFeedbacks: totalFeedbacks || 0,
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total de Usuários',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Organizações',
      value: stats?.totalOrganizations || 0,
      icon: Building2,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Assinaturas Ativas',
      value: stats?.activeSubscriptions || 0,
      icon: CreditCard,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Em Período de Teste',
      value: stats?.trialingSubscriptions || 0,
      icon: TrendingUp,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Assinaturas Expiradas',
      value: stats?.expiredSubscriptions || 0,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Feedbacks Pendentes',
      value: stats?.pendingFeedbacks || 0,
      description: `${stats?.totalFeedbacks || 0} total`,
      icon: MessageSquare,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <AnimatedContainer animation="fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Visão geral do sistema</p>
          </div>
          <NotificationCreator />
        </div>
      </AnimatedContainer>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card, index) => (
          <AnimatedContainer key={card.title} animation="fade-up" delay={0.1 * (index + 1)}>
            <Card>
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
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <p className="text-2xl font-bold">{card.value}</p>
                    {card.description && (
                      <p className="text-xs text-muted-foreground">{card.description}</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </AnimatedContainer>
        ))}
      </div>
    </div>
  );
}
