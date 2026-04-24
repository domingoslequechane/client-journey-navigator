import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, ArrowUpRight, X, Sparkles, Construction, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleLockedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleName: string;
  requiredPlan?: string;
  type?: 'plan' | 'privilege' | 'development';
}

export function ModuleLockedModal({ 
  open, 
  onOpenChange, 
  moduleName, 
  requiredPlan = 'Lança',
  type = 'plan'
}: ModuleLockedModalProps) {
  const navigate = useNavigate();

  const isPrivilege = type === 'privilege';
  const isDevelopment = type === 'development';

  const getStyle = () => {
    if (isDevelopment) {
      return {
        title: "Em Desenvolvimento",
        description: `O módulo ${moduleName} está a ser construído e será disponibilizado em breve.`,
        icon: <Construction className="h-8 w-8 text-white" />,
        gradient: "from-amber-500 via-orange-500 to-yellow-500",
        accentColor: "text-amber-500",
        accentBg: "bg-amber-500/10"
      };
    }
    if (isPrivilege) {
      return {
        title: "Acesso Restrito",
        description: `Você não tem permissão para aceder ao módulo ${moduleName}. Solicite acesso ao administrador da sua agência.`,
        icon: <ShieldAlert className="h-8 w-8 text-white" />,
        gradient: "from-slate-700 via-slate-800 to-slate-900",
        accentColor: "text-slate-500",
        accentBg: "bg-slate-500/10"
      };
    }
    return {
      title: "Módulo Bloqueado",
      description: `O módulo ${moduleName} está disponível a partir do plano ${requiredPlan}. Faça upgrade para desbloquear.`,
      icon: <Lock className="h-8 w-8 text-white" />,
      gradient: "from-primary via-primary/90 to-blue-600",
      accentColor: "text-primary",
      accentBg: "bg-primary/10"
    };
  };

  const style = getStyle();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl [&>button:last-child]:hidden">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Gradient hero */}
        <div className={`relative bg-gradient-to-br ${style.gradient} px-8 pt-10 pb-8 text-white text-center`}>
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
              {style.icon}
            </div>
            <h2 className="text-xl font-bold mb-2">{style.title}</h2>
            <p className="text-white/90 text-sm leading-relaxed">
              {style.description}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5 bg-card">
          <div className="space-y-2.5">
            {[
              'Acesse ferramentas de produtividade avançadas',
              'Gestão otimizada para agências',
              'Suporte prioritário'
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm">
                <div className={`h-5 w-5 rounded-full ${style.accentBg} flex items-center justify-center shrink-0`}>
                  <Sparkles className={`h-3 w-3 ${style.accentColor}`} />
                </div>
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-1">
            {!isPrivilege && !isDevelopment && (
              <Button
                className={`w-full gap-2 h-11 text-sm font-semibold bg-gradient-to-r ${style.gradient} border-0 hover:opacity-90 shadow-lg shadow-primary/20`}
                onClick={() => {
                  onOpenChange(false);
                  navigate('/app/upgrade');
                }}
              >
                <ArrowUpRight className="h-4 w-4" />
                Explorar Planos e Upgrade
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full text-muted-foreground text-sm"
              onClick={() => onOpenChange(false)}
            >
              {(isPrivilege || isDevelopment) ? "Entendi" : "Depois"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
