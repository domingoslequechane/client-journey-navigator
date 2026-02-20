"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, Loader2, Wand2, Copy, Image as ImageIcon, 
  Shield, Plus, X, Zap, ChevronDown, ChevronUp, Upload, Unlock, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  dailyCount?: number;
  className?: string;
}

const MODE_OPTIONS: { value: GenerationMode; label: string; icon: typeof Wand2; description: string }[] = [
  { value: 'original', label: 'Original', icon: Wand2, description: 'Design 100% original de alta fidelidade' },
  { value: 'copy', label: 'Cópia', icon: Copy, description: 'Replicação precisa de layout e zonas' },
  { value: 'inspiration', label: 'Inspiração', icon: ImageIcon, description: 'Inspirado em referências de elite' },
  { value: 'product', label: 'Produto', icon: Shield, description: 'Preserva o produto exato da foto' },
  { value: 'template', icon: Zap, label: 'Template', description: 'Usa layout aprovado com novo produto' },
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

// Storage key for persisting settings per project
function getSettingsKey(projectId: string): string {
  return `studio-gen-settings-${projectId}`;
}

interface PersistedSettings {
  size: FlyerSize;
  style: 'vivid' | 'natural';
  mode: GenerationMode;
  model: 'gemini-flash' | 'gemini-pro';
  mood?: FlyerMood;
  colors: FlyerColorScheme;
  elements?: FlyerElement;
  preserveProduct: boolean;
  productImage: string;
  allowManipulation: boolean;
  showAdvanced: boolean;
}

export function GenerationPanel({
  project,
  onGenerate,
  isGenerating,
  dailyCount = 0,
  className,
}: GenerationPanelProps) {
  const { user } = useAuth();
  
  // Load persisted settings for this project
  const loadPersistedSettings = useCallback((): Partial<PersistedSettings> => {
    try {
      const stored = localStorage.getItem(getSettingsKey(project.id));
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return {};
  }, [project.id]);

  const persisted = loadPersistedSettings();

  const [prompt, setPrompt] = useState('');
  const [autoCopy, setAutoCopy] = useState(false);
  const [size, setSize] = useState<FlyerSize>(persisted.size || '1080x1080');
  const [style, setStyle] = useState<'vivid' | 'natural'>(persisted.style || 'vivid');
  const [mode, setMode] = useState<GenerationMode>(persisted.mode || 'original');
  const [model, setModel] = useState<'gemini-flash' | 'gemini-pro'>(persisted.model || 'gemini-flash');
  
  const [mood, setMood] = useState<FlyerMood | undefined>(persisted.mood);
  const [colors, setColors] = useState<FlyerColorScheme>(persisted.colors || 'Cores do Cliente');
  const [elements, setElements] = useState<FlyerElement | undefined>(persisted.elements);
  const [preserveProduct, setPreserveProduct] = useState(persisted.preserveProduct || false);
  const [productImage, setProductImage] = useState<string>(persisted.productImage || '');
  const [allowManipulation, setAllowManipulation] = useState(persisted.allowManipulation || false);
  const [uploadingProduct, setUploadingProduct] = useState(false);
  
  const [showAdvanced, setShowAdvanced] = useState(persisted.showAdvanced || false);
  const productInputRef = useRef<HTMLInputElement>(null);

  const DAILY_LIMIT = 5;
  const EXEMPT_EMAILS = ["domingosf.lequechane@gmail.com"];
  const isExempt = user?.email && EXEMPT_EMAILS.includes(user.email);
  
  const remainingGenerations = Math.max(0, DAILY_LIMIT - dailyCount);
  const limitReached = !isExempt && dailyCount >= DAILY_LIMIT;

  // Persist settings whenever they change
  useEffect(() => {
    const settings: PersistedSettings = {
      size, style, mode, model, mood, colors, elements,
      preserveProduct, productImage, allowManipulation, showAdvanced,
    };
    try {
      localStorage.setItem(getSettingsKey(project.id), JSON.stringify(settings));
    } catch { /* ignore full storage */ }
  }, [size, style, mode, model, mood, colors, elements, preserveProduct, productImage, allowManipulation, showAdvanced, project.id]);

  const handleGenerate = async () => {
    if ((!prompt.trim() && !autoCopy) || limitReached) return;

    const isProductMode = mode === 'product';
    const isTemplateMode = mode === 'template';

    await onGenerate({
      prompt: prompt.trim(),
      size,
      style,
      mode,
      model,
      mood,
      colors,
      elements,
      preserveProduct: isProductMode || preserveProduct,
      productImage: (isProductMode || preserveProduct) ? productImage : undefined,
      allowManipulation: (isProductMode || preserveProduct) ? allowManipulation : undefined,
      autoCopy,
    } as GenerationSettings & { allowManipulation?: boolean; autoCopy?: boolean });
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

  const canGenerate = (prompt.trim().length > 0 || autoCopy) && !isGenerating && !limitReached &&
    (!preserveProduct || productImage);

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Gerar Flyer
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-tighter">
                High-Fidelity Engine Active
              </span>
            </div>
          </div>
          <div className="text-right">
            {!isExempt && (
              <Badge variant={limitReached ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">
                {remainingGenerations} / {DAILY_LIMIT} hoje
              </Badge>
            )}
            {isExempt && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                Dev: Ilimitado
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {limitReached && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
            <Lock className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              <strong>Limite diário atingido.</strong> Você pode gerar até 5 flyers por dia durante a fase Beta. O limite será resetado à meia-noite.
            </p>
          </div>
        )}

        {/* Mode Selection - 5 modes */}
        <div className="space-y-2">
          <Label>Modo de Geração</Label>
          <div className="grid grid-cols-3 gap-2">
            {MODE_OPTIONS.map((option) => (
              <Tooltip key={option.value}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setMode(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-center transition-all',
                      mode === option.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <option.icon className={cn(
                      'h-5 w-5',
                      mode === option.value ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className="font-medium text-[11px]">{option.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-bold">{option.label}</p>
                  <p className="text-xs">{option.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="prompt">Descrição do Flyer</Label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground">Copy por IA</span>
              <Switch
                checked={autoCopy}
                onCheckedChange={setAutoCopy}
                disabled={limitReached}
              />
            </div>
          </div>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={autoCopy ? "Opcional: Dê uma direção para a IA (ex: Foco em preço baixo)" : "Ex: Promoção de Black Friday com 50% de desconto em todos os produtos..."}
            className="min-h-[100px] resize-none"
            disabled={limitReached}
          />
          {autoCopy && (
            <p className="text-[10px] text-primary font-medium animate-pulse">
              ✨ A QIA criará uma copy persuasiva baseada no nicho e contexto do cliente.
            </p>
          )}
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

        {/* Preserve Product Toggle / Product Mode Section */}
        <div className="space-y-3">
          {mode !== 'product' && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Preservar Produto Exato</span>
              </div>
              <Switch
                checked={preserveProduct}
                onCheckedChange={setPreserveProduct}
                disabled={limitReached}
              />
            </div>
          )}

          {/* Product Image Upload + Manipulation toggle - shown when preserve is enabled or in product mode */}
          {(preserveProduct || mode === 'product') && (
            <div className="p-3 rounded-lg border border-dashed space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Imagem do Produto</Label>
                {mode === 'product' && (
                  <Badge variant="outline" className="text-[9px] uppercase border-destructive/50 text-destructive">
                    Obrigatório
                  </Badge>
                )}
              </div>
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
                  disabled={uploadingProduct || limitReached}
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

              {/* Manipulation permission toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2">
                  <Unlock className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <span className="text-xs font-medium">Permitir Manipulação</span>
                    <p className="text-[10px] text-muted-foreground">
                      A IA pode ajustar iluminação, ângulo e efeitos no produto
                    </p>
                  </div>
                </div>
                <Switch
                  checked={allowManipulation}
                  onCheckedChange={setAllowManipulation}
                  disabled={limitReached}
                />
              </div>

              <p className="text-[10px] text-muted-foreground">
                {allowManipulation 
                  ? 'O produto será usado como base, mas a IA pode manipulá-lo criativamente'
                  : 'O produto será preservado 100% idêntico no flyer gerado'
                }
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
          ) : limitReached ? (
            <>
              <Lock className="h-4 w-4" />
              Limite Diário Atingido
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Gerar Flyer com IA
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}