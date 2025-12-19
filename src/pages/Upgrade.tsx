import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, CheckCircle2, Loader2, ArrowLeft, X, 
  Users, FileText, Bot, Briefcase, Crown, Sparkles 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Plan images
import planBussola from '@/assets/plans/plan-bussola.png';
import planLanca from '@/assets/plans/plan-lanca.png';
import planArco from '@/assets/plans/plan-arco.png';
import planCatapulta from '@/assets/plans/plan-catapulta.png';

type PlanType = 'free' | 'starter' | 'pro' | 'agency';

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
  free: { name: 'Grátis', codename: 'Bússola', tagline: 'Encontre o caminho certo para começar!' },
  starter: { name: 'Iniciante', codename: 'Lança', tagline: 'Lance sua marca no mundo digital!' },
  pro: { name: 'Pro', codename: 'Arco', tagline: 'Alcance resultados com precisão!' },
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
  };
}

const plans: Record<Exclude<PlanType, 'free'>, PlanConfig> = {
  starter: {
    name: 'Iniciante',
    price: 19,
    priceLabel: '$19/mês',
    description: 'Para agências em crescimento',
    features: [
      { text: 'Até 15 clientes', included: true },
      { text: '10 contratos/mês', included: true },
      { text: '50 mensagens IA/mês', included: true },
      { text: '2 usuários', included: true },
      { text: 'Funil de vendas', included: true },
      { text: 'Fluxo operacional', included: true },
      { text: 'Checklists personalizados', included: true },
      { text: 'Suporte por email', included: true },
    ],
    limits: {
      clients: '15',
      contracts: '10/mês',
      ai: '50 msgs/mês',
      team: '2 usuários',
    },
  },
  pro: {
    name: 'Pro',
    price: 49,
    priceLabel: '$49/mês',
    description: 'Para agências estabelecidas',
    popular: true,
    features: [
      { text: 'Até 50 clientes', included: true },
      { text: 'Contratos ilimitados', included: true },
      { text: 'Mensagens IA ilimitadas', included: true },
      { text: '5 usuários', included: true },
      { text: 'Funil de vendas', included: true },
      { text: 'Fluxo operacional', included: true },
      { text: 'Checklists personalizados', included: true },
      { text: 'Suporte prioritário', included: true },
    ],
    limits: {
      clients: '50',
      contracts: 'Ilimitado',
      ai: 'Ilimitado',
      team: '5 usuários',
    },
  },
  agency: {
    name: 'Agência',
    price: 129,
    priceLabel: '$129/mês',
    description: 'Para grandes agências',
    features: [
      { text: 'Clientes ilimitados', included: true },
      { text: 'Contratos ilimitados', included: true },
      { text: 'Mensagens IA ilimitadas', included: true },
      { text: '15 usuários', included: true },
      { text: 'Funil de vendas', included: true },
      { text: 'Fluxo operacional', included: true },
      { text: 'Checklists personalizados', included: true },
      { text: 'Suporte VIP', included: true },
    ],
    limits: {
      clients: 'Ilimitado',
      contracts: 'Ilimitado',
      ai: 'Ilimitado',
      team: '15 usuários',
    },
  },
};

const freePlan: PlanConfig = {
  name: 'Grátis',
  price: 0,
  priceLabel: '$0/mês',
  description: 'Para testar a plataforma',
  features: [
    { text: 'Até 5 clientes', included: true },
    { text: '2 contratos/mês', included: true },
    { text: 'Sem acesso à IA', included: false },
    { text: '1 usuário', included: true },
    { text: 'Funil de vendas', included: true },
    { text: 'Fluxo operacional', included: true },
    { text: 'Checklists básicos', included: true },
    { text: 'Suporte comunidade', included: true },
  ],
  limits: {
    clients: '5',
    contracts: '2/mês',
    ai: 'Bloqueado',
    team: '1 usuário',
  },
};

