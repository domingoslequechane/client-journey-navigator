import { useEffect, useState, useRef } from 'react';

// Static images - pre-generated for fast loading
import illustrationProblema from '@/assets/landing/illustration-problema.png';
import illustrationCusto from '@/assets/landing/illustration-custo.png';
import illustrationEsperanca from '@/assets/landing/illustration-esperanca.png';

type SectionType = 'problema' | 'custo' | 'solucao' | 'esperanca';

interface AnimatedIllustrationProps {
  section: SectionType;
  className?: string;
  animationDirection?: 'left' | 'right' | 'scale' | 'fade';
}

const sectionImages: Record<SectionType, string> = {
  problema: illustrationProblema,
  custo: illustrationCusto,
  solucao: illustrationEsperanca, // Reuse esperanca for solucao
  esperanca: illustrationEsperanca,
};

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

  const imageUrl = sectionImages[section];

  return (
    <div 
      ref={ref}
      className={`relative overflow-hidden rounded-2xl ${className} ${getAnimationClasses()}`}
    >
      <img 
        src={imageUrl} 
        alt={`Ilustração ${section}`}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
