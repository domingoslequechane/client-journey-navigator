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

const getDefaultTime = () => format(addMinutes(new Date(), 15), 'HH:mm');

interface Placement {
  accountId: string;
  format: ContentType;
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
  const [selectedPlacements, setSelectedPlacements] = useState<Placement[]>([]);
  const [hashtags, setHashtags] = useState('');
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('instagram');
  const [uploading, setUploading] = useState(false);
  const [showAICaptionModal, setShowAICaptionModal] = useState(false);
  const [suggestingTimes, setSuggestingTimes] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(defaultDate || format(new Date(), 'yyyy-MM-dd'));
  const [scheduleTime, setScheduleTime] = useState(getDefaultTime());
  
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
        return true; // Feed aceita quase tudo
      case 'stories':
        return mediaStats.count === 1; // Stories via API geralmente 1 por vez
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
      
      // Map existing post to placements
      const postPlatforms = post.platforms || [];
      const ct = (post.content_type as ContentType) || 'feed';
      const initialPlacements: Placement[] = [];
      
      postPlatforms.forEach(p => {
        const acc = connectedAccounts.find(a => a.platform === p);
        if (acc) {
          initialPlacements.push({ accountId: acc.id, format: ct });
        }
      });
      setSelectedPlacements(initialPlacements);
      
      if (post.scheduled_at) {
        const dt = new Date(post.scheduled_at);
        setScheduleDate(format(dt, 'yyyy-MM-dd'));
        setScheduleTime(format(dt, 'HH:mm'));
      }
      setPreviewPlatform(postPlatforms[0] as SocialPlatform || 'instagram');
    } else {
      setContent('');
      setMediaUrls([]);
      setHashtags('');
      setSelectedPlacements([]);
      setScheduleDate(defaultDate || format(new Date(), 'yyyy-MM-dd'));
      setScheduleTime(getDefaultTime());
    }
  }, [post, open, defaultDate, connectedAccounts.length]);

  const togglePlacement = (accountId: string, format: ContentType) => {
    if (isPublished) return;
    
    const isSelected = selectedPlacements.some(p => p.accountId === accountId && p.format === format);
    if (isSelected) {
      setSelectedPlacements(prev => prev.filter(p => !(p.accountId === accountId && p.format === format)));
    } else {
      setSelectedPlacements(prev => [...prev, { accountId, format }]);
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
    } catch (err: any) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAction = (status: string) => {
    if (selectedPlacements.length === 0) {
      toast.error('Selecione ao menos um canal e formato.');
      return;
    }

    // Se houver múltiplos formatos, criamos posts separados
    selectedPlacements.forEach(placement => {
      const account = connectedAccounts.find(a => a.id === placement.accountId);
      if (!account) return;

      const postData = {
        content,
        media_urls: mediaUrls,
        platforms: [account.platform as SocialPlatform],
        content_type: placement.format,
        hashtags: hashtags ? hashtags.split(',').map(t => t.trim()).filter(Boolean) : [],
        scheduled_at: `${scheduleDate}T${scheduleTime}:00`,
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

  const previewAccount = useMemo(() => {
    const firstSelected = selectedPlacements[0];
    if (firstSelected) {
      return connectedAccounts.find(a => a.id === firstSelected.accountId);
    }
    return connectedAccounts.find(a => a.platform === previewPlatform);
  }, [selectedPlacements, previewPlatform, connectedAccounts]);

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
            <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] gap-0">
              {/* Left column - Form */}
              <div className="p-6 space-y-6 border-r border-border bg-muted/5">
                
                {/* Step 1: Media First (to enable formats) */}
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

                {/* Step 2: Select channels and formats */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
                    Canais e Formatos
                  </Label>
                  
                  <div className="space-y-4">
                    {connectedAccounts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum canal conectado.</p>
                    ) : (
                      connectedAccounts.map(account => {
                        const p = account.platform as SocialPlatform;
                        const availableFormats: ContentType[] = PLATFORM_CONTENT_TYPES[p] || ['feed'];
                        
                        return (
                          <div key={account.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{account.account_name}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {availableFormats.map(fmt => {
                                const isCompatible = checkCompatibility(p, fmt);
                                const isSelected = selectedPlacements.some(sp => sp.accountId === account.id && sp.format === fmt);
                                
                                return (
                                  <Tooltip key={fmt}>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        disabled={!isCompatible || isPublished}
                                        onClick={() => togglePlacement(account.id, fmt)}
                                        className={cn(
                                          "relative p-2 rounded-full border-2 transition-all",
                                          isSelected 
                                            ? "border-primary bg-primary/10 scale-110" 
                                            : "border-transparent bg-muted/50 opacity-40",
                                          !isCompatible && "opacity-10 cursor-not-allowed grayscale",
                                          isCompatible && !isSelected && "hover:opacity-100 hover:border-border"
                                        )}
                                      >
                                        <div className="relative">
                                          <PlatformIcon platform={p} size="sm" />
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
                                      {CONTENT_TYPE_CONFIG[fmt]?.label} {!isCompatible && '(Incompatível com a mídia)'}
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

                <Separator />

                {/* Step 3: Content */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">3</span>
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

                {/* Step 4: Schedule */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">4</span>
                    Agendamento
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="h-8 pl-7 text-[11px]" disabled={isPublished} />
                    </div>
                    <div className="relative">
                      <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="h-8 pl-7 text-[11px]" disabled={isPublished} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column - Preview */}
              <div className="bg-muted/10 p-8 flex flex-col items-center overflow-y-auto">
                <div className="w-full max-w-[360px] space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Visualização</Label>
                    <div className="flex gap-1.5">
                      {Array.from(new Set(selectedPlacements.map(p => connectedAccounts.find(a => a.id === p.accountId)?.platform))).map(p => (
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
                <Button variant="outline" onClick={() => handleSaveAction('draft')} disabled={selectedPlacements.length === 0} className="w-full sm:w-auto">
                  Salvar Rascunho
                </Button>
                <Button variant="secondary" onClick={() => handleSaveAction('scheduled')} disabled={selectedPlacements.length === 0} className="gap-2 w-full sm:w-auto">
                  <Calendar className="h-4 w-4" /> Agendar
                </Button>
                <Button onClick={() => handleSaveAction('published')} disabled={selectedPlacements.length === 0} className="gap-2 w-full sm:w-auto shadow-lg shadow-primary/20">
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
        platforms={Array.from(new Set(selectedPlacements.map(p => connectedAccounts.find(a => a.id === p.accountId)?.platform as SocialPlatform)))}
        contentType={selectedPlacements[0]?.format || 'feed'}
        mediaUrls={mediaUrls}
        onCaptionGenerated={handleAICaptionGenerated}
      />
    </>
  );
}