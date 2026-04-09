import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QualifySplashScreenProps {
  message?: string;
  className?: string;
}

export function QualifySplashScreen({ message = "Verificando acesso...", className }: QualifySplashScreenProps) {
  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background animate-in fade-in duration-200",
      className
    )}>
      <div className="relative mb-8">
        {/* Animated Rings */}
        <div className="absolute inset-0 animate-ping opacity-20 bg-primary rounded-full" />
        <div className="absolute -inset-4 animate-pulse opacity-10 bg-primary rounded-full delay-75" />
        
        {/* Logo Container */}
        <div className="relative h-20 w-20 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/20">
          <span className="text-primary-foreground font-black text-4xl select-none">Q</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 text-center px-4 max-w-sm">
        <h2 className="text-2xl font-bold tracking-tight">Qualify</h2>
        
        <div className="flex items-center gap-2 text-muted-foreground bg-accent/50 px-4 py-2 rounded-full border border-border/50">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p className="text-sm font-medium">{message}</p>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-8 text-muted-foreground/40 text-[10px] font-bold uppercase tracking-[0.2em]">
        Agência Qualify &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
