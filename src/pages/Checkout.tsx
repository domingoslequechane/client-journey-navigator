import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CreditCard, Landmark, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { PublicBackground } from '@/components/layout/PublicBackground';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { getPlanColors } from '@/lib/plan-colors';

import planLanca from '@/assets/plans/plan-lanca.png';
import planArco from '@/assets/plans/plan-arco.png';
import planCatapulta from '@/assets/plans/plan-catapulta.png';

const plans = [
  {
    key: 'starter',
    name: 'Lança',
    price: 19,
    period: '/mês',
    description: 'Para agências em crescimento',
    image: planLanca,
  },
  {
    key: 'pro',
    name: 'Arco',
    price: 54,
    period: '/mês',
    description: 'Para agências estabelecidas',
    image: planArco,
  },
  {
    key: 'agency',
    name: 'Catapulta',
    price: 99,
    period: '/mês',
    description: 'Para grandes agências',
    image: planCatapulta,
  },
];

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const planKey = searchParams.get('plan');
  const plan = plans.find(p => p.key === planKey);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!planKey || !plan) {
      navigate('/select-plan');
      return;
    }

    const checkOrg = async () => {
      try {
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id, current_organization_id')
          .eq('id', user.id)
          .single();

        const orgId = profile?.current_organization_id || profile?.organization_id;
        
        if (orgId) {
          setOrganizationId(orgId);
        } else {
          toast.error('Organização não encontrada');
          navigate('/select-plan');
        }
      } catch (error) {
        console.error('Error fetching org:', error);
      } finally {
        setLoading(false);
      }
    };

    checkOrg();
  }, [user, authLoading, navigate, planKey, plan]);

  const handleCardPayment = async () => {
    if (!organizationId || !user || !plan) return;

    setLoadingPayment(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

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
            planType: plan.key,
            userEmail: user.email,
            userName: user.user_metadata?.full_name,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Erro ao criar checkout');

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('URL de checkout não encontrada');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast.error(error.message || 'Erro ao processar pagamento');
      setLoadingPayment(false);
    }
  };

  const handleWhatsApp = () => {
    if (!user || !plan) return;
    const message = `Olá Domingos, sou o(a) ${user.user_metadata?.full_name || 'utilizador'} e gostaria de activar o meu plano ${plan.name} no Qualify. Segue em anexo o meu comprovativo de transferência associado ao email ${user.email}.`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/258868499221?text=${encoded}`, '_blank');
  };

  if (authLoading || loading) {
    return (
      <PublicBackground>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PublicBackground>
    );
  }

  if (!plan) return null;

  const colors = getPlanColors(plan.key);

  return (
    <PublicBackground>
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center p-4 py-12">
        <div className="w-full max-w-4xl">
          <Link to="/select-plan" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos Planos
          </Link>

          <h1 className="text-3xl font-bold mb-8">Finalizar Assinatura</h1>

          <div className="grid md:grid-cols-[1fr_2fr] gap-6 items-start">
            
            {/* Detalhes do Plano Resumo */}
            <Card className="bg-card/50 backdrop-blur-sm border-dashed">
              <CardHeader className="text-center pb-4">
                <img src={plan.image} alt={plan.name} className="w-16 h-16 mx-auto mb-3 object-contain" />
                <CardTitle className="text-xl" style={{ color: colors.primary }}>Plano {plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold" style={{ color: colors.primary }}>${plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardContent>
            </Card>

            {/* Opções de Pagamento */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Método de Pagamento</CardTitle>
                <CardDescription>Escolha a forma mais conveniente para si</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="transfer">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="transfer" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                      <Landmark className="h-4 w-4 mr-2" />
                      Transferência Local
                    </TabsTrigger>
                    <TabsTrigger value="card">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Cartão Automático
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="card" className="space-y-4 pt-4">
                    <div className="rounded-lg bg-muted/50 p-4 mb-4 text-sm text-muted-foreground flex gap-3">
                      <AlertCircle className="h-5 w-5 shrink-0 text-primary" />
                      <p>
                        Pagamentos com cartão através do LemonSqueezy são <strong>instantâneos e automáticos</strong> todos os meses.
                        Ao prosseguir, será redirecionado para a nossa página de checkout seguro.
                      </p>
                    </div>
                    
                    <Button 
                      className="w-full h-12 text-md transition-all hover:scale-[1.01]" 
                      style={{ backgroundColor: colors.primary, color: 'white' }}
                      onClick={handleCardPayment}
                      disabled={loadingPayment}
                    >
                      {loadingPayment ? (
                        <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> A Processar Checkout...</>
                      ) : (
                        <><CreditCard className="h-5 w-5 mr-2" /> Pagar ${plan.price} com Cartão <ArrowRight className="h-4 w-4 ml-2" /></>
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="transfer" className="space-y-4 pt-2">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-5 space-y-4">
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-muted-foreground">M-Pesa</span>
                          <span className="font-semibold">+258 85 313 5136</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-muted-foreground">E-Mola</span>
                          <span className="font-semibold">+258 86 849 9221</span>
                        </div>
                        <div className="flex justify-between items-start py-2 border-b">
                          <span className="text-muted-foreground pt-1">Banco BIM</span>
                          <div className="text-right">
                            <div className="font-semibold">7810 9269 5</div>
                            <div className="text-xs text-muted-foreground mt-0.5">NIB: 0001 0000 0078 1092 6955 7</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-muted-foreground">Titular</span>
                          <span className="font-semibold">Domingos Francisco Lequechane</span>
                        </div>
                      </div>

                      <div className="rounded-md bg-yellow-500/10 p-3 mt-4 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-600/90 dark:text-yellow-400">
                          Transferências manuais levam de <strong>10 a 15 minutos</strong> para ativação. (Horário laboral: Seg a Sáb, das 08h às 17h)
                        </p>
                      </div>

                    </div>

                    <Button 
                      className="w-full h-12 text-md mt-6 bg-[#25D366] hover:bg-[#1DA851] text-white transition-all hover:scale-[1.01]" 
                      onClick={handleWhatsApp}
                    >
                      <Send className="h-5 w-5 mr-2" />
                      Enviar Comprovativo no WhatsApp
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </PublicBackground>
  );
}
