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


// Plan images
import planBussola from '@/assets/plans/plan-bussola.png';
import planLanca from '@/assets/plans/plan-lanca.png';
import planArco from '@/assets/plans/plan-arco.png';
import planCatapulta from '@/assets/plans/plan-catapulta.png';

type PlanType = 'free' | 'starter' | 'pro' | 'agency';

// Plan order for upgrade/downgrade comparison
const PLAN_ORDER: PlanType[] = ['free', 'starter', 'pro', 'agency'];

// Get button label based on plan comparison
const getButtonLabel = (targetPlan: PlanType, currentPlan: PlanType): string => {
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);
  const targetIndex = PLAN_ORDER.indexOf(targetPlan);
  
  if (targetIndex > currentIndex) return 'Fazer Upgrade';
  if (targetIndex < currentIndex) return 'Fazer Downgrade';
  return 'Plano Atual';
};

// Plan colors (HSL values)
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

export const planImages: Record<PlanType, string> = {
  free: planBussola,
  starter: planLanca,
  pro: planArco,
  agency: planCatapulta,
};

export const planNames: Record<PlanType, { name: string; codename: string; tagline: string }> = {
  free: { name: 'Essencial', codename: 'Bússola', tagline: 'Encontre o caminho certo para começar!' },
  starter: { name: 'Crescimento', codename: 'Lança', tagline: 'Lance sua marca no mundo digital!' },
  pro: { name: 'Profissional', codename: 'Arco', tagline: 'Alcance resultados com precisão!' },
  agency: { name: 'Agência', codename: 'Catapulta', tagline: 'Imponha sua agência no mercado!' },
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

const plans: Record<PlanType, PlanConfig> = {
  free: {
    name: 'Bússola',
    price: 0,
    priceLabel: 'Grátis',
    description: 'Para começar sua jornada',
    features: [
      { text: '3 clientes ativos', included: true },
      { text: 'Funil de vendas ilimitado', included: true },
      { text: '3 contratos/mês', included: true },
      { text: '90 mensagens IA/mês', included: true },
      { text: '1 usuário', included: true },
      { text: 'Academia', included: true },
      { text: 'Finanças', included: false },
      { text: 'Social Media', included: false },
      { text: 'Studio AI', included: false },
      { text: 'Link23', included: false },
    ],
    limits: {
      clients: '3 ativos',
      contracts: '3/mês',
      ai: '90 msgs/mês',
      team: '1 usuário',
      templates: '1 template',
    },
  },
  starter: {
    name: 'Lança',
    price: 19,
    priceLabel: '$19/mês',
    description: 'Para agências em crescimento',
    features: [
      { text: '15 clientes ativos', included: true },
      { text: '500 mensagens IA/mês', included: true },
      { text: '5 usuários', included: true },
      { text: 'Finanças + Editorial', included: true },
      { text: 'Studio AI (30 flyers/mês)', included: true },
      { text: 'Social Media (3 contas, 50 posts)', included: true },
      { text: 'Link23 (1 página)', included: true },
      { text: 'Exportação de dados', included: true },
      { text: 'Inbox (DMs)', included: false },
      { text: 'Suporte prioritário', included: false },
    ],
    limits: {
      clients: '15 ativos',
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
    description: 'Para agências estabelecidas',
    popular: true,
    features: [
      { text: '50 clientes ativos', included: true },
      { text: '1200 mensagens IA/mês', included: true },
      { text: '10 usuários', included: true },
      { text: 'Todos os módulos', included: true },
      { text: 'Studio AI (100 flyers/mês)', included: true },
      { text: 'Social Media (7 contas, 200 posts)', included: true },
      { text: 'Link23 (5 páginas)', included: true },
      { text: 'Inbox (DMs)', included: true },
      { text: 'Suporte prioritário', included: true },
      { text: 'Suporte VIP', included: false },
    ],
    limits: {
      clients: '50 ativos',
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
    description: 'Para grandes agências',
    features: [
      { text: 'Clientes ilimitados', included: true },
      { text: 'IA ilimitada', included: true },
      { text: '20 usuários', included: true },
      { text: 'Todos os módulos', included: true },
      { text: 'Studio AI ilimitado', included: true },
      { text: 'Social Media (15 contas, ilimitado)', included: true },
      { text: 'Link23 ilimitado', included: true },
      { text: 'Inbox (DMs)', included: true },
      { text: 'Suporte VIP dedicado', included: true },
      { text: 'Templates ilimitados', included: true },
    ],
    limits: {
      clients: 'Ilimitado',
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

    setChangingPlan(newPlanType);
    try {
      const response = await supabase.functions.invoke('manage-subscription', {
        body: {
          action: 'change-plan',
          organizationId: organization.id,
          newPlanType,
        },
      });

      // When edge function returns non-2xx, error is set and data may be null
      if (response.error || response.data?.error) {
        console.log('Change plan failed, falling back to checkout:', response.error?.message || response.data?.error);
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
      // Any unexpected error also falls back to checkout
      console.log('Change plan exception, falling back to checkout:', error);
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

  // Non-admin users cannot change plans
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
              <p className="text-muted-foreground">
                Se você precisa de um upgrade ou alteração no plano, entre em contato com o administrador da sua organização.
              </p>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Por que essa restrição?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• Decisões de assinatura envolvem custos financeiros</p>
              <p>• Apenas administradores têm autoridade para aprovar mudanças de plano</p>
              <p>• Isso garante controle adequado sobre os recursos da organização</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentPlan = activePlanType || currentPlanType || 'free';

  const allPlans: { key: PlanType; config: PlanConfig }[] = [
    { key: 'free', config: plans.free },
    { key: 'starter', config: plans.starter },
    { key: 'pro', config: plans.pro },
    { key: 'agency', config: plans.agency },
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Link to="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Link>
          
          <h1 className="text-3xl font-bold">Escolha o plano ideal para sua agência</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Escale suas operações com o plano que melhor se adapta às suas necessidades.
          </p>
        </div>


        {/* Current Plan Banner */}
        <Card 
          className="border-2"
          style={{ 
            borderColor: planColors[currentPlan].border,
            backgroundColor: planColors[currentPlan].bg 
          }}
        >
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5" style={{ color: planColors[currentPlan].primary }} />
              <span>
                Você está no plano <strong>{planNames[currentPlan].codename}</strong> ({planNames[currentPlan].name})
              </span>
            </div>
            <Badge 
              variant="outline" 
              style={{ 
                borderColor: planColors[currentPlan].primary,
                color: planColors[currentPlan].text 
              }}
            >
              {isActive ? 'Ativo' : 'Plano Atual'}
            </Badge>
          </CardContent>
        </Card>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {allPlans.map(({ key: planKey, config: plan }) => {
            const isCurrentPlan = currentPlan === planKey && isActive;
            const isLoading = creatingCheckout === planKey || changingPlan === planKey;
            const colors = planColors[planKey];
            const planInfo = planNames[planKey];
            const hasActiveSubscription = isActive && subscription?.lemonsqueezySubscriptionId;

            // Determine if this is upgrade or downgrade
            const currentIndex = PLAN_ORDER.indexOf(currentPlan);
            const targetIndex = PLAN_ORDER.indexOf(planKey);
            const isUpgrade = targetIndex > currentIndex;

            const neonColorClass = planKey === 'free' ? 'neon-border-green' : 
                                   planKey === 'starter' ? 'neon-border-blue' : 
                                   planKey === 'pro' ? 'neon-border-purple' : 'neon-border-orange';

            return (
              <Card 
                key={planKey} 
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                  plan.popular && !isCurrentPlan ? 'ring-2' : ''
                } ${isCurrentPlan ? `neon-pulse ${neonColorClass}` : ''}`}
                style={{
                  borderColor: plan.popular && !isCurrentPlan ? colors.border : undefined,
                  ...(plan.popular && !isCurrentPlan ? { '--ring-color': colors.primary } as any : {}),
                  ringColor: plan.popular && !isCurrentPlan ? colors.primary : undefined,
                }}
              >
                {/* Current Plan Badge - Top Left Inside Card */}
                {isCurrentPlan && (
                  <Badge 
                    className="absolute top-3 left-3 z-20 shadow-lg text-white"
                    style={{ backgroundColor: colors.primary }}
                  >
                    Plano Atual
                  </Badge>
                )}

                {/* Plan Image */}
                <div 
                  className="relative h-48 overflow-hidden"
                  style={{ backgroundColor: colors.bg }}
                >
                  <img 
                    src={planImages[planKey]} 
                    alt={`Plano ${planInfo.codename}`}
                    className="w-full h-full object-cover"
                  />
                  {plan.popular && !isCurrentPlan && (
                    <Badge 
                      className="absolute top-3 right-3 shadow-lg"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Mais Popular
                    </Badge>
                  )}
                </div>

                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <span style={{ color: colors.text }}>{planInfo.codename}</span>
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-2">
                    {planKey === 'free' ? (
                      <>
                        <span className="text-3xl font-bold" style={{ color: colors.text }}>
                          Grátis
                        </span>
                        <p className="text-xs text-muted-foreground">para sempre</p>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold" style={{ color: colors.text }}>
                          ${plan.price}
                        </span>
                        <span className="text-muted-foreground">/mês</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs italic text-muted-foreground mt-1">
                    {planInfo.tagline}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.slice(0, 6).map((feature, index) => (
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
                    // User has active subscription - use change-plan API (but free plan needs checkout since it's $0 on LemonSqueezy)
                    planKey === 'free' ? (
                      // Free plan requires checkout to capture payment info (even at $0)
                      <Button 
                        onClick={() => handleSubscribe(planKey)}
                        disabled={isLoading || creatingCheckout !== null || changingPlan !== null}
                        className="w-full gap-2 text-white"
                        style={{ backgroundColor: colors.primary }}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            Mudar para Grátis
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleChangePlan(planKey)}
                        disabled={isLoading || creatingCheckout !== null || changingPlan !== null}
                        className="w-full gap-2 text-white"
                        style={{ backgroundColor: colors.primary }}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {isUpgrade ? 'Fazendo Upgrade...' : 'Fazendo Downgrade...'}
                          </>
                        ) : (
                          <>
                            {isUpgrade ? (
                              <Crown className="h-4 w-4" />
                            ) : (
                              <CreditCard className="h-4 w-4" />
                            )}
                            {getButtonLabel(planKey, currentPlan)}
                          </>
                        )}
                      </Button>
                    )
                  ) : (
                    // No subscription - create new checkout
                    <Button 
                      onClick={() => handleSubscribe(planKey)}
                      disabled={isLoading || creatingCheckout !== null}
                      className="w-full gap-2 text-white"
                      style={{ backgroundColor: colors.primary }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
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

        {/* Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Comparação de Planos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Recurso</th>
                    <th className="text-center py-3 px-4 font-medium" style={{ color: planColors.free.text }}>Bússola</th>
                    <th className="text-center py-3 px-4 font-medium" style={{ color: planColors.starter.text }}>Lança</th>
                    <th className="text-center py-3 px-4 font-medium" style={{ backgroundColor: planColors.pro.bg, color: planColors.pro.text }}>Arco</th>
                    <th className="text-center py-3 px-4 font-medium" style={{ color: planColors.agency.text }}>Catapulta</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4">Clientes</td>
                    <td className="text-center py-3 px-4">{plans.free.limits.clients}</td>
                    <td className="text-center py-3 px-4">{plans.starter.limits.clients}</td>
                    <td className="text-center py-3 px-4" style={{ backgroundColor: planColors.pro.bg }}>{plans.pro.limits.clients}</td>
                    <td className="text-center py-3 px-4">{plans.agency.limits.clients}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Contratos</td>
                    <td className="text-center py-3 px-4">{plans.free.limits.contracts}</td>
                    <td className="text-center py-3 px-4">{plans.starter.limits.contracts}</td>
                    <td className="text-center py-3 px-4" style={{ backgroundColor: planColors.pro.bg }}>{plans.pro.limits.contracts}</td>
                    <td className="text-center py-3 px-4">{plans.agency.limits.contracts}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Assistente IA</td>
                    <td className="text-center py-3 px-4">{plans.free.limits.ai}</td>
                    <td className="text-center py-3 px-4">{plans.starter.limits.ai}</td>
                    <td className="text-center py-3 px-4" style={{ backgroundColor: planColors.pro.bg }}>{plans.pro.limits.ai}</td>
                    <td className="text-center py-3 px-4">{plans.agency.limits.ai}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Equipe</td>
                    <td className="text-center py-3 px-4">{plans.free.limits.team}</td>
                    <td className="text-center py-3 px-4">{plans.starter.limits.team}</td>
                    <td className="text-center py-3 px-4" style={{ backgroundColor: planColors.pro.bg }}>{plans.pro.limits.team}</td>
                    <td className="text-center py-3 px-4">{plans.agency.limits.team}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Templates</td>
                    <td className="text-center py-3 px-4">{plans.free.limits.templates}</td>
                    <td className="text-center py-3 px-4">{plans.starter.limits.templates}</td>
                    <td className="text-center py-3 px-4" style={{ backgroundColor: planColors.pro.bg }}>{plans.pro.limits.templates}</td>
                    <td className="text-center py-3 px-4">{plans.agency.limits.templates}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Pagamento seguro via LemonSqueezy. Cancele a qualquer momento.
          </p>
        </div>

      </div>
    </div>
  );
}
