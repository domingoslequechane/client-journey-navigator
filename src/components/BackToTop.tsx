import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <Button
      variant="secondary"
      size="icon"
      className={cn(
        "fixed bottom-8 right-8 z-[210] rounded-full w-12 h-12 shadow-2xl transition-all duration-300 transform border border-border/50 bg-background/80 backdrop-blur-md hover:bg-primary hover:text-primary-foreground group",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
      )}
      onClick={scrollToTop}
      aria-label="Voltar ao topo"
    >
      <ArrowUp className="h-6 w-6 group-hover:-translate-y-1 transition-transform" />
    </Button>
  );
}
