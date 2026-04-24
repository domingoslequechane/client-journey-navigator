import { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, X, Sparkles, Clock, ShieldCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function SubscriptionExpiryModal() {
  const { daysRemaining, hasActiveSubscription, isActive, organization } = useSubscription();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!organization?.id || !hasActiveSubscription) return;

    // Do not show on upgrade or subscription pages
    const excludedRoutes = ['/app/upgrade', '/app/subscription'];
    if (excludedRoutes.includes(location.pathname)) {
      setIsOpen(false);
      return;
    }

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
  }, [daysRemaining, hasActiveSubscription, isActive, organization?.id, location.pathname]);

  const handleRenew = () => {
    setIsOpen(false);
    navigate('/app/settings?tab=subscription');
  };

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
        <div className="relative bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 px-8 pt-10 pb-8 text-white text-center">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Plano Expira em Breve</h2>
            <p className="text-white/90 text-sm leading-relaxed">
              O plano da agência <strong>{organization?.name}</strong> expira em{' '}
              <span className="font-bold underline decoration-white/40">
                {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
              </span>.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5 bg-card">
          <div className="space-y-2.5">
            {[
              'Evite a interrupção das suas atividades',
              'Mantenha o acesso a todos os seus clientes',
              'Renovação segura via LemonSqueezy'
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm">
                <div className="h-5 w-5 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-3 w-3 text-orange-500" />
                </div>
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-1">
            <Button
              className="w-full gap-2 h-11 text-sm font-semibold bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 border-0 hover:opacity-90 shadow-lg shadow-orange-500/20"
              onClick={handleRenew}
            >
              Ver Detalhes e Renovar
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground text-sm"
              onClick={() => setIsOpen(false)}
            >
              Lembrar mais tarde
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
