import { Link } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Rocket, Clock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

export function TrialStatusBanner() {
  const { t } = useTranslation('common');
  const { isTrialing, trialDaysLeft, daysRemaining, organization, isActive } = useSubscription();

  // O banner aparece se:
  // 1. O utilizador estiver em trial OU
  // 2. Tiver uma assinatura ativa (paga) que expira em 7 dias ou menos.
  const shouldShow = isTrialing || (isActive && daysRemaining <= 7);

  if (!shouldShow) {
    return null;
  }

  // Se estiver em trial usamos o trialDaysLeft, se for assinatura paga usamos o daysRemaining global do LemonSqueezy
  const effectiveDays = isTrialing ? trialDaysLeft : daysRemaining;

  return (
    <div className="w-full bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-primary/20 h-14 flex items-center px-4 shadow-sm shrink-0 sticky top-0 z-40 backdrop-blur-md">
      <div className="flex items-center gap-3 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-3 text-primary shrink-0">
          <Rocket className="h-5 w-5" />
          <Badge variant="outline" className="text-[10px] uppercase font-black border-primary/30 text-primary bg-primary/5 px-2.5 py-0.5 h-6">
            {isTrialing ? 'Trial' : 'Renovação'}
          </Badge>
        </div>
        
        <div className="flex-1 min-w-0 text-sm font-medium">
          <span className="hidden sm:inline">Olá, <strong>{organization?.name}</strong>! </span>
          <span>{isTrialing ? 'Seu período de teste' : 'Sua assinatura'} expira em <span className="text-primary font-bold">{effectiveDays} {effectiveDays === 1 ? 'dia' : 'dias'}</span>.</span>
          {isTrialing && <span className="hidden lg:inline text-muted-foreground ml-2 text-xs opacity-80">{t('common:status.trialBanner')}</span>}
        </div>

        <Link 
          to="/app/subscription" 
          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-all hover:translate-x-1 shrink-0"
        >
          Ver Planos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
