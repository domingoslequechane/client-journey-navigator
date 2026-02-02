import { useState } from 'react';
import { 
  Sparkles, Loader2, Wand2, Copy, Image as ImageIcon, 
  FileText, Shield, Plus, X, Globe, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { 
  GenerationMode, 
  GenerationSettings, 
  StudioProject,
  FlyerSize,
  FlyerNiche,
  FlyerMood,
  FlyerColorScheme,
  FlyerElement,
  SIZE_OPTIONS,
  NICHE_OPTIONS,
  MOOD_OPTIONS,
  COLOR_SCHEME_OPTIONS,
  ELEMENT_OPTIONS,
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
  { value: 'copy', label: 'Cópia', icon: Copy, description: 'Copia layout exato' },
  { value: 'inspiration', label: 'Inspiração', icon: ImageIcon, description: 'Inspirado em referências' },
  { value: 'product', label: 'Produto Exato', icon: Shield, description: 'Preserva produto 100%' },
  { value: 'template', label: 'Template', icon: FileText, description: 'Usa template aprovado' },
];

const SIZE_LIST: { value: FlyerSize; label: string; aspect: string }[] = [
  { value: '1080x1080', label: 'Instagram Post (1080×1080)', aspect: '1:1' },
  { value: '1080x1920', label: 'Stories (1080×1920)', aspect: '9:16' },
  { value: '1920x1080', label: 'Banner (1920×1080)', aspect: '16:9' },
  { value: '1080x1350', label: 'Carrossel (1080×1350)', aspect: '4:5' },
  { value: '1280x720', label: 'YouTube (1280×720)', aspect: '16:9' },
];

const NICHE_LIST: FlyerNiche[] = [
  'Construção', 'Mobiliário', 'Automóvel', 'Imobiliário', 'Restaurante',
  'Beleza', 'Saúde', 'Tecnologia', 'Moda', 'Fitness', 'Pet Shop',
  'Agricultura', 'Ótica', 'Farmácia', 'Joalharia', 'Eventos', 'Educação', 'Outro'
];

const MOOD_LIST: FlyerMood[] = [
  'Profissional', 'Moderno', 'Minimalista', 'Vibrante', 'Elegante',
  'Rústico', 'Tecnológico', 'Divertido', 'Luxuoso', 'Corporativo'
];

const COLOR_LIST: FlyerColorScheme[] = [
  'Laranja/Cinza', 'Azul/Laranja', 'Vermelho/Preto', 'Amarelo/Roxo',
  'Verde/Branco', 'Preto/Dourado', 'Azul/Branco', 'Rosa/Roxo', 'Cores do Cliente'
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
  
  // Novos estados para opções avançadas
  const [niche, setNiche] = useState<FlyerNiche | undefined>(project.niche as FlyerNiche || undefined);
  const [mood, setMood] = useState<FlyerMood | undefined>();
  const [colors, setColors] = useState<FlyerColorScheme | undefined>();
  const [elements, setElements] = useState<FlyerElement | undefined>();
  const [preserveProduct, setPreserveProduct] = useState(false);
  
  // Imagens de referência
  const [layoutReferences, setLayoutReferences] = useState<string[]>([]);
  const [additionalReferences, setAdditionalReferences] = useState<string[]>([]);
  
  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    // Determinar modo baseado em preserveProduct
    const finalMode = preserveProduct ? 'product' : mode;

    await onGenerate({
      prompt: prompt.trim(),
      size,
      style,
      mode: finalMode,
      model,
      niche,
      mood,
      colors,
      elements,
      preserveProduct,
      layoutReferences: layoutReferences.length > 0 ? layoutReferences : undefined,
      additionalReferences: additionalReferences.length > 0 ? additionalReferences : undefined,
    });
  };

  const canGenerate = prompt.trim().length > 0 && !isGenerating && 
    (remainingGenerations === null || remainingGenerations === undefined || remainingGenerations > 0);

  // Função para manejar upload de referência
  const handleReferenceUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'layout' | 'additional'
  ) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (type === 'layout') {
          setLayoutReferences((prev) => [...prev.slice(0, 2), dataUrl]);
        } else {
          setAdditionalReferences((prev) => [...prev.slice(0, 2), dataUrl]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReference = (index: number, type: 'layout' | 'additional') => {
    if (type === 'layout') {
      setLayoutReferences((prev) => prev.filter((_, i) => i !== index));
    } else {
      setAdditionalReferences((prev) => prev.filter((_, i) => i !== index));
    }
  };

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
              {remainingGenerations} gerações restantes
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Mode Selection - 5 modos */}
        <div className="space-y-2">
          <Label>Modo de Geração</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setMode(option.value)}
                disabled={option.value === 'template' && !project.template_image}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-colors',
                  mode === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50',
                  option.value === 'template' && !project.template_image && 'opacity-50 cursor-not-allowed'
                )}
              >
                <option.icon className={cn(
                  'h-4 w-4',
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
            placeholder="Ex: Promoção de Black Friday com 50% de desconto em todos os produtos. Tema escuro com detalhes em dourado..."
            className="min-h-[100px] resize-none"
          />
        </div>

        {/* Main Settings Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tamanho</Label>
            <Select value={size} onValueChange={(v) => setSize(v as FlyerSize)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_LIST.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Modelo IA</Label>
            <Select value={model} onValueChange={(v) => setModel(v as 'gemini-flash' | 'gemini-pro')}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-flash">
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3" /> Flash (Rápido)
                  </span>
                </SelectItem>
                <SelectItem value="gemini-pro">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Pro (Qualidade)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nicho</Label>
            <Select value={niche || ''} onValueChange={(v) => setNiche(v as FlyerNiche || undefined)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {NICHE_LIST.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
        </div>

        {/* Style Toggle */}
        <div className="flex items-center gap-3">
          <Label className="text-sm">Estilo:</Label>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={style === 'vivid' ? 'default' : 'outline'}
              onClick={() => setStyle('vivid')}
              className="h-8"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Vivid
            </Button>
            <Button
              type="button"
              size="sm"
              variant={style === 'natural' ? 'default' : 'outline'}
              onClick={() => setStyle('natural')}
              className="h-8"
            >
              Natural
            </Button>
          </div>
        </div>

        {/* Preserve Product Toggle */}
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

        {/* Advanced Options */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>Opções Avançadas</span>
              <span className="text-xs text-muted-foreground">
                {showAdvanced ? '▲' : '▼'}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cores</Label>
                <Select value={colors || ''} onValueChange={(v) => setColors(v as FlyerColorScheme || undefined)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_LIST.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

            {/* Reference Images */}
            <div className="grid grid-cols-2 gap-4">
              {/* Layout References */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Referências de Layout</Label>
                  <span className="text-[10px] text-muted-foreground">({layoutReferences.length}/3)</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {layoutReferences.map((ref, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded border overflow-hidden group">
                      <img src={ref} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeReference(idx, 'layout')}
                        className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {layoutReferences.length < 3 && (
                    <label className="w-16 h-16 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleReferenceUpload(e, 'layout')}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Additional References */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Referências Adicionais</Label>
                  <span className="text-[10px] text-muted-foreground">({additionalReferences.length}/3)</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {additionalReferences.map((ref, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded border overflow-hidden group">
                      <img src={ref} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeReference(idx, 'additional')}
                        className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {additionalReferences.length < 3 && (
                    <label className="w-16 h-16 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleReferenceUpload(e, 'additional')}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Client References from project */}
            {project.reference_images && project.reference_images.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Referências do Cliente</Label>
                  <span className="text-[10px] text-muted-foreground">{project.reference_images.length} imagem(ns)</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {project.reference_images.slice(0, 3).map((ref, idx) => (
                    <div key={idx} className="w-16 h-16 rounded border overflow-hidden">
                      <img src={ref} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Definidas nas configurações do projeto</p>
              </div>
            )}
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
