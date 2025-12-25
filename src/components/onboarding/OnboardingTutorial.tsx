import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TutorialStep {
  target: string; // CSS selector for the element to highlight
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tutorialSteps: TutorialStep[] = [
  {
    target: '[data-tutorial="dashboard"]',
    title: 'Painel Principal',
    description: 'Este é o seu Dashboard! Aqui você tem uma visão geral dos seus clientes, métricas e pode acessar ações rápidas.',
    position: 'bottom',
  },
  {
    target: '[data-tutorial="sidebar-funnel"]',
    title: 'Funil de Vendas',
    description: 'Gerencie seus clientes através das etapas do funil: Prospecção, Reunião, Contratação e muito mais.',
    position: 'right',
  },
  {
    target: '[data-tutorial="sidebar-clients"]',
    title: 'Lista de Clientes',
    description: 'Acesse todos os seus clientes, visualize detalhes, gerencie contratos e acompanhe o progresso.',
    position: 'right',
  },
  {
    target: '[data-tutorial="sidebar-ai"]',
    title: 'QIA - Assistente Inteligente',
    description: 'Conheça a QIA, sua assistente de marketing digital! Ela conhece todos os detalhes dos seus clientes e pode ajudar com estratégias.',
    position: 'right',
  },
  {
    target: '[data-tutorial="sidebar-settings"]',
    title: 'Configurações',
    description: 'Configure sua agência, gerencie equipe, base de conhecimento e assinatura aqui.',
    position: 'right',
  },
];

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

export function OnboardingTutorial() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [loading, setLoading] = useState(true);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check tutorial status from database
  useEffect(() => {
    const checkTutorialStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tutorial_completed')
          .eq('id', user.id)
          .single();

        if (profile && !profile.tutorial_completed) {
          // Delay to let the page render
          setTimeout(() => {
            setIsVisible(true);
          }, 500);
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkTutorialStatus();
  }, [user]);

  useEffect(() => {
    if (!isVisible) return;

    const step = tutorialSteps[currentStep];
    const targetElement = document.querySelector(step.target);

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      setTargetRect(rect);

      // Calculate tooltip position based on the step's preferred position
      const tooltipWidth = 320;
      const tooltipHeight = 150;
      const padding = 16;

      let top = 0;
      let left = 0;
      let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

      switch (step.position) {
        case 'bottom':
          top = rect.bottom + padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          arrowPosition = 'top';
          break;
        case 'top':
          top = rect.top - tooltipHeight - padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          arrowPosition = 'bottom';
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + padding;
          arrowPosition = 'left';
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - padding;
          arrowPosition = 'right';
          break;
      }

      // Keep tooltip within viewport
      left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
      top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

      setTooltipPosition({ top, left, arrowPosition });

      // Scroll element into view if needed
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep, isVisible]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ tutorial_completed: true })
          .eq('id', user.id);
      } catch (error) {
        console.error('Error updating tutorial status:', error);
      }
    }
    setIsVisible(false);
  };

  if (loading || !isVisible || !tooltipPosition || !targetRect) return null;

  const step = tutorialSteps[currentStep];

  const arrowStyles: Record<string, string> = {
    top: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent border-b-card',
    bottom: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-b-transparent border-t-card',
    left: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-card',
    right: 'right-0 top-1/2 translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-card',
  };

  return createPortal(
    <>
      {/* Overlay with spotlight effect */}
      <div className="fixed inset-0 z-[9998]">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>

      {/* Highlighted element border */}
      <div
        className="fixed z-[9999] rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent pointer-events-none"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[10000] w-80 bg-card border border-border rounded-xl shadow-2xl animate-scale-in"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Arrow */}
        <div
          className={`absolute w-0 h-0 border-8 ${arrowStyles[tooltipPosition.arrowPosition]}`}
        />

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={handleComplete}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 pr-6">{step.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{step.description}</p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} de {tutorialSteps.length}
            </span>
            <Button onClick={handleNext} size="sm">
              {currentStep === tutorialSteps.length - 1 ? 'Começar' : 'Próximo'}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
