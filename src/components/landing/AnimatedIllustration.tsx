import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

type SectionType = 'problema' | 'custo' | 'solucao' | 'esperanca';

interface AnimatedIllustrationProps {
  section: SectionType;
  className?: string;
  animationDirection?: 'left' | 'right' | 'scale' | 'fade';
}

export function AnimatedIllustration({ 
  section, 
  className = '',
  animationDirection = 'fade'
}: AnimatedIllustrationProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Fetch image from edge function
  useEffect(() => {
    const fetchImage = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase.functions.invoke('generate-landing-image', {
          body: { section }
        });

        if (fetchError) {
          console.error('Error fetching image:', fetchError);
          setError('Failed to load illustration');
          return;
        }

        if (data?.imageUrl) {
          setImageUrl(data.imageUrl);
        } else if (data?.error) {
          setError(data.error);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load illustration');
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [section]);

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

  return (
    <div 
      ref={ref}
      className={`relative overflow-hidden rounded-2xl bg-muted/50 ${className} ${getAnimationClasses()}`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      
      {error && !imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="text-center text-muted-foreground text-sm px-4">
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt={`Ilustração ${section}`}
          className="w-full h-full object-cover"
          onLoad={() => setIsLoading(false)}
        />
      )}
    </div>
  );
}
