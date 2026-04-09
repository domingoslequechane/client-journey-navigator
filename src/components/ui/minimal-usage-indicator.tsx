import { cn } from "@/lib/utils";

interface MinimalUsageIndicatorProps {
  current: number;
  max: number | null;
  label: string;
  className?: string;
}

export function MinimalUsageIndicator({ current, max, label, className }: MinimalUsageIndicatorProps) {
  if (max === null) return null;
  
  const percentage = Math.min(100, (current / max) * 100);
  
  return (
    <div className={cn("inline-flex flex-col min-w-[200px] mb-2", className)}>
      <div className="flex justify-between items-end mb-1.5 px-0.5">
        <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{label}:</span>
        <span className="text-[13px] font-bold text-primary tabular-nums">
          {current} <span className="text-muted-foreground/40 mx-0.5">/</span> {max}
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden border border-border/5">
        <div 
          className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-700 ease-in-out shadow-[0_0_8px_rgba(var(--primary),0.3)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
