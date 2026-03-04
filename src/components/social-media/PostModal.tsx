"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { format, addMinutes } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PostPreview } from './PostPreview';
import { PlatformIcon } from './PlatformIcon';
import { AICaptionModal } from './AICaptionModal';
import { type SocialPlatform, type ContentType } from '@/lib/social-media-mock';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  Upload, Calendar, Clock, Loader2, X, 
  Image as ImageIcon, Zap, Sparkles, LayoutGrid, 
  Layers, Plus, AlertCircle, 
  CheckCircle2, Smartphone, Type, Share2, MapPin, MessageSquare, Phone,
  CircleDashed, Film, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

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

export function PostModal({ open, onOpenChange, post, clientId, onSave, defaultDate }: any) {
  const { accounts } = useSocialAccounts(post?.client_id || clientId);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [postItems, setPostItems] = useState<PostItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('instagram');
  const [showAICaptionModal, setShowAICaptionModal] = useState(false);
  const [showUploadChoice, setShowUploadChoice] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const connectedAccounts = accounts.filter(a => a.is_connected);
  const currentPostItem = useMemo(() => postItems[activeIndex] || null, [postItems, activeIndex]);

  useEffect(() => {
    if (open) {
      if (post) {
        setSelectedAccountIds(connectedAccounts.filter(a => post.platforms.includes(a.platform)).map(a => a.id));
        setPostItems([{
          id: post.id,
          content: post.content || '',
          files: [],
          mediaUrls: post.media_urls || [],
          contentType: (post.content_type as ContentType) || 'feed',
          location: post.location || '',
          ctaType: (post.cta_type as any) || 'none',
          ctaValue: post.cta_value || '',
          scheduledAt: post.scheduled_at ? format(new Date(post.scheduled_at), 'yyyy-MM-dd') : (defaultDate || format(new Date(), 'yyyy-MM-dd')),
          scheduledTime: post.scheduled_at ? format(new Date(post.scheduled_at), 'HH:mm') : getDefaultTime(),
        }]);
      } else {
        setSelectedAccountIds([]);
        setPostItems([]);
      }
    }
  }, [post, open, defaultDate, connectedAccounts.length]);

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
        scheduledAt: defaultDate || format(new Date(), 'yyyy-MM-dd'),
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
        scheduledAt: defaultDate || format(new Date(), 'yyyy-MM-dd'),
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
        scheduledAt: defaultDate || format(new Date(), 'yyyy-MM-dd'),
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
          client_id: post?.client_id || clientId,
        };
        const savedPost = await onSave({ post: postData, silent: true });
        if (status !== 'draft' && savedPost?.id) {
          const { error: publishError } = await supabase.functions.invoke('social-publish', {
            body: { post_id: savedPost.id, publish_now: status === 'published' }
          });
          if (publishError) throw publishError;
        }
      }
      toast.success(status === 'draft' ? 'Rascunho salvo!' : (status === 'published' ? 'Publicado!' : 'Agendado!'));
      onOpenChange(false);
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col overflow-hidden">
          {isSaving && (
            <div className="absolute inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-bold">Finalizando Postagem...</p>
            </div>
          )}

          <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between shrink-0">
            <DialogTitle className="text-xl font-bold">
              {post ? 'Editar Publicação' : 'Nova Publicação'}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}><X className="h-5 w-5" /></Button>
          </div>

          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr,400px]">
            <div className="flex flex-col h-full bg-background">
              <ScrollArea className="flex-1">
                <div className="p-6 md:p-8 max-w-2xl mx-auto w-full space-y-10">
                  
                  {/* SEÇÃO 1: CANAIS (Sempre visível) */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">1</div>
                      <h3 className="font-bold uppercase tracking-wider text-xs">Canais de Destino</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {connectedAccounts.length === 0 ? (
                        <div className="col-span-full p-4 text-center border-2 border-dashed rounded-xl bg-muted/20">
                          <AlertCircle className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Nenhum canal conectado.</p>
                        </div>
                      ) : (
                        connectedAccounts.map(acc => (
                          <div 
                            key={acc.id} 
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer",
                              selectedAccountIds.includes(acc.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/20"
                            )}
                            onClick={() => {
                              setSelectedAccountIds(prev => 
                                prev.includes(acc.id) ? prev.filter(id => id !== acc.id) : [...prev, acc.id]
                              );
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <PlatformIcon platform={acc.platform as SocialPlatform} size="sm" variant="circle" />
                              <div className="min-w-0">
                                <p className="font-bold text-xs truncate">{acc.account_name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">@{acc.username}</p>
                              </div>
                            </div>
                            <Checkbox checked={selectedAccountIds.includes(acc.id)} onCheckedChange={() => {}} />
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  {/* SEÇÃO 2: MÍDIA (Abre após selecionar canal) */}
                  {selectedAccountIds.length > 0 && (
                    <section className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                      <Separator />
                      <div className="flex items-center gap-2 text-primary">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">2</div>
                        <h3 className="font-bold uppercase tracking-wider text-xs">Conteúdo Visual</h3>
                      </div>

                      {postItems.length === 0 ? (
                        <div 
                          className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-8 w-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                          <p className="text-sm font-medium">Carregar fotos ou vídeos</p>
                          <p className="text-xs text-muted-foreground mt-1">Clique para selecionar arquivos do seu dispositivo</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {postItems.flatMap(item => item.mediaUrls).map((url, i) => (
                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-border group shadow-sm">
                              <img src={url} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => {
                                  // Lógica simplificada para remover mídia
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
                            className="aspect-square rounded-xl border-2 border-dashed flex items-center justify-center hover:bg-muted/50 transition-colors"
                          >
                            <Plus className="h-6 w-6 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleFileSelection(e.target.files)} />
                    </section>
                  )}

                  {/* SEÇÃO 3: CONFIGURAÇÃO (Abre após carregar mídia) */}
                  {postItems.length > 0 && (
                    <section className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-primary">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">3</div>
                          <h3 className="font-bold uppercase tracking-wider text-xs">Detalhes da Postagem</h3>
                        </div>
                        {postItems.length > 1 && (
                          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                            {postItems.map((_, i) => (
                              <Button 
                                key={i} 
                                variant={activeIndex === i ? "default" : "ghost"} 
                                size="sm" 
                                className="h-6 w-6 p-0 text-[10px]" 
                                onClick={() => setActiveIndex(i)}
                              >
                                {i + 1}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>

                      {currentPostItem && (
                        <div className="space-y-6 bg-muted/5 p-4 rounded-2xl border border-border/50">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Legenda do Post</Label>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="gap-2 border-primary/30 text-primary hover:bg-primary/5 h-7 text-xs"
                                onClick={() => setShowAICaptionModal(true)}
                              >
                                <Sparkles className="h-3 w-3" /> Gerar com IA
                              </Button>
                            </div>
                            <Textarea 
                              value={currentPostItem.content} 
                              onChange={e => updatePostItem(currentPostItem.id, { content: e.target.value })}
                              placeholder="O que você quer dizer ao seu público?"
                              className="min-h-[120px] rounded-xl border-2 bg-background"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Tipo</Label>
                              <Select 
                                value={currentPostItem.contentType} 
                                onValueChange={(v: any) => updatePostItem(currentPostItem.id, { contentType: v })}
                              >
                                <SelectTrigger className="h-10 rounded-xl border-2 bg-background">
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
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Localização</Label>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input 
                                  value={currentPostItem.location} 
                                  onChange={e => updatePostItem(currentPostItem.id, { location: e.target.value })}
                                  placeholder="Onde foi isso?"
                                  className="h-10 pl-9 rounded-xl border-2 bg-background"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Chamada para Ação (CTA)</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <Select 
                                value={currentPostItem.ctaType} 
                                onValueChange={(v: any) => updatePostItem(currentPostItem.id, { ctaType: v })}
                              >
                                <SelectTrigger className="h-10 rounded-xl border-2 bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum</SelectItem>
                                  <SelectItem value="channel">Mensagem pelo Canal</SelectItem>
                                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                </SelectContent>
                              </Select>
                              {currentPostItem.ctaType === 'whatsapp' && (
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                  <Input 
                                    value={currentPostItem.ctaValue} 
                                    onChange={e => updatePostItem(currentPostItem.id, { ctaValue: e.target.value })}
                                    placeholder="Número com DDD"
                                    className="h-10 pl-9 rounded-xl border-2 bg-background"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Data</Label>
                              <Input 
                                type="date" 
                                value={currentPostItem.scheduledAt} 
                                onChange={e => updatePostItem(currentPostItem.id, { scheduledAt: e.target.value })} 
                                className="h-10 rounded-xl border-2 bg-background" 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Hora</Label>
                              <Input 
                                type="time" 
                                value={currentPostItem.scheduledTime} 
                                onChange={e => updatePostItem(currentPostItem.id, { scheduledTime: e.target.value })} 
                                className="h-10 rounded-xl border-2 bg-background" 
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </section>
                  )}
                </div>
              </ScrollArea>

              <div className="p-6 border-t bg-muted/5 flex items-center justify-between shrink-0">
                <div className="text-xs text-muted-foreground">
                  {postItems.length > 0 ? `${postItems.length} post(s) configurado(s)` : 'Aguardando configuração'}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => handleSaveAction('draft')} disabled={postItems.length === 0}>Salvar Rascunho</Button>
                  <Button variant="secondary" onClick={() => handleSaveAction('scheduled')} disabled={postItems.length === 0} className="gap-2">
                    <Calendar className="h-4 w-4" /> Agendar
                  </Button>
                  <Button onClick={() => handleSaveAction('published')} disabled={postItems.length === 0} className="gap-2 shadow-xl shadow-primary/20 px-8">
                    <Zap className="h-4 w-4" /> Publicar Agora
                  </Button>
                </div>
              </div>
            </div>

            {/* Preview Lateral */}
            <div className="hidden lg:flex flex-col bg-muted/10 border-l border-border overflow-hidden">
              <div className="p-4 border-b bg-background/50 flex items-center justify-between">
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
                          "p-1.5 rounded-md transition-all",
                          previewPlatform === p ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "opacity-30 hover:opacity-60"
                        )}
                      >
                        <PlatformIcon platform={p} size="xs" />
                      </button>
                    ))
                  ) : (
                    <div className="text-[10px] text-muted-foreground italic">Selecione um canal</div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
                <div className="w-full max-w-[300px]">
                  <div className="shadow-2xl rounded-[2.5rem] overflow-hidden border-8 border-black bg-black">
                    {currentPostItem ? (
                      <PostPreview
                        content={currentPostItem.content}
                        mediaUrl={currentPostItem.mediaUrls[0]}
                        platform={previewPlatform}
                      />
                    ) : (
                      <div className="aspect-[9/16] bg-muted flex items-center justify-center p-8 text-center">
                        <p className="text-xs text-muted-foreground">Configure o post para ver o preview</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
        clientId={post?.client_id || clientId}
        onCaptionGenerated={(c) => currentPostItem && updatePostItem(currentPostItem.id, { content: c })}
      />
    </>
  );
}