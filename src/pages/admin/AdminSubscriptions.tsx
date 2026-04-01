import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SubscriptionWithOrg {
  id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  organization: {
    name: string;
    trial_ends_at: string;
  } | null;
}

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`id, status, current_period_start, current_period_end, created_at, organization:organizations(name, trial_ends_at)`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subscriptions:', error);
      } else {
        setSubscriptions(data || []);
      }
      setLoading(false);
    };

    fetchSubscriptions();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      active: { className: 'bg-emerald-500/10 text-emerald-500', label: 'Activa' },
      trialing: { className: 'bg-yellow-500/10 text-yellow-500', label: 'Em Teste' },
      past_due: { className: 'bg-orange-500/10 text-orange-500', label: 'Atrasada' },
      cancelled: { className: 'bg-red-500/10 text-red-500', label: 'Cancelada' },
      expired: { className: 'bg-muted text-muted-foreground', label: 'Expirada' },
    };
    const variant = variants[status] || variants.expired;
    return <Badge className={`border-0 ${variant.className}`}>{variant.label}</Badge>;
  };

  const getExpiryInfo = (sub: SubscriptionWithOrg) => {
    const endDate = sub.current_period_end
      ? new Date(sub.current_period_end)
      : sub.organization?.trial_ends_at
        ? new Date(sub.organization.trial_ends_at)
        : null;

    if (!endDate) return { label: '—', urgent: false };

    const daysLeft = differenceInDays(endDate, new Date());
    const label = format(endDate, 'dd/MM/yyyy', { locale: ptBR });
    const urgent = sub.status === 'active' && daysLeft >= 0 && daysLeft <= 7;

    return { label, urgent, daysLeft };
  };

  const filterByStatus = (status: string | null) => {
    if (!status) return subscriptions;
    return subscriptions.filter(s => s.status === status);
  };

  const expiringCount = subscriptions.filter(s => {
    const end = s.current_period_end ? new Date(s.current_period_end) : null;
    if (!end || s.status !== 'active') return false;
    return differenceInDays(end, new Date()) <= 7;
  }).length;

  const statsCards = [
    {
      label: 'Total',
      value: subscriptions.length,
      icon: CreditCard,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Activas',
      value: filterByStatus('active').length,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Em Teste',
      value: filterByStatus('trialing').length,
      icon: Clock,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Expiram em 7 dias',
      value: expiringCount,
      icon: AlertCircle,
      color: expiringCount > 0 ? 'text-red-500' : 'text-muted-foreground',
      bg: expiringCount > 0 ? 'bg-red-500/10' : 'bg-muted',
    },
  ];

  const SubscriptionTable = ({ data }: { data: SubscriptionWithOrg[] }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organização</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Expiração</TableHead>
            <TableHead>Criada em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((sub) => {
            const expiry = getExpiryInfo(sub);
            return (
              <TableRow key={sub.id} className={expiry.urgent ? 'bg-red-500/5' : ''}>
                <TableCell className="font-medium">
                  {sub.organization?.name || '—'}
                </TableCell>
                <TableCell>{getStatusBadge(sub.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {sub.current_period_start
                    ? format(new Date(sub.current_period_start), 'dd/MM/yyyy', { locale: ptBR })
                    : '—'}
                </TableCell>
                <TableCell>
                  {expiry.urgent ? (
                    <span className="flex items-center gap-1.5 text-red-500 font-medium text-sm">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {expiry.label} ({expiry.daysLeft}d)
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">{expiry.label}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(sub.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
              </TableRow>
            );
          })}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                Nenhuma assinatura encontrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <AnimatedContainer animation="fade-up">
        <div>
          <h1 className="text-3xl font-bold">Assinaturas</h1>
          <p className="text-muted-foreground">Monitorizar e gerir as assinaturas do sistema</p>
        </div>
      </AnimatedContainer>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((s, i) => (
          <AnimatedContainer key={s.label} animation="fade-up" delay={0.05 * (i + 1)}>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${s.bg} shrink-0`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  {loading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold">{s.value}</p>}
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </AnimatedContainer>
        ))}
      </div>

      <AnimatedContainer animation="fade-up" delay={0.15}>
        <Card>
          <CardHeader>
            <CardTitle>Lista de Assinaturas ({subscriptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">Todas ({subscriptions.length})</TabsTrigger>
                  <TabsTrigger value="active">Activas ({filterByStatus('active').length})</TabsTrigger>
                  <TabsTrigger value="trialing">Em Teste ({filterByStatus('trialing').length})</TabsTrigger>
                  <TabsTrigger value="expired">
                    Expiradas ({filterByStatus('expired').length + filterByStatus('cancelled').length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="all">
                  <SubscriptionTable data={subscriptions} />
                </TabsContent>
                <TabsContent value="active">
                  <SubscriptionTable data={filterByStatus('active')} />
                </TabsContent>
                <TabsContent value="trialing">
                  <SubscriptionTable data={filterByStatus('trialing')} />
                </TabsContent>
                <TabsContent value="expired">
                  <SubscriptionTable data={[...filterByStatus('expired'), ...filterByStatus('cancelled')]} />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
