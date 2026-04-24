import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, Sparkles, X } from 'lucide-react';

interface FreeLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What was the limit hit. e.g. "2 clientes no Pipeline" */
  limitDescription: string;
  /** Feature name for the upgrade CTA.  e.g. "clientes ilimitados" */
  upgradeFeature?: string;
}

export function FreeLimitModal({
  open,
  onOpenChange,
  limitDescription,
  upgradeFeature = 'recursos ilimitados',
}: FreeLimitModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/app/subscription');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl [&>button]:hidden">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Gradient hero */}
        <div className="relative bg-gradient-to-br from-primary via-primary/90 to-orange-600 px-8 pt-10 pb-8 text-white text-center">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Rocket className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">Limite do Plano Free</h2>
            <p className="text-white/80 text-sm leading-relaxed">
              Você atingiu o limite de{' '}
              <span className="font-semibold text-white">{limitDescription}</span>.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5 bg-card">
          {/* Benefit teaser */}
          <div className="space-y-2.5">
            {[
              'Clientes, páginas e contas ilimitadas',
              'Créditos de Studio renovados mensalmente',
              'Todos os módulos desbloqueados',
              'Suporte prioritário',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="space-y-2 pt-1">
            <Button
              className="w-full gap-2 h-11 text-sm font-semibold"
              onClick={handleUpgrade}
            >
              <Rocket className="h-4 w-4" />
              Ver Planos e Fazer Upgrade
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground text-sm"
              onClick={() => onOpenChange(false)}
            >
              Agora não
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
