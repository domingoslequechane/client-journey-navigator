import { useEffect } from 'react';
import { BrainCircuit, Lock } from 'lucide-react';
import { useHeader } from '@/contexts/HeaderContext';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Badge } from '@/components/ui/badge';

export default function AIAgents() {
  const { setCustomTitle, setRightAction } = useHeader();

  useEffect(() => {
    setCustomTitle('Agentes de IA');
    setRightAction(null);

    return () => {
      setCustomTitle(null);
      setRightAction(null);
    };
  }, [setCustomTitle, setRightAction]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 md:p-6 text-center">
      <AnimatedContainer duration={0.6} className="max-w-md w-full">
        <div className="relative mb-8">
          <div className="h-24 w-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto relative z-10">
            <BrainCircuit className="h-12 w-12 text-primary animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-background border-2 border-border flex items-center justify-center z-20">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          {/* Decorative gradients */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-0" />
        </div>

        <Badge variant="outline" className="mb-4 border-primary/30 text-primary font-bold tracking-widest uppercase text-[10px] px-3">
          🚧 Em Desenvolvimento 🚧
        </Badge>
        
        <h1 className="text-3xl font-bold tracking-tight mb-4">
          Agentes de IA
        </h1>
        
        <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
          Estamos construindo algo incrível! Este recurso está em fase final de desenvolvimento e será liberado em breve para todos os utilizadores.
        </p>

        <div className="p-6 rounded-2xl border border-border bg-card/50 backdrop-blur-sm space-y-4 text-left">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            O que esperar:
          </h3>
          <ul className="grid gap-2">
            <li className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              Atendimento automático inteligente 24/7
            </li>
            <li className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              Integração completa com seus canais de vendas
            </li>
            <li className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              Personalidade personalizada para sua marca
            </li>
          </ul>
        </div>
      </AnimatedContainer>
    </div>
  );
}
