import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CreditCard, CheckCircle2, Loader2, ArrowLeft, X, 
  Users, FileText, Bot, Briefcase, Crown, Sparkles, ShieldAlert
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

import planLanca from '@/assets/plans/plan-lanca.png';
import planArco from '@/assets/plans/plan-arco.png';
import planCatapulta from '@/assets/plans/plan-catapulta.png';

type PlanType = 'free' | 'starter' | 'pro' | 'agency';

const PLAN_ORDER: PlanType[] = ['free', 'starter', 'pro', 'agency'];

const getButtonLabel = (targetPlan: PlanType, currentPlan: PlanType): string => {
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);
  const targetIndex = PLAN_ORDER.indexOf(targetPlan);
  
  if (targetIndex > currentIndex) return 'Fazer Upgrade';
  if (targetIndex < currentIndex) return 'Fazer Downgrade';
  return 'Plano Atual';
};

export const planColors: Record<PlanType, { primary: string; bg: string; border: string; text: string }> = {
  free: {
    primary: 'hsl(142, 71%, 45%)',
    bg: 'hsl(142, 71%, 45%, 0.1)',
    border: 'hsl(142, 71%, 45%, 0.3)',
    text: 'hsl(142, 71%, 35%)',
  },
  starter: {
    primary: 'hsl(217, 91%, 60%)',
    bg: 'hsl(217, 91%, 60%, 0.1)',
    border: 'hsl(217, 91%, 60%, 0.3)',
    text: 'hsl(217, 91%, 50%)',
  },
  pro: {
    primary: 'hsl(270, 91%, 65%)',
    bg: 'hsl(270, 91%, 65%, 0.1)',
    border: 'hsl(270, 91%, 65%, 0.3)',
    text: 'hsl(270, 91%, 55%)',
  },
  agency: {
    primary: 'hsl(25, 95%, 53%)',
    bg: 'hsl(25, 95%, 53%, 0.1)',
    border: 'hsl(25, 95%, 53%, 0.3)',
    text: 'hsl(25, 95%, 43%)',
  },
};

export const planImages: Record<string, string> = {
  starter: planLanca,
  pro: planArco,
  agency: planCatapulta,
};

export const planNames: Record<PlanType, { name: string; codename: string; tagline: string }> = {
  free: { name: 'Sem Plano', codename: 'Sem Plano', tagline: 'Selecione um plano para começar.' },
  starter: { name: 'Pequena Agência', codename: 'Lança', tagline: 'O essencial para começar a crescer.' },
  pro: { name: 'Agência em Crescimento', codename: 'Arco', tagline: 'Ferramentas para escalar seus resultados.' },
  agency: { name: 'Agência Consolidada', codename: 'Catapulta', tagline: 'Poder total para dominar o mercado.' },
};

interface PlanConfig {
  name: string;
  price: number;
  priceLabel: string;
  description: string;
  popular?: boolean;
  features: { text: string; included: boolean }[];
  limits: {
    clients: string;
    contracts: string;
    ai: string;
    team: string;
    templates: string;
  };
}

const plans: Record<string, PlanConfig> = {
  starter: {
    name: 'Lança',
    price: 19,
    priceLabel: '$19/mês',
    description: 'Freelancers / Pequenas Agências',
    features: [
      { text: '5 Marcas (Clientes)', included: true },
      { text: 'Redes Sociais Ilimitadas', included: true },
      { text: '5 Créditos Studio AI / dia', included: true },
      { text: 'Módulos: Finanças, Editorial, Link23', included: true },
      { text: 'Inbox/Analytics', included: false },
      { text: 'Suporte VIP', included: false },
    ],
    limits: {
      clients: '5 ativos',
      contracts: '15/mês',
      ai: '500 msgs/mês',
      team: '5 usuários',
      templates: '3 templates',
    },
  },
  pro: {
    name: 'Arco',
    price: 39,
    priceLabel: '$39/mês',
    description: 'Agências em Crescimento',
    popular: true,
    features: [
      { text: '15 Marcas (Clientes)', included: true },
      { text: '15 Créditos Studio AI / dia', included: true },
      { text: 'Tudo do Lança + Inbox/Analytics', included: true },
      { text: 'Suporte Prioritário', included: true },
      { text: 'Suporte VIP', included: false },
    ],
    limits: {
      clients: '15 ativos',
      contracts: '50/mês',
      ai: '1200 msgs/mês',
      team: '10 usuários',
      templates: '10 templates',
    },
  },
  agency: {
    name: 'Catapulta',
    price: 79,
    priceLabel: '$79/mês',
    description: 'Grandes Agências / White Label',
    features: [
      { text: '50 Marcas (Clientes)', included: true },
      { text: '30 Créditos Studio AI / dia', included: true },
      { text: 'Tudo do Arco + Suporte VIP', included: true },
      { text: 'Acesso Antecipado a Recursos', included: true },
      { text: 'Templates Ilimitados', included: true },
    ],
    limits: {
      clients: '50 ativos',
      contracts: 'Ilimitado',
      ai: 'Ilimitado',
      team: '20 usuários',
      templates: 'Ilimitado',
    },
  },
};

