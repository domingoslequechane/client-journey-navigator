import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PostPreview } from './PostPreview';
import { PlatformIcon } from './PlatformIcon';
import { ContentTypeIcon } from './ContentTypeIcon';
import { AICaptionModal } from './AICaptionModal';
import { type SocialPlatform, type ContentType, PLATFORM_CONFIG, CONTENT_TYPE_CONFIG } from '@/lib/social-media-mock';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import type { SocialPostRow } from '@/hooks/useSocialPosts';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Upload, Calendar, Clock, Hash, Loader2, X, Image as ImageIcon, Zap, Sparkles, LayoutGrid, Layers, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Which content types each platform supports
const PLATFORM_CONTENT_TYPES: Record<SocialPlatform, ContentType[]> = {
  instagram: ['feed', 'stories', 'reels', 'carousel'],
  facebook: ['feed', 'stories', 'reels', 'carousel', 'video'],
  linkedin: ['feed', 'carousel', 'video', 'text'],
  tiktok: ['video', 'reels'],
  twitter: ['feed', 'text', 'carousel'],
  youtube: ['video', 'reels'],
  pinterest: ['feed', 'carousel', 'video'],
  threads: ['feed', 'text', 'carousel'],
};

interface ScheduleSlot {
  date: string;
  time: string;
  platforms: SocialPlatform[];
}

interface PostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: SocialPostRow | null;
  onSave: (data: any) => void;
  onPublish?: (postId: string, publishNow: boolean) => void;
  defaultDate?: string;
}

