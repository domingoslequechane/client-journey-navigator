import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface NewDataBadgeProps {
  count: number;
  className?: string;
}

export function NewDataBadge({ count, className }: NewDataBadgeProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevCount, setPrevCount] = useState(count);

  useEffect(() => {
    if (count > prevCount) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
    setPrevCount(count);
  }, [count, prevCount]);

  if (count === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full bg-destructive text-destructive-foreground",
        isAnimating && "animate-pulse",
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
