import { cn } from "@/lib/utils";

interface UsageIndicatorProps {
  current: number;
  max: number;
  label: string;
  className?: string;
}

export function UsageIndicator({ current, max, label, className }: UsageIndicatorProps) {
  const percentage = Math.min((current / max) * 100, 100);
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-end">
        <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{label}:</span>
        <span className={cn(
          "text-xs font-bold tracking-tight px-2 py-0.5 rounded-md",
          isCritical ? "bg-destructive/10 text-destructive" : 
          isWarning ? "bg-amber-500/10 text-amber-600" : 
          "bg-primary/5 text-primary"
        )}>
          {current} / {max}
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
        <div
          className={cn(
            "h-full transition-all duration-700 ease-in-out rounded-full",
            isCritical ? "bg-destructive" : isWarning ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${percentage}%` }}
        />
        {/* Subtle glow effect for progress */}
        <div 
          className={cn(
            "absolute top-0 bottom-0 left-0 blur-[4px] opacity-20 transition-all duration-700",
            isCritical ? "bg-destructive" : isWarning ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
