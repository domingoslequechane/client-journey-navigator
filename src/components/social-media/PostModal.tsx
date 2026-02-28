import { useState, useEffect, useRef, useMemo } from 'react';
import { format, addMinutes } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PostPreview } from './PostPreview';
import { PlatformIcon } from './PlatformIcon';
import { AICaptionModal } from './AICaptionModal';
import { ContentTypeIcon } from './ContentTypeIcon';
import { type SocialPlatform, type ContentType, PLATFORM_CONFIG, CONTENT_TYPE_CONFIG } from '@/lib/social-media-mock';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import type { SocialPostRow } from '@/hooks/useSocialPosts';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Upload, Calendar, Clock, Hash, Loader2, X, Image as ImageIcon, Zap, Sparkles, LayoutGrid, Layers, Trash2, ChevronLeft, ChevronRight, Plus, Copy, AlertCircle, CircleDashed, Film, Image } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

const getDefaultTime = () => format(addMinutes(new Date(), 15), 'HH:mm');

interface ScheduleSlot {
  date: string;
  time: string;
  platforms: SocialPlatform[];
  contentType: ContentType;
}

interface PostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: SocialPostRow | null;
  clientId?: string | null;
  onSave: (data: any) => void;
  onPublish?: (postId: string, publishNow: boolean) => void;
  onDuplicate?: (post: SocialPostRow) => void;
  defaultDate?: string;
  isPublished?: boolean;
}