export default function Upgrade() {
  const { user } = useAuth();
  const { loading, organization, isActive, isTrialing, trialDaysLeft, planType: currentPlanType } = useSubscription();
  const { planType: activePlanType } = usePlanLimits();
  const [creatingCheckout, setCreatingCheckout] = useState<PlanType | null>(null);

  const handleSubscribe = async (planType: Exclude<PlanType, 'free'>) => {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlan = activePlanType || currentPlanType || 'free';

  const allPlans: { key: PlanType; config: PlanConfig }[] = [
    { key: 'free', config: freePlan },
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
            {isTrialing && trialDaysLeft > 0 ? (
              <>Você tem <strong>{trialDaysLeft} dias</strong> restantes do período de teste. Assine agora para continuar usando o Qualify.</>
            ) : (
              'Escale suas operações com o plano que melhor se adapta às suas necessidades.'
            )}
          </p>
        </div>

        {/* Current Plan Banner */}
        {currentPlan !== 'free' && isActive && (
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
                Ativo
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {allPlans.map(({ key: planKey, config: plan }) => {
            const isCurrentPlan = currentPlan === planKey && (planKey === 'free' ? !isActive : isActive);
            const isLoading = creatingCheckout === planKey;
            const colors = planColors[planKey];
            const planInfo = planNames[planKey];

            return (
              <Card 
                key={planKey} 
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                  plan.popular ? 'ring-2' : ''
                } ${isCurrentPlan ? 'ring-2' : ''}`}
                style={{
                  borderColor: isCurrentPlan || plan.popular ? colors.border : undefined,
                  ...(plan.popular || isCurrentPlan ? { '--ring-color': colors.primary } as any : {}),
                  ringColor: isCurrentPlan || plan.popular ? colors.primary : undefined,
                }}
              >
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
                  {plan.popular && (
                    <Badge 
                      className="absolute top-3 right-3 shadow-lg"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Mais Popular
                    </Badge>
                  )}
                  {isCurrentPlan && !plan.popular && (
                    <Badge 
                      className="absolute top-3 right-3 shadow-lg"
                      style={{ backgroundColor: colors.primary }}
                    >
                      Plano Atual
                    </Badge>
                  )}
                </div>

                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <span style={{ color: colors.text }}>{planInfo.codename}</span>
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-2">
                    <span className="text-3xl font-bold" style={{ color: colors.text }}>
                      ${plan.price}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
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
                  
                  {planKey === 'free' ? (
                    <Button variant="outline" disabled className="w-full">
                      {isCurrentPlan ? 'Plano Atual' : 'Plano Base'}
                    </Button>
                  ) : isCurrentPlan ? (
                    <Button variant="outline" disabled className="w-full">
                      Plano Atual
                    </Button>
                  ) : (
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
                          {currentPlan !== 'free' && isActive ? 'Mudar Plano' : 'Assinar'}
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
                    <td className="text-center py-3 px-4">{freePlan.limits.clients}</td>
                    <td className="text-center py-3 px-4">{plans.starter.limits.clients}</td>
                    <td className="text-center py-3 px-4" style={{ backgroundColor: planColors.pro.bg }}>{plans.pro.limits.clients}</td>
                    <td className="text-center py-3 px-4">{plans.agency.limits.clients}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Contratos</td>
                    <td className="text-center py-3 px-4">{freePlan.limits.contracts}</td>
                    <td className="text-center py-3 px-4">{plans.starter.limits.contracts}</td>
                    <td className="text-center py-3 px-4" style={{ backgroundColor: planColors.pro.bg }}>{plans.pro.limits.contracts}</td>
                    <td className="text-center py-3 px-4">{plans.agency.limits.contracts}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Assistente IA</td>
                    <td className="text-center py-3 px-4">{freePlan.limits.ai}</td>
                    <td className="text-center py-3 px-4">{plans.starter.limits.ai}</td>
                    <td className="text-center py-3 px-4" style={{ backgroundColor: planColors.pro.bg }}>{plans.pro.limits.ai}</td>
                    <td className="text-center py-3 px-4">{plans.agency.limits.ai}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Equipe</td>
                    <td className="text-center py-3 px-4">{freePlan.limits.team}</td>
                    <td className="text-center py-3 px-4">{plans.starter.limits.team}</td>
                    <td className="text-center py-3 px-4" style={{ backgroundColor: planColors.pro.bg }}>{plans.pro.limits.team}</td>
                    <td className="text-center py-3 px-4">{plans.agency.limits.team}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Back Link */}
        {isTrialing && trialDaysLeft > 0 && (
          <div className="text-center">
            <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Continuar usando o período de teste
            </Link>
          </div>
        )}

        {/* Payment Info */}
        <p className="text-xs text-center text-muted-foreground">
          Pagamento seguro via LemonSqueezy. Cancele a qualquer momento.
        </p>
      </div>
    </div>
  );
}
