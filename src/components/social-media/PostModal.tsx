import { useState, useEffect, useRef } from 'react';
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
import { Upload, Calendar, Clock, Hash, Loader2, X, Image as ImageIcon, Zap, Sparkles, LayoutGrid, Layers, Trash2, ChevronLeft, ChevronRight, Plus, Copy, AlertCircle } from 'lucide-react';
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

interface IndividualPostConfig {
  content: string;
  hashtags: string;
  selectedAccountIds: string[];
  scheduleSlots: ScheduleSlot[];
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
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [contentType, setContentType] = useState<ContentType>('feed');
  const [hashtags, setHashtags] = useState('');
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('instagram');
  const [uploading, setUploading] = useState(false);
  const [multiImageMode, setMultiImageMode] = useState<'carousel' | 'individual'>('carousel');
  const [showAICaptionModal, setShowAICaptionModal] = useState(false);
  const [suggestingTimes, setSuggestingTimes] = useState(false);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([
    { date: format(new Date(), 'yyyy-MM-dd'), time: getDefaultTime(), platforms: ['instagram'], contentType: 'feed' },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [individualConfigs, setIndividualConfigs] = useState<IndividualPostConfig[]>([]);

  const connectedAccounts = accounts.filter(a => a.is_connected);

  const platforms: SocialPlatform[] = Array.from(
    new Set(
      selectedAccountIds
        .map(id => connectedAccounts.find(a => a.id === id)?.platform as SocialPlatform)
        .filter(Boolean)
    )
  );

  const isIndividualMode = multiImageMode === 'individual' && mediaUrls.length > 1;
  const totalIndividualPosts = isIndividualMode ? mediaUrls.length : 1;

  const getAccountForPlatform = (platform: SocialPlatform) => {
    return connectedAccounts.find(a => a.platform === platform);
  };

  useEffect(() => {
    if (post) {
      setContent(post.content);
      setMediaUrls(post.media_urls || []);
      const postPlatforms = post.platforms || ['instagram'];
      const matchedIds = connectedAccounts
        .filter(a => postPlatforms.includes(a.platform as SocialPlatform))
        .map(a => a.id);
      setSelectedAccountIds(matchedIds);
      const ct = (post.content_type as ContentType) || 'feed';
      setContentType(ct);
      if (post.scheduled_at) {
        const dt = new Date(post.scheduled_at);
        setScheduleSlots([{ date: format(dt, 'yyyy-MM-dd'), time: format(dt, 'HH:mm'), platforms: postPlatforms, contentType: ct }]);
      } else {
        setScheduleSlots([{ date: format(new Date(), 'yyyy-MM-dd'), time: getDefaultTime(), platforms: postPlatforms, contentType: ct }]);
      }
      setHashtags(post.hashtags?.join(', ') || '');
      setPreviewPlatform(postPlatforms[0] || 'instagram');
    } else {
      const defaultIds = connectedAccounts.length > 0 ? [connectedAccounts[0].id] : [];
      const defaultPlatforms: SocialPlatform[] = connectedAccounts.length > 0
        ? [connectedAccounts[0].platform as SocialPlatform]
        : ['instagram'];
      setContent('');
      setMediaUrls([]);
      setSelectedAccountIds(defaultIds);
      setScheduleSlots([{ date: defaultDate || format(new Date(), 'yyyy-MM-dd'), time: getDefaultTime(), platforms: defaultPlatforms, contentType: 'feed' }]);
      setContentType('feed');
      setHashtags('');
      setPreviewPlatform(defaultPlatforms[0]);
      setMultiImageMode('carousel');
      setCurrentPostIndex(0);
      setIndividualConfigs([]);
    }
  }, [post, open, defaultDate, connectedAccounts.length]);

  useEffect(() => {
    if (isIndividualMode && individualConfigs.length !== mediaUrls.length) {
      setIndividualConfigs(mediaUrls.map((_, i) =>
        individualConfigs[i] || {
          content: i === 0 ? content : '',
          hashtags: i === 0 ? hashtags : '',
          selectedAccountIds: [...selectedAccountIds],
          contentType: 'feed',
          scheduleSlots: [{ date: format(new Date(), 'yyyy-MM-dd'), time: getDefaultTime(), platforms: [...platforms], contentType: 'feed' }],
        }
      ));
    }
  }, [isIndividualMode, mediaUrls.length]);

  useEffect(() => {
    if (isIndividualMode && individualConfigs[currentPostIndex]) {
      const cfg = individualConfigs[currentPostIndex];
      setContent(cfg.content);
      setHashtags(cfg.hashtags);
      setSelectedAccountIds(cfg.selectedAccountIds);
      setScheduleSlots(cfg.scheduleSlots);
      setContentType(cfg.contentType);
      const cfgPlatforms = cfg.selectedAccountIds
        .map(id => connectedAccounts.find(a => a.id === id)?.platform as SocialPlatform)
        .filter(Boolean);
      if (cfgPlatforms.length > 0) setPreviewPlatform(cfgPlatforms[0]);
    }
  }, [currentPostIndex, isIndividualMode]);

  const saveCurrentIndividualConfig = () => {
    if (!isIndividualMode) return;
    setIndividualConfigs(prev => prev.map((cfg, i) =>
      i === currentPostIndex ? { content, hashtags, selectedAccountIds, scheduleSlots, contentType } : cfg
    ));
  };

  const toggleAccount = (accountId: string) => {
    if (isPublished) return;
    setSelectedAccountIds(prev =>
      prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]
    );
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

  const updateSlotContentType = (slotIdx: number, ct: ContentType) => {
    setScheduleSlots(prev => prev.map((s, i) => i === slotIdx ? { ...s, contentType: ct } : s));
  };

  const addSlot = () => setScheduleSlots(prev => [...prev, { date: format(new Date(), 'yyyy-MM-dd'), time: getDefaultTime(), platforms: [...platforms], contentType: 'feed' }]);
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
        body: { platforms, content_type: contentType, slots_count: 3 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const slots = data.slots || [];
      if (slots.length > 0) {
        setScheduleSlots(slots.map((s: any) => ({
          date: s.date,
          time: s.time,
          platforms: [...platforms],
          contentType: contentType,
        })));
        toast.success(`${slots.length} melhores horários sugeridos pela IA!`);
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
    } catch (err: any) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const validatePost = () => {
    if (platforms.length === 0) {
      toast.error('Selecione ao menos um canal.');
      return false;
    }

    // Reels validation
    if (contentType === 'reels' && mediaUrls.length > 0) {
      const hasVideo = mediaUrls.some(url => /\.(mp4|mov|avi|webm)$/i.test(url));
      if (!hasVideo) {
        toast.error('Reels exige pelo menos um vídeo.');
        return false;
      }
      if (mediaUrls.length > 1) {
        toast.error('Reels suporta apenas um vídeo por post.');
        return false;
      }
    }

    // Stories validation
    if (contentType === 'stories' && mediaUrls.length > 1) {
      toast.error('Stories suporta apenas uma mídia por post. Use o modo Individual para postar várias.');
      return false;
    }

    // Carousel validation
    if (contentType === 'carousel' && mediaUrls.length < 2) {
      toast.error('Carrossel exige pelo menos duas mídias.');
      return false;
    }

    return true;
  };

  const buildPostData = (status: string) => {
    if (isIndividualMode) {
      const configs = individualConfigs.map((cfg, i) =>
        i === currentPostIndex ? { content, hashtags, selectedAccountIds, scheduleSlots, contentType } : cfg
      );
      return configs.map((cfg, i) => {
        const cfgPlatforms = Array.from(new Set(
          cfg.selectedAccountIds
            .map(id => connectedAccounts.find(a => a.id === id)?.platform as SocialPlatform)
            .filter(Boolean)
        ));
        return {
          content: cfg.content,
          media_urls: [mediaUrls[i]],
          platforms: cfgPlatforms,
          scheduled_at: `${cfg.scheduleSlots[0].date}T${cfg.scheduleSlots[0].time}:00`,
          status,
          content_type: cfg.contentType,
          hashtags: cfg.hashtags ? cfg.hashtags.split(',').map(t => t.trim()).filter(Boolean) : [],
          schedule_slots: cfg.scheduleSlots.length > 1 ? cfg.scheduleSlots : undefined,
        };
      });
    }

    const firstSlot = scheduleSlots[0];
    return {
      content,
      media_urls: mediaUrls,
      platforms,
      scheduled_at: `${firstSlot.date}T${firstSlot.time}:00`,
      status,
      content_type: mediaUrls.length > 1 && multiImageMode === 'carousel' ? 'carousel' : contentType,
      hashtags: hashtags ? hashtags.split(',').map(t => t.trim()).filter(Boolean) : [],
      schedule_slots: scheduleSlots.length > 1 ? scheduleSlots : undefined,
    };
  };

  const handleSaveDraft = () => {
    if (!validatePost()) return;
    const data = buildPostData('draft');
    if (Array.isArray(data)) {
      data.forEach(d => { if (d.content.trim()) onSave(d); });
    } else {
      if (!content.trim()) return;
      onSave(data);
    }
    onOpenChange(false);
  };

  const handleSchedule = () => {
    if (!validatePost()) return;
    const now = new Date();
    const slotsToValidate = isIndividualMode
      ? individualConfigs.flatMap(cfg => cfg.scheduleSlots)
      : scheduleSlots;
    const hasPastDate = slotsToValidate.some(slot => {
      const slotDate = new Date(`${slot.date}T${slot.time}:00`);
      return slotDate < now;
    });
    if (hasPastDate) {
      toast.error('Não é possível agendar posts em datas/horários que já passaram.');
      return;
    }
    const data = buildPostData('scheduled');
    if (Array.isArray(data)) {
      data.forEach(d => { if (d.content.trim()) onSave(d); });
    } else {
      if (!content.trim()) return;
      onSave(data);
    }
    onOpenChange(false);
  };

  const handlePublishNow = () => {
    if (!validatePost()) return;
    const data = buildPostData('published');
    if (Array.isArray(data)) {
      data.forEach(d => { if (d.content.trim()) onSave(d); });
    } else {
      if (!content.trim()) return;
      onSave(data);
    }
    onOpenChange(false);
  };

  const handleAICaptionGenerated = (caption: string) => {
    setContent(caption);
    const hashtagMatches = caption.match(/#\w+/g);
    if (hashtagMatches) {
      setHashtags(hashtagMatches.map(t => t.replace('#', '')).join(', '));
    }
  };

  const goToPost = (idx: number) => {
    saveCurrentIndividualConfig();
    setCurrentPostIndex(idx);
  };

  const minCharLimit = Math.min(...platforms.map(p => PLATFORM_CONFIG[p]?.charLimit || 2200));
  const isOverLimit = content.length > minCharLimit;

  const getSlotContentTypes = (slotPlatforms: SocialPlatform[]): ContentType[] => {
    if (slotPlatforms.length === 0) return ['feed'];
    return Array.from(new Set(slotPlatforms.flatMap(p => PLATFORM_CONTENT_TYPES[p] || ['feed'])));
  };

  const currentMediaUrl = isIndividualMode ? mediaUrls[currentPostIndex] : mediaUrls[0];
  const previewAccount = getAccountForPlatform(previewPlatform);

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
            <div className="grid grid-cols-1 md:grid-cols-[420px_1fr] gap-0">
              {/* Left column - Form (Narrower) */}
              <div className="p-6 space-y-6 border-r border-border bg-muted/5">
                {/* Step 1: Select channels */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
                    Canais
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {connectedAccounts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum canal conectado.</p>
                    ) : (
                      connectedAccounts.map(account => {
                        const p = account.platform as SocialPlatform;
                        const isSelected = selectedAccountIds.includes(account.id);
                        return (
                          <button
                            key={account.id}
                            type="button"
                            onClick={() => toggleAccount(account.id)}
                            disabled={isPublished}
                            className={cn(
                              "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                              isSelected
                                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                                : "border-border hover:border-primary/50",
                              isPublished && "opacity-60 cursor-not-allowed"
                            )}
                          >
                            {account.avatar_url ? (
                              <img src={account.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                            ) : (
                              <PlatformIcon platform={p} size="xs" />
                            )}
                            <span className="truncate max-w-[80px]">{account.account_name || PLATFORM_CONFIG[p].label}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <Separator />

                {/* Step 2: Content text + AI */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
                      Conteúdo
                    </Label>
                    {!isPublished && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-[10px] h-6 px-2"
                        onClick={() => setShowAICaptionModal(true)}
                      >
                        <Sparkles className="h-3 w-3" />
                        IA
                      </Button>
                    )}
                  </div>
                  <Textarea 
                    value={content} 
                    onChange={e => setContent(e.target.value)} 
                    placeholder="Legenda do post..." 
                    className="min-h-[120px] text-sm resize-none" 
                    disabled={isPublished} 
                  />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Input 
                        value={hashtags} 
                        onChange={e => setHashtags(e.target.value)} 
                        placeholder="hashtags..." 
                        className="h-7 text-[11px]" 
                        disabled={isPublished} 
                      />
                    </div>
                    <p className={cn("text-[10px] text-right", isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground")}>
                      {content.length}/{minCharLimit}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Step 3: Media */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">3</span>
                    Mídias
                  </Label>
                  {!isPublished && (
                    <Button variant="outline" size="sm" className="h-8 gap-2 w-full border-dashed text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      Upload
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={e => handleFileUpload(e.target.files)}
                  />

                  {mediaUrls.length > 0 && (
                    <div className="space-y-3">
                      {mediaUrls.length > 1 && !isPublished && (
                        <div className="flex items-center gap-1 p-1.5 rounded-lg border border-border bg-background">
                          <button
                            type="button"
                            onClick={() => { setMultiImageMode('carousel'); setCurrentPostIndex(0); }}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-[10px] font-medium transition-all",
                              multiImageMode === 'carousel' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                            )}
                          >
                            <Layers className="h-3 w-3" />
                            Carrossel
                          </button>
                          <button
                            type="button"
                            onClick={() => setMultiImageMode('individual')}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 py-1 rounded-md text-[10px] font-medium transition-all",
                              multiImageMode === 'individual' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                            )}
                          >
                            <LayoutGrid className="h-3 w-3" />
                            Individual
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-4 gap-1.5">
                        {mediaUrls.map((url, i) => (
                          <div
                            key={i}
                            className={cn(
                              "relative aspect-square rounded-md overflow-hidden group cursor-pointer border-2 transition-all",
                              isIndividualMode && i === currentPostIndex ? "border-primary" : "border-transparent opacity-70"
                            )}
                            onClick={() => isIndividualMode && goToPost(i)}
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            {!isPublished && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeMedia(i); }} 
                                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Step 4: Schedule */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">4</span>
                      Agendamento
                    </Label>
                    {!isPublished && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-primary"
                        onClick={handleSuggestBestTimes}
                        disabled={suggestingTimes || platforms.length === 0}
                      >
                        {suggestingTimes ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        Sugerir horários
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {scheduleSlots.map((slot, idx) => {
                      const slotContentTypes = getSlotContentTypes(slot.platforms);
                      return (
                        <div key={idx} className="space-y-2 p-3 rounded-xl border border-border bg-background">
                          <div className="flex items-center justify-between">
                            <div className="flex -space-x-1.5">
                              {platforms.map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => !isPublished && toggleSlotPlatform(idx, p)}
                                  className={cn(
                                    "rounded-full border-2 border-background transition-all z-10",
                                    slot.platforms.includes(p) ? "opacity-100 scale-105" : "opacity-20 grayscale"
                                  )}
                                >
                                  <PlatformIcon platform={p} size="xs" variant="circle" />
                                </button>
                              ))}
                            </div>
                            
                            {/* Format selector per slot */}
                            <div className="flex items-center gap-1">
                              {slotContentTypes.map(ct => (
                                <button
                                  key={ct}
                                  type="button"
                                  onClick={() => !isPublished && updateSlotContentType(idx, ct)}
                                  className={cn(
                                    "p-1.5 rounded-md transition-all flex items-center gap-1 border",
                                    slot.contentType === ct ? "bg-primary/10 border-primary/30 text-primary" : "border-transparent opacity-40"
                                  )}
                                >
                                  <ContentTypeIcon type={ct} className="!h-3 !w-3" />
                                  <span className="text-[9px] font-bold uppercase">{CONTENT_TYPE_CONFIG[ct]?.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Input type="date" value={slot.date} onChange={e => updateSlot(idx, 'date', e.target.value)} className="h-8 text-[11px] px-2" disabled={isPublished} />
                            <Input type="time" value={slot.time} onChange={e => updateSlot(idx, 'time', e.target.value)} className="h-8 text-[11px] px-2" disabled={isPublished} />
                            {scheduleSlots.length > 1 && !isPublished && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" onClick={() => removeSlot(idx)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!isPublished && (
                    <Button variant="ghost" size="sm" className="w-full text-[10px] h-7 text-primary" onClick={addSlot}>
                      <Plus className="h-3 w-3 mr-1" /> Adicionar outro horário
                    </Button>
                  )}
                </div>
              </div>

              {/* Right column - Preview (Dominant) */}
              <div className="bg-muted/10 p-8 flex flex-col items-center">
                <div className="md:sticky md:top-8 w-full max-w-[400px] space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Visualização Real</Label>
                    <div className="flex gap-1.5">
                      {platforms.map(p => (
                        <button 
                          key={p} 
                          onClick={() => setPreviewPlatform(p)} 
                          className={cn(
                            "p-2 rounded-full transition-all border-2", 
                            previewPlatform === p ? "border-primary bg-primary/10 scale-110" : "border-transparent opacity-40 hover:opacity-100"
                          )}
                        >
                          <PlatformIcon platform={p} size="sm" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {platforms.length > 0 ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                      <div className="w-full shadow-2xl rounded-2xl overflow-hidden border border-border/50">
                        <PostPreview
                          content={content}
                          mediaUrl={currentMediaUrl}
                          platform={previewPlatform}
                          accountName={previewAccount?.account_name || undefined}
                          accountUsername={previewAccount?.username || undefined}
                          accountAvatarUrl={previewAccount?.avatar_url || undefined}
                        />
                      </div>
                      {!isIndividualMode && mediaUrls.length > 1 && multiImageMode === 'carousel' && (
                        <div className="flex gap-2 overflow-x-auto py-4 w-full scrollbar-hide">
                          {mediaUrls.map((url, i) => (
                            <img key={i} src={url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 border-2 border-background shadow-md" />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-[4/5] w-full border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center bg-background/50 p-12 text-center">
                      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                        <ImageIcon className="h-10 w-10 text-muted-foreground/20" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">Selecione um canal para ver como seu post ficará na rede social</p>
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
              <Button
                variant="secondary"
                className="gap-2 w-full sm:w-auto shadow-sm"
                onClick={() => {
                  if (post && onDuplicate) {
                    onDuplicate(post);
                    onOpenChange(false);
                  }
                }}
              >
                <Copy className="h-4 w-4" />
                Duplicar para edição
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={handleSaveDraft} disabled={platforms.length === 0} className="w-full sm:w-auto">
                  Salvar Rascunho
                </Button>
                <Button variant="secondary" onClick={handleSchedule} disabled={platforms.length === 0} className="gap-2 w-full sm:w-auto">
                  <Calendar className="h-4 w-4" />
                  Agendar
                </Button>
                {connectedAccounts.length > 0 && (
                  <Button onClick={handlePublishNow} disabled={platforms.length === 0} className="gap-2 w-full sm:w-auto shadow-lg shadow-primary/20">
                    <Zap className="h-4 w-4" />
                    Publicar Agora
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AICaptionModal
        open={showAICaptionModal}
        onOpenChange={setShowAICaptionModal}
        platforms={platforms}
        contentType={contentType}
        mediaUrls={isIndividualMode ? [mediaUrls[currentPostIndex]] : mediaUrls}
        onCaptionGenerated={handleAICaptionGenerated}
      />
    </>
  );
}