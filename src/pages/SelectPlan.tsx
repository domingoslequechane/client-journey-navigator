import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, ArrowRight, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { PublicBackground } from '@/components/layout/PublicBackground';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { getPlanColors } from '@/lib/plan-colors';

import planLanca from '@/assets/plans/plan-lanca.png';
import planArco from '@/assets/plans/plan-arco.png';
import planCatapulta from '@/assets/plans/plan-catapulta.png';

const plans = [
  {
    key: 'starter' as const,
    name: 'Lança',
    price: 19,
    period: '/mês',
    description: 'Para agências em crescimento',
    features: [
      '5 Marcas (Clientes)',
      'Redes Sociais Ilimitadas',
      '5 Créditos Studio AI / dia',
      'Finanças + Editorial + Link23',
    ],
    image: planLanca,
  },
  {
    key: 'pro' as const,
    name: 'Arco',
    price: 54,
    period: '/mês',
    description: 'Para agências estabelecidas',
    features: [
      '15 Marcas (Clientes)',
      '15 Créditos Studio AI / dia',
      'Tudo + Inbox/Analytics',
      'Suporte Prioritário',
    ],
    image: planArco,
    popular: true,
  },
  {
    key: 'agency' as const,
    name: 'Catapulta',
    price: 99,
    period: '/mês',
    description: 'Para grandes agências',
    features: [
      '30 Marcas (Clientes)',
      '30 Créditos Studio AI / dia',
      'Tudo + Suporte VIP',
      'Todos os Módulos',
    ],
    image: planCatapulta,
  },
];

export default function SelectPlan() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    const checkUserStatus = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.organization_id) {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('organization_id', profile.organization_id)
            .maybeSingle();

          if (subscription?.status === 'active') {
            navigate('/app');
            return;
          }

          setOrganizationId(profile.organization_id);
        } else {
          const { data: slugData } = await supabase.rpc('generate_slug', { 
            name: `temp-${user.id.substring(0, 8)}` 
          });
          
          const { data: newOrg, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: 'Agency',
              slug: slugData || `temp-${Date.now()}`,
              owner_id: user.id,
              plan_type: 'free',
            })
            .select()
            .single();

          if (orgError) throw orgError;

          await supabase
            .from('profiles')
            .update({ organization_id: newOrg.id })
            .eq('id', user.id);

          setOrganizationId(newOrg.id);
        }
      } catch (error) {
        console.error('Error checking user status:', error);
        toast.error('Erro ao verificar status do usuário');
      } finally {
        setCheckingStatus(false);
      }
    };

    if (user) {
      checkUserStatus();
    }
  }, [user, authLoading, navigate]);

  const handleSelectPlan = async (planKey: string) => {
    if (!organizationId || !user) {
      toast.error('Erro: organização não encontrada');
      return;
    }

    setLoadingPlan(planKey);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        navigate('/auth');
        return;
      }

      const response = await fetch(
        'https://hrarkpjuchrbffnrhzcy.supabase.co/functions/v1/create-checkout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            organizationId,
            planType: planKey,
            userEmail: user.email,
            userName: user.user_metadata?.full_name,
          }),
        }
      );

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response from checkout:', textResponse.substring(0, 200));
        throw new Error('Erro inesperado ao criar checkout. Tente novamente.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar checkout');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('URL de checkout não encontrada');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast.error(error.message || 'Erro ao processar pagamento');
    } finally {
      setLoadingPlan(null);
    }
  };

  if (authLoading || checkingStatus) {
    return (
      <PublicBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </PublicBackground>
    );
  }

  return (
    <PublicBackground>
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
        <ThemeToggle />
      </div>
      
      <div className="min-h-screen flex flex-col items-center justify-center p-4 py-12">
        <div className="text-center mb-8 max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Escolha seu plano
          </h1>
          <p className="text-muted-foreground text-lg">
            Selecione um plano para começar a usar o Qualify. Informações de cartão são obrigatórias.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full">
          {plans.map((plan) => {
            const colors = getPlanColors(plan.key);
            const isLoading = loadingPlan === plan.key;

            return (
              <Card 
                key={plan.key}
                className={`relative flex flex-col transition-all duration-300 hover:shadow-xl ${
                  plan.popular ? 'ring-2 ring-primary shadow-lg scale-[1.02]' : ''
                }`}
              >
                {plan.popular && (
                  <Badge 
                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
                    style={{ backgroundColor: colors.primary }}
                  >
                    Mais Popular
                  </Badge>
                )}

                <CardHeader className="text-center pb-2">
                  <img 
                    src={plan.image} 
                    alt={plan.name} 
                    className="w-16 h-16 mx-auto mb-3 object-contain"
                  />
                  <CardTitle className="text-xl" style={{ color: colors.primary }}>
                    {plan.name}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  <div className="text-center mb-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold" style={{ color: colors.primary }}>
                        ${plan.price}
                      </span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-sm text-primary font-medium mt-1">
                      Cartão obrigatório
                    </p>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check 
                          className="h-4 w-4 mt-0.5 flex-shrink-0" 
                          style={{ color: colors.primary }}
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    style={{ 
                      backgroundColor: colors.primary,
                      color: 'white',
                    }}
                    onClick={() => handleSelectPlan(plan.key)}
                    disabled={!!loadingPlan}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        Assinar Agora
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8 max-w-lg">
          Pagamento seguro via LemonSqueezy. Cancele a qualquer momento.
        </p>
      </div>
    </PublicBackground>
  );
}