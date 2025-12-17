import { Link } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Clock, CreditCard, X } from 'lucide-react';
import { useState, useEffect } from 'react';

const TRIAL_BANNER_DISMISSED_KEY = 'trial-banner-dismissed';

export function TrialBanner() {
  const { loading, isTrialing, trialDaysLeft, isActive } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedUntil = localStorage.getItem(TRIAL_BANNER_DISMISSED_KEY);
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      if (dismissedDate > new Date()) {
        setDismissed(true);
      } else {
        localStorage.removeItem(TRIAL_BANNER_DISMISSED_KEY);
      }
    }
  }, []);

  const handleDismiss = () => {
    // Dismiss for 24 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    localStorage.setItem(TRIAL_BANNER_DISMISSED_KEY, tomorrow.toISOString());
    setDismissed(true);
  };

  // Don't show if loading, dismissed, active subscription, or not trialing
  if (loading || dismissed || isActive || !isTrialing) {
    return null;
  }

  const isUrgent = trialDaysLeft <= 3;

  return (
    <div 
      className={`relative rounded-lg p-4 mb-6 ${
        isUrgent 
          ? 'bg-destructive/10 border border-destructive/20' 
          : 'bg-blue-500/10 border border-blue-500/20'
      }`}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-md hover:bg-background/50 transition-colors"
        aria-label="Fechar"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className={`p-2 rounded-full ${isUrgent ? 'bg-destructive/10' : 'bg-blue-500/10'}`}>
          <Clock className={`h-5 w-5 ${isUrgent ? 'text-destructive' : 'text-blue-500'}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${isUrgent ? 'text-destructive' : 'text-blue-600'}`}>
            {isUrgent 
              ? `Seu período de teste expira em ${trialDaysLeft} dia${trialDaysLeft !== 1 ? 's' : ''}!`
              : `${trialDaysLeft} dias restantes no período de teste`
            }
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isUrgent 
              ? 'Assine agora para não perder o acesso às funcionalidades.'
              : 'Aproveite todas as funcionalidades do Qualify. Assine para continuar usando após o período de teste.'
            }
          </p>
        </div>
        
        <Link to="/app/settings?tab=subscription">
          <Button 
            size="sm" 
            className={`gap-2 shrink-0 ${isUrgent ? 'bg-destructive hover:bg-destructive/90' : ''}`}
          >
            <CreditCard className="h-4 w-4" />
            Assinar Agora
          </Button>
        </Link>
      </div>
    </div>
  );
}