export default function Upgrade() {
  const { user } = useAuth();
  const { loading, organization, isActive, isTrialing, trialDaysLeft, planType: currentPlanType, subscription, refetch } = useSubscription();
  const { planType: activePlanType } = usePlanLimits();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [creatingCheckout, setCreatingCheckout] = useState<PlanType | null>(null);
  const [changingPlan, setChangingPlan] = useState<PlanType | null>(null);

  const handleSubscribe = async (planType: PlanType) => {
    if (!organization?.id || !user?.email) {
      toast({
        title: 'Erro',
        description: 'Dados da organização não encontrados',
        variant: 'destructive',
      });
      return;
    }

    setCreatingCheckout(planType);
    try {
      const response = await supabase.functions.invoke('create-checkout', {
        body: {
          organizationId: organization.id,
          planType,
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
      setCreatingCheckout(null);
    }
  };

  const handleChangePlan = async (newPlanType: PlanType) => {
    if (!organization?.id) {
      toast({
        title: 'Erro',
        description: 'Dados da organização não encontrados',
        variant: 'destructive',
      });
      return;
    }

    if (currentPlan === 'free' || !subscription?.lemonsqueezySubscriptionId) {
      await handleSubscribe(newPlanType);
      return;
    }

    setChangingPlan(newPlanType);
    try {
      const response = await supabase.functions.invoke('manage-subscription', {
        body: {
          action: 'change-plan',
          organizationId: organization.id,
          newPlanType,
        },
      });

      if (response.error || response.data?.error) {
        setChangingPlan(null);
        await handleSubscribe(newPlanType);
        return;
      }

      toast({
        title: 'Plano alterado com sucesso!',
        description: `Seu plano foi alterado para ${planNames[newPlanType].codename}.`,
      });

      await refetch();
    } catch (error: any) {
      setChangingPlan(null);
      await handleSubscribe(newPlanType);
      return;
    } finally {
      setChangingPlan(null);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          <Link to="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Link>
          
          <Alert variant="default" className="border-primary/30 bg-primary/5">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle>Acesso Restrito</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>
                Apenas o <strong>administrador da agência</strong> pode visualizar e alterar o plano de assinatura.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const currentPlan = activePlanType || currentPlanType || 'free';

  const allPlans: { key: PlanType; config: PlanConfig }[] = [
    { key: 'starter', config: plans.starter },
    { key: 'pro', config: plans.pro },
    { key: 'agency', config: plans.agency },
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <Link to="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Link>
          
          <h1 className="text-3xl font-bold">Tabela de Planos e Limitações</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Escale suas operações com o plano que melhor se adapta à sua agência.
          </p>
        </div>

        <Card 
          className="border-2"
          style={{ 
            borderColor: planColors[currentPlan]?.border || planColors.starter.border,
            backgroundColor: planColors[currentPlan]?.bg || planColors.starter.bg,
          }}
        >
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5" style={{ color: planColors[currentPlan]?.primary || planColors.starter.primary }} />
              <span>
                Você está no plano <strong>{planNames[currentPlan]?.codename || 'Lança'}</strong>
              </span>
            </div>
            <Badge 
              variant="outline" 
              style={{ 
                borderColor: planColors[currentPlan]?.primary || planColors.starter.primary,
                color: planColors[currentPlan]?.text || planColors.starter.text,
              }}
            >
              {isTrialing ? `Trial (${trialDaysLeft}d)` : isActive ? 'Ativo' : 'Plano Atual'}
            </Badge>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allPlans.map(({ key: planKey, config: plan }) => {
            const isCurrentPlan = currentPlan === planKey && (isActive || isTrialing);
            const isLoading = creatingCheckout === planKey || changingPlan === planKey;
            const colors = planColors[planKey];
            const planInfo = planNames[planKey];
            const hasActiveSubscription = isActive && subscription?.lemonsqueezySubscriptionId;

            const currentIndex = PLAN_ORDER.indexOf(currentPlan);
            const targetIndex = PLAN_ORDER.indexOf(planKey);
            const isUpgrade = targetIndex > currentIndex;

            const neonColorClass = planKey === 'starter' ? 'neon-border-blue' : 
                                   planKey === 'pro' ? 'neon-border-purple' : 'neon-border-orange';

            return (
              <Card 
                key={planKey} 
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                  plan.popular && !isCurrentPlan ? 'ring-2' : ''
                } ${isCurrentPlan ? `neon-pulse ${neonColorClass}` : ''}`}
              >
                {isCurrentPlan && (
                  <Badge 
                    className="absolute top-3 left-3 z-20 shadow-lg text-white"
                    style={{ backgroundColor: colors.primary }}
                  >
                    Plano Atual
                  </Badge>
                )}

                <div 
                  className="relative h-48 overflow-hidden"
                  style={{ backgroundColor: colors.bg }}
                >
                  <img 
                    src={planImages[planKey]} 
                    alt={`Plano ${planInfo.codename}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <span style={{ color: colors.text }}>{planInfo.codename}</span>
                  </CardTitle>
                  <CardDescription className="text-xs">{plan.description}</CardDescription>
                  <div className="pt-2">
                    <span className="text-3xl font-bold" style={{ color: colors.text }}>
                      ${plan.price}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: colors.primary }} />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className={!feature.included ? 'text-muted-foreground' : ''}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  {isCurrentPlan ? (
                    <Button 
                      className="w-full"
                      variant="outline"
                      disabled
                      style={{ 
                        borderColor: colors.border,
                        color: colors.text 
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Plano Atual
                    </Button>
                  ) : hasActiveSubscription ? (
                    <Button 
                      onClick={() => handleChangePlan(planKey)}
                      disabled={isLoading || creatingCheckout !== null || changingPlan !== null}
                      className="w-full gap-2 text-white"
                      style={{ backgroundColor: colors.primary }}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          {isUpgrade ? <Crown className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                          {getButtonLabel(planKey, currentPlan)}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleSubscribe(planKey)}
                      disabled={isLoading || creatingCheckout !== null}
                      className="w-full gap-2 text-white"
                      style={{ backgroundColor: colors.primary }}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Assinar Agora
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Comparação Detalhada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Recurso</th>
                    <th className="text-center py-3 px-4 font-medium" style={{ color: planColors.starter.text }}>Lança</th>
                    <th className="text-center py-3 px-4 font-medium" style={{ color: planColors.pro.text }}>Arco</th>
                    <th className="text-center py-3 px-4 font-medium" style={{ color: planColors.agency.text }}>Catapulta</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4">Marcas (Clientes)</td>
                    <td className="text-center py-3 px-4">{plans.starter.limits.clients}</td>
                    <td className="text-center py-3 px-4">{plans.pro.limits.clients}</td>
                    <td className="text-center py-3 px-4">{plans.agency.limits.clients}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Studio AI (Créditos/dia)</td>
                    <td className="text-center py-3 px-4">5</td>
                    <td className="text-center py-3 px-4">15</td>
                    <td className="text-center py-3 px-4">30</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Módulos Extras</td>
                    <td className="text-center py-3 px-4 text-xs">Finanças, Editorial, Link23</td>
                    <td className="text-center py-3 px-4 text-xs">Tudo + Inbox/Analytics</td>
                    <td className="text-center py-3 px-4 text-xs">Tudo + Suporte VIP</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}