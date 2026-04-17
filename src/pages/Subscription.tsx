import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, RefreshCw, Sparkles, CreditCard } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SubscriptionTab } from '@/components/subscription/SubscriptionTab';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useHeader } from '@/contexts/HeaderContext';
import { usePermissions } from '@/hooks/usePermissions';

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { organization, refetch } = useSubscription();
  const [syncing, setSyncing] = useState(false);
  const { setBackAction } = useHeader();
  const { isOwner, hasPrivilege } = usePermissions();
  
  const canManageSubscription = isOwner || hasPrivilege('finance');

  const syncSubscription = async () => {
    if (!organization?.id) return;
    
    setSyncing(true);
    try {
      console.log('Syncing subscription for organization:', organization.id);
      
      const { data, error } = await supabase.functions.invoke('sync-subscription', {
        body: { organizationId: organization.id },
      });

      console.log('Sync response:', data, error);

      if (error) throw error;

      if (data?.synced) {
        toast({
          title: 'Assinatura sincronizada!',
          description: `Plano atualizado para ${data.planType?.toUpperCase() || 'novo plano'}.`,
        });
        await refetch();
      } else if (data?.error) {
        console.log('No subscription found:', data.error);
      }
    } catch (error: any) {
      console.error('Error syncing subscription:', error);
      toast({
        title: 'Erro ao sincronizar',
        description: 'Tente novamente em alguns segundos.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true' && organization?.id) {
      // Remove the success param to avoid re-syncing on refresh
      setSearchParams({});
      
      toast({
        title: 'Processando assinatura...',
        description: 'Aguarde enquanto sincronizamos sua assinatura.',
      });
      
      // Wait a bit for LemonSqueezy to process, then sync
      const timer = setTimeout(() => {
        syncSubscription();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, organization?.id]);

  useEffect(() => {
    setBackAction(() => () => navigate(-1));
    return () => setBackAction(null);
  }, [setBackAction, navigate]);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <AnimatedContainer animation="fade-up" className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 md:flex hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="hidden md:block">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <CreditCard className="h-7 w-7 md:h-8 md:w-8 text-primary" />
              Assinatura
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie sua assinatura do Qualify</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManageSubscription && (
            <Link to="/app/upgrade">
              <Button variant="outline" size="sm" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Planos
              </Button>
            </Link>
          )}
          {canManageSubscription && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={syncSubscription}
              disabled={syncing || !organization?.id}
              className="gap-2"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sincronizar
            </Button>
          )}
        </div>
      </AnimatedContainer>

      {syncing && (
        <AnimatedContainer animation="fade-up" className="mb-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium text-primary">Sincronizando assinatura...</p>
              <p className="text-sm text-muted-foreground">Buscando informações do LemonSqueezy</p>
            </div>
          </div>
        </AnimatedContainer>
      )}

      <AnimatedContainer animation="fade-up" delay={0.1}>
        <SubscriptionTab />
      </AnimatedContainer>
    </div>
  );
}
