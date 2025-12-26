import { useState, useEffect } from 'react';
import { useIsMobile } from './use-mobile';

export function useKeyboardVisible() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined' || !window.visualViewport) return;
    
    const viewport = window.visualViewport;
    const initialHeight = window.innerHeight;
    
    const handleResize = () => {
      // Se a altura diminuiu mais de 150px, o teclado provavelmente abriu
      const heightDiff = initialHeight - (viewport?.height || initialHeight);
      setIsKeyboardVisible(heightDiff > 150);
    };
    
    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, [isMobile]);
  
  return isKeyboardVisible;
}
