import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Loader2, CheckCircle2, Clock, Receipt, XCircle, Compass, Target, 
  TrendingUp, Rocket, Sparkles, AlertTriangle, ExternalLink, RotateCcw, CreditCard 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { PlanUsageCard } from './PlanUsageCard';

import planLanca from '@/assets/plans/plan-lanca.png';
import planArco from '@/assets/plans/plan-arco.png';
import planCatapulta from '@/assets/plans/plan-catapulta.png';

interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_date: string;
  description: string | null;
}

const PLAN_CONFIG = {
  free: {
    name: 'Bússola',
    icon: Compass,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    image: planLanca,
    price: 'Legado',
    features: ['3 clientes ativos', 'Funil ilimitado', '3 contratos/mês', '90 msgs IA/mês']
  },
  starter: {
    name: 'Lança',
    icon: Target,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    image: planLanca,
    price: '$19/mês',
    features: ['15 clientes ativos', 'Contratos e faturas', '500 msgs IA', 'Academia completa']
  },
  pro: {
    name: 'Arco',
    icon: TrendingUp,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    image: planArco,
    price: '$39/mês',
    features: ['50 clientes ativos', 'Todos os documentos', '1200 msgs IA', 'Academia + IA']
  },
  agency: {
    name: 'Catapulta',
    icon: Rocket,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    image: planCatapulta,
    price: '$79/mês',
    features: ['Clientes ilimitados', 'Docs ilimitados', 'IA ilimitada', 'Suporte prioritário']
  },
};

