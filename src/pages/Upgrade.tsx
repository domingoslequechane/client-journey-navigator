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
import { useHeader } from '@/contexts/HeaderContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import planLanca from '@/assets/plans/plan-lanca.png';
import planArco from '@/assets/plans/plan-arco.png';
import planCatapulta from '@/assets/plans/plan-catapulta.png';

type PlanType = 'free' | 'starter' | 'pro' | 'agency' | 'trial';

const PLAN_ORDER: PlanType[] = ['free', 'trial', 'starter', 'pro', 'agency'];

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
  trial: {
    primary: 'hsl(142, 71%, 45%)',
    bg: 'hsl(142, 71%, 45%, 0.1)',
    border: 'hsl(142, 71%, 45%, 0.3)',
    text: 'hsl(142, 71%, 35%)',
  },
};

export const planImages: Record<string, string> = {
  starter: planLanca,
  pro: planArco,
  agency: planCatapulta,
};

export const planNames: Record<PlanType, { name: string; codename: string; tagline: string }> = {
  free: { name: 'Sem Plano', codename: 'Sem Plano', tagline: 'Selecione um plano para começar.' },
  starter: { name: 'Pequena Agência', codename: 'Lança', tagline: 'Profissionalize sua prospecção e fechamento.' },
  pro: { name: 'Agência em Crescimento', codename: 'Arco', tagline: 'Ferramentas para escalar seus resultados.' },
  agency: { name: 'Agência Consolidada', codename: 'Catapulta', tagline: 'Poder total para dominar o mercado.' },
  trial: { name: 'Período de Teste', codename: 'Trial', tagline: 'Aproveite o período de teste com todas as funções.' },
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
    description: 'Para a Pequena Agência',
    features: [
      { text: '5 Marcas (Clientes)', included: true },
      { text: 'Redes Sociais Ilimitadas', included: true },
      { text: '5 Créditos Studio AI / dia', included: true },
      { text: 'Finanças, Editorial, Link23', included: true },
      { text: '5 membros de equipe', included: true },
      { text: 'Exportação de dados', included: true },
      { text: 'Inbox (DMs)', included: false },
      { text: 'Suporte prioritário', included: false },
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
    price: 54,
    priceLabel: '$54/mês',
    description: 'Para a Agência em Crescimento',
    popular: true,
    features: [
      { text: '15 Marcas (Clientes)', included: true },
      { text: 'Redes Sociais Ilimitadas', included: true },
      { text: '15 Créditos Studio AI / dia', included: true },
      { text: 'Tudo + Inbox/Analytics', included: true },
      { text: '10 membros de equipe', included: true },
      { text: 'Suporte prioritário', included: true },
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
    price: 99,
    priceLabel: '$99/mês',
    description: 'Para a Agência Consolidada',
    features: [
      { text: '30 Marcas (Clientes)', included: true },
      { text: 'Redes Sociais Ilimitadas', included: true },
      { text: '30 Créditos Studio AI / dia', included: true },
      { text: 'Tudo + Suporte VIP', included: true },
      { text: '20 usuários', included: true },
      { text: 'Todos os módulos', included: true },
      { text: 'Suporte VIP dedicado', included: true },
      { text: 'Templates ilimitados', included: true },
    ],
    limits: {
      clients: '30 ativos',
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
  const { isAdmin, canSeeFinance, loading: roleLoading } = useUserRole();
  const canManageUpgrade = isAdmin || canSeeFinance;
  const [creatingCheckout, setCreatingCheckout] = useState<PlanType | null>(null);
  const [changingPlan, setChangingPlan] = useState<PlanType | null>(null);
  const { setBackAction, setCustomTitle } = useHeader();
  const navigate = useNavigate();

  useEffect(() => {
    setCustomTitle('Upgrade');
    setBackAction(() => () => navigate('/app'));
    return () => {
      setCustomTitle(null);
      setBackAction(null);
    };
  }, [setCustomTitle, setBackAction, navigate]);

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

  // We now allow everyone to see the plans page, but restrict actions
  const currentPlan = activePlanType || currentPlanType || 'free';

  const allPlans: { key: PlanType; config: PlanConfig }[] = [
    { key: 'starter', config: plans.starter },
    { key: 'pro', config: plans.pro },
    { key: 'agency', config: plans.agency },
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="hidden md:block text-center space-y-4">
          <Link to="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Link>
          
          <h1 className="text-3xl font-bold">Escolha o plano ideal para sua agência</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Escale suas operações com o plano que melhor se adapta à sua agência.
          </p>
        </div>

        {/* Trial Upgrade Banner */}
        {currentPlan === 'trial' && (
          <div className="relative overflow-hidden rounded-xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -translate-y-32 translate-x-32 pointer-events-none" />
            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <span className="text-sm font-semibold text-amber-600 uppercase tracking-wider">Período de Teste Ativo</span>
                  </div>
                  <h2 className="text-xl font-bold">
                    {trialDaysLeft > 0
                      ? <>Você tem <span className="text-amber-500">{trialDaysLeft} {trialDaysLeft === 1 ? 'dia' : 'dias'} restantes</span> no trial</>
                      : <span className="text-destructive">Seu trial expirou</span>
                    }
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Faça upgrade agora e desbloqueie todo o potencial do Qualify
                  </p>
                </div>
                <Link to="/app/upgrade">
                  <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-white shrink-0" size="lg">
                    <Crown className="h-4 w-4" />
                    Ver Planos Pagos
                  </Button>
                </Link>
              </div>

              {/* Trial vs Paid comparison chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Clientes', trial: '2', paid: '5–30' },
                  { label: 'Equipe', trial: '1 membro', paid: '5–20' },
                  { label: 'Studio AI', trial: '5/dia', paid: '5–30/dia' },
                  { label: 'Suporte', trial: 'Standard', paid: 'Prioritário' },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border bg-card/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className="text-xs line-through text-muted-foreground/60">{item.trial}</p>
                    <p className="text-sm font-semibold text-amber-500">{item.paid}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Current Plan Badge */}
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
                Você está no plano <strong>{planNames[currentPlan]?.codename || 'Lança'}</strong> ({planNames[currentPlan]?.name || 'Crescimento'})
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
                style={{
                  borderColor: plan.popular && !isCurrentPlan ? colors.border : undefined,
                }}
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
                    <span className="text-3xl font-bold" style={{ color: colors.text }}>
                      ${plan.price}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                    <p className="text-sm text-primary font-medium mt-1">Cartão obrigatório</p>
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
                    <Button 
                      onClick={() => handleChangePlan(planKey)}
                      disabled={isLoading || creatingCheckout !== null || changingPlan !== null || !canManageUpgrade}
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
                  ) : (
                    <Button 
                      onClick={() => handleSubscribe(planKey)}
                      disabled={isLoading || creatingCheckout !== null || !canManageUpgrade}
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
                          <Sparkles className="h-4 w-4" />
                          {!canManageUpgrade ? 'Falar com Dono' : currentPlan === 'trial' ? 'Fazer Upgrade' : 'Iniciar Minha Transformação'}
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
              Comparação de Planos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Recurso</th>
                    <th className="text-center py-3 px-4 font-medium text-amber-500">Trial</th>
                    <th className="text-center py-3 px-4 font-medium" style={{ color: planColors.starter.text }}>Lança</th>
                    <th className="text-center py-3 px-4 font-medium" style={{ backgroundColor: planColors.pro.bg, color: planColors.pro.text }}>Arco</th>
                    <th className="text-center py-3 px-4 font-medium" style={{ color: planColors.agency.text }}>Catapulta</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4">Clientes Ativos</td>
                    <td className="text-center py-3 px-4 text-muted-foreground">2</td>
                    <td className="text-center py-3 px-4">5</td>
                    <td className="text-center py-3 px-4" style={{ backgroundColor: planColors.pro.bg }}>15</td>
                    <td className="text-center py-3 px-4">30</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Studio AI (por ferramenta/dia)</td>
                    <td className="text-center py-3 px-4 text-muted-foreground">5</td>
                    <td className="text-center py-3 px-4">5</td>
                    <td className="text-center py-3 px-4" style={{ backgroundColor: planColors.pro.bg }}>15</td>
                    <td className="text-center py-3 px-4">30</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Membros da Equipe</td>
                    <td className="text-center py-3 px-4 text-muted-foreground">1</td>
                    <td className="text-center py-3 px-4">5</td>
                    <td className="text-center py-3 px-4" style={{ backgroundColor: planColors.pro.bg }}>10</td>
                    <td className="text-center py-3 px-4">20</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Link23 (árvores)</td>
                    <td className="text-center py-3 px-4 text-muted-foreground">2</td>
                    <td className="text-center py-3 px-4">1</td>
                    <td className="text-center py-3 px-4" style={{ backgroundColor: planColors.pro.bg }}>5</td>
                    <td className="text-center py-3 px-4">Ilimitado</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Módulos Extras</td>
                    <td className="text-center py-3 px-4 text-muted-foreground">Todos (limitado)</td>
                    <td className="text-center py-3 px-4">Básico</td>
                    <td className="text-center py-3 px-4" style={{ backgroundColor: planColors.pro.bg }}>Inbox/Analytics</td>
                    <td className="text-center py-3 px-4">Suporte VIP</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Pagamento seguro via LemonSqueezy. Cancele a qualquer momento.
          </p>
        </div>

      </div>
    </div>
  );
}