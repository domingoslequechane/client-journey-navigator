import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, Check, X } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CustomTimePickerProps {
  value: string; // "HH:mm" format (24h)
  onChange: (value: string) => void;
  className?: string;
}

export function CustomTimePicker({ value, onChange, className }: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  
  const parseValue = (val: string) => {
    if (!val) {
      const defaultTime = format(addMinutes(new Date(), 15), 'HH:mm');
      const [h, m] = defaultTime.split(':').map(Number);
      return { hour: h, minute: m };
    }
    const [h24, m] = val.split(':').map(Number);
    return { hour: h24, minute: m || 0 };
  };

  const initial = parseValue(value);
  const [tempHour, setTempHour] = useState(initial.hour);
  const [tempMinute, setTempMinute] = useState(initial.minute);

  // Sync temp state when value prop changes or on open
  useEffect(() => {
    const parsed = parseValue(value);
    setTempHour(parsed.hour);
    setTempMinute(parsed.minute);
  }, [value, isOpen]);

  // Scroll to selected values when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const hElement = hourRef.current?.querySelector(`[data-hour="${tempHour}"]`);
        const mElement = minuteRef.current?.querySelector(`[data-minute="${tempMinute}"]`);
        
        if (hElement) hElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
        if (mElement) mElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 50);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const formatted = `${tempHour.toString().padStart(2, '0')}:${tempMinute.toString().padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <TooltipProvider delayDuration={0}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-10 px-3 justify-start font-bold border-border/50 bg-background/50 hover:bg-muted/30 transition-all gap-2 min-w-[110px]",
                  className
                )}
              >
                <Clock className="h-4 w-4 text-primary" />
                <span>{`${tempHour.toString().padStart(2, '0')}:${tempMinute.toString().padStart(2, '0')}`}</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-[10px] font-bold">Definir horário de postagem</p>
          </TooltipContent>
        </Tooltip>
        
        <PopoverContent className="w-auto p-0 bg-[#1A1A1A] border-border/40 shadow-2xl rounded-2xl overflow-hidden" align="end">
          <div className="flex flex-col w-[180px]">
            <div className="flex p-3 gap-0 border-b border-white/5 h-[220px]">
              {/* Hours Column */}
              <div 
                ref={hourRef}
                className="flex-1 flex flex-col overflow-y-auto no-scrollbar scroll-smooth snap-y"
              >
                <div className="h-[80px] shrink-0" /> {/* Spacer */}
                {hours.map(h => (
                  <button
                    key={h}
                    data-hour={h}
                    onClick={() => setTempHour(h)}
                    className={cn(
                      "py-3 text-sm font-black transition-all rounded-xl mb-1 mx-1 snap-center shrink-0",
                      tempHour === h 
                        ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30" 
                        : "text-white/30 hover:bg-white/5 hover:text-white/60"
                    )}
                  >
                    {h.toString().padStart(2, '0')}
                  </button>
                ))}
                <div className="h-[80px] shrink-0" /> {/* Spacer */}
              </div>

              <div className="flex items-center text-primary/40 font-black px-1 text-lg mb-1">:</div>

              {/* Minutes Column */}
              <div 
                ref={minuteRef}
                className="flex-1 flex flex-col overflow-y-auto no-scrollbar scroll-smooth snap-y"
              >
                <div className="h-[80px] shrink-0" /> {/* Spacer */}
                {minutes.map(m => (
                  <button
                    key={m}
                    data-minute={m}
                    onClick={() => setTempMinute(m)}
                    className={cn(
                      "py-3 text-sm font-black transition-all rounded-xl mb-1 mx-1 snap-center shrink-0",
                      tempMinute === m 
                        ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30" 
                        : "text-white/30 hover:bg-white/5 hover:text-white/60"
                    )}
                  >
                    {m.toString().padStart(2, '0')}
                  </button>
                ))}
                <div className="h-[80px] shrink-0" /> {/* Spacer */}
              </div>
            </div>
            
            <div className="p-4 bg-black/20 flex gap-2 w-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsOpen(false)}
                    className="group flex-1 h-11 text-white/50 hover:bg-white/5 rounded-xl border border-white/5 transition-all"
                  >
                    <X className="h-5 w-5 group-hover:text-destructive transition-colors" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-[10px] font-bold">Cancelar</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleConfirm}
                    className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                  >
                    <Check className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-[10px] font-bold">Confirmar horário</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
