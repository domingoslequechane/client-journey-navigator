import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Circle, Loader2, Sparkles, Wand2, ShieldCheck, PenTool, Search, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

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
    description: 'Analisando referências, mapeando zonas de layout e definindo hierarquia visual...',
    icon: Search,
    duration: 10000
  },
  {
    id: 2,
    title: 'Designer',
    description: 'Renderizando produto 3D com iluminação de estúdio e compondo elementos gráficos...',
    icon: Wand2,
    duration: 30000
  },
  {
    id: 3,
    title: 'Quality Control',
    description: 'Verificando fidelidade ao brief, harmonia de cores e legibilidade tipográfica...',
    icon: ShieldCheck,
    duration: 10000
  },
  {
    id: 4,
    title: 'Retoucher',
    description: 'Aplicando color grading, polimento final e efeitos atmosféricos de iluminação...',
    icon: PenTool,
    duration: 15000
  }
];

export function GenerationSteps({ isGenerating, mode }: GenerationStepsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  const totalDuration = useMemo(() => STEPS.reduce((acc, step) => acc + step.duration, 0), []);

  useEffect(() => {
    if (!isGenerating) {
      setCurrentStep(0);
      setCompletedSteps([]);
      setElapsedTime(0);
      return;
    }

    let timeoutId: number;
    let intervalId: number;
    
    const runSteps = async () => {
      let accumulatedTime = 0;
      for (let i = 0; i < STEPS.length; i++) {
        if (!isGenerating) break;
        
        setCurrentStep(i);
        await new Promise(resolve => {
          timeoutId = window.setTimeout(resolve, STEPS[i].duration);
        });
        accumulatedTime += STEPS[i].duration;
        setCompletedSteps(prev => [...prev, i]);
      }
    };

    runSteps();

    // Update elapsed time every 100ms for smooth progress bar
    intervalId = window.setInterval(() => {
      setElapsedTime(prev => {
        if (prev >= totalDuration) return totalDuration;
        return prev + 100;
      });
    }, 100);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isGenerating, totalDuration]);

  if (!isGenerating) return null;

  const progress = Math.min((elapsedTime / totalDuration) * 100, 99);
  const remainingSeconds = Math.max(Math.ceil((totalDuration - elapsedTime) / 1000), 0);

  return (
    <div className="space-y-6 py-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
            Creative Team em Ação
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
          <Clock className="h-3 w-3" />
          <span>Tempo estimado: {remainingSeconds}s</span>
        </div>
      </div>

      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
          <span>Progresso da Geração</span>
          <span>{Math.round(progress)}%</span>
        </div>
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
        O processo de alta fidelidade leva cerca de 65 segundos para garantir um resultado profissional impecável.
      </p>
    </div>
  );
}