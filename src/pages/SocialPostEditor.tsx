"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { format, addMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PostPreview } from '@/components/social-media/PostPreview';
import { PlatformIcon } from './PlatformIcon';
import { AICaptionModal } from '@/components/social-media/AICaptionModal';
import { type SocialPlatform, type ContentType } from '@/lib/social-media-mock';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import { useSocialPosts } from '@/hooks/useSocialPosts';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  Upload, Calendar, Clock, Loader2, X, 
  Image as ImageIcon, Zap, Sparkles, 
  Plus, Smartphone, MapPin, 
  ArrowLeft, FileText, Trash2,
  CircleDashed, Film, Layers, Image,
  LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const getDefaultTime = () => format(addMinutes(new Date(), 15), 'HH:mm');

interface PostSchedule {
  id: string;
  contentType: ContentType;
  date: string;
  time: string;
}

interface PostItem {
  id: string;
  content: string;
  files: File[];
  mediaUrls: string[];
  location: string;
  selectedAccountIds: string[];
  schedules: PostSchedule[];
}

const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string; icon: any }[] = [
  { value: 'feed', label: 'Feed', icon: Image },
  { value: 'stories', label: 'Story', icon: CircleDashed },
  { value: 'reels', label: 'Reel', icon: Film },
  { value: 'carousel', label: 'Carrossel', icon: Layers },
];

