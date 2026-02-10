import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Loader2, Sparkles, Wand2, ShieldCheck, PenTool, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GenerationStepsProps {
  isGenerating: boolean;
  mode: string;
}

interface Step {
  id: number;
  title: string;
  description: string;
  icon: any;
  duration: number; // Estimated duration in ms
}

const STEPS: Step[] = [
  { 
    id: 1, 
    title: 'Art Director', 
    description: 'Analisando referências e mapeando zonas de layout...', 
    icon: Search,
    duration: 8000 
  },
  { 
    id: 2, 
    title: 'Designer', 
    description: 'Renderizando produto 3D e compondo elementos visuais...', 
    icon: Wand2,
    duration: 25000 
  },
  { 
    id: 3, 
    title: 'Quality Control', 
    description: 'Verificando fidelidade, cores e legibilidade do texto...', 
    icon: ShieldCheck,
    duration: 7000 
  },
  { 
    id: 4, 
    title: 'Retoucher', 
    description: 'Aplicando polimento final e efeitos de iluminação...', 
    icon: PenTool,
    duration: 10000 
  }
];

export function GenerationSteps({ isGenerating, mode }: GenerationStepsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    if (!isGenerating) {
      setCurrentStep(0);
      setCompletedSteps([]);
      return;
    }

    let timeoutId: number;
    
    const runSteps = async () => {
      for (let i = 0; i < STEPS.length; i++) {
        if (!isGenerating) break;
        
        setCurrentStep(i);
        await new Promise(resolve => {
          timeoutId = window.setTimeout(resolve, STEPS[i].duration);
        });
        setCompletedSteps(prev => [...prev, i]);
      }
    };

    runSteps();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isGenerating]);

  if (!isGenerating) return null;

  return (
    <div className="space-y-4 py-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
          Creative Team em Ação
        </h3>
      </div>

      <div className="space-y-3">
        {STEPS.map((step, index) => {
          const isActive = currentStep === index;
          const isCompleted = completedSteps.includes(index);
          const Icon = step.icon;

          return (
            <div 
              key={step.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border transition-all duration-500",
                isActive ? "bg-primary/5 border-primary/30 shadow-sm scale-[1.02]" : "bg-card border-border opacity-50",
                isCompleted && "opacity-100 border-green-500/30 bg-green-500/5"
              )}
            >
              <div className={cn(
                "mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                isActive ? "bg-primary text-primary-foreground" : 
                isCompleted ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={cn(
                    "text-sm font-bold",
                    isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-foreground"
                  )}>
                    {step.title}
                  </p>
                  {isActive && (
                    <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full animate-pulse">
                      PROCESSANDO
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-center text-muted-foreground italic">
        O processo completo leva cerca de 45-60 segundos para garantir qualidade máxima.
      </p>
    </div>
  );
}