import { useState, useEffect, useRef, useMemo } from 'react';
import { format, addMinutes } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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

interface Placement {
  accountId: string;
  format: ContentType;
}

interface ScheduleEntry {
  id: string;
  date: string;
  time: string;
  placements: Placement[];
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
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('instagram');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAICaptionModal, setShowAICaptionModal] = useState(false);
  
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
    if (mediaUrls.length === 0) return true;

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
      // Combine content and hashtags for the single field
      const postHashtags = post.hashtags?.map(h => `#${h}`).join(' ') || '';
      setContent(post.content + (postHashtags ? `\n\n${postHashtags}` : ''));
      setMediaUrls(post.media_urls || []);
      
      const postPlatforms = post.platforms || [];
      const ct = (post.content_type as ContentType) || 'feed';
      const initialPlacements: Placement[] = [];
      
      postPlatforms.forEach(p => {
        const acc = connectedAccounts.find(a => a.platform === p);
        if (acc) {
          initialPlacements.push({ accountId: acc.id, format: ct });
        }
      });

      let date = defaultDate || format(new Date(), 'yyyy-MM-dd');
      let time = getDefaultTime();

      if (post.scheduled_at) {
        const dt = new Date(post.scheduled_at);
        date = format(dt, 'yyyy-MM-dd');
        time = format(dt, 'HH:mm');
      }

      setSchedules([{
        id: crypto.randomUUID(),
        date,
        time,
        placements: initialPlacements
      }]);
      
      setPreviewPlatform(postPlatforms[0] as SocialPlatform || 'instagram');
    } else {
      setContent('');
      setMediaUrls([]);
      setSchedules([{
        id: crypto.randomUUID(),
        date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
        time: getDefaultTime(),
        placements: []
      }]);
    }
  }, [post, open, defaultDate, connectedAccounts.length]);

  const addSchedule = () => {
    setSchedules(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
        time: getDefaultTime(),
        placements: []
      }
    ]);
  };

  const removeSchedule = (id: string) => {
    if (schedules.length <= 1) return;
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const updateSchedule = (id: string, updates: Partial<ScheduleEntry>) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const togglePlacementInSchedule = (scheduleId: string, accountId: string, format: ContentType) => {
    if (isPublished) return;
    
    setSchedules(prev => prev.map(s => {
      if (s.id !== scheduleId) return s;
      
      const isSelected = s.placements.some(p => p.accountId === accountId && p.format === format);
      const newPlacements = isSelected
        ? s.placements.filter(p => !(p.accountId === accountId && p.format === format))
        : [...s.placements, { accountId, format }];
        
      return { ...s, placements: newPlacements };
    }));
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const newUrls: string[] = [];
      const totalFiles = files.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        
        // Simulate progress for each file
        const { error } = await supabase.storage.from('social-media').upload(path, file);
        if (error) throw error;
        
        const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
        
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }
      setMediaUrls(prev => [...prev, ...newUrls]);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Erro ao carregar arquivos.');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const removeMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAction = (status: string) => {
    const allPlacements = schedules.flatMap(s => s.placements);
    if (allPlacements.length === 0) {
      toast.error('Selecione ao menos um canal e formato em algum agendamento.');
      return;
    }

    // Extract hashtags from content
    const hashtagRegex = /#(\w+)/g;
    const extractedHashtags: string[] = [];
    let match;
    while ((match = hashtagRegex.exec(content)) !== null) {
      extractedHashtags.push(match[1]);
    }

    // Clean content by removing hashtags if they are at the end or just keep it as is?
    // Usually, we keep the content as is because the user typed it that way.
    // But we need to send the hashtags array to the backend.

    schedules.forEach(schedule => {
      schedule.placements.forEach(placement => {
        const account = connectedAccounts.find(a => a.id === placement.accountId);
        if (!account) return;

        // Ensure scheduled_at respects user's local timezone
        // If status is 'published', we use current time
        let scheduledAt: string;
        if (status === 'published') {
          scheduledAt = new Date().toISOString();
        } else {
          const [year, month, day] = schedule.date.split('-').map(Number);
          const [hours, minutes] = schedule.time.split(':').map(Number);
          const localDate = new Date(year, month - 1, day, hours, minutes);
          scheduledAt = localDate.toISOString();
        }

        const postData = {
          content,
          media_urls: mediaUrls,
          platforms: [account.platform as SocialPlatform],
          content_type: placement.format,
          hashtags: extractedHashtags,
          scheduled_at: scheduledAt,
          status,
          client_id: post?.client_id || clientId,
          _isNew: post ? !isFirst : true,
        };
        
        onSave(postData);
        isFirst = false;
      });
    });

    onOpenChange(false);
  };

  const handleAICaptionGenerated = (caption: string) => {
    setContent(caption);
  };

  const previewAccount = useMemo(() => {
    const firstSelected = schedules[0]?.placements[0];
    if (firstSelected) {
      return connectedAccounts.find(a => a.id === firstSelected.accountId);
    }
    return connectedAccounts.find(a => a.platform === previewPlatform);
  }, [schedules, previewPlatform, connectedAccounts]);

  const hasAnyPlacement = useMemo(() => schedules.some(s => s.placements.length > 0), [schedules]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col p-0 w-[calc(100vw-1rem)] sm:w-auto">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-lg">
              {isPublished ? 'Visualizar Post (Publicado)' : post ? 'Editar Post' : 'Novo Post'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-[450px_1fr] gap-0">
              {/* Left column - Form */}
              <div className="p-6 space-y-6 border-r border-border bg-muted/5">
                
                {/* Step 1: Media */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
                    Mídias
                  </Label>
                  {!isPublished && (
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="h-8 gap-2 w-full border-dashed text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        Carregar fotos ou vídeos
                      </Button>
                      {uploading && (
                        <div className="space-y-1.5">
                          <Progress value={uploadProgress} className="h-1" />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Enviando arquivos...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                        </div>
                      )}
                    </div>
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

                {/* Step 2: Content (Moved up) */}
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
                  <Textarea 
                    value={content} 
                    onChange={e => setContent(e.target.value)} 
                    placeholder="Escreva sua legenda aqui... Use #hashtags diretamente no texto." 
                    className="min-h-[120px] text-sm resize-none" 
                    disabled={isPublished} 
                  />
                </div>

                <Separator />

                {/* Step 3: Schedules (Moved down) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">3</span>
                      Agendamentos
                    </Label>
                    {!isPublished && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] gap-1" onClick={addSchedule}>
                        <Plus className="h-3 w-3" /> Adicionar
                      </Button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {schedules.map((schedule, sIdx) => (
                      <div key={schedule.id} className="relative p-4 rounded-lg border bg-background/50 space-y-4">
                        {schedules.length > 1 && !isPublished && (
                          <button
                            onClick={() => removeSchedule(schedule.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-sm hover:bg-destructive/90 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input 
                              type="date" 
                              value={schedule.date} 
                              onChange={e => updateSchedule(schedule.id, { date: e.target.value })} 
                              className="h-8 pl-7 text-[11px]" 
                              disabled={isPublished} 
                            />
                          </div>
                          <div className="relative">
                            <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input 
                              type="time" 
                              value={schedule.time} 
                              onChange={e => updateSchedule(schedule.id, { time: e.target.value })} 
                              className="h-8 pl-7 text-[11px]" 
                              disabled={isPublished} 
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          {connectedAccounts.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground">Nenhum canal conectado.</p>
                          ) : (
                            connectedAccounts.map(account => {
                              const p = account.platform as SocialPlatform;
                              const availableFormats: ContentType[] = PLATFORM_CONTENT_TYPES[p] || ['feed'];
                              
                              // Filter formats based on compatibility
                              const compatibleFormats = availableFormats.filter(fmt => checkCompatibility(p, fmt));
                              
                              if (compatibleFormats.length === 0) return null;

                              return (
                                <div key={account.id} className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{account.account_name}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {compatibleFormats.map(fmt => {
                                      const isSelected = schedule.placements.some(sp => sp.accountId === account.id && sp.format === fmt);
                                      
                                      return (
                                        <Tooltip key={fmt}>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              disabled={isPublished}
                                              onClick={() => togglePlacementInSchedule(schedule.id, account.id, fmt)}
                                              className={cn(
                                                "relative p-1.5 rounded-full border-2 transition-all",
                                                isSelected 
                                                  ? "border-primary bg-primary/10 scale-105" 
                                                  : "border-transparent bg-muted/50 opacity-40 hover:opacity-100 hover:border-border"
                                              )}
                                            >
                                              <div className="relative">
                                                <PlatformIcon platform={p} size="xs" />
                                                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-border">
                                                  {fmt === 'feed' && <Image className="h-2 w-2 text-primary" />}
                                                  {fmt === 'stories' && <CircleDashed className="h-2 w-2 text-primary" />}
                                                  {fmt === 'reels' && <Film className="h-2 w-2 text-primary" />}
                                                  {fmt === 'carousel' && <Layers className="h-2 w-2 text-primary" />}
                                                  {fmt === 'video' && <Film className="h-2 w-2 text-primary" />}
                                                </div>
                                              </div>
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" className="text-[10px]">
                                            {CONTENT_TYPE_CONFIG[fmt]?.label}
                                          </TooltipContent>
                                        </Tooltip>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column - Preview */}
              <div className="bg-muted/10 p-8 flex flex-col items-center overflow-y-auto">
                <div className="w-full max-w-[400px] space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Visualização</Label>
                    <div className="flex gap-1.5">
                      {Array.from(new Set(schedules.flatMap(s => s.placements).map(p => connectedAccounts.find(a => a.id === p.accountId)?.platform))).map(p => (
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
                <Button variant="outline" onClick={() => handleSaveAction('draft')} disabled={!hasAnyPlacement} className="w-full sm:w-auto">
                  Salvar Rascunho
                </Button>
                <Button variant="secondary" onClick={() => handleSaveAction('scheduled')} disabled={!hasAnyPlacement} className="gap-2 w-full sm:w-auto">
                  <Calendar className="h-4 w-4" /> Agendar
                </Button>
                <Button onClick={() => handleSaveAction('published')} disabled={!hasAnyPlacement} className="gap-2 w-full sm:w-auto shadow-lg shadow-primary/20">
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
        platforms={Array.from(new Set(schedules.flatMap(s => s.placements).map(p => connectedAccounts.find(a => a.id === p.accountId)?.platform as SocialPlatform)))}
        contentType={schedules[0]?.placements[0]?.format || 'feed'}
        mediaUrls={mediaUrls}
        onCaptionGenerated={handleAICaptionGenerated}
      />
    </>
  );
}