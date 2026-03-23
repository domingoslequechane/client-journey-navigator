import { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calendar, CreditCard, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SubscriptionExpiryModal() {
  const { daysRemaining, hasActiveSubscription, isActive, organization } = useSubscription();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!organization?.id || !hasActiveSubscription) return;

    // We only alert specifically at 7, 3, 2, 1 days
    const alertDays = [7, 3, 2, 1];
    if (!alertDays.includes(daysRemaining)) return;

    // Check if we already showed this specific alert for this organization today
    const storageKey = `expiry_alert_${organization.id}_${daysRemaining}`;
    const alreadySeen = localStorage.getItem(storageKey);

    if (!alreadySeen) {
      setIsOpen(true);
      // Mark as seen for today
      localStorage.setItem(storageKey, new Date().toDateString());
    }
  }, [daysRemaining, hasActiveSubscription, isActive, organization?.id]);

  const handleRenew = () => {
    setIsOpen(false);
    navigate('/app/settings?tab=subscription');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md border-orange-500/20 bg-orange-50/5 dark:bg-orange-950/10 backdrop-blur-xl">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            Seu plano expira em breve!
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            O plano da agência <strong>{organization?.name}</strong> expira em{' '}
            <span className="text-orange-600 dark:text-orange-400 font-bold">
              {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
            </span>.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-white/50 dark:bg-black/20 rounded-xl p-4 space-y-3 border border-orange-200/50 dark:border-orange-800/30 my-2">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">Acesso renovável via LemonSqueezy.</span>
          </div>
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">Evite a interrupção das suas atividades.</span>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => setIsOpen(false)}
          >
            Lembrar depois
          </Button>
          <Button
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white gap-2"
            onClick={handleRenew}
          >
            Ver Detalhes
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
