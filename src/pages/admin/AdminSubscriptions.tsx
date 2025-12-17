import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
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
        .select(`
          id,
          status,
          current_period_start,
          current_period_end,
          created_at,
          organization:organizations(name, trial_ends_at)
        `)
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
      active: { className: 'bg-green-500/10 text-green-500', label: 'Ativa' },
      trialing: { className: 'bg-yellow-500/10 text-yellow-500', label: 'Em Teste' },
      past_due: { className: 'bg-orange-500/10 text-orange-500', label: 'Atrasada' },
      cancelled: { className: 'bg-red-500/10 text-red-500', label: 'Cancelada' },
      expired: { className: 'bg-muted text-muted-foreground', label: 'Expirada' },
    };
    const variant = variants[status] || variants.expired;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const filterByStatus = (status: string | null) => {
    if (!status) return subscriptions;
    return subscriptions.filter(s => s.status === status);
  };

  const SubscriptionTable = ({ data }: { data: SubscriptionWithOrg[] }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organização</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Início do Período</TableHead>
            <TableHead>Fim do Período</TableHead>
            <TableHead>Criada em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((sub) => (
            <TableRow key={sub.id}>
              <TableCell className="font-medium">
                {sub.organization?.name || '-'}
              </TableCell>
              <TableCell>{getStatusBadge(sub.status)}</TableCell>
              <TableCell>
                {sub.current_period_start
                  ? format(new Date(sub.current_period_start), 'dd/MM/yyyy', { locale: ptBR })
                  : '-'}
              </TableCell>
              <TableCell>
                {sub.current_period_end
                  ? format(new Date(sub.current_period_end), 'dd/MM/yyyy', { locale: ptBR })
                  : sub.organization?.trial_ends_at
                    ? format(new Date(sub.organization.trial_ends_at), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'}
              </TableCell>
              <TableCell>
                {format(new Date(sub.created_at), 'dd/MM/yyyy', { locale: ptBR })}
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
          <p className="text-muted-foreground">Gerenciar assinaturas do sistema</p>
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="fade-up" delay={0.1}>
        <Card>
          <CardHeader>
            <CardTitle>Assinaturas ({subscriptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">Todas ({subscriptions.length})</TabsTrigger>
                  <TabsTrigger value="active">Ativas ({filterByStatus('active').length})</TabsTrigger>
                  <TabsTrigger value="trialing">Em Teste ({filterByStatus('trialing').length})</TabsTrigger>
                  <TabsTrigger value="expired">Expiradas ({filterByStatus('expired').length + filterByStatus('cancelled').length})</TabsTrigger>
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
