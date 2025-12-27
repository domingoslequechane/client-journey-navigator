import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScrollToBottomButtonProps {
  visible: boolean;
  onClick: () => void;
  className?: string;
}

export function ScrollToBottomButton({ visible, onClick, className }: ScrollToBottomButtonProps) {
  if (!visible) return null;

  return (
    <Button
      onClick={onClick}
      className={cn(
        "absolute left-1/2 -translate-x-1/2 rounded-full h-10 w-10 shadow-lg animate-fade-in z-10",
        "bg-background hover:bg-muted border border-border text-foreground",
        "transition-all duration-200 hover:scale-105",
        className || "bottom-4"
      )}
      size="icon"
      variant="outline"
      title="Ir para mensagens mais recentes"
    >
      <ArrowDown className="h-4 w-4" />
    </Button>
  );
}
