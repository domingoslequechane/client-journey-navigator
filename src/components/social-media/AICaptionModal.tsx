import { useState } from 'react';
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

export function AICaptionModal({
  open,
  onOpenChange,
  platforms = [],
  contentType = 'feed',
  files = [],
  clientId,
  onCaptionGenerated,
}: AICaptionModalProps) {
  const [tone, setTone] = useState('direto');
  const [length, setLength] = useState('media');
  const [topic, setTopic] = useState('');
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedCaption('');
    try {
      // Converter apenas imagens para base64 (Gemini Flash suporta imagens via API)
      const imageFiles = files.filter(f => f.type.startsWith('image/')).slice(0, 3);
      const mediaData = await Promise.all(imageFiles.map(fileToBase64));

      const { data, error } = await supabase.functions.invoke('generate-social-caption', {
        body: {
          platforms,
          content_type: contentType,
          media_data: mediaData,
          tone,
          length,
          topic: topic.trim() || undefined,
          client_id: clientId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedCaption(data.caption || '');
    } catch (err: any) {
      console.error('Error generating caption:', err);
      setGeneratedCaption('Erro ao gerar legenda. Verifique sua conexão e tente novamente.');
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