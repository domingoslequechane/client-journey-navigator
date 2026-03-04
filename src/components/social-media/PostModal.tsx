"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { format, addMinutes } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PostPreview } from './PostPreview';
import { PlatformIcon } from './PlatformIcon';
import { AICaptionModal } from './AICaptionModal';
import { type SocialPlatform, type ContentType, PLATFORM_CONFIG } from '@/lib/social-media-mock';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import type { SocialPostRow } from '@/hooks/useSocialPosts';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  Upload, Calendar, Clock, Loader2, X, 
  Image as ImageIcon, Zap, Sparkles, LayoutGrid, 
  Layers, Trash2, Plus, Copy, AlertCircle, 
  CheckCircle2, MessageCircle, ChevronRight, ChevronLeft,
  Smartphone, Type, Share2, MapPin, MessageSquare, Phone,
  CircleDashed, Film
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const getDefaultTime = () => format(addMinutes(new Date(), 15), 'HH:mm');

interface PostItem {
  id: string;
  content: string;
  files: File[]; // Arquivos brutos para upload posterior
  mediaUrls: string[]; // URLs locais (blob) para preview ou remotas (se editando)
  contentType: ContentType;
  location: string;
  ctaType: 'none' | 'channel' | 'whatsapp';
  ctaValue: string;
  scheduledAt: string;
  scheduledTime: string;
}

