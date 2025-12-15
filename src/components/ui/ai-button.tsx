import { Button } from './button';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function AIButton({ onClick, isLoading, className, children }: AIButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        'bg-gradient-to-r from-primary to-chart-5 hover:from-primary/90 hover:to-chart-5/90 text-primary-foreground gap-2',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {children || 'Análise IA'}
    </Button>
  );
}
