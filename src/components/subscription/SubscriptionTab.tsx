import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, CheckCircle2, AlertCircle, Clock, Receipt, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_date: string;
  description: string | null;
}

export function SubscriptionTab() {
  const { user } = useAuth();
  const { loading, subscription, organization, isActive, isTrialing, trialDaysLeft, hasAccess, refetch } = useSubscription();
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!organization?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('payment_history')
          .select('*')
          .eq('organization_id', organization.id)
          .order('payment_date', { ascending: false });

        if (error) throw error;
        setPayments(data || []);
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setLoadingPayments(false);
      }
    };

    if (organization?.id) {
      fetchPayments();
    }
  }, [organization?.id]);

  const handleSubscribe = async () => {
    if (!organization?.id || !user?.email) {
      toast({
        title: 'Erro',
        description: 'Dados da organização não encontrados',
        variant: 'destructive',
      });
      return;
    }

    setCreatingCheckout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-checkout', {
        body: {
          organizationId: organization.id,
          userEmail: user.email,
          userName: user.user_metadata?.full_name,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create checkout');
      }

      const { checkoutUrl } = response.data;
      
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar o processo de assinatura',
        variant: 'destructive',
      });
    } finally {
      setCreatingCheckout(false);
    }
  };

  const getStatusBadge = () => {
    if (!subscription) {
      return <Badge variant="secondary">Sem assinatura</Badge>;
    }

    switch (subscription.status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Ativo</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Período de Teste</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pagamento Pendente</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelado</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirado</Badge>;
      default:
        return <Badge variant="secondary">{subscription.status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Confirmado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pendente</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'refunded':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Reembolsado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Status da Assinatura
          </CardTitle>
          <CardDescription>
            Gerencie sua assinatura do Qualify
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status atual</span>
            {getStatusBadge()}
          </div>

          {organization && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Organização</span>
              <span className="font-medium">{organization.name}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Valor mensal</span>
            <span className="font-bold text-lg">$7,00 USD <span className="text-sm text-muted-foreground line-through">$14</span></span>
          </div>

          {isTrialing && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Dias restantes do teste</span>
              <span className="font-medium text-blue-500">{trialDaysLeft} dias</span>
            </div>
          )}

          {subscription?.currentPeriodEnd && isActive && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Próxima renovação</span>
              <span className="font-medium">
                {format(new Date(subscription.currentPeriodEnd), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
          )}

          {subscription?.cancelAtPeriodEnd && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Assinatura será cancelada no fim do período</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trial Banner */}
      {isTrialing && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-600">Período de Teste Ativo</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Você tem {trialDaysLeft} dias restantes no seu período de teste gratuito. 
                  Assine agora para garantir acesso contínuo a todas as funcionalidades.
                </p>
                <Button 
                  onClick={handleSubscribe} 
                  disabled={creatingCheckout}
                  className="mt-4 gap-2"
                >
                  {creatingCheckout ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Assinar Agora - $7/mês
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Subscription */}
      {isActive && !subscription?.cancelAtPeriodEnd && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-600">Assinatura Ativa</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sua assinatura está ativa e você tem acesso completo a todas as funcionalidades do Qualify.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Subscription / Expired */}
      {!hasAccess && subscription?.status !== 'trialing' && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">Assinatura Necessária</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Seu período de teste expirou ou sua assinatura foi cancelada. 
                  Assine para continuar usando o Qualify.
                </p>
                <Button 
                  onClick={handleSubscribe} 
                  disabled={creatingCheckout}
                  className="mt-4 gap-2"
                >
                  {creatingCheckout ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Assinar Agora - $7/mês
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>O que está incluído</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {[
              'Gestão ilimitada de clientes',
              'Funil de vendas completo',
              'Fluxo operacional',
              'Assistente de IA por cliente',
              'Gestão de equipe',
              'Checklists personalizados',
              'Contratos digitais',
              'Base de conhecimento',
            ].map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Histórico de Pagamentos
          </CardTitle>
          <CardDescription>
            Veja todos os pagamentos realizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPayments ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum pagamento registrado ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div 
                  key={payment.id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {payment.status === 'confirmed' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : payment.status === 'failed' ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{payment.description || 'Assinatura'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.payment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      ${payment.amount.toFixed(2)} {payment.currency}
                    </span>
                    {getPaymentStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