export function PostModal({ open, onOpenChange, post, clientId, onSave, defaultDate }: any) {
  const { accounts } = useSocialAccounts(post?.client_id || clientId);
  const [step, setStep] = useState(1);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [postItems, setPostItems] = useState<PostItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('instagram');
  const [uploading, setUploading] = useState(false);
  const [showAICaptionModal, setShowAICaptionModal] = useState(false);
  const [showUploadChoice, setShowUploadChoice] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const connectedAccounts = accounts.filter(a => a.is_connected);

  const currentPostItem = useMemo(() => postItems[activeIndex] || null, [postItems, activeIndex]);

  // Limpeza de URLs de objeto para evitar vazamento de memória
  useEffect(() => {
    return () => {
      postItems.forEach(item => {
        item.mediaUrls.forEach(url => {
          if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        });
      });
    };
  }, [postItems]);

  useEffect(() => {
    if (open) {
      setStep(1);
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
        setStep(3);
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
      const newItem: PostItem = {
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
      };
      setPostItems([newItem]);
      setStep(3);
    }
  };

  const handleUploadChoice = (choice: 'carousel' | 'separate') => {
    setShowUploadChoice(false);
    if (choice === 'carousel') {
      const localUrls = pendingFiles.map(f => URL.createObjectURL(f));
      const newItem: PostItem = {
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
      };
      setPostItems([newItem]);
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
    setStep(3);
    setPendingFiles([]);
  };

  const uploadFilesToLate = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    
    const uploadPromises = files.map(async (file) => {
      const { data: presignData, error: presignError } = await supabase.functions.invoke('social-media-presign', {
        body: { fileName: file.name, fileType: file.type }
      });
      if (presignError) throw presignError;

      await fetch(presignData.uploadUrl, { 
        method: 'PUT', 
        headers: { 'Content-Type': file.type }, 
        body: file 
      });
      
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
        // 1. Upload das mídias se houver arquivos novos (blob)
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

        // 2. Salvar no banco de dados
        const savedPost = await onSave({ post: postData, silent: true });

        // 3. Se não for rascunho, enviar para o Late.dev
        if (status !== 'draft' && savedPost?.id) {
          const { error: publishError } = await supabase.functions.invoke('social-publish', {
            body: { post_id: savedPost.id, publish_now: status === 'published' }
          });
          if (publishError) throw publishError;
        }
      }

      toast.success(status === 'draft' ? 'Rascunho salvo!' : (status === 'published' ? 'Publicado com sucesso!' : 'Agendado com sucesso!'));
      onOpenChange(false);
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error('Erro ao processar postagem: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updatePostItem = (id: string, updates: Partial<PostItem>) => {
    setPostItems(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const steps = [
    { id: 1, label: 'Canais', icon: Share2 },
    { id: 2, label: 'Mídia', icon: ImageIcon },
    { id: 3, label: 'Configuração', icon: Type },
  ];

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
              <p className="text-lg font-bold">Processando e Enviando...</p>
              <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos dependendo do tamanho das mídias.</p>
            </div>
          )}

          {/* Header com Stepper */}
          <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-8">
              <DialogTitle className="text-xl font-bold">
                {post ? 'Editar Post' : 'Novo Post'}
              </DialogTitle>
              
              <div className="hidden md:flex items-center gap-4">
                {steps.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                      step === s.id ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" : 
                      step > s.id ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {step > s.id ? <CheckCircle2 className="h-5 w-5" /> : s.id}
                    </div>
                    <span className={cn("text-sm font-medium", step === s.id ? "text-foreground" : "text-muted-foreground")}>
                      {s.label}
                    </span>
                    {i < steps.length - 1 && <div className="w-8 h-px bg-border mx-2" />}
                  </div>
                ))}
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}><X className="h-5 w-5" /></Button>
          </div>

          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr,400px]">
            {/* Área de Configuração */}
            <div className="flex flex-col h-full bg-background">
              <ScrollArea className="flex-1">
                <div className="p-8 max-w-2xl mx-auto w-full space-y-8">
                  
                  {/* PASSO 1: CANAIS */}
                  {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Onde vamos postar?</h2>
                        <p className="text-muted-foreground">Selecione os canais conectados para esta publicação.</p>
                      </div>

                      <div className="grid gap-3">
                        {connectedAccounts.length === 0 ? (
                          <div className="p-8 text-center border-2 border-dashed rounded-2xl">
                            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Nenhum canal conectado para este cliente.</p>
                          </div>
                        ) : (
                          connectedAccounts.map(acc => (
                            <div 
                              key={acc.id} 
                              className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer",
                                selectedAccountIds.includes(acc.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
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
                                  <p className="text-xs text-muted-foreground">@{acc.username}</p>
                                </div>
                              </div>
                              <Checkbox checked={selectedAccountIds.includes(acc.id)} onCheckedChange={() => {}} />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* PASSO 2: MÍDIA */}
                  {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Escolha suas mídias</h2>
                        <p className="text-muted-foreground">Adicione fotos ou vídeos para sua publicação.</p>
                      </div>

                      <div 
                        className="border-2 border-dashed border-border rounded-2xl p-12 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                          <Upload className="h-8 w-8 text-primary" />
                        </div>
                        <p className="font-medium">Clique para selecionar</p>
                        <p className="text-sm text-muted-foreground mt-1">As mídias serão carregadas localmente para preview.</p>
                      </div>
                      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleFileSelection(e.target.files)} />
                    </div>
                  )}

                  {/* PASSO 3: CONFIGURAÇÃO */}
                  {step === 3 && currentPostItem && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h2 className="text-2xl font-bold">Configuração do Post</h2>
                          <p className="text-muted-foreground">
                            {postItems.length > 1 ? `Post ${activeIndex + 1} de ${postItems.length}` : 'Ajuste os detalhes da sua publicação.'}
                          </p>
                        </div>
                        {postItems.length > 1 && (
                          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
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

                      <div className="space-y-6">
                        {/* Mídia Preview */}
                        <div className="grid grid-cols-4 gap-2">
                          {currentPostItem.mediaUrls.map((url, i) => (
                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-border group shadow-sm">
                              <img src={url} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => {
                                  const newUrls = currentPostItem.mediaUrls.filter((_, idx) => idx !== i);
                                  const newFiles = currentPostItem.files.filter((_, idx) => idx !== i);
                                  updatePostItem(currentPostItem.id, { mediaUrls: newUrls, files: newFiles });
                                }}
                                className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
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

                        {/* Legenda */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold">Legenda</Label>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-2 border-primary/30 text-primary hover:bg-primary/5 h-7 text-xs"
                              onClick={() => setShowAICaptionModal(true)}
                            >
                              <Sparkles className="h-3 w-3" />
                              Gerar com IA
                            </Button>
                          </div>
                          <Textarea 
                            value={currentPostItem.content} 
                            onChange={e => updatePostItem(currentPostItem.id, { content: e.target.value })}
                            placeholder="Escreva sua legenda aqui..."
                            className="min-h-[150px] rounded-xl border-2"
                          />
                        </div>

                        {/* Tipo de Conteúdo */}
                        <div className="space-y-3">
                          <Label className="text-sm font-bold">Tipo de Conteúdo</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { id: 'feed', label: 'Feed', icon: LayoutGrid },
                              { id: 'stories', label: 'Story', icon: CircleDashed },
                              { id: 'reels', label: 'Reel', icon: Film },
                              { id: 'carousel', label: 'Carrossel', icon: Layers },
                            ].map(type => (
                              <button
                                key={type.id}
                                onClick={() => updatePostItem(currentPostItem.id, { contentType: type.id as ContentType })}
                                className={cn(
                                  "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                                  currentPostItem.contentType === type.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                                )}
                              >
                                <type.icon className={cn("h-5 w-5", currentPostItem.contentType === type.id ? "text-primary" : "text-muted-foreground")} />
                                <span className="text-[10px] font-bold uppercase">{type.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Localização e CTA */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-bold flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" /> Localização
                            </Label>
                            <Input 
                              value={currentPostItem.location} 
                              onChange={e => updatePostItem(currentPostItem.id, { location: e.target.value })}
                              placeholder="Adicionar localização..."
                              className="h-10 rounded-xl border-2"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-bold flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-primary" /> Chamada para Ação (CTA)
                            </Label>
                            <Select 
                              value={currentPostItem.ctaType} 
                              onValueChange={(v: any) => updatePostItem(currentPostItem.id, { ctaType: v })}
                            >
                              <SelectTrigger className="h-10 rounded-xl border-2">
                                <SelectValue placeholder="Selecione um CTA" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                <SelectItem value="channel">Mensagem pelo Canal</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {currentPostItem.ctaType === 'whatsapp' && (
                          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label className="text-sm font-bold flex items-center gap-2">
                              <Phone className="h-4 w-4 text-primary" /> Número do WhatsApp
                            </Label>
                            <Input 
                              value={currentPostItem.ctaValue} 
                              onChange={e => updatePostItem(currentPostItem.id, { ctaValue: e.target.value })}
                              placeholder="Ex: +258 84 000 0000"
                              className="h-10 rounded-xl border-2"
                            />
                          </div>
                        )}

                        {/* Agendamento */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-bold flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" /> Data
                            </Label>
                            <Input 
                              type="date" 
                              value={currentPostItem.scheduledAt} 
                              onChange={e => updatePostItem(currentPostItem.id, { scheduledAt: e.target.value })} 
                              className="h-10 rounded-xl border-2" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-bold flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" /> Horário
                            </Label>
                            <Input 
                              type="time" 
                              value={currentPostItem.scheduledTime} 
                              onChange={e => updatePostItem(currentPostItem.id, { scheduledTime: e.target.value })} 
                              className="h-10 rounded-xl border-2" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Navegação do Wizard */}
              <div className="p-6 border-t bg-muted/5 flex items-center justify-between shrink-0">
                <Button 
                  variant="ghost" 
                  onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {step === 1 ? 'Cancelar' : 'Voltar'}
                </Button>

                <div className="flex gap-3">
                  {step < 3 ? (
                    <Button 
                      onClick={() => setStep(step + 1)} 
                      className="gap-2 px-8"
                      disabled={
                        (step === 1 && selectedAccountIds.length === 0) ||
                        (step === 2 && uploading)
                      }
                    >
                      Próximo Passo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => handleSaveAction('draft')}>Salvar Rascunho</Button>
                      <Button variant="secondary" onClick={() => handleSaveAction('scheduled')} className="gap-2">
                        <Calendar className="h-4 w-4" /> Agendar
                      </Button>
                      <Button onClick={() => handleSaveAction('published')} className="gap-2 shadow-xl shadow-primary/20 px-8">
                        <Zap className="h-4 w-4" />
                        Publicar Agora
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Preview Lateral (Desktop) */}
            <div className="hidden lg:flex flex-col bg-muted/10 border-l border-border overflow-hidden">
              <div className="p-4 border-b bg-background/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Visualização Real</span>
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
                    ['instagram', 'facebook', 'tiktok'].map(p => (
                      <button key={p} disabled className="opacity-10 p-1.5">
                        <PlatformIcon platform={p as any} size="xs" />
                      </button>
                    ))
                  )}
                </div>
              </div>
              
              <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
                <div className="w-full max-w-[320px] animate-in fade-in zoom-in-95 duration-500">
                  <div className="shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2.5rem] overflow-hidden border-8 border-black bg-black">
                    {currentPostItem ? (
                      <PostPreview
                        content={currentPostItem.content}
                        mediaUrl={currentPostItem.mediaUrls[0]}
                        platform={previewPlatform}
                      />
                    ) : (
                      <div className="aspect-[9/16] bg-muted flex items-center justify-center p-8 text-center">
                        <p className="text-xs text-muted-foreground">Selecione mídias para ver o preview</p>
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
        mediaUrls={currentPostItem?.mediaUrls || []}
        onCaptionGenerated={(c) => currentPostItem && updatePostItem(currentPostItem.id, { content: c })}
      />
    </>
  );
}