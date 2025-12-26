import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION_DAYS = 7;

export function InstallPromptBanner() {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if user dismissed the banner recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const now = new Date();
      const daysSinceDismiss = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceDismiss < DISMISS_DURATION_DAYS) {
        return;
      }
    }

    // Show banner after a delay if installation is available
    if (canInstall && !isInstalled) {
      const timer = setTimeout(() => {
        setIsAnimating(true);
        setTimeout(() => setIsVisible(true), 50);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsAnimating(false);
      localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    }, 300);
  };

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setIsVisible(false);
      setIsAnimating(false);
    }
  };

  if (!isAnimating || isInstalled) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-80 
                  bg-primary text-primary-foreground p-4 rounded-xl shadow-2xl z-50
                  transition-all duration-300 ease-out
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
          <Download className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base">Instalar Qualify</p>
          <p className="text-sm opacity-90 mt-0.5">
            Acesse mais rápido direto da sua tela inicial
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button
          onClick={handleInstall}
          variant="secondary"
          size="sm"
          className="flex-1 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        >
          <Download className="h-4 w-4 mr-2" />
          Instalar agora
        </Button>
        <Button
          onClick={handleDismiss}
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          Depois
        </Button>
      </div>
    </div>
  );
}
