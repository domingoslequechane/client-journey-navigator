import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, X, Rocket } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { usePermissions } from '@/hooks/usePermissions';

export function PlanExpiredModal() {
  const { loading, hasAccess, planType, organization } = useSubscription();
  const { isOwner, hasPrivilege } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const canManageSubscription = isOwner || hasPrivilege('finance');

  useEffect(() => {
    // Only show on main app routes
    if (!location.pathname.startsWith('/app')) return;

    // Do not show on upgrade or subscription pages to avoid confusing the user
    const excludedRoutes = ['/app/upgrade', '/app/subscription', '/app/prospecting'];
    if (excludedRoutes.includes(location.pathname)) {
      setIsOpen(false);
      return;
    }

    // Only show if we have successfully loaded organization data and user TRULY doesn't have access
    if (!loading && organization && !hasAccess) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [loading, hasAccess, organization, location.pathname]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleUpgrade = () => {
    setIsOpen(false);
    navigate('/app/subscription');
  };

  if (loading || hasAccess || !organization) return null;

  const isTrial = planType === 'trial';
  const title = isTrial ? 'Período de Teste Terminado' : 'Assinatura Expirada';
  const description = isTrial 
    ? 'Os seus 7 dias de teste grátis terminaram. Para não perder acesso aos seus clientes e às funcionalidades premium, escolha um plano.'
    : 'A validade do seu plano expirou. Renove agora para continuar a gerir os seus clientes sem interrupções.';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl [&>button]:hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Gradient hero */}
        <div className="relative bg-gradient-to-br from-red-600 via-orange-600 to-amber-500 px-8 pt-10 pb-8 text-white text-center">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">{title}</h2>
            <p className="text-white/90 text-sm leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5 bg-card">
          {/* Benefit teaser */}
          <div className="space-y-2.5">
            {[
              'Acesso a todos os seus clientes ativos',
              'Ferramentas exclusivas do Studio Criativo',
              'Gestão Financeira e contratos ilimitados',
              'Integração com Assistente QIA'
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm">
                <div className="h-5 w-5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                </div>
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="space-y-2 pt-1">
            {canManageSubscription && (
              <Button
                className="w-full gap-2 h-11 text-sm font-semibold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-0"
                onClick={handleUpgrade}
              >
                <Rocket className="h-4 w-4" />
                Ver Planos Disponíveis
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full text-muted-foreground text-sm"
              onClick={handleClose}
            >
              Continuar com acesso limitado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
