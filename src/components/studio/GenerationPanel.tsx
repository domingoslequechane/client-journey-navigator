import { useState } from 'react';
import { Sparkles, Loader2, Wand2, Copy, Image as ImageIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { GenerationMode, GenerationSettings, StudioProject } from '@/types/studio';

interface GenerationPanelProps {
  project: StudioProject;
  onGenerate: (settings: GenerationSettings) => Promise<void>;
  isGenerating: boolean;
  remainingGenerations?: number | null;
  className?: string;
}

const SIZE_OPTIONS = [
  { value: '1080x1080', label: 'Quadrado (1080×1080)', aspect: '1:1' },
  { value: '1080x1920', label: 'Stories (1080×1920)', aspect: '9:16' },
  { value: '1920x1080', label: 'Paisagem (1920×1080)', aspect: '16:9' },
  { value: '1200x628', label: 'Facebook (1200×628)', aspect: '1.91:1' },
];

const MODE_OPTIONS: { value: GenerationMode; label: string; icon: typeof Wand2; description: string }[] = [
  { value: 'original', label: 'Original', icon: Wand2, description: 'Criação 100% original baseada no prompt' },
  { value: 'copy', label: 'Cópia', icon: Copy, description: 'Recria um flyer existente com variações' },
  { value: 'inspiration', label: 'Inspiração', icon: ImageIcon, description: 'Usa imagens de referência como base' },
  { value: 'template', label: 'Template', icon: FileText, description: 'Usa o template definido no projeto' },
];

export function GenerationPanel({
  project,
  onGenerate,
  isGenerating,
  remainingGenerations,
  className,
}: GenerationPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1080x1080');
  const [style, setStyle] = useState<'vivid' | 'natural'>('vivid');
  const [mode, setMode] = useState<GenerationMode>('original');
  const [model, setModel] = useState<'gemini-flash' | 'gemini-pro'>('gemini-flash');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    await onGenerate({
      prompt: prompt.trim(),
      size,
      style,
      mode,
      model,
    });
  };

  const canGenerate = prompt.trim().length > 0 && !isGenerating && 
    (remainingGenerations === null || remainingGenerations > 0);

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Flyer
          </CardTitle>
          {remainingGenerations !== null && (
            <span className="text-sm text-muted-foreground">
              {remainingGenerations} gerações restantes
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <div className="space-y-2">
          <Label>Modo de Geração</Label>
          <div className="grid grid-cols-2 gap-2">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setMode(option.value)}
                disabled={option.value === 'template' && !project.template_image}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-lg border text-left transition-colors',
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
                <div>
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-[10px] text-muted-foreground">{option.description}</p>
                </div>
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
            className="min-h-[120px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Seja específico: mencione cores, estilo, elementos visuais, texto que deve aparecer, etc.
          </p>
        </div>

        {/* Settings Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tamanho</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estilo</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as 'vivid' | 'natural')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vivid">Vibrante</SelectItem>
                <SelectItem value="natural">Natural</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label>Modelo AI</Label>
          <Tabs value={model} onValueChange={(v) => setModel(v as 'gemini-flash' | 'gemini-pro')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gemini-flash">
                Flash (Rápido)
              </TabsTrigger>
              <TabsTrigger value="gemini-pro">
                Pro (Qualidade)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

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
              Gerar Flyer
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
