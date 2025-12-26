import { useState, useEffect, useRef, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (navigator as any).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstalled();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
      if (e.matches) {
        setCanInstall(false);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    // Capture the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt.current = null;
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt.current) {
      return false;
    }

    try {
      await deferredPrompt.current.prompt();
      const result = await deferredPrompt.current.userChoice;
      
      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
        deferredPrompt.current = null;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  }, []);

  return { canInstall, isInstalled, install };
}
