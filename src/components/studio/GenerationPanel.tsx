import { useState, useRef } from 'react';
import { 
  Sparkles, Loader2, Wand2, Copy, Image as ImageIcon, 
  Shield, Plus, X, Zap, ChevronDown, ChevronUp, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  GenerationMode, 
  GenerationSettings, 
  StudioProject,
  FlyerSize,
  FlyerMood,
  FlyerColorScheme,
  FlyerElement,
} from '@/types/studio';

interface GenerationPanelProps {
  project: StudioProject;
  onGenerate: (settings: GenerationSettings) => Promise<void>;
  isGenerating: boolean;
  remainingGenerations?: number | null;
  className?: string;
}

const MODE_OPTIONS: { value: GenerationMode; label: string; icon: typeof Wand2; description: string }[] = [
  { value: 'original', label: 'Original', icon: Wand2, description: 'Design 100% original' },
  { value: 'copy', label: 'Cópia', icon: Copy, description: 'Copia layout das referências' },
  { value: 'inspiration', label: 'Inspiração', icon: ImageIcon, description: 'Inspirado em referências' },
];

const SIZE_LIST: { value: FlyerSize; label: string; aspect: string; w: number; h: number }[] = [
  { value: '1080x1080', label: 'Post', aspect: '1:1', w: 1, h: 1 },
  { value: '1080x1920', label: 'Stories', aspect: '9:16', w: 9, h: 16 },
  { value: '1920x1080', label: 'Banner', aspect: '16:9', w: 16, h: 9 },
  { value: '1080x1350', label: 'Carrossel', aspect: '4:5', w: 4, h: 5 },
  { value: '1280x720', label: 'YouTube', aspect: '16:9', w: 16, h: 9 },
];

const MOOD_LIST: FlyerMood[] = [
  'Profissional', 'Moderno', 'Minimalista', 'Vibrante', 'Elegante',
  'Rústico', 'Tecnológico', 'Divertido', 'Luxuoso', 'Corporativo'
];

const COLOR_LIST: FlyerColorScheme[] = [
  'Cores do Cliente', 'Aleatórias (IA escolhe)'
];

const ELEMENT_LIST: FlyerElement[] = [
  'Produto 3D', 'Pessoas', 'Paisagem', 'Abstrato',
  'Ícones', 'Formas Geométricas', 'Gradientes', 'Texturas'
];

