import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, Lock, Rocket, AlertCircle, X, Sparkles, ArrowRight } from "lucide-react";

export function RedirectNoticeModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const reasonParam = searchParams.get('reason');
    if (reasonParam) {
      setReason(reasonParam);
      setIsOpen(true);
      
      // Clear the param from URL without refreshing
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('reason');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const getContent = () => {
    switch (reason) {
      case 'onboarding':
        return {
          title: "Configuração Necessária",
          description: "Para começar a usar a plataforma, precisamos que complete as informações básicas da sua agência.",
          icon: <Rocket className="h-8 w-8 text-white" />,
          gradient: "from-blue-600 via-indigo-600 to-violet-500",
          accentColor: "text-blue-500",
          accentBg: "bg-blue-500/10",
          buttonText: "Começar Agora",
          action: () => navigate('/onboarding')
        };
      case 'expired':
        return {
          title: "Plano Expirado",
          description: "O período de validade do seu plano terminou. Por favor, renove a sua subscrição para continuar a aceder a todas as funcionalidades.",
          icon: <AlertCircle className="h-8 w-8 text-white" />,
          gradient: "from-red-600 via-orange-600 to-amber-500",
          accentColor: "text-red-500",
          accentBg: "bg-red-500/10",
          buttonText: "Ver Planos Disponíveis",
          action: () => navigate('/app/subscription')
        };
      case 'no_plan':
        return {
          title: "Escolha um Plano",
          description: "A sua agência ainda não tem um plano ativo. Escolha o plano que melhor se adapta às suas necessidades para começar.",
          icon: <Lock className="h-8 w-8 text-white" />,
          gradient: "from-amber-500 via-orange-500 to-red-500",
          accentColor: "text-amber-500",
          accentBg: "bg-amber-500/10",
          buttonText: "Explorar Planos",
          action: () => navigate('/app/subscription')
        };
      default:
        return {
          title: "Acesso Condicionado",
          description: "Foi redirecionado porque esta funcionalidade requer uma configuração adicional ou um plano superior.",
          icon: <Info className="h-8 w-8 text-white" />,
          gradient: "from-primary via-primary/90 to-blue-600",
          accentColor: "text-primary",
          accentBg: "bg-primary/10",
          buttonText: "Entendido",
          action: () => setIsOpen(false)
        };
    }
  };

  const content = getContent();

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
        <div className={`relative bg-gradient-to-br ${content.gradient} px-8 pt-10 pb-8 text-white text-center`}>
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
              {content.icon}
            </div>
            <h2 className="text-xl font-bold mb-2">{content.title}</h2>
            <p className="text-white/90 text-sm leading-relaxed">
              {content.description}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5 bg-card">
          <div className="space-y-2.5">
            {[
              'Acesse todas as funcionalidades exclusivas',
              'Gestão centralizada da sua agência',
              'Suporte especializado'
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm">
                <div className={`h-5 w-5 rounded-full ${content.accentBg} flex items-center justify-center shrink-0`}>
                  <Sparkles className={`h-3 w-3 ${content.accentColor}`} />
                </div>
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-1">
            <Button
              className={`w-full gap-2 h-11 text-sm font-semibold bg-gradient-to-r ${content.gradient} border-0 hover:opacity-90`}
              onClick={content.action}
            >
              {content.buttonText}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground text-sm"
              onClick={() => setIsOpen(false)}
            >
              Agora não
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
