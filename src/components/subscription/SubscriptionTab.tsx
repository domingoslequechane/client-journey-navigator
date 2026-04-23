import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useOrganization } from '@/hooks/useOrganization';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Loader2, CheckCircle2, Clock, Receipt, XCircle, Compass, Target, 
  TrendingUp, Rocket, Sparkles, AlertTriangle, ExternalLink, RotateCcw, CreditCard, Zap,
  Crown, ArrowRight, X, Smartphone, Building2, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PaymentProofUpload } from '@/components/billing/PaymentProofUpload';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { PlanUsageCard } from './PlanUsageCard';
import { usePermissions } from '@/hooks/usePermissions';

import planLanca from '@/assets/plans/plan-lanca.png';
import planArco from '@/assets/plans/plan-arco.png';
import planCatapulta from '@/assets/plans/plan-catapulta.png';

import visaLogo from '@/assets/payment/visa.png';
import mpesaLogo from '@/assets/payment/mpesa.png';
import emolaLogo from '@/assets/payment/emola.png';

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
  trial: {
    name: 'Trial',
    icon: Zap,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    image: planLanca,
    price: '7 dias grátis',
    features: ['2 clientes ativos', '2 árvores Link23', '2 chats QIA', 'Studio Criativo (5/dia)']
  },
  starter: {
    name: 'Lança',
    icon: Target,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    image: planLanca,
    price: '$19/mês',
    priceUSD: 19,
    features: ['5 clientes ativos', 'Contratos e faturas', '500 msgs IA', 'Academia completa']
  },
  pro: {
    name: 'Arco',
    icon: TrendingUp,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    image: planArco,
    price: '$54/mês',
    priceUSD: 54,
    features: ['15 clientes ativos', 'Todos os documentos', '1200 msgs IA', 'Academia + IA']
  },
  agency: {
    name: 'Catapulta',
    icon: Rocket,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    image: planCatapulta,
    price: '$99/mês',
    priceUSD: 99,
    features: ['30 clientes ativos', 'Docs ilimitados', 'IA ilimitada', 'Suporte prioritário']
  },
};

