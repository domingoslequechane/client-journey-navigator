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
  mediaUrls: string[];
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
  platforms,
  contentType,
  mediaUrls,
  onCaptionGenerated,
}: AICaptionModalProps) {
  const [tone, setTone] = useState('direto');
  const [length, setLength] = useState('media');
  const [topic, setTopic] = useState('');
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedCaption('');
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-caption', {
        body: {
          platforms,
          content_type: contentType,
          media_urls: mediaUrls,
          tone,
          length,
          topic: topic.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedCaption(data.caption || '');
    } catch (err: any) {
      console.error('Error generating caption:', err);
      setGeneratedCaption('Erro ao gerar legenda. Tente novamente.');
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
            Gerar legenda com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tone selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
              Tom de voz
            </Label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTone(t.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                    tone === t.value
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span>{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Length selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
              Tamanho da legenda
            </Label>
            <div className="flex gap-2">
              {LENGTHS.map(l => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLength(l.value)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium border transition-all flex flex-col items-center gap-0.5",
                    length === l.value
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span>{l.label}</span>
                  <span className="text-[10px] text-muted-foreground">{l.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Topic - optional */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">3</span>
              Assunto / tema do post
              <span className="text-[10px] text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Ex.: Um post sobre marketing digital... (deixe vazio para a IA analisar o conteúdo automaticamente)"
              className="min-h-[70px]"
            />
            <p className="text-[11px] text-muted-foreground">
              {mediaUrls.length > 0
                ? `A IA irá analisar ${mediaUrls.length > 1 ? 'as ' + mediaUrls.length + ' mídias' : 'a mídia'} para gerar a legenda${topic.trim() ? ' com o tema informado' : ' automaticamente'}.`
                : 'Descreva o tema ou deixe vazio para gerar com base no contexto do post.'}
            </p>
          </div>

          {/* Generated caption */}
          {generatedCaption && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Legenda gerada</Label>
                  <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs" onClick={handleCopy}>
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
                <div className="rounded-lg border border-border p-3 bg-muted/50 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {generatedCaption}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generatedCaption ? 'Gerar novamente' : 'Gerar'}
            </Button>
            {generatedCaption && (
              <Button onClick={handleUseCaption} className="gap-2">
                Usar esta legenda
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
