import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Copy, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SocialPlatform, ContentType } from '@/lib/social-media-mock';
import { useAICaption } from '@/hooks/useAICaption';

interface AICaptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platforms: SocialPlatform[];
  contentType: ContentType;
  files: File[];
  mediaUrls?: string[];
  clientId: string | null;
  onCaptionGenerated: (caption: string) => void;
}

const TONES = [
  { value: 'direto', label: 'Direto', emoji: '😎' },
  { value: 'casual', label: 'Casual', emoji: '🤗' },
  { value: 'persuasivo', label: 'Persuasivo', emoji: '🤩' },
  { value: 'alegre', label: 'Alegre', emoji: '🤣' },
  { value: 'amigavel', label: 'Amigável', emoji: '😊' },
];

const LENGTHS = [
  { value: 'curta', label: 'Curta', description: '1-2 frases' },
  { value: 'media', label: 'Média', description: '3-5 frases' },
  { value: 'longa', label: 'Longa', description: '1-2 parágrafos' },
];

const OBJECTIVES = [
  { value: 'venda', label: 'Venda', emoji: '💰' },
  { value: 'conscientizacao', label: 'Consciencialização', emoji: '📢' },
  { value: 'engajamento', label: 'Engajamento', emoji: '💬' },
  { value: 'educativo', label: 'Educativo', emoji: '📚' },
  { value: 'institucional', label: 'Institucional', emoji: '🏢' },
];

export function AICaptionModal({
  open,
  onOpenChange,
  platforms = [],
  contentType = 'feed',
  files = [],
  mediaUrls = [],
  clientId,
  onCaptionGenerated,
}: AICaptionModalProps) {
  const [tone, setTone] = useState('direto');
  const [length, setLength] = useState('media');
  const [objective, setObjective] = useState('venda');
  const [topic, setTopic] = useState('');
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [copied, setCopied] = useState(false);

  const { isGenerating, error, generateCaption } = useAICaption();

  const handleGenerate = async () => {
    const caption = await generateCaption({
      platforms,
      contentType,
      tone,
      length,
      objective,
      topic,
      clientId,
      files,
      mediaUrls
    });

    if (caption) {
      setGeneratedCaption(caption);
    }
  };

  const errorMessage = error ? `Erro ao gerar legenda: ${error}` : null;


  const handleUseCaption = () => {
    onCaptionGenerated(generatedCaption);
    onOpenChange(false);
    setGeneratedCaption('');
    setTopic('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build preview URLs de-duplicated
  const previewImages = useMemo(() => {
    const results: string[] = [];
    const blobUrls = new Set<string>();

    // Add local files and track their blob URLs
    files.forEach(f => {
      if (f && f.type.startsWith('image/')) {
        const url = URL.createObjectURL(f);
        results.push(url);
        blobUrls.add(url);
      }
    });

    // Add remote URLs only if they are not blob URLs (which are duplicates of files)
    mediaUrls.forEach(url => {
      const isVideo = /\.(mp4|mov|avi|webm|m4v)$/i.test(url) || url.includes('video');
      const isBlob = url.startsWith('blob:');
      if (!isVideo && !isBlob) {
        results.push(url);
      }
    });

    return results.slice(0, 10);
  }, [files, mediaUrls]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar legenda com QIA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">

          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-xs flex items-center gap-2">
              <X className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Visual preview of images being analyzed */}
          {previewImages.length > 0 ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                Imagens a analisar
              </Label>
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {previewImages.map((url, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-primary/20 bg-muted flex-shrink-0">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    {previewImages.length > 1 && (
                      <Badge variant="secondary" className="absolute top-1 right-1 h-4 px-1 text-[8px]">
                        #{i + 1}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                {previewImages.length === 1
                  ? 'A IA vai analisar esta imagem.'
                  : `A IA vai analisar estas ${previewImages.length} imagens em conjunto (Carrossel).`}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-muted/30">
              <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                Sem imagens detetadas. A legenda será gerada com base no contexto.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Tom de voz</Label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTone(t.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                    tone === t.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  )}
                >
                  <span>{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>


          <div className="space-y-2">
            <Label className="text-sm font-semibold">Tamanho</Label>
            <div className="flex gap-2">
              {LENGTHS.map(l => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLength(l.value)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium border transition-all flex-1",
                    length === l.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Objetivo</Label>
            <div className="flex flex-wrap gap-2">
              {OBJECTIVES.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setObjective(o.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                    objective === o.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  )}
                >
                  <span>{o.emoji}</span>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Contexto Adicional (opcional)</Label>
            <Textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Ex.: Promoção de verão, lançamento de produto..."
              className="min-h-[70px]"
            />
          </div>

          {generatedCaption && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Legenda Sugerida</Label>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopy}>
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="rounded-lg border p-3 bg-muted/50 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {generatedCaption}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full sm:w-auto gap-2"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generatedCaption ? 'Gerar novamente' : 'Gerar Legenda'}
          </Button>
          {generatedCaption && (
            <Button onClick={handleUseCaption} className="w-full sm:w-auto">Usar Legenda</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}