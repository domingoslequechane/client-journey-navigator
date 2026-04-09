import { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function TrialStartedModal() {
  const { isTrialing, subscription, organization } = useSubscription();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isTrialing || !organization?.id || !subscription?.currentPeriodEnd) return;

    // Check if we already showed the welcome modal for this organization's current trial
    const storageKey = `trial_welcome_seen_${organization.id}_${subscription.id}`;
    const alreadySeen = localStorage.getItem(storageKey);

    if (!alreadySeen) {
      setIsOpen(true);
      // Mark as seen permanently for this specific subscription ID
      localStorage.setItem(storageKey, 'true');
    }
  }, [isTrialing, organization?.id, subscription?.id, subscription?.currentPeriodEnd]);

  if (!subscription) return null;

  const startDate = subscription.currentPeriodStart 
    ? new Date(subscription.currentPeriodStart) 
    : new Date();
    
  const endDate = subscription.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd) 
    : new Date();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Bem-vindo ao Qualify!
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            Seu período de <strong>7 dias de teste grátis</strong> do plano <strong>Catapulta</strong> começou com sucesso.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-card/50 rounded-2xl p-6 space-y-4 border border-border my-4 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Calendar className="h-5 w-5" />
              <span className="text-sm font-medium">Início:</span>
            </div>
            <span className="text-sm font-bold">{format(startDate, "dd 'de' MMMM", { locale: ptBR })}</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Expira em:</span>
            </div>
            <span className="text-sm font-extrabold text-primary">{format(endDate, "dd 'de' MMMM", { locale: ptBR })}</span>
          </div>
          
          <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest pt-2">
            Acesso Total a Todos os Módulos Liberado
          </p>
        </div>

        <DialogFooter className="pt-2">
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-lg font-semibold gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
            onClick={() => setIsOpen(false)}
          >
            Começar a Explorar
            <ArrowRight className="h-5 w-5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
