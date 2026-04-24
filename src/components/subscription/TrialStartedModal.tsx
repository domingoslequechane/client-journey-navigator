import { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, Calendar, CheckCircle2, ArrowRight, X, Sparkles, PartyPopper } from 'lucide-react';
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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl [&>button:last-child]:hidden">
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Gradient hero */}
        <div className="relative bg-gradient-to-br from-primary via-primary/90 to-blue-600 px-8 pt-10 pb-8 text-white text-center">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <PartyPopper className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Bem-vindo ao Qualify!</h2>
            <p className="text-white/90 text-sm leading-relaxed">
              O seu período de <strong>7 dias de teste grátis</strong> do plano <strong>Catapulta</strong> começou com sucesso.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5 bg-card">
          <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Início:</span>
              </div>
              <span className="font-semibold">{format(startDate, "dd 'de' MMMM", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-primary font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Expira em:</span>
              </div>
              <span className="font-bold text-primary">{format(endDate, "dd 'de' MMMM", { locale: ptBR })}</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              'Acesso total a todos os módulos liberado',
              'Ferramentas de IA de última geração',
              'Gestão ilimitada de clientes'
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-xs">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <div className="pt-1">
            <Button
              className="w-full gap-2 h-11 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg shadow-primary/20 transition-all active:scale-95"
              onClick={() => setIsOpen(false)}
            >
              Começar a Explorar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
