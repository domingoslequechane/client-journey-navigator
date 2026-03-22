import { useState, useEffect, useCallback, useRef } from 'react';

interface UseOnlineStatusOptions {
  onReconnect?: () => void;
  onDisconnect?: () => void;
}

export function useOnlineStatus(options: UseOnlineStatusOptions = {}) {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    if (!isOnline) {
      setWasOffline(true);
      setJustReconnected(true);
      options.onReconnect?.();
      
      // Clear "just reconnected" status after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        setJustReconnected(false);
      }, 5000);
    }
  }, [isOnline, options]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setJustReconnected(false);
    options.onDisconnect?.();
  }, [options]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [handleOnline, handleOffline]);

  return {
    isOnline,
    wasOffline,
    justReconnected,
  };
}