export function SubscriptionTab() {
  const { user } = useAuth();
  const { currency, currencySymbol } = useOrganization();
  const { 
    loading, subscription, organization, isActive, isPaidPlan, planType, 
    isPastDue, cancelAtPeriodEnd, isExpired, hasActiveSubscription, refetch,
    trialDaysLeft, isTrialing
  } = useSubscription();

  const isMZN = currency === 'MZN';
  const exchangeRate = isMZN ? 65 : 1; 

  const formatPrice = (usd: number) => {
    if (isMZN) return `${currencySymbol} ${(usd * exchangeRate).toLocaleString('pt-PT')}`;
    return `$${usd}`;
  }
  const location = useLocation();
  const navigate = useNavigate();
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Upgrade flow state
  type UpgradePlanKey = 'starter' | 'pro' | 'agency';
  type PaymentStep = 'plans' | 'method' | 'proof';
  type PaymentMethodKey = 'card' | 'mpesa' | 'emola';
  const [upgradeStep, setUpgradeStep] = useState<PaymentStep>('plans');
  const [selectedPlan, setSelectedPlan] = useState<UpgradePlanKey | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodKey | null>(null);
  const { isOwner, hasPrivilege } = usePermissions();
  
  const canManageSubscription = isOwner || hasPrivilege('finance');

  const PAYMENT_METHODS = [
    {
      key: 'card' as const,
      label: 'Cartão de Crédito / Débito',
      description: 'Pagamento seguro via LemonSqueezy',
      icon: CreditCard,
      image: mpesaLogo, // Note: fixing user's reversed upload here
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
    },
    {
      key: 'mpesa' as const,
      label: 'M-Pesa',
      description: 'Vodacom Moçambique',
      icon: Smartphone,
      image: visaLogo, // Note: fixing user's reversed upload here
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
    },
    {
      key: 'emola' as const,
      label: 'E-Mola',
      description: 'Movitel Moçambique',
      icon: Smartphone,
      image: emolaLogo,
      color: 'text-green-600',
      bg: 'bg-green-600/10',
      border: 'border-green-600/30',
    },
  ] as const;

  const MOBILE_MONEY_INFO: Record<'mpesa' | 'emola', { number: string; name: string; instructions: string[] }> = {
    mpesa: {
      number: '+258 84 796 9224',
      name: 'Domingos Francisco Lequechane',
      instructions: [
        'Abra o M-Pesa no seu telemóvel',
        'Seleccione "Enviar Dinheiro"',
        'Introduza o número acima',
        'Introduza o valor correspondente ao plano',
        'Confirme com o seu PIN',
        'Tire screenshot do comprovativo e carregue abaixo',
      ],
    },
    emola: {
      number: '+258 87 575 3118',
      name: 'Domingos Francisco Lequechane',
      instructions: [
        'Abra o E-Mola no seu telemóvel',
        'Seleccione "Transferir"',
        'Introduza o número acima',
        'Introduza o valor correspondente ao plano',
        'Confirme a transferência',
        'Tire screenshot do comprovativo e carregue abaixo',
      ],
    },
  };

  const openUpgradeModal = () => {
    if (!canManageSubscription) {
      toast({
        title: 'Acesso Restrito',
        description: 'Apenas o dono da agência ou financeiro pode alterar o plano.',
        variant: 'destructive',
      });
      return;
    }
    setUpgradeStep('plans');
    setSelectedPlan(null);
    setSelectedMethod(null);
    setShowUpgradeModal(true);
  };

  const handlePlanSelected = (planKey: UpgradePlanKey) => {
    setSelectedPlan(planKey);
    setUpgradeStep('method');
  };

  const handleMethodSelected = async (method: PaymentMethodKey) => {
    setSelectedMethod(method);
    if (method === 'card') {
      if (!selectedPlan) return;
      await handleCreateCheckout(selectedPlan);
    } else {
      setUpgradeStep('proof');
    }
  };

  const handleProofSuccess = () => {
    setShowUpgradeModal(false);
    setUpgradeStep('plans');
    setSelectedPlan(null);
    setSelectedMethod(null);
    toast({ title: 'Comprovativo enviado!', description: 'A nossa equipa irá validar e activar o seu plano em breve.' });
  };

  const UPGRADE_PLANS = [
    {
      key: 'starter' as const,
      name: 'Lança',
      priceUSD: 19,
      period: '/mês',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      primary: 'hsl(217, 91%, 60%)',
      image: planLanca,
      description: 'Para Pequenas Agências',
      features: ['5 clientes ativos', '5 membros de equipe', '5 Studio AI/dia', 'Finanças + Editorial + Link23', '500 msgs IA/mês'],
    },
    {
      key: 'pro' as const,
      name: 'Arco',
      priceUSD: 54,
      period: '/mês',
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      primary: 'hsl(270, 91%, 65%)',
      image: planArco,
      description: 'Agência em Crescimento',
      popular: true,
      features: ['15 clientes ativos', '10 membros de equipe', '15 Studio AI/dia', 'Inbox + Analytics', '1200 msgs IA/mês'],
    },
    {
      key: 'agency' as const,
      name: 'Catapulta',
      priceUSD: 99,
      period: '/mês',
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      primary: 'hsl(25, 95%, 53%)',
      image: planCatapulta,
      description: 'Agência Consolidada',
      features: ['30 clientes ativos', '20 membros de equipe', '30 Studio AI/dia', 'Suporte VIP dedicado', 'IA ilimitada'],
    },
  ] as const;

  const handleCreateCheckout = async (planKey: string) => {
    if (!organization?.id || !user?.email) {
      toast({ title: 'Erro', description: 'Dados da organização não encontrados', variant: 'destructive' });
      return;
    }
    setCheckoutLoading(planKey);
    try {
      const response = await supabase.functions.invoke('create-checkout', {
        body: {
          organizationId: organization.id,
          planType: planKey,
          userEmail: user.email,
          userName: user.user_metadata?.full_name,
        },
      });
      if (response.error) throw new Error(response.error.message);
      const { checkoutUrl } = response.data;
      if (checkoutUrl) {
        // Remove loading state before navigating to prevent getting stuck if user hits "Back"
        setCheckoutLoading(null);
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({ title: 'Erro ao criar checkout', description: 'Tente novamente.', variant: 'destructive' });
      setCheckoutLoading(null);
    }
  };

  useEffect(() => {
    // Clear loading states if page is restored from bfcache (browser back button)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setCheckoutLoading(null);
        setActionLoading(null);
        // Reset the upgrade modal states to prevent "caching" the selection via bfcache
        setShowUpgradeModal(false);
        setUpgradeStep('plans');
        setSelectedPlan(null);
        setSelectedMethod(null);
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const currentPlan = PLAN_CONFIG[planType] || PLAN_CONFIG.free;
  const PlanIcon = currentPlan.icon;
  let displayPrice = 'priceUSD' in currentPlan ? `${formatPrice((currentPlan as any).priceUSD as number)}/mês` : currentPlan.price;

  if (planType === 'trial') {
    displayPrice = `${trialDaysLeft} dia${trialDaysLeft === 1 ? '' : 's'} restante${trialDaysLeft === 1 ? '' : 's'}`;
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('reason') === 'expired') {
      setShowRedirectModal(true);
    }
  }, [location]);

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
    if (subscription?.lemonsqueezyCustomerPortalUrl) {
      window.open(subscription.lemonsqueezyCustomerPortalUrl, '_blank');
      return;
    }

    if (!subscription?.lemonsqueezySubscriptionId) {
      toast({
        title: 'Informação',
        description: 'ID da assinatura não encontrado. Tente sincronizar primeiro.',
      });
      return;
    }
    
    // Fallback if portal URL is not set yet
    window.open(`https://app.lemonsqueezy.com/my-orders`, '_blank');
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
      // First, sync to make sure we have the latest status from LS
      const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-subscription', {
        body: { organizationId: organization.id },
      });
      
      if (syncError) console.error('Auto-sync before resume failed:', syncError);
      await refetch();

      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: {
          action: 'resume',
          organizationId: organization.id,
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      if (data?.error) {
        console.error('Business logic error:', data.error);
        throw new Error(data.error);
      }

      toast({
        title: 'Assinatura reativada',
        description: 'Sua assinatura continuará normalmente.',
      });

      await refetch();
    } catch (error: any) {
      console.error('Error resuming subscription:', error);
      toast({
        title: 'Erro ao reativar',
        description: error.message || 'Não foi possível reativar a assinatura. Verifique se o seu cartão é válido.',
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
      {cancelAtPeriodEnd && subscription?.currentPeriodEnd && hasActiveSubscription && (
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
                  {hasActiveSubscription ? (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20 ml-2">Ativo</Badge>
                  ) : subscription?.status === 'cancelled' || cancelAtPeriodEnd ? (
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500/20 ml-2">Cancelado</Badge>
                  ) : isExpired ? (
                    <Badge variant="destructive" className="ml-2">Expirado</Badge>
                  ) : null}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {hasActiveSubscription ? 'Sua assinatura está ativa' : 'Você não possui assinatura ativa no momento'}
                </CardDescription>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className={cn("text-xl sm:text-2xl font-bold", currentPlan.color)}>{displayPrice}</span>
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
            {/* Upgrade button - only for trial users */}
            {planType === 'trial' && (
              <Button
                size="sm"
                className="gap-2 w-full sm:w-auto text-xs sm:text-sm text-white"
                style={{ background: 'linear-gradient(135deg, hsl(25,95%,50%) 0%, hsl(270,91%,60%) 100%)' }}
                onClick={openUpgradeModal}
                disabled={!canManageSubscription}
              >
                <Crown className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span>Fazer Upgrade</span>
              </Button>
            )}

            {/* Payment management - only for paid plans */}
            {isPaidPlan && hasActiveSubscription && canManageSubscription && (
              <div className="flex flex-wrap gap-2">
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
              </div>
            )}
          </div>
        </CardContent>
      </Card>

       {/* Plan Usage Card - Restricted to Managers */}
      {canManageSubscription && <PlanUsageCard />}

      {/* Upgrade CTA for Free Plan - Only for Managers */}
      {!isPaidPlan && canManageSubscription && (
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
                {planType !== 'agency' && canManageSubscription && (
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

      {/* Payment History - Restricted to Managers */}
      {canManageSubscription && (
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
      )}

      {/* Upgrade Modal — 3-step flow */}
      <Dialog open={showUpgradeModal} onOpenChange={(open) => {
        setShowUpgradeModal(open);
        if (!open) { setUpgradeStep('plans'); setSelectedPlan(null); setSelectedMethod(null); }
      }}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">

          {/* ── STEP 1: Escolher Plano ── */}
          {upgradeStep === 'plans' && (
            <>
              <DialogHeader className="pb-2">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Escolha seu plano
                </DialogTitle>
                <DialogDescription>
                  Desbloqueie o potencial completo do Qualify. Escolha o plano e depois o método de pagamento.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
                {UPGRADE_PLANS.map((plan) => (
                  <div
                    key={plan.key}
                    className={cn(
                      'relative flex flex-col rounded-xl border-2 overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-md',
                      plan.border,
                      plan.popular ? 'shadow-lg scale-[1.02]' : '',
                    )}
                    onClick={() => handlePlanSelected(plan.key)}
                  >
                    {plan.popular && (
                      <div className="absolute top-0 left-0 right-0 py-1 text-center text-xs font-bold text-white" style={{ background: plan.primary }}>
                        ⭐ Mais Popular
                      </div>
                    )}
                    <div className={cn('h-28 flex items-center justify-center', plan.bg, plan.popular ? 'pt-6' : '')}>
                      <img src={plan.image} alt={plan.name} className="h-20 object-contain drop-shadow-md" />
                    </div>
                    <div className="flex flex-col flex-1 p-4 gap-3">
                      <div>
                        <p className={cn('text-lg font-bold', plan.color)}>{plan.name}</p>
                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl font-bold" style={{ color: plan.primary }}>{formatPrice(plan.priceUSD)}</span>
                          <span className="text-sm text-muted-foreground">{plan.period}</span>
                        </div>
                      </div>
                      <ul className="space-y-1.5 flex-1">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: plan.primary }} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button className="w-full gap-2 text-white mt-2" size="sm" style={{ backgroundColor: plan.primary }}>
                        <ArrowRight className="h-4 w-4" />
                        Seleccionar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground pt-1">Cancele a qualquer momento. Sem taxas escondidas.</p>
            </>
          )}

          {/* ── STEP 2: Escolher Método de Pagamento ── */}
          {upgradeStep === 'method' && selectedPlan && (() => {
            const plan = UPGRADE_PLANS.find(p => p.key === selectedPlan)!;
            return (
              <>
                <DialogHeader className="pb-2">
                  <button onClick={() => setUpgradeStep('plans')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 w-fit">
                    <ChevronLeft className="h-3 w-3" /> Voltar aos planos
                  </button>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <span style={{ color: plan.primary }}>{plan.name}</span>
                    <span className="text-muted-foreground font-normal text-base">— {formatPrice(plan.priceUSD)}{plan.period}</span>
                  </DialogTitle>
                  <DialogDescription>Como prefere pagar?</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3">
                  {PAYMENT_METHODS.map((method) => {
                    const isCardLoading = method.key === 'card' && checkoutLoading !== null;
                    return (
                      <button
                        key={method.key}
                        disabled={isCardLoading}
                        onClick={() => handleMethodSelected(method.key)}
                        className={cn(
                          'flex flex-col items-center flex-1 gap-2 p-5 rounded-xl border-2 text-center transition-all duration-200 hover:shadow-md h-full',
                          method.border, method.bg,
                          isCardLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'
                        )}
                      >
                        <div className="h-16 flex items-center justify-center mb-3">
                          {isCardLoading && method.key === 'card' ? (
                            <div className={cn('p-3 rounded-full bg-background/80', method.color)}>
                              <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                          ) : (
                            <img src={method.image} alt={method.label} className="h-14 w-14 sm:h-16 sm:w-16 rounded-[14px] object-cover drop-shadow-md transition-transform duration-200" />
                          )}
                        </div>
                        <div className="flex flex-col items-center mt-auto">
                          <p className={cn('font-bold leading-tight', method.color)}>{method.label}</p>
                          <p className="text-xs text-muted-foreground mt-1.5 px-1">{method.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {/* ── STEP 3: Comprovativo M-Pesa / E-Mola ── */}
          {upgradeStep === 'proof' && selectedPlan && selectedMethod && selectedMethod !== 'card' && (() => {
            const plan = UPGRADE_PLANS.find(p => p.key === selectedPlan)!;
            const info = MOBILE_MONEY_INFO[selectedMethod];
            const priceNum = plan.priceUSD * exchangeRate;
            return (
              <>
                <DialogHeader className="pb-2">
                  <button onClick={() => setUpgradeStep('method')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 w-fit">
                    <ChevronLeft className="h-3 w-3" /> Voltar ao método
                  </button>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <Smartphone className="h-5 w-5" style={{ color: plan.primary }} />
                    Pagamento via {selectedMethod === 'mpesa' ? 'M-Pesa' : 'E-Mola'}
                  </DialogTitle>
                  <DialogDescription>
                    Plano <strong>{plan.name}</strong> — <strong>{formatPrice(plan.priceUSD)}/mês</strong>
                  </DialogDescription>
                </DialogHeader>

                {/* Payment details box */}
                <div className="rounded-xl border-2 p-4 space-y-3 mb-2" style={{ borderColor: plan.primary + '50', background: plan.bg }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Número para transferir:</span>
                    <span className="font-mono font-bold text-lg" style={{ color: plan.primary }}>{info.number}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Nome do destinatário:</span>
                    <span className="font-medium">{info.name}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-black/10 dark:border-white/10 pt-2">
                    <span className="text-sm font-medium">Valor a transferir:</span>
                    <span className="font-bold text-xl" style={{ color: plan.primary }}>{formatPrice(plan.priceUSD)}/mês</span>
                  </div>
                </div>

                {/* Instructions */}
                <ol className="space-y-1.5 text-sm mb-3">
                  {info.instructions.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5" style={{ backgroundColor: plan.primary }}>{i + 1}</span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>

                {/* Upload proof */}
                {organization?.id && user?.id && (
                  <PaymentProofUpload
                    planKey={selectedPlan}
                    planName={plan.name}
                    planPrice={plan.priceUSD}
                    planPriceFormatted={`${formatPrice(plan.priceUSD)}/mês`}
                    organizationId={organization.id}
                    userId={user.id}
                    paymentMethod={selectedMethod}
                    onSuccess={handleProofSuccess}
                    onCancel={() => setUpgradeStep('method')}
                  />
                )}
              </>
            );
          })()}

        </DialogContent>
      </Dialog>

      {/* Redirect Reason Modal */}
      <Dialog open={showRedirectModal} onOpenChange={setShowRedirectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Acesso Restrito
            </DialogTitle>
            <DialogDescription className="py-2">
              Você foi redirecionado para esta página porque o plano da sua agência expirou ou foi cancelado. 
              Para continuar utilizando todas as funcionalidades do Qualify, é necessário reativar sua assinatura ou escolher um novo plano.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowRedirectModal(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