export function GenerationPanel({
  project,
  onGenerate,
  isGenerating,
  remainingGenerations,
  className,
}: GenerationPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<FlyerSize>('1080x1080');
  const [style, setStyle] = useState<'vivid' | 'natural'>('vivid');
  const [mode, setMode] = useState<GenerationMode>('original');
  const [model, setModel] = useState<'gemini-flash' | 'gemini-pro'>('gemini-flash');
  
  const [mood, setMood] = useState<FlyerMood | undefined>();
  const [colors, setColors] = useState<FlyerColorScheme>('Cores do Cliente');
  const [elements, setElements] = useState<FlyerElement | undefined>();
  const [preserveProduct, setPreserveProduct] = useState(false);
  const [productImage, setProductImage] = useState<string>('');
  const [uploadingProduct, setUploadingProduct] = useState(false);
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const productInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    await onGenerate({
      prompt: prompt.trim(),
      size,
      style,
      mode,
      model,
      mood,
      colors,
      elements,
      preserveProduct,
      productImage: preserveProduct ? productImage : undefined,
    });
  };

  const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 5MB)');
      return;
    }

    setUploadingProduct(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('studio-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('studio-assets')
        .getPublicUrl(fileName);

      setProductImage(publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload');
    } finally {
      setUploadingProduct(false);
      if (productInputRef.current) productInputRef.current.value = '';
    }
  };

  const canGenerate = prompt.trim().length > 0 && !isGenerating && 
    (remainingGenerations === null || remainingGenerations === undefined || remainingGenerations > 0) &&
    (!preserveProduct || productImage);

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Flyer
          </CardTitle>
          {remainingGenerations !== null && remainingGenerations !== undefined && (
            <span className="text-sm text-muted-foreground">
              {remainingGenerations} restantes
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Mode Selection - 3 modes */}
        <div className="space-y-2">
          <Label>Modo de Geração</Label>
          <div className="grid grid-cols-3 gap-2">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setMode(option.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all',
                  mode === option.value
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <option.icon className={cn(
                  'h-5 w-5',
                  mode === option.value ? 'text-primary' : 'text-muted-foreground'
                )} />
                <span className="font-medium text-xs">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <Label htmlFor="prompt">Descrição do Flyer</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Promoção de Black Friday com 50% de desconto em todos os produtos..."
            className="min-h-[100px] resize-none"
          />
        </div>

        {/* Size Selection - Visual geometric shapes */}
        <div className="space-y-2">
          <Label>Tamanho</Label>
          <div className="grid grid-cols-5 gap-2">
            {SIZE_LIST.map((option) => {
              const maxDim = 40;
              const ratio = Math.max(option.w, option.h);
              const w = Math.round((option.w / ratio) * maxDim);
              const h = Math.round((option.h / ratio) * maxDim);
              
              return (
                <Tooltip key={option.value}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setSize(option.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all',
                        size === option.value
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-sm border-2 transition-colors',
                          size === option.value ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'
                        )}
                        style={{ width: `${w}px`, height: `${h}px` }}
                      />
                      <span className="text-[10px] font-medium text-muted-foreground">{option.aspect}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{option.label} ({option.value})</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Model & Style Row - Icons only */}
        <div className="grid grid-cols-2 gap-3">
          {/* AI Model - Icons only */}
          <div className="space-y-2">
            <Label className="text-xs">Modelo IA</Label>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setModel('gemini-flash')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-lg border transition-all',
                      model === 'gemini-flash'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Zap className={cn('h-5 w-5', model === 'gemini-flash' ? 'text-primary' : 'text-muted-foreground')} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Flash (Rápido)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setModel('gemini-pro')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-lg border transition-all',
                      model === 'gemini-pro'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Sparkles className={cn('h-5 w-5', model === 'gemini-pro' ? 'text-primary' : 'text-muted-foreground')} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Pro (Qualidade)</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Style - Icons only */}
          <div className="space-y-2">
            <Label className="text-xs">Estilo</Label>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setStyle('vivid')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-lg border transition-all',
                      style === 'vivid'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Sparkles className={cn('h-5 w-5', style === 'vivid' ? 'text-primary' : 'text-muted-foreground')} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Vivid (Vibrante)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setStyle('natural')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-lg border transition-all',
                      style === 'natural'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <ImageIcon className={cn('h-5 w-5', style === 'natural' ? 'text-primary' : 'text-muted-foreground')} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Natural</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Mood */}
        <div className="space-y-1.5">
          <Label className="text-xs">Tom/Mood</Label>
          <Select value={mood || ''} onValueChange={(v) => setMood(v as FlyerMood || undefined)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {MOOD_LIST.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preserve Product Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Preservar Produto Exato</span>
            </div>
            <Switch
              checked={preserveProduct}
              onCheckedChange={setPreserveProduct}
            />
          </div>

          {/* Product Image Upload - shown when preserve is enabled */}
          {preserveProduct && (
            <div className="p-3 rounded-lg border border-dashed space-y-2">
              <Label className="text-xs">Imagem do Produto</Label>
              {productImage ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border group">
                  <img src={productImage} alt="Produto" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setProductImage('')}
                    className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => productInputRef.current?.click()}
                  disabled={uploadingProduct}
                  className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors"
                >
                  {uploadingProduct ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Upload</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={productInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProductUpload}
              />
              <p className="text-[10px] text-muted-foreground">
                O produto será preservado 100% idêntico no flyer gerado
              </p>
            </div>
          )}
        </div>

        {/* Advanced Options */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>Opções Avançadas</span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Colors */}
              <div className="space-y-1.5">
                <Label className="text-xs">Cores</Label>
                <Select value={colors} onValueChange={(v) => setColors(v as FlyerColorScheme)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_LIST.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Elements */}
              <div className="space-y-1.5">
                <Label className="text-xs">Elementos</Label>
                <Select value={elements || ''} onValueChange={(v) => setElements(v as FlyerElement || undefined)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ELEMENT_LIST.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full gap-2"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Gerar Flyer com IA
            </>
          )}
        </Button>

        {remainingGenerations === 0 && (
          <p className="text-sm text-destructive text-center">
            Você atingiu o limite de gerações do seu plano.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
