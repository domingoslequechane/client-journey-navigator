import { useEffect, useState, useRef } from 'react';

type SectionType = 'problema' | 'custo' | 'solucao' | 'esperanca';

interface AnimatedIllustrationProps {
  section: SectionType;
  className?: string;
  animationDirection?: 'left' | 'right' | 'scale' | 'fade';
}

// Chaos Illustration - WhatsApp-like messages with alerts
function ChaosIllustration() {
  return (
    <div className="w-full h-full bg-[#1a1a1a] rounded-xl overflow-hidden p-4 min-h-[280px]">
      {/* Window Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/80" />
          <div className="w-3 h-3 rounded-full bg-warning/80" />
          <div className="w-3 h-3 rounded-full bg-success/80" />
        </div>
        <span className="text-xs text-muted-foreground ml-2">Caos — Mensagens</span>
      </div>
      
      {/* Messages */}
      <div className="space-y-3">
        <div className="flex items-start gap-2 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-destructive/30 flex items-center justify-center text-destructive text-xs">⚠️</div>
          <div className="flex-1 bg-[#2a2a2a] rounded-lg p-3">
            <div className="text-destructive text-xs font-medium mb-1">URGENTE</div>
            <div className="h-2 w-3/4 bg-muted-foreground/20 rounded" />
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full bg-warning/30 flex items-center justify-center text-warning text-xs">❓</div>
          <div className="flex-1 bg-[#2a2a2a] rounded-lg p-3">
            <div className="text-warning text-xs font-medium mb-1">Onde está o cliente?</div>
            <div className="h-2 w-1/2 bg-muted-foreground/20 rounded" />
          </div>
        </div>
        
        <div className="flex items-start gap-2 opacity-70">
          <div className="w-8 h-8 rounded-full bg-destructive/30 flex items-center justify-center text-destructive text-xs">❌</div>
          <div className="flex-1 bg-[#2a2a2a] rounded-lg p-3">
            <div className="text-destructive text-xs font-medium mb-1">Lead Perdido</div>
            <div className="h-2 w-2/3 bg-muted-foreground/20 rounded" />
          </div>
        </div>
        
        <div className="flex items-start gap-2 opacity-50">
          <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground text-xs">💬</div>
          <div className="flex-1 bg-[#2a2a2a] rounded-lg p-3">
            <div className="h-2 w-1/3 bg-muted-foreground/20 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Loss Illustration - Cards fading/disappearing
function LossIllustration() {
  return (
    <div className="w-full h-full bg-[#1a1a1a] rounded-xl overflow-hidden p-4 min-h-[280px]">
      {/* Window Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/80" />
          <div className="w-3 h-3 rounded-full bg-warning/80" />
          <div className="w-3 h-3 rounded-full bg-success/80" />
        </div>
        <span className="text-xs text-muted-foreground ml-2">Leads — Perdidos</span>
      </div>
      
      {/* Fading Cards */}
      <div className="space-y-3 relative">
        <div className="flex items-center gap-3 transform translate-x-4 opacity-100">
          <div className="w-full bg-primary/20 border border-primary/40 rounded-lg p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center text-primary">↘️</div>
            <div className="flex-1">
              <div className="h-2 w-1/2 bg-primary/40 rounded mb-2" />
              <div className="h-2 w-1/3 bg-primary/20 rounded" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 transform translate-x-8 opacity-60">
          <div className="w-full bg-primary/15 border border-primary/30 rounded-lg p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary/60">↘️</div>
            <div className="flex-1">
              <div className="h-2 w-2/5 bg-primary/30 rounded mb-2" />
              <div className="h-2 w-1/4 bg-primary/15 rounded" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 transform translate-x-12 opacity-30">
          <div className="w-full bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary/30">↘️</div>
            <div className="flex-1">
              <div className="h-2 w-1/3 bg-primary/20 rounded mb-2" />
              <div className="h-2 w-1/5 bg-primary/10 rounded" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 transform translate-x-16 opacity-10">
          <div className="w-full bg-primary/5 border border-primary/10 rounded-lg p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/5" />
            <div className="flex-1">
              <div className="h-2 w-1/4 bg-primary/10 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pipeline Illustration - Organized Kanban
function PipelineIllustration() {
  return (
    <div className="w-full h-full bg-[#1a1a1a] rounded-xl overflow-hidden p-4 min-h-[280px]">
      {/* Window Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/80" />
          <div className="w-3 h-3 rounded-full bg-warning/80" />
          <div className="w-3 h-3 rounded-full bg-success/80" />
        </div>
        <span className="text-xs text-muted-foreground ml-2">Qualify — Pipeline</span>
      </div>
      
      {/* Kanban Columns */}
      <div className="grid grid-cols-3 gap-2 h-[200px]">
        {/* Column 1 */}
        <div className="bg-[#2a2a2a] rounded-lg p-2">
          <div className="text-xs text-muted-foreground mb-2 font-medium">Prospecção</div>
          <div className="space-y-2">
            <div className="bg-primary rounded p-2">
              <div className="h-2 w-full bg-primary-foreground/30 rounded mb-1" />
              <div className="h-1.5 w-2/3 bg-primary-foreground/20 rounded" />
            </div>
            <div className="bg-primary rounded p-2">
              <div className="h-2 w-3/4 bg-primary-foreground/30 rounded mb-1" />
              <div className="h-1.5 w-1/2 bg-primary-foreground/20 rounded" />
            </div>
            <div className="bg-primary/80 rounded p-2">
              <div className="h-2 w-full bg-primary-foreground/30 rounded" />
            </div>
          </div>
        </div>
        
        {/* Column 2 */}
        <div className="bg-[#2a2a2a] rounded-lg p-2">
          <div className="text-xs text-muted-foreground mb-2 font-medium">Reunião</div>
          <div className="space-y-2">
            <div className="bg-primary rounded p-2">
              <div className="h-2 w-full bg-primary-foreground/30 rounded mb-1" />
              <div className="h-1.5 w-3/4 bg-primary-foreground/20 rounded" />
            </div>
            <div className="bg-primary/80 rounded p-2">
              <div className="h-2 w-2/3 bg-primary-foreground/30 rounded" />
            </div>
          </div>
        </div>
        
        {/* Column 3 */}
        <div className="bg-[#2a2a2a] rounded-lg p-2">
          <div className="text-xs text-muted-foreground mb-2 font-medium">Produção</div>
          <div className="space-y-2">
            <div className="bg-success rounded p-2">
              <div className="h-2 w-full bg-success-foreground/30 rounded mb-1" />
              <div className="h-1.5 w-1/2 bg-success-foreground/20 rounded" />
            </div>
            <div className="bg-success/80 rounded p-2">
              <div className="h-2 w-3/4 bg-success-foreground/30 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnimatedIllustration({ 
  section, 
  className = '',
  animationDirection = 'fade'
}: AnimatedIllustrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  // Animation classes based on direction
  const getAnimationClasses = () => {
    const baseClasses = 'transition-all duration-1000 ease-out';
    
    if (!isVisible) {
      switch (animationDirection) {
        case 'left':
          return `${baseClasses} opacity-0 -translate-x-16`;
        case 'right':
          return `${baseClasses} opacity-0 translate-x-16`;
        case 'scale':
          return `${baseClasses} opacity-0 scale-75`;
        default:
          return `${baseClasses} opacity-0 translate-y-8`;
      }
    }
    
    return `${baseClasses} opacity-100 translate-x-0 translate-y-0 scale-100`;
  };

  // Render appropriate illustration based on section
  const renderIllustration = () => {
    switch (section) {
      case 'problema':
        return <ChaosIllustration />;
      case 'custo':
        return <LossIllustration />;
      case 'solucao':
      case 'esperanca':
        return <PipelineIllustration />;
      default:
        return <PipelineIllustration />;
    }
  };

  return (
    <div 
      ref={ref}
      className={`relative overflow-hidden rounded-2xl shadow-lg ${className} ${getAnimationClasses()}`}
    >
      {renderIllustration()}
    </div>
  );
}
