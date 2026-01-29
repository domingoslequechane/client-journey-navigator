import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ColorPickerInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#1e293b', '#ffffff',
];

export function ColorPickerInput({ label, value, onChange, className }: ColorPickerInputProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleColorChange = (color: string) => {
    onChange(color);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-12 h-10 p-1 border-2"
              style={{ backgroundColor: value }}
            >
              <span className="sr-only">Escolher cor</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      'w-8 h-8 rounded-md border-2 transition-transform hover:scale-110',
                      value === color ? 'border-primary ring-2 ring-primary/50' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      handleColorChange(color);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  type="color"
                  value={value}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-10 h-10 cursor-pointer rounded border-0"
                />
                <span className="text-sm text-muted-foreground">Cor personalizada</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Input
          value={value}
          onChange={(e) => handleColorChange(e.target.value)}
          placeholder="#3b82f6"
          className="flex-1 font-mono"
        />
      </div>
    </div>
  );
}
