import { useState, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface UseRateLimitReturn {
  checkRateLimit: () => boolean;
  isRateLimited: boolean;
  remainingRequests: number;
  resetTime: number | null;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10, // 10 requests
  windowMs: 60000, // per minute
};

export function useRateLimit(config: RateLimitConfig = DEFAULT_CONFIG): UseRateLimitReturn {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [remainingRequests, setRemainingRequests] = useState(config.maxRequests);
  const [resetTime, setResetTime] = useState<number | null>(null);
  const requestTimestamps = useRef<number[]>([]);

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Remove timestamps outside the current window
    requestTimestamps.current = requestTimestamps.current.filter(
      timestamp => timestamp > windowStart
    );
    
    const currentCount = requestTimestamps.current.length;
    
    if (currentCount >= config.maxRequests) {
      const oldestTimestamp = requestTimestamps.current[0];
      const timeUntilReset = oldestTimestamp + config.windowMs - now;
      
      setIsRateLimited(true);
      setRemainingRequests(0);
      setResetTime(now + timeUntilReset);
      
      toast({
        title: 'Limite de requisições',
        description: `Aguarde ${Math.ceil(timeUntilReset / 1000)} segundos antes de tentar novamente.`,
        variant: 'destructive',
      });
      
      // Auto-reset after the window expires
      setTimeout(() => {
        setIsRateLimited(false);
        setRemainingRequests(config.maxRequests);
        setResetTime(null);
      }, timeUntilReset);
      
      return false;
    }
    
    // Add current request timestamp
    requestTimestamps.current.push(now);
    setRemainingRequests(config.maxRequests - requestTimestamps.current.length);
    
    return true;
  }, [config.maxRequests, config.windowMs]);

  return {
    checkRateLimit,
    isRateLimited,
    remainingRequests,
    resetTime,
  };
}