export default function SocialPostEditor() {
  const { postId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientId = searchParams.get('clientId');
  
  const { createPost, updatePost, publishPost } = useSocialPosts();
  const { accounts } = useSocialAccounts(clientId);
  
  const [postItems, setPostItems] = useState<PostItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('instagram');
  const [showAICaptionModal, setShowAICaptionModal] = useState(false);
  const [showUploadChoice, setShowUploadChoice] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(!!postId);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const connectedAccounts = accounts.filter(a => a.is_connected);
  const currentPostItem = useMemo(() => postItems[activeIndex] || null, [postItems, activeIndex]);

  useEffect(() => {
    if (postId && connectedAccounts.length > 0) {
      const loadPost = async () => {
        const { data, error } = await supabase
          .from('social_posts')
          .select('*')
          .eq('id', postId)
          .single();
        
        if (data) {
          const accountIds = connectedAccounts
            .filter(a => data.platforms.includes(a.platform))
            .map(a => a.id);

          setPostItems([{
            id: data.id,
            content: data.content || '',
            files: [],
            mediaUrls: data.media_urls || [],
            location: data.location || '',
            selectedAccountIds: accountIds,
            schedules: [{
              id: crypto.randomUUID(),
              contentType: (data.content_type as ContentType) || 'feed',
              date: data.scheduled_at ? format(new Date(data.scheduled_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
              time: data.scheduled_at ? format(new Date(data.scheduled_at), 'HH:mm') : getDefaultTime(),
            }]
          }]);
        }
        setIsLoadingPost(false);
      };
      loadPost();
    } else if (!postId) {
      setIsLoadingPost(false);
      if (postItems.length === 0) {
        handleAddEmptyPost();
      }
    }
  }, [postId, connectedAccounts.length]);

  const handleAddEmptyPost = () => {
    const newItem: PostItem = {
      id: crypto.randomUUID(),
      content: '',
      files: [],
      mediaUrls: [],
      location: '',
      selectedAccountIds: [],
      schedules: [{
        id: crypto.randomUUID(),
        contentType: 'feed',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: getDefaultTime(),
      }]
    };
    setPostItems(prev => [...prev, newItem]);
    setActiveIndex(postItems.length);
  };

  const handleAddSchedule = (postId: string) => {
    setPostItems(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          schedules: [...p.schedules, {
            id: crypto.randomUUID(),
            contentType: 'feed',
            date: format(new Date(), 'yyyy-MM-dd'),
            time: getDefaultTime(),
          }]
        };
      }
      return p;
    }));
  };

  const handleRemoveSchedule = (postId: string, scheduleId: string) => {
    setPostItems(prev => prev.map(p => {
      if (p.id === postId && p.schedules.length > 1) {
        return {
          ...p,
          schedules: p.schedules.filter(s => s.id !== scheduleId)
        };
      }
      return p;
    }));
  };

  const updateSchedule = (postId: string, scheduleId: string, updates: Partial<PostSchedule>) => {
    setPostItems(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          schedules: p.schedules.map(s => s.id === scheduleId ? { ...s, ...updates } : s)
        };
      }
      return p;
    }));
  };

  const handleFileSelection = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selectedFiles = Array.from(files);
    
    if (selectedFiles.length > 1) {
      setPendingFiles(selectedFiles);
      setShowUploadChoice(true);
    } else {
      const file = selectedFiles[0];
      const localUrl = URL.createObjectURL(file);
      
      if (currentPostItem) {
        updatePostItem(currentPostItem.id, {
          files: [...currentPostItem.files, file],
          mediaUrls: [...currentPostItem.mediaUrls, localUrl],
        });
        // Auto-detect video
        if (file.type.startsWith('video/')) {
          updateSchedule(currentPostItem.id, currentPostItem.schedules[0].id, { contentType: 'video' as any });
        }
      }
    }
  };

  const handleUploadChoice = (choice: 'carousel' | 'separate') => {
    setShowUploadChoice(false);
    if (choice === 'carousel') {
      const localUrls = pendingFiles.map(f => URL.createObjectURL(f));
      if (currentPostItem) {
        updatePostItem(currentPostItem.id, {
          files: [...currentPostItem.files, ...pendingFiles],
          mediaUrls: [...currentPostItem.mediaUrls, ...localUrls],
        });
        updateSchedule(currentPostItem.id, currentPostItem.schedules[0].id, { contentType: 'carousel' });
      }
    } else {
      const newItems: PostItem[] = pendingFiles.map(file => ({
        id: crypto.randomUUID(),
        content: '',
        files: [file],
        mediaUrls: [URL.createObjectURL(file)],
        location: '',
        selectedAccountIds: currentPostItem?.selectedAccountIds || [],
        schedules: [{
          id: crypto.randomUUID(),
          contentType: file.type.startsWith('video/') ? 'video' as any : 'feed',
          date: format(new Date(), 'yyyy-MM-dd'),
          time: getDefaultTime(),
        }]
      }));
      setPostItems(prev => [...prev, ...newItems]);
      setActiveIndex(postItems.length);
    }
    setPendingFiles([]);
  };

  const uploadFilesToLate = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    const uploadPromises = files.map(async (file) => {
      const { data: presignData, error: presignError } = await supabase.functions.invoke('social-media-presign', {
        body: { fileName: file.name, fileType: file.type }
      });
      if (presignError) throw presignError;
      await fetch(presignData.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      return presignData.publicUrl;
    });
    return await Promise.all(uploadPromises);
  };

  const handleSaveAction = async (status: 'draft' | 'scheduled' | 'published') => {
    const invalidPosts = postItems.filter(item => item.selectedAccountIds.length === 0);
    if (invalidPosts.length > 0) {
      toast.error('Todas as postagens devem ter pelo menos um canal selecionado.');
      return;
    }

    setIsSaving(true);
    try {
      for (const item of postItems) {
        let finalMediaUrls = item.mediaUrls.filter(url => !url.startsWith('blob:'));
        if (item.files.length > 0) {
          const uploadedUrls = await uploadFilesToLate(item.files);
          finalMediaUrls = [...finalMediaUrls, ...uploadedUrls];
        }

        const selectedAccounts = connectedAccounts.filter(a => item.selectedAccountIds.includes(a.id));
        const platforms = Array.from(new Set(selectedAccounts.map(a => a.platform)));

        // Criar um post para cada agendamento definido
        for (const schedule of item.schedules) {
          const scheduledAt = new Date(`${schedule.date}T${schedule.time}`).toISOString();
          const postData = {
            content: item.content,
            media_urls: finalMediaUrls,
            platforms,
            content_type: schedule.contentType,
            location: item.location,
            scheduled_at: scheduledAt,
            status: status,
            client_id: clientId,
          };

          const created = await createPost.mutateAsync({ post: postData, silent: true });
          if (status !== 'draft' && (created as any)?.data?.id) {
            await publishPost.mutateAsync({ postId: (created as any).data.id, publishNow: status === 'published', silent: true });
          }
        }
      }
      toast.success('Todas as postagens foram processadas!');
      navigate('/app/social-media');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updatePostItem = (id: string, updates: Partial<PostItem>) => {
    setPostItems(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleDeletePostItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (postItems.length === 1) {
      toast.error('Você deve ter pelo menos uma postagem.');
      return;
    }
    const newItems = postItems.filter(p => p.id !== id);
    setPostItems(newItems);
    if (activeIndex >= newItems.length) {
      setActiveIndex(newItems.length - 1);
    }
  };

  const currentPlatforms = useMemo(() => {
    if (!currentPostItem) return [];
    return Array.from(new Set(connectedAccounts
      .filter(a => currentPostItem.selectedAccountIds.includes(a.id))
      .map(a => a.platform as SocialPlatform)));
  }, [currentPostItem, connectedAccounts]);

  if (isLoadingPost) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header Fixo */}
      <header className="h-16 border-b bg-card px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/social-media')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">{postId ? 'Editar Publicação' : 'Nova Publicação'}</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              {postItems.length} {postItems.length === 1 ? 'Postagem' : 'Postagens em lote'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => handleSaveAction('draft')} disabled={isSaving}>
            Salvar Rascunhos
          </Button>
          <Button variant="secondary" onClick={() => handleSaveAction('scheduled')} disabled={isSaving} className="gap-2">
            <Calendar className="h-4 w-4" /> Agendar Tudo
          </Button>
          <Button onClick={() => handleSaveAction('published')} disabled={isSaving} className="gap-2 shadow-lg shadow-primary/20 px-6">
            <Zap className="h-4 w-4" /> Publicar Agora
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex">
        
        {/* NAVEGADOR LATERAL DE POSTS */}
        <aside className="w-64 border-r bg-muted/10 flex flex-col shrink-0">
          <div className="p-4 border-b bg-background/50 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Páginas</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddEmptyPost}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {postItems.map((item, index) => (
                <div 
                  key={item.id}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "group relative p-3 rounded-xl border-2 transition-all cursor-pointer overflow-hidden",
                    activeIndex === index ? "border-primary bg-primary/5 shadow-sm" : "border-transparent hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border">
                      {item.mediaUrls[0] ? (
                        <img src={item.mediaUrls[0]} className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">Post #{index + 1}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.content || 'Sem legenda...'}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {connectedAccounts.filter(a => item.selectedAccountIds.includes(a.id)).slice(0, 3).map(a => (
                          <PlatformIcon key={a.id} platform={a.platform as SocialPlatform} size="xs" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleDeletePostItem(item.id, e)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* EDITOR CENTRAL */}
        <div className="flex-1 overflow-hidden flex flex-col bg-background">
          <ScrollArea className="flex-1">
            <div className="p-6 md:p-10 max-w-3xl mx-auto w-full space-y-10">
              
              {currentPostItem && (
                <AnimatedContainer animation="fade-in" key={currentPostItem.id} className="space-y-10">
                  
                  {/* SEÇÃO 1: CANAIS */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">1</div>
                      <h3 className="font-bold uppercase tracking-wider text-xs">Canais para este Post</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {connectedAccounts.map(acc => (
                        <div 
                          key={acc.id} 
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer",
                            currentPostItem.selectedAccountIds.includes(acc.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/20"
                          )}
                          onClick={() => {
                            const ids = currentPostItem.selectedAccountIds.includes(acc.id)
                              ? currentPostItem.selectedAccountIds.filter(id => id !== acc.id)
                              : [...currentPostItem.selectedAccountIds, acc.id];
                            updatePostItem(currentPostItem.id, { selectedAccountIds: ids });
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <PlatformIcon platform={acc.platform as SocialPlatform} size="md" variant="circle" />
                            <div>
                              <p className="font-bold text-sm">{acc.account_name}</p>
                              <p className="text-[10px] text-muted-foreground">@{acc.username}</p>
                            </div>
                          </div>
                          <Checkbox checked={currentPostItem.selectedAccountIds.includes(acc.id)} onCheckedChange={() => {}} />
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* SEÇÃO 2: MÍDIA */}
                  <section className="space-y-4">
                    <Separator />
                    <div className="flex items-center gap-2 text-primary">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">2</div>
                      <h3 className="font-bold uppercase tracking-wider text-xs">Conteúdo Visual</h3>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {currentPostItem.mediaUrls.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-border group shadow-sm">
                          <img src={url} className="w-full h-full object-cover" />
                          <button 
                            onClick={() => {
                              const newUrls = currentPostItem.mediaUrls.filter((_, idx) => idx !== i);
                              const newFiles = currentPostItem.files.filter((_, idx) => idx !== i);
                              updatePostItem(currentPostItem.id, { mediaUrls: newUrls, files: newFiles });
                            }}
                            className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 hover:bg-muted/50 transition-colors text-muted-foreground"
                      >
                        <Upload className="h-6 w-6" />
                        <span className="text-[10px] font-bold uppercase">Upload</span>
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleFileSelection(e.target.files)} />
                  </section>

                  {/* SEÇÃO 3: LEGENDA */}
                  <section className="space-y-4">
                    <Separator />
                    <div className="flex items-center gap-2 text-primary">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">3</div>
                      <h3 className="font-bold uppercase tracking-wider text-xs">Legenda e Localização</h3>
                    </div>

                    <div className="space-y-6 bg-card p-6 rounded-3xl border shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-bold">Legenda</Label>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="gap-2 border-primary/30 text-primary hover:bg-primary/5 h-8"
                            onClick={() => setShowAICaptionModal(true)}
                          >
                            <Sparkles className="h-4 w-4" /> Gerar com QIA
                          </Button>
                        </div>
                        <Textarea 
                          value={currentPostItem.content} 
                          onChange={e => updatePostItem(currentPostItem.id, { content: e.target.value })}
                          placeholder="O que você quer dizer ao seu público?"
                          className="min-h-[150px] rounded-2xl border-2 text-base"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-bold">Localização</Label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            value={currentPostItem.location} 
                            onChange={e => updatePostItem(currentPostItem.id, { location: e.target.value })}
                            placeholder="Onde foi isso?"
                            className="h-12 pl-11 rounded-xl border-2"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* SEÇÃO 4: AGENDAMENTOS */}
                  <section className="space-y-4">
                    <Separator />
                    <div className="flex items-center gap-2 text-primary">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">4</div>
                      <h3 className="font-bold uppercase tracking-wider text-xs">Horários e Formatos</h3>
                    </div>

                    <div className="space-y-4">
                      {currentPostItem.schedules.map((schedule, sIdx) => (
                        <div key={schedule.id} className="bg-card p-6 rounded-3xl border shadow-sm space-y-6 relative group/schedule">
                          {currentPostItem.schedules.length > 1 && (
                            <button 
                              onClick={() => handleRemoveSchedule(currentPostItem.id, schedule.id)}
                              className="absolute top-4 right-4 p-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}

                          <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Tipo de Conteúdo</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {CONTENT_TYPE_OPTIONS.map(opt => {
                                const Icon = opt.icon;
                                return (
                                  <button
                                    key={opt.value}
                                    onClick={() => updateSchedule(currentPostItem.id, schedule.id, { contentType: opt.value })}
                                    className={cn(
                                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                                      schedule.contentType === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/20"
                                    )}
                                  >
                                    <Icon className={cn("h-5 w-5", schedule.contentType === opt.value ? "text-primary" : "text-muted-foreground")} />
                                    <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Data</Label>
                              <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  type="date" 
                                  value={schedule.date} 
                                  onChange={e => updateSchedule(currentPostItem.id, schedule.id, { date: e.target.value })} 
                                  className="h-12 pl-11 rounded-xl border-2" 
                                />
                              </div>
                            </div>
                            <div className="space-y-3">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Horário</Label>
                              <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  type="time" 
                                  value={schedule.time} 
                                  onChange={e => updateSchedule(currentPostItem.id, schedule.id, { time: e.target.value })} 
                                  className="h-12 pl-11 rounded-xl border-2" 
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button 
                        variant="outline" 
                        className="w-full h-14 border-dashed border-2 rounded-2xl gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all"
                        onClick={() => handleAddSchedule(currentPostItem.id)}
                      >
                        <Plus className="h-5 w-5" />
                        Adicionar outro horário/formato
                      </Button>
                    </div>
                  </section>
                </AnimatedContainer>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* PREVIEW LATERAL DIREITO */}
        <aside className="w-[400px] flex flex-col bg-muted/10 border-l border-border overflow-hidden shrink-0">
          <div className="p-4 border-b bg-background/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preview Real</span>
            </div>
            <div className="flex gap-1">
              {currentPlatforms.length > 0 ? (
                currentPlatforms.map(p => (
                  <button 
                    key={p} 
                    onClick={() => setPreviewPlatform(p)}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      previewPlatform === p ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "opacity-30 hover:opacity-60"
                    )}
                  >
                    <PlatformIcon platform={p} size="sm" />
                  </button>
                ))
              ) : (
                <div className="text-[10px] text-muted-foreground italic">Selecione um canal</div>
              )}
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
            <div className="w-full max-w-[300px] animate-in fade-in zoom-in-95 duration-500">
              <div className="shadow-2xl rounded-[3rem] overflow-hidden border-[10px] border-black bg-black">
                {currentPostItem ? (
                  <PostPreview
                    content={currentPostItem.content}
                    mediaUrl={currentPostItem.mediaUrls[0]}
                    platform={previewPlatform}
                  />
                ) : (
                  <div className="aspect-[9/16] bg-muted flex items-center justify-center p-10 text-center">
                    <div className="space-y-2">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                      <p className="text-xs text-muted-foreground">Configure o post para ver o preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* DIÁLOGOS AUXILIARES */}
      <Dialog open={showUploadChoice} onOpenChange={setShowUploadChoice}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Como deseja postar?</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button variant="outline" className="flex-col h-auto py-8 gap-4 rounded-2xl border-2 hover:border-primary/50" onClick={() => handleUploadChoice('carousel')}>
              <Layers className="h-10 w-10 text-primary" />
              <div className="text-center">
                <p className="font-bold">Carrossel</p>
                <p className="text-[10px] text-muted-foreground">Post único com várias mídias</p>
              </div>
            </Button>
            <Button variant="outline" className="flex-col h-auto py-8 gap-4 rounded-2xl border-2 hover:border-primary/50" onClick={() => handleUploadChoice('separate')}>
              <LayoutGrid className="h-10 w-10 text-primary" />
              <div className="text-center">
                <p className="font-bold">Posts Separados</p>
                <p className="text-[10px] text-muted-foreground">Um post para cada mídia</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AICaptionModal
        open={showAICaptionModal}
        onOpenChange={setShowAICaptionModal}
        platforms={currentPlatforms}
        contentType={currentPostItem?.schedules[0]?.contentType || 'feed'}
        files={currentPostItem?.files || []}
        clientId={clientId}
        onCaptionGenerated={(c) => currentPostItem && updatePostItem(currentPostItem.id, { content: c })}
      />
    </div>
  );
}