export function SubscriptionTab() {
  const { user } = useAuth();
  const { 
    loading, subscription, organization, isActive, isPaidPlan, planType, 
    isPastDue, cancelAtPeriodEnd, refetch 
  } = useSubscription();
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const currentPlan = PLAN_CONFIG[planType] || PLAN_CONFIG.free;
  const PlanIcon = currentPlan.icon;

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

  const handleManagePayment = async () => {
    if (!organization?.id) return;
    
    setActionLoading('portal');
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: {
          action: 'get-portal-url',
          organizationId: organization.id,
        },
      });

      if (error) throw error;

      if (data?.customerPortalUrl) {
        window.open(data.customerPortalUrl, '_blank');
      } else {
        throw new Error('URL do portal não encontrada');
      }
    } catch (error: any) {
      console.error('Error getting portal URL:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível abrir o portal de pagamento',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!organization?.id) return;
    
    setActionLoading('cancel');
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: {
          action: 'cancel',
          organizationId: organization.id,
        },
      });

      if (error) throw error;

      toast({
        title: 'Assinatura cancelada',
        description: 'Sua assinatura será cancelada no final do período atual.',
      });

      await refetch();
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar a assinatura',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeSubscription = async () => {
    if (!organization?.id) return;
    
    setActionLoading('resume');
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: {
          action: 'resume',
          organizationId: organization.id,
        },
      });

      if (error) throw error;

      toast({
        title: 'Assinatura reativada',
        description: 'Sua assinatura continuará normalmente.',
      });

      await refetch();
    } catch (error: any) {
      console.error('Error resuming subscription:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reativar a assinatura',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className={cn(currentPlan.bgColor, currentPlan.color, currentPlan.borderColor)}>Confirmado</Badge>;
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
      {/* Past Due Alert */}
      {isPastDue && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Pagamento em atraso</AlertTitle>
          <AlertDescription>
            O pagamento da sua assinatura falhou. Por favor, atualize seu método de pagamento para evitar a suspensão do serviço.
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 gap-2"
              onClick={handleManagePayment}
              disabled={actionLoading === 'portal'}
            >
              {actionLoading === 'portal' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Atualizar Pagamento
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Cancellation Alert */}
      {cancelAtPeriodEnd && subscription?.currentPeriodEnd && (
        <Alert className="border-yellow-500/30 bg-yellow-500/5">
          <Clock className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-600">Cancelamento Pendente</AlertTitle>
          <AlertDescription>
            Sua assinatura será cancelada em{' '}
            <strong>{format(new Date(subscription.currentPeriodEnd), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</strong>.
            Você continuará tendo acesso até essa data.
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 gap-2"
              onClick={handleResumeSubscription}
              disabled={actionLoading === 'resume'}
            >
              {actionLoading === 'resume' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Manter Assinatura
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan Card */}
      <Card 
        className={cn(
          "border-2", 
          currentPlan.borderColor,
          isPaidPlan && isActive && "neon-pulse"
        )}
        style={isPaidPlan && isActive ? { 
          '--neon-color': `hsl(var(--primary))` 
        } as React.CSSProperties : undefined}
      >
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <img 
                src={currentPlan.image} 
                alt={`Plano ${currentPlan.name}`}
                className="h-12 w-12 sm:h-16 sm:w-16 object-contain"
              />
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <PlanIcon className={cn("h-4 w-4 sm:h-5 sm:w-5", currentPlan.color)} />
                  Plano {currentPlan.name}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {isPaidPlan && isActive ? 'Sua assinatura está ativa' : 'Você não possui assinatura ativa'}
                </CardDescription>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className={cn("text-xl sm:text-2xl font-bold", currentPlan.color)}>{currentPlan.price}</span>
              {isActive && subscription?.currentPeriodEnd && !cancelAtPeriodEnd && (
                <p className="text-xs text-muted-foreground mt-1">
                  Renova em {format(new Date(subscription.currentPeriodEnd), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {currentPlan.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-xs sm:text-sm">
                <CheckCircle2 className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0", currentPlan.color)} />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* Management buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-4 border-t">
            {/* Payment management - only for paid plans */}
            {isPaidPlan && isActive && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleManagePayment}
                  disabled={actionLoading === 'portal'}
                  className="gap-2 w-full sm:w-auto text-xs sm:text-sm"
                >
                  {actionLoading === 'portal' ? (
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin shrink-0" />
                  ) : (
                    <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                  )}
                  <span className="hidden sm:inline">Gerenciar Pagamento</span>
                  <span className="sm:hidden">Pagamento</span>
                </Button>

                {!cancelAtPeriodEnd && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <XCircle className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        <span className="hidden sm:inline">Cancelar Assinatura</span>
                        <span className="sm:hidden">Cancelar</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza que deseja cancelar?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Sua assinatura será cancelada no final do período atual 
                          ({subscription?.currentPeriodEnd ? format(new Date(subscription.currentPeriodEnd), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'data não disponível'}).
                          Você continuará tendo acesso aos recursos do plano {currentPlan.name} até essa data.
                          Após o cancelamento, você perderá o acesso às funcionalidades do sistema.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Manter Assinatura</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelSubscription}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={actionLoading === 'cancel'}
                        >
                          {actionLoading === 'cancel' ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Confirmar Cancelamento
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Usage Card */}
      <PlanUsageCard />

      {/* Upgrade CTA for Free Plan */}
      {!isPaidPlan && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary">Desbloqueie mais recursos</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Faça upgrade para ter mais clientes, membros na equipe, contratos e mensagens de IA.
                </p>
                <Link to="/app/upgrade">
                  <Button className="mt-4 gap-2">
                    <Sparkles className="h-4 w-4" />
                    Ver Planos
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Subscription Info */}
      {isActive && !cancelAtPeriodEnd && !isPastDue && isPaidPlan && (
        <Card className={cn(currentPlan.borderColor, currentPlan.bgColor)}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className={cn("p-3 rounded-full", currentPlan.bgColor)}>
                <CheckCircle2 className={cn("h-6 w-6", currentPlan.color)} />
              </div>
              <div className="flex-1">
                <h3 className={cn("font-semibold", currentPlan.color)}>Assinatura Ativa</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sua assinatura está ativa. Você tem acesso a todas as funcionalidades do plano {currentPlan.name}.
                </p>
                {planType !== 'agency' && (
                  <Link to="/app/upgrade">
                    <Button variant="outline" className="mt-4 gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Fazer Upgrade
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {payment.status === 'confirmed' ? (
                      <CheckCircle2 className={cn("h-5 w-5 shrink-0", currentPlan.color)} />
                    ) : payment.status === 'failed' ? (
                      <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                    ) : (
                      <Clock className="h-5 w-5 shrink-0 text-yellow-500" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{payment.description || 'Assinatura'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.payment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0">
                    <span className="font-medium text-sm">
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