export function PostModal({ open, onOpenChange, post, clientId, onSave, onPublish, onDuplicate, defaultDate, isPublished }: PostModalProps) {
  const { accounts } = useSocialAccounts(post?.client_id || clientId);
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState('');
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('instagram');
  const [uploading, setUploading] = useState(false);
  const [showAICaptionModal, setShowAICaptionModal] = useState(false);
  const [suggestingTimes, setSuggestingTimes] = useState(false);
  
  // Each slot contains its own platforms and format
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([
    { 
      date: defaultDate || format(new Date(), 'yyyy-MM-dd'), 
      time: getDefaultTime(), 
      platforms: [], 
      contentType: 'feed' 
    },
  ]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const connectedAccounts = accounts.filter(a => a.is_connected);

  // Media compatibility logic
  const mediaStats = useMemo(() => {
    const isVideo = (url: string) => /\.(mp4|mov|avi|webm)$/i.test(url);
    const hasVideo = mediaUrls.some(isVideo);
    const hasImage = mediaUrls.some(url => !isVideo(url));
    const count = mediaUrls.length;
    return { hasVideo, hasImage, count, isOnlyVideo: hasVideo && !hasImage, isOnlyImage: hasImage && !hasVideo };
  }, [mediaUrls]);

  const checkCompatibility = (platform: SocialPlatform, format: ContentType) => {
    if (mediaUrls.length === 0) return false;

    switch (format) {
      case 'feed':
        return true;
      case 'stories':
        return mediaStats.count === 1;
      case 'reels':
        return mediaStats.hasVideo && mediaStats.count === 1;
      case 'carousel':
        return mediaStats.count > 1 && !mediaStats.hasVideo;
      case 'video':
        return mediaStats.hasVideo;
      default:
        return true;
    }
  };

  useEffect(() => {
    if (post) {
      setContent(post.content);
      setMediaUrls(post.media_urls || []);
      setHashtags(post.hashtags?.join(', ') || '');
      
      const postPlatforms = post.platforms || [];
      const ct = (post.content_type as ContentType) || 'feed';
      
      if (post.scheduled_at) {
        const dt = new Date(post.scheduled_at);
        setScheduleSlots([{ 
          date: format(dt, 'yyyy-MM-dd'), 
          time: format(dt, 'HH:mm'), 
          platforms: postPlatforms, 
          contentType: ct 
        }]);
      }
      setPreviewPlatform(postPlatforms[0] as SocialPlatform || 'instagram');
    } else {
      setContent('');
      setMediaUrls([]);
      setHashtags('');
      setScheduleSlots([{ 
        date: defaultDate || format(new Date(), 'yyyy-MM-dd'), 
        time: getDefaultTime(), 
        platforms: connectedAccounts.length > 0 ? [connectedAccounts[0].platform as SocialPlatform] : [], 
        contentType: 'feed' 
      }]);
    }
  }, [post, open, defaultDate, connectedAccounts.length]);

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
    } catch (err: any) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const addSlot = () => {
    setScheduleSlots(prev => [...prev, { 
      date: format(new Date(), 'yyyy-MM-dd'), 
      time: getDefaultTime(), 
      platforms: [], 
      contentType: 'feed' 
    }]);
  };

  const removeSlot = (index: number) => {
    if (scheduleSlots.length > 1) {
      setScheduleSlots(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateSlot = (index: number, updates: Partial<ScheduleSlot>) => {
    setScheduleSlots(prev => prev.map((slot, i) => i === index ? { ...slot, ...updates } : slot));
  };

  const toggleSlotPlatform = (slotIndex: number, platform: SocialPlatform) => {
    const slot = scheduleSlots[slotIndex];
    const isSelected = slot.platforms.includes(platform);
    const newPlatforms = isSelected 
      ? slot.platforms.filter(p => p !== platform)
      : [...slot.platforms, platform];
    
    updateSlot(slotIndex, { platforms: newPlatforms });
  };

  const handleSaveAction = (status: string) => {
    const validSlots = scheduleSlots.filter(s => s.platforms.length > 0);
    
    if (validSlots.length === 0) {
      toast.error('Selecione ao menos um canal e formato em algum dos agendamentos.');
      return;
    }

    // Create a post for each slot
    validSlots.forEach(slot => {
      const postData = {
        content,
        media_urls: mediaUrls,
        platforms: slot.platforms,
        content_type: slot.contentType,
        hashtags: hashtags ? hashtags.split(',').map(t => t.trim()).filter(Boolean) : [],
        scheduled_at: `${slot.date}T${slot.time}:00`,
        status,
        client_id: post?.client_id || clientId,
      };
      onSave(postData);
    });

    onOpenChange(false);
  };

  const handleAICaptionGenerated = (caption: string) => {
    setContent(caption);
    const hashtagMatches = caption.match(/#\w+/g);
    if (hashtagMatches) {
      setHashtags(hashtagMatches.map(t => t.replace('#', '')).join(', '));
    }
  };

  const handleSuggestBestTimes = async () => {
    const allPlatforms = Array.from(new Set(scheduleSlots.flatMap(s => s.platforms)));
    if (allPlatforms.length === 0) {
      toast.error('Selecione ao menos um canal primeiro.');
      return;
    }
    setSuggestingTimes(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-best-times', {
        body: { platforms: allPlatforms, content_type: 'feed', slots_count: 3 },
      });
      if (error) throw error;
      
      const suggested = data.slots || [];
      if (suggested.length > 0) {
        setScheduleSlots(suggested.map((s: any) => ({
          date: s.date,
          time: s.time,
          platforms: allPlatforms,
          contentType: 'feed'
        })));
        toast.success('Melhores horários sugeridos pela IA!');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao sugerir horários.');
    } finally {
      setSuggestingTimes(false);
    }
  };

  const previewAccount = useMemo(() => {
    const firstSlot = scheduleSlots.find(s => s.platforms.length > 0);
    if (firstSlot) {
      return connectedAccounts.find(a => a.platform === firstSlot.platforms[0]);
    }
    return connectedAccounts.find(a => a.platform === previewPlatform);
  }, [scheduleSlots, previewPlatform, connectedAccounts]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0 w-[calc(100vw-1rem)] sm:w-auto">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-lg">
              {isPublished ? 'Visualizar Post (Publicado)' : post ? 'Editar Post' : 'Novo Post'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-0">
              {/* Left column - Form (Narrower) */}
              <div className="p-6 space-y-6 border-r border-border bg-muted/5">
                
                {/* Step 1: Media */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
                    Mídias
                  </Label>
                  {!isPublished && (
                    <Button variant="outline" size="sm" className="h-8 gap-2 w-full border-dashed text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      Carregar fotos ou vídeos
                    </Button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => handleFileUpload(e.target.files)} />

                  {mediaUrls.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {mediaUrls.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-md overflow-hidden group border border-border">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {!isPublished && (
                            <button onClick={() => removeMedia(i)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Step 2: Content */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
                      Legenda
                    </Label>
                    {!isPublished && (
                      <Button variant="outline" size="sm" className="gap-2 text-[10px] h-6 px-2" onClick={() => setShowAICaptionModal(true)}>
                        <Sparkles className="h-3 w-3" /> IA
                      </Button>
                    )}
                  </div>
                  <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Escreva aqui..." className="min-h-[100px] text-sm resize-none" disabled={isPublished} />
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="hashtags..." className="h-7 text-[11px]" disabled={isPublished} />
                  </div>
                </div>

                <Separator />

                {/* Step 3: Schedule with Channels and Formats */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">3</span>
                      Agendamento e Canais
                    </Label>
                    {!isPublished && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-primary" onClick={handleSuggestBestTimes} disabled={suggestingTimes}>
                        {suggestingTimes ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        Sugerir horários
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {scheduleSlots.map((slot, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-border bg-background space-y-4 relative group/slot">
                        {scheduleSlots.length > 1 && !isPublished && (
                          <button 
                            onClick={() => removeSlot(idx)}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-lg opacity-0 group-hover/slot:opacity-100 transition-opacity z-20"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}

                        {/* Date and Time */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input type="date" value={slot.date} onChange={e => updateSlot(idx, { date: e.target.value })} className="h-8 pl-7 text-[11px]" disabled={isPublished} />
                          </div>
                          <div className="relative">
                            <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input type="time" value={slot.time} onChange={e => updateSlot(idx, { time: e.target.value })} className="h-8 pl-7 text-[11px]" disabled={isPublished} />
                          </div>
                        </div>

                        {/* Channels for this slot */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Canais</p>
                          <div className="flex flex-wrap gap-1.5">
                            {connectedAccounts.map(acc => {
                              const p = acc.platform as SocialPlatform;
                              const isSelected = slot.platforms.includes(p);
                              return (
                                <button
                                  key={acc.id}
                                  type="button"
                                  onClick={() => !isPublished && toggleSlotPlatform(idx, p)}
                                  className={cn(
                                    "p-1.5 rounded-lg border transition-all",
                                    isSelected ? "border-primary bg-primary/10" : "border-border opacity-40 hover:opacity-100"
                                  )}
                                >
                                  <PlatformIcon platform={p} size="xs" />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Format for this slot */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Formato</p>
                          <div className="flex flex-wrap gap-1.5">
                            {['feed', 'stories', 'reels', 'carousel', 'video'].map(fmt => {
                              const isCompatible = checkCompatibility('instagram', fmt as ContentType);
                              const isSelected = slot.contentType === fmt;
                              
                              return (
                                <button
                                  key={fmt}
                                  type="button"
                                  disabled={!isCompatible || isPublished}
                                  onClick={() => updateSlot(idx, { contentType: fmt as ContentType })}
                                  className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-medium transition-all",
                                    isSelected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                                    !isCompatible && "opacity-20 cursor-not-allowed grayscale"
                                  )}
                                >
                                  <ContentTypeIcon type={fmt as ContentType} className="!h-3 !w-3" />
                                  <span className="capitalize">{CONTENT_TYPE_CONFIG[fmt as ContentType]?.label || fmt}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}

                    {!isPublished && (
                      <Button variant="outline" size="sm" className="w-full h-8 border-dashed text-[10px] gap-2" onClick={addSlot}>
                        <Plus className="h-3 w-3" /> Adicionar outro agendamento
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column - Preview (Dominant) */}
              <div className="bg-muted/10 p-8 flex flex-col items-center overflow-y-auto">
                <div className="w-full max-w-[400px] space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Visualização</Label>
                    <div className="flex gap-1.5">
                      {Array.from(new Set(scheduleSlots.flatMap(s => s.platforms))).map(p => (
                        <button key={p} onClick={() => setPreviewPlatform(p as SocialPlatform)} className={cn("p-1.5 rounded-lg transition-all", previewPlatform === p ? "bg-primary/10 ring-1 ring-primary/30" : "opacity-40")}>
                          <PlatformIcon platform={p as SocialPlatform} size="sm" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {mediaUrls.length > 0 ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                      <div className="w-full shadow-2xl rounded-2xl overflow-hidden border border-border/50">
                        <PostPreview
                          content={content}
                          mediaUrl={mediaUrls[0]}
                          platform={previewPlatform}
                          accountName={previewAccount?.account_name || undefined}
                          accountUsername={previewAccount?.username || undefined}
                          accountAvatarUrl={previewAccount?.avatar_url || undefined}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[4/5] w-full border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center bg-background/50 p-12 text-center">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/20 mb-4" />
                      <p className="text-sm text-muted-foreground">Carregue uma mídia para ver o preview</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-background shrink-0 flex flex-col sm:flex-row justify-between gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              {isPublished ? 'Fechar' : 'Cancelar'}
            </Button>
            
            {isPublished ? (
              <Button variant="secondary" className="gap-2 w-full sm:w-auto" onClick={() => { if (post && onDuplicate) { onDuplicate(post); onOpenChange(false); } }}>
                <Copy className="h-4 w-4" /> Duplicar para edição
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => handleSaveAction('draft')} className="w-full sm:w-auto">
                  Salvar Rascunho
                </Button>
                <Button variant="secondary" onClick={() => handleSaveAction('scheduled')} className="gap-2 w-full sm:w-auto">
                  <Calendar className="h-4 w-4" /> Agendar
                </Button>
                <Button onClick={() => handleSaveAction('published')} className="gap-2 w-full sm:w-auto shadow-lg shadow-primary/20">
                  <Zap className="h-4 w-4" /> Publicar Agora
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AICaptionModal
        open={showAICaptionModal}
        onOpenChange={setShowAICaptionModal}
        platforms={Array.from(new Set(scheduleSlots.flatMap(s => s.platforms)))}
        contentType={scheduleSlots[0]?.contentType || 'feed'}
        mediaUrls={mediaUrls}
        onCaptionGenerated={handleAICaptionGenerated}
      />
    </>
  );
}