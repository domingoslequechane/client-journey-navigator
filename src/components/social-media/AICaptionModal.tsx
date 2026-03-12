import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SocialPlatform, ContentType } from '@/lib/social-media-mock';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const compressMedia = (source: File | string, maxWidth = 800, quality = 0.6): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      const isFile = source instanceof File;
      const url = isFile ? URL.createObjectURL(source) : (source as string);
      
      img.crossOrigin = "anonymous"; 
      img.onload = () => {
        if (isFile) URL.revokeObjectURL(url);
        try {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          console.error("Canvas error:", e);
          resolve(null);
        }
      };
      img.onerror = () => { 
        console.error("Image load error for URL:", url);
        if (isFile) URL.revokeObjectURL(url);
        resolve(null); 
      };
      img.src = url;
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedCaption('');
    try {
      // Gather base64 versions of local File objects (for newly uploaded, not-yet-sent images)
      const sources: File[] = files.filter(f => f && f.type.startsWith('image/'));
      const mediaData: string[] = [];

      if (sources.length > 0) {
        const compressed = await Promise.all(sources.slice(0, 2).map(f => compressMedia(f)));
        compressed.forEach(d => { if (d) mediaData.push(d); });
      }

      // Always pass the remote URLs so the server can fetch them if no local base64 available
      const remoteUrls = mediaUrls.filter(url => {
        const isVideo = url.includes('video') || /\.(mp4|mov|avi|webm|m4v)$/i.test(url);
        return !isVideo;
      });

      const { data, error } = await supabase.functions.invoke('generate-social-caption', {
        body: {
          platforms,
          content_type: contentType,
          media_data: mediaData,      // base64 from local Files (may be empty)
          media_urls: remoteUrls,     // remote URLs for server-side fetching
          tone,
          length,
          objective,
          topic: topic.trim() || undefined,
          client_id: clientId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedCaption(data.caption || '');
    } catch (err: any) {
      console.error('Error generating caption:', err);
      setGeneratedCaption(`Erro ao gerar legenda: ${err.message || 'Verifique sua conexão e tente novamente.'}`);
    } finally {
      setIsGenerating(false);
    }
  };

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

  // Build preview URLs to show which images will be analyzed
  const previewImages = useMemo(() => {
    const results: string[] = [];
    // Local files take priority
    files.forEach(f => {
      if (f && f.type.startsWith('image/')) results.push(URL.createObjectURL(f));
    });
    // Then remote URLs
    if (results.length === 0) {
      mediaUrls.forEach(url => {
        const isVideo = /\.(mp4|mov|avi|webm|m4v)$/i.test(url) || url.includes('video');
        if (!isVideo) results.push(url);
      });
    }
    return results.slice(0, 3);
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

        <div className="space-y-4">

          {/* Visual preview of images being analyzed */}
          {previewImages.length > 0 ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                Imagens a analisar
              </Label>
              <div className="flex gap-2">
                {previewImages.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-primary/20 bg-muted flex-shrink-0">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                ))}
                <div className="flex-1 flex items-center">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A IA vai analisar {previewImages.length === 1 ? 'esta imagem' : `estas ${previewImages.length} imagens`} e criar uma legenda personalizada para o seu conteúdo.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-muted/30">
              <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                Sem imagens detetadas. A legenda será gerada com base no contexto do cliente e nas opções abaixo.
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