import React, { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Loader2, Search, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface GoogleFont {
  family: string;
  category: string;
}

interface GoogleFontPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function GoogleFontPicker({ value, onChange, className }: GoogleFontPickerProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [fonts, setFonts] = useState<GoogleFont[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    
    async function fetchFonts() {
      try {
        setLoading(true);
        const apiKey = 'AIzaSyDLJ42E8ZAOh3ODmg1l9V8XBNc5xx4yn6Q';
        const response = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`);
        
        if (!response.ok) throw new Error('Failed to fetch fonts');
        
        const data = await response.json();
        
        if (mounted && data.items) {
          const fontList = data.items.map((f: any) => ({
            family: f.family,
            category: f.category || ''
          }));
            
          setFonts(fontList);
        }
      } catch (error) {
        console.error('Error fetching Google Fonts:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchFonts();
    
    return () => { mounted = false; };
  }, []);

  // Filter fonts manually instead of relying on CommandItem's internal filtering 
  // since we have 1600+ fonts and want better performance
  const filteredFonts = useMemo(() => {
    if (!search) return fonts.slice(0, 100); // Show top 100 by default (mostly popular ones)
    
    return fonts
      .filter((font) => font.family.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 50); // Limit results for performance
  }, [fonts, search]);

  // Request the font to preview it in the dropdown if available
  useEffect(() => {
    if (value && value !== 'Montserrat' && value !== 'Inter' && value !== 'Roboto') {
      const linkId = `font-preview-${value.replace(/\s+/g, '-')}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.href = `https://fonts.googleapis.com/css2?family=${value.replace(/\s+/g, '+')}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
    }
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-12 rounded-xl bg-muted/20 border-transparent hover:bg-muted/30 focus-visible:bg-background transition-all",
            !value && "text-muted-foreground",
            className
          )}
          style={value ? { fontFamily: `"${value}", sans-serif` } : undefined}
        >
          {loading && !fonts.length ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span>Carregando fontes...</span>
            </div>
          ) : value ? (
            <span className="truncate">{value}</span>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Type className="h-4 w-4" />
              <span>Selecione uma fonte...</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Buscar fonte..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className="max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFonts.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma fonte encontrada.
              </div>
            ) : (
              <CommandGroup>
                {filteredFonts.map((font) => (
                  <CommandItem
                    key={font.family}
                    value={font.family}
                    onSelect={() => {
                      // Use font.family directly to avoid cmdk's automatic lowercase normalization
                      onChange(font.family);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="cursor-pointer py-2"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-primary",
                        value === font.family ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{font.family}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
