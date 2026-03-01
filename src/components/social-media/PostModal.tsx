import { useState, useEffect, useRef, useMemo } from 'react';
import { format, addMinutes } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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
import { Upload, Calendar, Clock, Hash, Loader2, X, Image as ImageIcon, Zap, Sparkles, LayoutGrid, Layers, Trash2, ChevronLeft, ChevronRight, Plus, Copy, AlertCircle, CircleDashed, Film, Image, CheckCircle2 } from 'lucide-react';
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

interface PostData {
  id: string;
  content: string;
  mediaUrls: string[];
  schedules: ScheduleEntry[];
  isGeneratingCaption?: boolean;
}

interface PostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: SocialPostRow | null;
  clientId?: string | null;
  onSave: (data: any) => Promise<any>;
  onPublish?: (postId: string, publishNow: boolean) => void;
  onDuplicate?: (post: SocialPostRow) => void;
  defaultDate?: string;
  isPublished?: boolean;
}

export function PostModal({ open, onOpenChange, post, clientId, onSave, onPublish, onDuplicate, defaultDate, isPublished }: PostModalProps) {
  const { accounts } = useSocialAccounts(post?.client_id || clientId);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('instagram');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAICaptionModal, setShowAICaptionModal] = useState(false);
  const [showUploadChoice, setShowUploadChoice] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState({ current: 0, total: 0 });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const connectedAccounts = accounts.filter(a => a.is_connected);

  const currentPost = useMemo(() => {
    return posts[activeIndex] || { id: 'temp', content: '', mediaUrls: [], schedules: [] };
  }, [posts, activeIndex]);

  // Media compatibility logic
  const mediaStats = useMemo(() => {
    const isVideo = (url: string) => /\.(mp4|mov|avi|webm)$/i.test(url);
    const hasVideo = currentPost.mediaUrls.some(isVideo);
    const hasImage = currentPost.mediaUrls.some(url => !isVideo(url));
    const count = currentPost.mediaUrls.length;
    return { hasVideo, hasImage, count, isOnlyVideo: hasVideo && !hasImage, isOnlyImage: hasImage && !hasVideo };
  }, [currentPost.mediaUrls]);

  const checkCompatibility = (platform: SocialPlatform, format: ContentType) => {
    if (currentPost.mediaUrls.length === 0) return true;

    switch (format) {
      case 'feed':
        // Se houver mais de uma mídia, o feed não é compatível (deve usar carrossel)
        return currentPost.mediaUrls.length <= 1;
      case 'stories':
        // Permite múltiplas mídias para stories, pois vamos quebrar em posts individuais no salvamento
        return true;
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
    if (open) {
      if (post) {
        const postHashtags = post.hashtags?.map(h => `#${h}`).join(' ') || '';
        const content = post.content + (postHashtags ? `\n\n${postHashtags}` : '');
        const mediaUrls = post.media_urls || [];
        
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

        setPosts([{
          id: post.id,
          content,
          mediaUrls,
          schedules: [{
            id: crypto.randomUUID(),
            date,
            time,
            placements: initialPlacements
          }]
        }]);
        setActiveIndex(0);
        setPreviewPlatform(postPlatforms[0] as SocialPlatform || 'instagram');
      } else {
        setPosts([{
          id: crypto.randomUUID(),
          content: '',
          mediaUrls: [],
          schedules: [{
            id: crypto.randomUUID(),
            date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
            time: getDefaultTime(),
            placements: []
          }]
        }]);
        setActiveIndex(0);
      }
    }
  }, [post, open, defaultDate, connectedAccounts.length]);

  const addPost = () => {
    const newPost: PostData = {
      id: crypto.randomUUID(),
      content: '',
      mediaUrls: [],
      schedules: [{
        id: crypto.randomUUID(),
        date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
        time: getDefaultTime(),
        placements: []
      }]
    };
    setPosts(prev => [...prev, newPost]);
    setActiveIndex(posts.length);
  };

  const removePost = (index: number) => {
    if (posts.length <= 1) return;
    setPosts(prev => prev.filter((_, i) => i !== index));
    if (activeIndex >= index && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const duplicatePost = (index: number) => {
    const postToDuplicate = posts[index];
    const newPost: PostData = {
      ...JSON.parse(JSON.stringify(postToDuplicate)),
      id: crypto.randomUUID(),
      schedules: postToDuplicate.schedules.map(s => ({
        ...s,
        id: crypto.randomUUID()
      }))
    };
    setPosts(prev => {
      const updated = [...prev];
      updated.splice(index + 1, 0, newPost);
      return updated;
    });
    setActiveIndex(index + 1);
  };

  const updateCurrentPost = (updates: Partial<PostData>) => {
    setPosts(prev => prev.map((p, i) => i === activeIndex ? { ...p, ...updates } : p));
  };

  const addSchedule = () => {
    const newSchedule = {
      id: crypto.randomUUID(),
      date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
      time: getDefaultTime(),
      placements: []
    };
    updateCurrentPost({ schedules: [...currentPost.schedules, newSchedule] });
  };

  const removeSchedule = (id: string) => {
    if (currentPost.schedules.length <= 1) return;
    updateCurrentPost({ schedules: currentPost.schedules.filter(s => s.id !== id) });
  };

  const updateSchedule = (id: string, updates: Partial<ScheduleEntry>) => {
    updateCurrentPost({
      schedules: currentPost.schedules.map(s => s.id === id ? { ...s, ...updates } : s)
    });
  };

  const togglePlacementInSchedule = (scheduleId: string, accountId: string, format: ContentType) => {
    if (isPublished) return;
    
    updateCurrentPost({
      schedules: currentPost.schedules.map(s => {
        if (s.id !== scheduleId) return s;
        
        const isSelected = s.placements.some(p => p.accountId === accountId && p.format === format);
        const newPlacements = isSelected
          ? s.placements.filter(p => !(p.accountId === accountId && p.format === format))
          : [...s.placements, { accountId, format }];
          
        return { ...s, placements: newPlacements };
      })
    });
  };

  const generateAICaptionForPost = async (postId: string, urls: string[]) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, isGeneratingCaption: true } : p));
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-caption', {
        body: {
          platforms: ['instagram', 'facebook'], // Default platforms for analysis
          content_type: 'feed',
          media_urls: urls,
          tone: 'casual',
          length: 'media',
        },
      });

      if (error) throw error;
      
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        content: data?.caption || '',
        isGeneratingCaption: false
      } : p));
    } catch (err) {
      console.error('Error generating AI caption:', err);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isGeneratingCaption: false } : p));
    }
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
        
        const { error } = await supabase.storage.from('social-media').upload(path, file);
        if (error) throw error;
        
        const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
        
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      if (newUrls.length > 1) {
        setPendingFiles(newUrls);
        setShowUploadChoice(true);
      } else {
        updateCurrentPost({ mediaUrls: [...currentPost.mediaUrls, ...newUrls] });
      }
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

  const handleUploadChoice = async (choice: 'carousel' | 'separate') => {
    setShowUploadChoice(false);
    
    if (choice === 'carousel') {
      updateCurrentPost({ mediaUrls: [...currentPost.mediaUrls, ...pendingFiles] });
    } else {
      // Create new posts for each file
      const newPosts: PostData[] = pendingFiles.map(url => ({
        id: crypto.randomUUID(),
        content: '',
        mediaUrls: [url],
        schedules: JSON.parse(JSON.stringify(currentPost.schedules)).map((s: ScheduleEntry) => ({
          ...s,
          id: crypto.randomUUID()
        })),
        isGeneratingCaption: true
      }));

      // If current post is empty, replace it or just add to it?
      if (currentPost.mediaUrls.length === 0 && currentPost.content === '') {
        setPosts(prev => {
          const updated = [...prev];
          updated[activeIndex] = newPosts[0];
          return [...updated, ...newPosts.slice(1)];
        });
        
        // Generate captions for all new posts
        newPosts.forEach((p) => {
          generateAICaptionForPost(p.id, p.mediaUrls);
        });
      } else {
        setPosts(prev => [...prev, ...newPosts]);
        
        // Generate captions for all new posts
        newPosts.forEach((p) => {
          generateAICaptionForPost(p.id, p.mediaUrls);
        });
      }
    }
    setPendingFiles([]);
  };

  const removeMedia = (index: number) => {
    updateCurrentPost({ mediaUrls: currentPost.mediaUrls.filter((_, i) => i !== index) });
  };

  const saveWithRetry = async (data: any, maxAttempts = 3) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await onSave(data);
      } catch (err: any) {
        if (attempt === maxAttempts) throw err;
        // Wait before retry (1s, 2s)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  };

  const handleSaveAction = async (status: string) => {
    let totalItems = 0;
    posts.forEach(p => {
      p.schedules.forEach(s => {
        s.placements.forEach(pl => {
          if (pl.format === 'stories' && p.mediaUrls.length > 1) {
            totalItems += p.mediaUrls.length;
          } else {
            totalItems += 1;
          }
        });
      });
    });

    if (totalItems === 0) {
      toast.error("Selecione ao menos um canal para agendar.");
      return;
    }

    setIsSaving(true);
    setSavingProgress({ current: 0, total: totalItems });

    let currentCount = 0;
    let isFirst = true;

    try {
      for (let pIdx = 0; pIdx < posts.length; pIdx++) {
        const postData = posts[pIdx];
        
        // Extract hashtags
        const hashtagRegex = /#(\w+)/g;
        const extractedHashtags: string[] = [];
        let match;
        while ((match = hashtagRegex.exec(postData.content)) !== null) {
          extractedHashtags.push(match[1]);
        }

        for (const schedule of postData.schedules) {
          for (const placement of schedule.placements) {
            const account = connectedAccounts.find(a => a.id === placement.accountId);
            if (!account) continue;

            let scheduledAt: string;
            if (status === 'published') {
              scheduledAt = new Date().toISOString();
            } else {
              const [year, month, day] = schedule.date.split('-').map(Number);
              const [hours, minutes] = schedule.time.split(':').map(Number);
              const localDate = new Date(year, month - 1, day, hours, minutes);
              scheduledAt = localDate.toISOString();
            }

            const baseData = {
              content: postData.content,
              platforms: [account.platform as SocialPlatform],
              content_type: placement.format,
              hashtags: extractedHashtags,
              status,
              client_id: post?.client_id || clientId,
            };

            if (placement.format === 'stories' && postData.mediaUrls.length > 1) {
              for (let urlIdx = 0; urlIdx < postData.mediaUrls.length; urlIdx++) {
                currentCount++;
                setSavingProgress(prev => ({ ...prev, current: currentCount }));
                
                if (!isFirst) await new Promise(r => setTimeout(r, 3000));

                const offsetDate = new Date(new Date(scheduledAt).getTime() + (urlIdx * 1000));
                const itemData = {
                  ...baseData,
                  media_urls: [postData.mediaUrls[urlIdx]],
                  scheduled_at: offsetDate.toISOString(),
                  _isNew: post ? !isFirst : true,
                };

                try {
                  await saveWithRetry(itemData);
                } catch (err: any) {
                  throw new Error(`Falha no Post ${pIdx + 1} (Story ${urlIdx + 1}): ${err.message || 'Erro desconhecido'}`);
                }
                isFirst = false;
              }
            } else {
              currentCount++;
              setSavingProgress(prev => ({ ...prev, current: currentCount }));
              
              if (!isFirst) await new Promise(r => setTimeout(r, 3000));

              const itemData = {
                ...baseData,
                media_urls: postData.mediaUrls,
                scheduled_at: scheduledAt,
                _isNew: post ? !isFirst : true,
              };

              try {
                await saveWithRetry(itemData);
              } catch (err: any) {
                throw new Error(`Falha no Post ${pIdx + 1} (${PLATFORM_CONFIG[account.platform as SocialPlatform].label}): ${err.message || 'Erro desconhecido'}`);
              }
              isFirst = false;
            }
          }
        }
      }
      
      setIsSaving(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Error saving posts:', err);
      setIsSaving(false);
      toast.error(err.message || 'Ocorreu um erro ao salvar os posts.');
    }
  };

  const handleAICaptionGenerated = (caption: string) => {
    updateCurrentPost({ content: caption });
  };

  const previewAccount = useMemo(() => {
    const firstSelected = currentPost.schedules[0]?.placements[0];
    if (firstSelected) {
      return connectedAccounts.find(a => a.id === firstSelected.accountId);
    }
    return connectedAccounts.find(a => a.platform === previewPlatform);
  }, [currentPost.schedules, previewPlatform, connectedAccounts]);

  const hasAnyPlacement = useMemo(() => posts.some(p => p.schedules.some(s => s.placements.length > 0)), [posts]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col p-0 w-[calc(100vw-1rem)] sm:w-auto">
          {/* Saving Overlay */}
          {isSaving && (
            <div className="absolute inset-0 z-[100] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="relative flex items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                  {Math.round((savingProgress.current / savingProgress.total) * 100)}%
                </div>
              </div>
              <div className="mt-6 text-center space-y-2">
                <p className="text-lg font-bold">Enviando para o Late.dev...</p>
                <p className="text-sm text-muted-foreground">
                  Processando item <span className="text-primary font-bold">{savingProgress.current}</span> de <span className="font-bold">{savingProgress.total}</span>
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">Aguarde, não feche esta janela</p>
              </div>
            </div>
          )}

          <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-lg">
              {isPublished ? 'Visualizar Post (Publicado)' : post ? 'Editar Post' : 'Novo Post'}
            </DialogTitle>
            
            {/* Pagination UI */}
            {!isPublished && (
              <div className="flex items-center gap-2 mr-8">
                <div className="flex items-center bg-muted rounded-lg p-1 gap-1 max-w-[300px] overflow-x-auto no-scrollbar">
                {posts.map((_, i) => (
                  <div key={i} className="relative group">
                    <Button
                      variant={activeIndex === i ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 text-xs font-bold transition-all",
                        activeIndex === i ? "shadow-sm" : "text-muted-foreground hover:bg-background/50"
                      )}
                      onClick={() => setActiveIndex(i)}
                      disabled={isSaving}
                    >
                      {i + 1}
                    </Button>
                    {posts.length > 1 && activeIndex === i && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removePost(i); }}
                        className="absolute -top-1 -right-1 z-10 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90 shadow-sm"
                        disabled={isSaving}
                      >
                        <X className="h-2 w-2" />
                      </button>
                    )}
                  </div>
                ))}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-background/50"
                      onClick={addPost}
                      disabled={isSaving}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Adicionar novo post</TooltipContent>
                </Tooltip>
              </div>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-[450px_1fr] gap-0">
              {/* Left column - Form */}
              <div className="p-6 space-y-6 border-r border-border bg-muted/5">
                
                {/* Post Actions */}
                {!isPublished && (
                  <div className="flex items-center justify-between bg-background border rounded-lg p-2 mb-2">
                    <div className="flex items-center gap-2 px-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Post {activeIndex + 1} de {posts.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => duplicatePost(activeIndex)} disabled={isSaving}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Duplicar este post</TooltipContent>
                      </Tooltip>
                      
                      {posts.length > 1 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removePost(activeIndex)} disabled={isSaving}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remover este post</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 1: Media */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
                    Mídias
                  </Label>
                  {!isPublished && (
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="h-8 gap-2 w-full border-dashed text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading || isSaving}>
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

                  {currentPost.mediaUrls.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {currentPost.mediaUrls.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-md overflow-hidden group border border-border">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {!isPublished && (
                            <button onClick={() => removeMedia(i)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100" disabled={isSaving}>
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 text-[10px] h-6 px-2" 
                        onClick={() => setShowAICaptionModal(true)}
                        disabled={currentPost.isGeneratingCaption || isSaving}
                      >
                        {currentPost.isGeneratingCaption ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        IA
                      </Button>
                    )}
                  </div>
                  <div className="relative">
                    <Textarea 
                      value={currentPost.content} 
                      onChange={e => updateCurrentPost({ content: e.target.value })} 
                      placeholder={currentPost.isGeneratingCaption ? "IA gerando legenda..." : "Escreva sua legenda aqui... Use #hashtags diretamente no texto."} 
                      className={cn(
                        "min-h-[120px] text-sm resize-none",
                        (currentPost.isGeneratingCaption || isSaving) && "opacity-50"
                      )} 
                      disabled={isPublished || currentPost.isGeneratingCaption || isSaving} 
                    />
                    {currentPost.isGeneratingCaption && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[1px] rounded-md">
                        <div className="flex items-center gap-2 text-xs font-medium text-primary animate-pulse">
                          <Sparkles className="h-3 w-3" />
                          Gerando legenda...
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Step 3: Schedules */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">3</span>
                      Agendamentos
                    </Label>
                    {!isPublished && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] gap-1" onClick={addSchedule} disabled={isSaving}>
                        <Plus className="h-3 w-3" /> Adicionar
                      </Button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {currentPost.schedules.map((schedule, sIdx) => (
                      <div key={schedule.id} className="relative p-4 rounded-lg border bg-background/50 space-y-4">
                        {currentPost.schedules.length > 1 && !isPublished && (
                          <button
                            onClick={() => removeSchedule(schedule.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-sm hover:bg-destructive/90 transition-colors"
                            disabled={isSaving}
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
                              disabled={isPublished || isSaving} 
                            />
                          </div>
                          <div className="relative">
                            <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input 
                              type="time" 
                              value={schedule.time} 
                              onChange={e => updateSchedule(schedule.id, { time: e.target.value })} 
                              className="h-8 pl-7 text-[11px]" 
                              disabled={isPublished || isSaving} 
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
                                              disabled={isPublished || isSaving}
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
                      {Array.from(new Set(currentPost.schedules.flatMap(s => s.placements).map(p => connectedAccounts.find(a => a.id === p.accountId)?.platform))).map(p => (
                        <button key={p} onClick={() => setPreviewPlatform(p as SocialPlatform)} className={cn("p-1.5 rounded-lg transition-all", previewPlatform === p ? "bg-primary/10 ring-1 ring-primary/30" : "opacity-40")} disabled={isSaving}>
                          <PlatformIcon platform={p as SocialPlatform} size="sm" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {currentPost.mediaUrls.length > 0 ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                      <div className="w-full shadow-2xl rounded-2xl overflow-hidden border border-border/50">
                        <PostPreview
                          content={currentPost.content}
                          mediaUrl={currentPost.mediaUrls[0]}
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
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto" disabled={isSaving}>
              {isPublished ? 'Fechar' : 'Cancelar'}
            </Button>
            
            {isPublished ? (
              <Button variant="secondary" className="gap-2 w-full sm:w-auto" onClick={() => { if (post && onDuplicate) { onDuplicate(post); onOpenChange(false); } }}>
                <Copy className="h-4 w-4" /> Duplicar para edição
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => handleSaveAction('draft')} disabled={!hasAnyPlacement || isSaving} className="w-full sm:w-auto">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar Rascunho
                </Button>
                <Button variant="secondary" onClick={() => handleSaveAction('scheduled')} disabled={!hasAnyPlacement || isSaving} className="gap-2 w-full sm:w-auto">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                  Agendar
                </Button>
                <Button onClick={() => handleSaveAction('published')} disabled={!hasAnyPlacement || isSaving} className="gap-2 w-full sm:w-auto shadow-lg shadow-primary/20">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  Publicar Agora
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-[400px]">
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl font-bold">Sucesso!</DialogTitle>
              <DialogDescription className="text-base">
                Todos os seus posts foram enviados e processados com sucesso pelo Late.dev.
              </DialogDescription>
            </div>
            <Button onClick={() => { setShowSuccessModal(false); onOpenChange(false); }} className="w-full">
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Choice Dialog */}
      <Dialog open={showUploadChoice} onOpenChange={setShowUploadChoice}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Como deseja carregar as mídias?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button 
              variant="outline" 
              className="flex flex-col items-center gap-3 h-auto py-6"
              onClick={() => handleUploadChoice('carousel')}
            >
              <Layers className="h-8 w-8 text-primary" />
              <div className="text-center">
                <div className="font-bold">Carrossel</div>
                <div className="text-[10px] text-muted-foreground">Post único com várias mídias</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col items-center gap-3 h-auto py-6"
              onClick={() => handleUploadChoice('separate')}
            >
              <LayoutGrid className="h-8 w-8 text-primary" />
              <div className="text-center">
                <div className="font-bold">Posts Separados</div>
                <div className="text-[10px] text-muted-foreground">Um post para cada mídia</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AICaptionModal
        open={showAICaptionModal}
        onOpenChange={setShowAICaptionModal}
        platforms={Array.from(new Set(currentPost.schedules.flatMap(s => s.placements).map(p => connectedAccounts.find(a => a.id === p.accountId)?.platform as SocialPlatform)))}
        contentType={currentPost.schedules[0]?.placements[0]?.format || 'feed'}
        mediaUrls={currentPost.mediaUrls}
        onCaptionGenerated={handleAICaptionGenerated}
      />
    </>
  );
}