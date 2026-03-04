"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { format, addMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PostPreview } from '@/components/social-media/PostPreview';
import { PlatformIcon } from '@/components/social-media/PlatformIcon';
import { AICaptionModal } from '@/components/social-media/AICaptionModal';
import { type SocialPlatform, type ContentType } from '@/lib/social-media-mock';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import { useSocialPosts } from '@/hooks/useSocialPosts';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  Upload, Calendar, Clock, Loader2, X, 
  Image as ImageIcon, Zap, Sparkles, LayoutGrid, 
  Layers, Plus, AlertCircle, 
  CheckCircle2, Smartphone, Type, Share2, MapPin, MessageSquare, Phone,
  CircleDashed, Film, ArrowLeft, Save, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const getDefaultTime = () => format(addMinutes(new Date(), 15), 'HH:mm');

interface PostItem {
  id: string;
  content: string;
  files: File[];
  mediaUrls: string[];
  contentType: ContentType;
  location: string;
  ctaType: 'none' | 'channel' | 'whatsapp';
  ctaValue: string;
  scheduledAt: string;
  scheduledTime: string;
}

export default function SocialPostEditor() {
  const { postId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientId = searchParams.get('clientId');
  
  const { posts, createPost, updatePost, publishPost } = useSocialPosts();
  const { accounts } = useSocialAccounts(clientId);
  
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
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

  // Carregar post se estiver editando
  useEffect(() => {
    if (postId) {
      const loadPost = async () => {
        const { data, error } = await supabase
          .from('social_posts')
          .select('*')
          .eq('id', postId)
          .single();
        
        if (data) {
          setSelectedAccountIds(connectedAccounts.filter(a => data.platforms.includes(a.platform)).map(a => a.id));
          setPostItems([{
            id: data.id,
            content: data.content || '',
            files: [],
            mediaUrls: data.media_urls || [],
            contentType: (data.content_type as ContentType) || 'feed',
            location: data.location || '',
            ctaType: (data.cta_type as any) || 'none',
            ctaValue: data.cta_value || '',
            scheduledAt: data.scheduled_at ? format(new Date(data.scheduled_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            scheduledTime: data.scheduled_at ? format(new Date(data.scheduled_at), 'HH:mm') : getDefaultTime(),
          }]);
        }
        setIsLoadingPost(false);
      };
      loadPost();
    }
  }, [postId, connectedAccounts.length]);

  const handleFileSelection = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selectedFiles = Array.from(files);
    if (selectedFiles.length > 1) {
      setPendingFiles(selectedFiles);
      setShowUploadChoice(true);
    } else {
      const file = selectedFiles[0];
      const localUrl = URL.createObjectURL(file);
      setPostItems([{
        id: crypto.randomUUID(),
        content: '',
        files: [file],
        mediaUrls: [localUrl],
        contentType: file.type.startsWith('video/') ? 'video' : 'feed',
        location: '',
        ctaType: 'none',
        ctaValue: '',
        scheduledAt: format(new Date(), 'yyyy-MM-dd'),
        scheduledTime: getDefaultTime(),
      }]);
    }
  };

  const handleUploadChoice = (choice: 'carousel' | 'separate') => {
    setShowUploadChoice(false);
    if (choice === 'carousel') {
      const localUrls = pendingFiles.map(f => URL.createObjectURL(f));
      setPostItems([{
        id: crypto.randomUUID(),
        content: '',
        files: pendingFiles,
        mediaUrls: localUrls,
        contentType: 'carousel',
        location: '',
        ctaType: 'none',
        ctaValue: '',
        scheduledAt: format(new Date(), 'yyyy-MM-dd'),
        scheduledTime: getDefaultTime(),
      }]);
    } else {
      const newItems: PostItem[] = pendingFiles.map(file => ({
        id: crypto.randomUUID(),
        content: '',
        files: [file],
        mediaUrls: [URL.createObjectURL(file)],
        contentType: file.type.startsWith('video/') ? 'video' : 'feed',
        location: '',
        ctaType: 'none',
        ctaValue: '',
        scheduledAt: format(new Date(), 'yyyy-MM-dd'),
        scheduledTime: getDefaultTime(),
      }));
      setPostItems(newItems);
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
    if (selectedAccountIds.length === 0) {
      toast.error('Selecione pelo menos um canal.');
      return;
    }
    setIsSaving(true);
    try {
      const selectedAccounts = connectedAccounts.filter(a => selectedAccountIds.includes(a.id));
      const platforms = Array.from(new Set(selectedAccounts.map(a => a.platform)));

      for (const item of postItems) {
        let finalMediaUrls = item.mediaUrls.filter(url => !url.startsWith('blob:'));
        if (item.files.length > 0) {
          const uploadedUrls = await uploadFilesToLate(item.files);
          finalMediaUrls = [...finalMediaUrls, ...uploadedUrls];
        }
        const scheduledAt = new Date(`${item.scheduledAt}T${item.scheduledTime}`).toISOString();
        const postData = {
          content: item.content,
          media_urls: finalMediaUrls,
          platforms,
          content_type: item.contentType,
          location: item.location,
          cta_type: item.ctaType,
          cta_value: item.ctaValue,
          scheduled_at: scheduledAt,
          status: status,
          client_id: clientId,
        };

        if (postId) {
          await updatePost.mutateAsync({ id: postId, ...postData } as any);
        } else {
          const created = await createPost.mutateAsync({ post: postData, silent: true });
          if (status !== 'draft' && (created as any)?.data?.id) {
            await publishPost.mutateAsync({ postId: (created as any).data.id, publishNow: status === 'published' });
          }
        }
      }
      toast.success('Postagem processada com sucesso!');
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

  const selectedPlatforms = useMemo(() => {
    return Array.from(new Set(connectedAccounts.filter(a => selectedAccountIds.includes(a.id)).map(a => a.platform as SocialPlatform)));
  }, [selectedAccountIds, connectedAccounts]);

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
            <p className="text-xs text-muted-foreground">Configure os detalhes e visualize em tempo real</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => handleSaveAction('draft')} disabled={isSaving || postItems.length === 0}>
            Salvar Rascunho
          </Button>
          <Button variant="secondary" onClick={() => handleSaveAction('scheduled')} disabled={isSaving || postItems.length === 0} className="gap-2">
            <Calendar className="h-4 w-4" /> Agendar
          </Button>
          <Button onClick={() => handleSaveAction('published')} disabled={isSaving || postItems.length === 0} className="gap-2 shadow-lg shadow-primary/20 px-6">
            <Zap className="h-4 w-4" /> Publicar Agora
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr,450px]">
        {/* Coluna de Configuração */}
        <ScrollArea className="h-full bg-muted/5">
          <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-10">
            
            {/* SEÇÃO 1: CANAIS */}
            <AnimatedContainer animation="fade-up" className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">1</div>
                <h3 className="font-bold uppercase tracking-wider text-xs">Canais de Destino</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {connectedAccounts.map(acc => (
                  <div 
                    key={acc.id} 
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer",
                      selectedAccountIds.includes(acc.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/20"
                    )}
                    onClick={() => {
                      setSelectedAccountIds(prev => 
                        prev.includes(acc.id) ? prev.filter(id => id !== acc.id) : [...prev, acc.id]
                      );
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <PlatformIcon platform={acc.platform as SocialPlatform} size="md" variant="circle" />
                      <div>
                        <p className="font-bold text-sm">{acc.account_name}</p>
                        <p className="text-[10px] text-muted-foreground">@{acc.username}</p>
                      </div>
                    </div>
                    <Checkbox checked={selectedAccountIds.includes(acc.id)} onCheckedChange={() => {}} />
                  </div>
                ))}
              </div>
            </AnimatedContainer>

            {/* SEÇÃO 2: MÍDIA */}
            <AnimatedContainer animation="fade-up" delay={0.1} className="space-y-4">
              <Separator />
              <div className="flex items-center gap-2 text-primary">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">2</div>
                <h3 className="font-bold uppercase tracking-wider text-xs">Conteúdo Visual</h3>
              </div>

              {postItems.length === 0 ? (
                <div 
                  className="border-2 border-dashed border-border rounded-2xl p-16 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-lg font-medium">Carregar fotos ou vídeos</p>
                  <p className="text-sm text-muted-foreground mt-1">Clique para selecionar arquivos do seu dispositivo</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {postItems.flatMap(item => item.mediaUrls).map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-border group shadow-sm">
                      <img src={url} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => {
                          const newItems = postItems.map(item => ({
                            ...item,
                            mediaUrls: item.mediaUrls.filter(u => u !== url),
                            files: item.files.filter((_, idx) => item.mediaUrls[idx] !== url)
                          })).filter(item => item.mediaUrls.length > 0);
                          setPostItems(newItems);
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
                    <Plus className="h-6 w-6" />
                    <span className="text-[10px] font-bold uppercase">Adicionar</span>
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleFileSelection(e.target.files)} />
            </AnimatedContainer>

            {/* SEÇÃO 3: DETALHES */}
            {postItems.length > 0 && (
              <AnimatedContainer animation="fade-up" delay={0.2} className="space-y-6">
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">3</div>
                    <h3 className="font-bold uppercase tracking-wider text-xs">Configuração do Post</h3>
                  </div>
                  {postItems.length > 1 && (
                    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                      {postItems.map((_, i) => (
                        <Button 
                          key={i} 
                          variant={activeIndex === i ? "default" : "ghost"} 
                          size="sm" 
                          className="h-7 w-7 p-0 text-xs" 
                          onClick={() => setActiveIndex(i)}
                        >
                          {i + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {currentPostItem && (
                  <div className="space-y-8 bg-card p-6 rounded-3xl border shadow-sm">
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
                        className="min-h-[180px] rounded-2xl border-2 text-base"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-sm font-bold">Tipo de Conteúdo</Label>
                        <Select 
                          value={currentPostItem.contentType} 
                          onValueChange={(v: any) => updatePostItem(currentPostItem.id, { contentType: v })}
                        >
                          <SelectTrigger className="h-12 rounded-xl border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="feed">Feed</SelectItem>
                            <SelectItem value="stories">Story</SelectItem>
                            <SelectItem value="reels">Reel</SelectItem>
                            <SelectItem value="carousel">Carrossel</SelectItem>
                          </SelectContent>
                        </Select>
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

                    <div className="space-y-4">
                      <Label className="text-sm font-bold">Chamada para Ação (CTA)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select 
                          value={currentPostItem.ctaType} 
                          onValueChange={(v: any) => updatePostItem(currentPostItem.id, { ctaType: v })}
                        >
                          <SelectTrigger className="h-12 rounded-xl border-2">
                            <SelectValue placeholder="Selecione um CTA" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            <SelectItem value="channel">Mensagem pelo Canal</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          </SelectContent>
                        </Select>
                        {currentPostItem.ctaType === 'whatsapp' && (
                          <div className="relative animate-in fade-in slide-in-from-left-2">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              value={currentPostItem.ctaValue} 
                              onChange={e => updatePostItem(currentPostItem.id, { ctaValue: e.target.value })}
                              placeholder="Número com DDD"
                              className="h-12 pl-11 rounded-xl border-2"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-sm font-bold">Data de Publicação</Label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="date" 
                            value={currentPostItem.scheduledAt} 
                            onChange={e => updatePostItem(currentPostItem.id, { scheduledAt: e.target.value })} 
                            className="h-12 pl-11 rounded-xl border-2" 
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-bold">Horário</Label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="time" 
                            value={currentPostItem.scheduledTime} 
                            onChange={e => updatePostItem(currentPostItem.id, { scheduledTime: e.target.value })} 
                            className="h-12 pl-11 rounded-xl border-2" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </AnimatedContainer>
            )}
          </div>
        </ScrollArea>

        {/* Coluna de Preview Lateral */}
        <aside className="hidden lg:flex flex-col bg-muted/10 border-l border-border overflow-hidden">
          <div className="p-4 border-b bg-background/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preview Real</span>
            </div>
            <div className="flex gap-1">
              {selectedPlatforms.length > 0 ? (
                selectedPlatforms.map(p => (
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
          
          <div className="flex-1 flex items-center justify-center p-10 overflow-y-auto">
            <div className="w-full max-w-[320px] animate-in fade-in zoom-in-95 duration-500">
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

      {/* Diálogos Auxiliares */}
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
        platforms={selectedPlatforms}
        contentType={currentPostItem?.contentType || 'feed'}
        files={currentPostItem?.files || []}
        clientId={clientId}
        onCaptionGenerated={(c) => currentPostItem && updatePostItem(currentPostItem.id, { content: c })}
      />
    </div>
  );
}