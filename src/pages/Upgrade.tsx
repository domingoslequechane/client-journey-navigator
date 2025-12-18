import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, CheckCircle2, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Upgrade() {
  const { user } = useAuth();
  const { loading, organization, isActive, isTrialing, trialDaysLeft } = useSubscription();
  const [creatingCheckout, setCreatingCheckout] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user has active subscription, redirect info
  if (isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle>Assinatura Ativa</CardTitle>
            <CardDescription>
              Você já possui uma assinatura ativa do Qualify.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/app">
              <Button className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">
            {isTrialing && trialDaysLeft > 0
              ? 'Seu período de teste está acabando'
              : 'Seu período de teste expirou'
            }
          </h1>
          <p className="text-muted-foreground mt-2">
            {isTrialing && trialDaysLeft > 0
              ? `Você tem ${trialDaysLeft} dia${trialDaysLeft !== 1 ? 's' : ''} restantes. Assine agora para continuar usando o Qualify.`
              : 'Assine o Qualify para continuar gerenciando seus clientes e equipe.'
            }
          </p>
        </div>

        {/* Pricing Card */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Plano Profissional</span>
              <span className="text-primary">$7/mês <span className="text-sm text-muted-foreground line-through">$14</span></span>
            </CardTitle>
            <CardDescription>
              Tudo o que você precisa para gerenciar sua agência
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {[
                'Gestão ilimitada de clientes',
                'Funil de vendas completo',
                'Fluxo operacional',
                'Assistente de IA por cliente',
                'Gestão de equipe ilimitada',
                'Checklists personalizados',
                'Contratos digitais',
                'Base de conhecimento',
                'Suporte prioritário',
              ].map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              onClick={handleSubscribe} 
              disabled={creatingCheckout}
              className="w-full gap-2"
              size="lg"
            >
              {creatingCheckout ? (
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

            <p className="text-xs text-center text-muted-foreground">
              Pagamento seguro via LemonSqueezy. Cancele a qualquer momento.
            </p>
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
      </div>
    </div>
  );
}
