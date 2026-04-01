import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, TrendingUp, AlertCircle, Clock, History, Receipt, DollarSign } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SubscriptionWithOrg {
  id: string;
  organization_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  organization: {
    name: string;
    trial_ends_at: string;
  } | null;
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_date: string;
  description: string | null;
}

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOrg, setHistoryOrg] = useState<{ id: string; name: string } | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchSubscriptions = async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`id, organization_id, status, current_period_start, current_period_end, created_at, organization:organizations(name, trial_ends_at)`)
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

  const fetchPaymentHistory = async (orgId: string) => {
    setLoadingHistory(true);
    setCurrentPage(1);
    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('organization_id', orgId)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Error fetching payment history:', error);
    } else {
      setPayments(data || []);
    }
    setLoadingHistory(false);
  };

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

  const getPaymentStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    const map: Record<string, { label: string; className: string }> = {
      paid: { label: 'Pago', className: 'bg-emerald-500/10 text-emerald-500' },
      confirmed: { label: 'Confirmado', className: 'bg-emerald-500/10 text-emerald-500' },
      success: { label: 'Sucesso', className: 'bg-emerald-500/10 text-emerald-500' },
      pending: { label: 'Pendente', className: 'bg-amber-500/10 text-amber-500' },
      failed: { label: 'Falhou', className: 'bg-primary/10 text-primary' },
      refused: { label: 'Recusado', className: 'bg-primary/10 text-primary' },
      rejected: { label: 'Rejeitado', className: 'bg-primary/10 text-primary' },
      refunded: { label: 'Reembolsado', className: 'bg-blue-500/10 text-blue-500' },
    };
    const entry = map[s] || { label: status, className: 'bg-muted text-muted-foreground' };
    return <Badge className={`border-0 ${entry.className}`}>{entry.label}</Badge>;
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

  const paginatedPayments = payments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(payments.length / itemsPerPage);

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
              <TableRow 
                key={sub.id} 
                className={`cursor-pointer hover:bg-muted/50 transition-colors ${expiry.urgent ? 'bg-red-500/5' : ''}`}
                onClick={() => {
                  setHistoryOrg({ id: sub.organization_id, name: sub.organization?.name || 'Agência' });
                  fetchPaymentHistory(sub.organization_id);
                }}
              >
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

      {/* History Dialog */}
      <Dialog open={!!historyOrg} onOpenChange={(open) => !open && setHistoryOrg(null)}>
        <DialogContent className="max-w-2xl bg-[#0F0F0F] border-stone-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <History className="h-5 w-5 text-primary" />
              Histórico de Pagamentos
            </DialogTitle>
            <DialogDescription className="text-stone-400">
              Transações financeiras da agência <span className="font-semibold text-stone-200">{historyOrg?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {loadingHistory ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full opacity-10" />)}
              </div>
            ) : payments.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-md border border-stone-800 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-stone-900/50 border-stone-800 hover:bg-stone-900/50">
                        <TableHead className="text-stone-400">Data</TableHead>
                        <TableHead className="text-stone-400">Descrição</TableHead>
                        <TableHead className="text-stone-400">Valor</TableHead>
                        <TableHead className="text-right text-stone-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPayments.map((p) => (
                        <TableRow key={p.id} className="border-stone-800 hover:bg-stone-900/20">
                          <TableCell className="text-sm whitespace-nowrap text-stone-300">
                            {format(new Date(p.payment_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2 text-stone-200 font-medium">
                              <Receipt className="h-3.5 w-3.5 text-stone-500" />
                              {p.description || 'Assinatura mensal Qualify'}
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-stone-100">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5 text-stone-500" />
                              {p.amount.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} {p.currency}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {getPaymentStatusBadge(p.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-2 py-2">
                    <p className="text-xs text-stone-500">
                      Página {currentPage} de {totalPages} ({payments.length} transações)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="h-8 border-stone-800 hover:bg-stone-900 text-stone-400"
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="h-8 border-stone-800 hover:bg-stone-900 text-stone-400"
                      >
                        Próximo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-stone-900/20 rounded-xl border border-dashed border-stone-800">
                <Receipt className="h-10 w-10 mx-auto text-stone-700 mb-3" />
                <p className="text-stone-500 italic">Nenhum histórico de pagamentos encontrado para esta agência.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