export function PostModal({ open, onOpenChange, post, onSave, onPublish, defaultDate }: PostModalProps) {
  const { accounts } = useSocialAccounts();
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(['instagram']);
  const [contentType, setContentType] = useState<ContentType>('feed');
  const [hashtags, setHashtags] = useState('');
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('instagram');
  const [uploading, setUploading] = useState(false);
  const [multiImageMode, setMultiImageMode] = useState<'carousel' | 'individual'>('carousel');
  const [showAICaptionModal, setShowAICaptionModal] = useState(false);
  const [suggestingTimes, setSuggestingTimes] = useState(false);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([
    { date: format(new Date(), 'yyyy-MM-dd'), time: '10:00', platforms: ['instagram'] },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const connectedPlatforms = accounts.filter(a => a.is_connected).map(a => a.platform as SocialPlatform);
  const hasLateAccounts = accounts.some(a => a.is_connected && a.late_account_id);

  // Available content types based on selected platforms
  const availableContentTypes = platforms.length > 0
    ? Array.from(new Set(platforms.flatMap(p => PLATFORM_CONTENT_TYPES[p] || ['feed'])))
    : Object.keys(CONTENT_TYPE_CONFIG) as ContentType[];

  useEffect(() => {
    if (post) {
      setContent(post.content);
      setMediaUrls(post.media_urls || []);
      setPlatforms(post.platforms || ['instagram']);
      const postPlatforms = post.platforms || ['instagram'];
      if (post.scheduled_at) {
        const dt = new Date(post.scheduled_at);
        setScheduleSlots([{ date: format(dt, 'yyyy-MM-dd'), time: format(dt, 'HH:mm'), platforms: postPlatforms }]);
      } else {
        setScheduleSlots([{ date: format(new Date(), 'yyyy-MM-dd'), time: '10:00', platforms: postPlatforms }]);
      }
      setContentType(post.content_type as ContentType);
      setHashtags(post.hashtags?.join(', ') || '');
      setPreviewPlatform(post.platforms?.[0] || 'instagram');
    } else {
      setContent('');
      setMediaUrls([]);
      setPlatforms(['instagram']);
      setScheduleSlots([{ date: defaultDate || format(new Date(), 'yyyy-MM-dd'), time: '10:00', platforms: ['instagram'] }]);
      setContentType('feed');
      setHashtags('');
      setPreviewPlatform('instagram');
      setMultiImageMode('carousel');
    }
  }, [post, open, defaultDate]);

  // Auto-switch content type if not available for selected platforms
  useEffect(() => {
    if (!availableContentTypes.includes(contentType) && availableContentTypes.length > 0) {
      setContentType(availableContentTypes[0] as ContentType);
    }
  }, [platforms]);

  // Sync slot platforms when global platforms change
  useEffect(() => {
    setScheduleSlots(prev => prev.map(slot => ({
      ...slot,
      platforms: slot.platforms.filter(p => platforms.includes(p)).length > 0
        ? slot.platforms.filter(p => platforms.includes(p))
        : [...platforms],
    })));
  }, [platforms]);

  const togglePlatform = (p: SocialPlatform) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const toggleSlotPlatform = (slotIdx: number, p: SocialPlatform) => {
    setScheduleSlots(prev => prev.map((slot, i) => {
      if (i !== slotIdx) return slot;
      const newPlatforms = slot.platforms.includes(p)
        ? slot.platforms.filter(x => x !== p)
        : [...slot.platforms, p];
      return { ...slot, platforms: newPlatforms.length > 0 ? newPlatforms : [p] };
    }));
  };

  const addSlot = () => setScheduleSlots(prev => [...prev, { date: format(new Date(), 'yyyy-MM-dd'), time: '10:00', platforms: [...platforms] }]);
  const removeSlot = (idx: number) => setScheduleSlots(prev => prev.filter((_, i) => i !== idx));
  const updateSlot = (idx: number, key: 'date' | 'time', value: string) =>
    setScheduleSlots(prev => prev.map((s, i) => i === idx ? { ...s, [key]: value } : s));

  const handleSuggestBestTimes = async () => {
    if (platforms.length === 0) {
      toast.error('Selecione ao menos um canal primeiro.');
      return;
    }
    setSuggestingTimes(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-best-times', {
        body: {
          platforms,
          content_type: contentType,
          slots_count: 3,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const slots = data.slots || [];
      if (slots.length > 0) {
        setScheduleSlots(slots.map((s: any) => ({
          date: s.date,
          time: s.time,
          platforms: [...platforms],
        })));
        toast.success(`${slots.length} melhores horários sugeridos pela IA!`);
      } else {
        toast.error('Não foi possível sugerir horários. Tente novamente.');
      }
    } catch (err: any) {
      console.error('Error suggesting times:', err);
      toast.error('Erro ao sugerir horários.');
    } finally {
      setSuggestingTimes(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('social-media').upload(path, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }
      setMediaUrls(prev => [...prev, ...newUrls]);
      if (mediaUrls.length + newUrls.length > 1) {
        setMultiImageMode('carousel');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const buildPostData = (status: string) => {
    const effectiveContentType = mediaUrls.length > 1 && multiImageMode === 'carousel' ? 'carousel' : contentType;
    const firstSlot = scheduleSlots[0];
    return {
      content,
      media_urls: mediaUrls,
      platforms,
      scheduled_at: `${firstSlot.date}T${firstSlot.time}:00`,
      status,
      content_type: effectiveContentType,
      hashtags: hashtags ? hashtags.split(',').map(t => t.trim()).filter(Boolean) : [],
      schedule_slots: scheduleSlots.length > 1 ? scheduleSlots : undefined,
    };
  };

  const handleSaveDraft = () => {
    if (!content.trim() || platforms.length === 0) return;
    onSave(buildPostData('draft'));
    onOpenChange(false);
  };

  const handleSchedule = () => {
    if (!content.trim() || platforms.length === 0) return;
    onSave(buildPostData('scheduled'));
    onOpenChange(false);
  };

  const handlePublishNow = () => {
    if (!content.trim() || platforms.length === 0) return;
    onSave(buildPostData('published'));
    onOpenChange(false);
  };

  const handleAICaptionGenerated = (caption: string) => {
    setContent(caption);
    const hashtagMatches = caption.match(/#\w+/g);
    if (hashtagMatches) {
      const tags = hashtagMatches.map(t => t.replace('#', ''));
      setHashtags(tags.join(', '));
    }
  };

  const minCharLimit = Math.min(...platforms.map(p => PLATFORM_CONFIG[p]?.charLimit || 2200));
  const isOverLimit = content.length > minCharLimit;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{post ? 'Editar Post' : 'Novo Post'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Left column - Form */}
            <div className="space-y-5">
              {/* Step 1: Select channels */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
                  Selecione os canais
                </Label>
                <div className="flex flex-wrap gap-2">
                  {connectedPlatforms.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum canal conectado. Conecte uma conta primeiro.</p>
                  ) : (
                    connectedPlatforms.map(p => {
                      const isSelected = platforms.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePlatform(p)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                            isSelected
                              ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <PlatformIcon platform={p} size="sm" />
                          {PLATFORM_CONFIG[p].label}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <Separator />

              {/* Step 2: Content type with real icons */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
                  Formato do conteúdo
                </Label>
                <div className="flex flex-wrap gap-2">
                  {availableContentTypes.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setContentType(t as ContentType)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                        contentType === t
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <ContentTypeIcon type={t as ContentType} />
                      {CONTENT_TYPE_CONFIG[t]?.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Formatos disponíveis baseados nos canais selecionados
                </p>
              </div>

              <Separator />

              {/* Step 3: Content text + AI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">3</span>
                    Texto do post
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs h-7"
                    onClick={() => setShowAICaptionModal(true)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Legenda com IA
                  </Button>
                </div>
                <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Digite o seu texto..." className="min-h-[140px]" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="hashtags separadas por vírgula" className="h-7 text-xs w-[200px]" />
                  </div>
                  <p className={cn("text-xs", isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground")}>
                    {content.length}/{minCharLimit}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Step 4: Media */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">4</span>
                  Mídias
                </Label>
                <Button variant="outline" className="h-9 gap-2 w-full" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Enviar imagens ou vídeos
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={e => handleFileUpload(e.target.files)}
                />

                {mediaUrls.length === 0 && (
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">Imagens, vídeos ou documentos</p>
                    <p className="text-xs text-muted-foreground mt-1">Envie arquivos clicando aqui ou arrastando</p>
                  </div>
                )}

                {mediaUrls.length > 0 && (
                  <div className="space-y-3">
                    {mediaUrls.length > 1 && (
                      <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50">
                        <span className="text-xs font-medium text-muted-foreground mr-2">Modo de publicação:</span>
                        <button
                          type="button"
                          onClick={() => setMultiImageMode('carousel')}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                            multiImageMode === 'carousel'
                              ? "bg-primary text-primary-foreground"
                              : "bg-background border border-border hover:border-primary/50"
                          )}
                        >
                          <Layers className="h-3.5 w-3.5" />
                          Carrossel
                        </button>
                        <button
                          type="button"
                          onClick={() => setMultiImageMode('individual')}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                            multiImageMode === 'individual'
                              ? "bg-primary text-primary-foreground"
                              : "bg-background border border-border hover:border-primary/50"
                          )}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                          Individual ({mediaUrls.length} posts)
                        </button>
                      </div>
                    )}

                    {multiImageMode === 'individual' && mediaUrls.length > 1 && (
                      <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-2">
                        💡 Cada imagem será publicada como um post separado com o mesmo texto e configurações.
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {mediaUrls.map((url, i) => (
                        <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden group">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors" />
                          {multiImageMode === 'carousel' && mediaUrls.length > 1 && (
                            <span className="absolute bottom-1 left-1 text-[10px] font-bold bg-foreground/70 text-background px-1.5 py-0.5 rounded">
                              {i + 1}/{mediaUrls.length}
                            </span>
                          )}
                          <button onClick={() => removeMedia(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Step 5: Schedule - per-slot platform selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">5</span>
                    Data e horário das publicações
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs h-7 border-primary/50 text-primary hover:bg-primary/10"
                    onClick={handleSuggestBestTimes}
                    disabled={suggestingTimes || platforms.length === 0}
                  >
                    {suggestingTimes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    <span>Melhores horários</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/50 text-primary">
                      NOVO
                    </Badge>
                  </Button>
                </div>

                <div className="space-y-2">
                  {scheduleSlots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                      {/* Per-slot platform toggles */}
                      <div className="flex gap-1 shrink-0">
                        {platforms.map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => toggleSlotPlatform(idx, p)}
                            className={cn(
                              "rounded-full transition-all",
                              slot.platforms.includes(p)
                                ? "opacity-100 ring-2 ring-primary/40"
                                : "opacity-30 hover:opacity-60"
                            )}
                          >
                            <PlatformIcon platform={p} size="sm" variant="circle" />
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 flex-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input type="date" value={slot.date} onChange={e => updateSlot(idx, 'date', e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div className="flex items-center gap-1.5 flex-1">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input type="time" value={slot.time} onChange={e => updateSlot(idx, 'time', e.target.value)} className="h-8 text-xs" />
                      </div>
                      {scheduleSlots.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeSlot(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7 text-primary" onClick={addSlot}>
                  <span className="text-sm">⊕</span> Incluir mais dias e horários
                </Button>
              </div>
            </div>

            {/* Right column - Preview */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Preview</Label>
              {platforms.length > 0 ? (
                <>
                  <div className="flex gap-1 flex-wrap">
                    {platforms.map(p => (
                      <button key={p} onClick={() => setPreviewPlatform(p)} className={cn("p-1.5 rounded-lg transition-colors", previewPlatform === p ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted")}>
                        <PlatformIcon platform={p} size="sm" />
                      </button>
                    ))}
                  </div>
                  <PostPreview content={content} mediaUrl={mediaUrls[0]} platform={previewPlatform} />
                  {mediaUrls.length > 1 && multiImageMode === 'carousel' && (
                    <div className="flex gap-1 overflow-x-auto py-1">
                      {mediaUrls.map((url, i) => (
                        <img key={i} src={url} alt="" className="w-12 h-12 rounded object-cover shrink-0 border border-border" />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="border border-border rounded-xl p-8 text-center">
                  <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Aguardando conteúdo.</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleSaveDraft} disabled={!content.trim() || platforms.length === 0}>
                Rascunho
              </Button>
              <Button variant="outline" onClick={handleSchedule} disabled={!content.trim() || platforms.length === 0} className="gap-2">
                <Calendar className="h-4 w-4" />
                Agendar
              </Button>
              {hasLateAccounts && (
                <Button onClick={handlePublishNow} disabled={!content.trim() || platforms.length === 0} className="gap-2">
                  <Zap className="h-4 w-4" />
                  Publicar Agora
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AICaptionModal
        open={showAICaptionModal}
        onOpenChange={setShowAICaptionModal}
        platforms={platforms}
        contentType={contentType}
        mediaUrls={mediaUrls}
        onCaptionGenerated={handleAICaptionGenerated}
      />
    </>
  );
}
