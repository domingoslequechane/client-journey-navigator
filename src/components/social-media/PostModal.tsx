"use client";

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
  Smartphone, Type, Share2
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const PLATFORM_LIMITS: Record<string, number> = {
  instagram: 10, facebook: 10, twitter: 4, linkedin: 20, tiktok: 35,
};

const getDefaultTime = () => format(addMinutes(new Date(), 15), 'HH:mm');

interface Placement { accountId: string; format: ContentType; }
interface ScheduleEntry { id: string; date: string; time: string; placements: Placement[]; }
interface PostData { id: string; content: string; mediaUrls: string[]; schedules: ScheduleEntry[]; isGeneratingCaption?: boolean; }
interface ProcessingResult { id: string; title: string; platform: SocialPlatform; format: ContentType; status: 'success' | 'error'; error?: string; }

export function PostModal({ open, onOpenChange, post, clientId, onSave, defaultDate, isPublished }: any) {
  const { accounts } = useSocialAccounts(post?.client_id || clientId);
  const [step, setStep] = useState(1);
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
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const connectedAccounts = accounts.filter(a => a.is_connected);

  const currentPost = useMemo(() => posts[activeIndex] || { id: 'temp', content: '', mediaUrls: [], schedules: [] }, [posts, activeIndex]);

  useEffect(() => {
    if (open) {
      setStep(1);
      if (post) {
        const content = post.content || '';
        const mediaUrls = post.media_urls || [];
        const postPlatforms = post.platforms || [];
        const ct = (post.content_type as ContentType) || 'feed';
        const initialPlacements: Placement[] = [];
        
        postPlatforms.forEach(p => {
          const acc = connectedAccounts.find(a => a.platform === p);
          if (acc) initialPlacements.push({ accountId: acc.id, format: ct });
        });

        let date = defaultDate || format(new Date(), 'yyyy-MM-dd');
        let time = getDefaultTime();
        if (post.scheduled_at) {
          const dt = new Date(post.scheduled_at);
          date = format(dt, 'yyyy-MM-dd');
          time = format(dt, 'HH:mm');
        }

        setPosts([{
          id: post.id, content, mediaUrls,
          schedules: [{ id: crypto.randomUUID(), date, time, placements: initialPlacements }]
        }]);
        setPreviewPlatform(postPlatforms[0] as SocialPlatform || 'instagram');
      } else {
        setPosts([{
          id: crypto.randomUUID(), content: '', mediaUrls: [],
          schedules: [{ id: crypto.randomUUID(), date: defaultDate || format(new Date(), 'yyyy-MM-dd'), time: getDefaultTime(), placements: [] }]
        }]);
      }
    }
  }, [post, open, defaultDate, connectedAccounts.length]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const { data: presignData } = await supabase.functions.invoke('social-media-presign', {
          body: { fileName: file.name, fileType: file.type }
        });
        await fetch(presignData.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        setUploadProgress(prev => prev + (100 / files.length));
        return presignData.publicUrl;
      });
      const newUrls = await Promise.all(uploadPromises);
      if (newUrls.length > 1) { setPendingFiles(newUrls); setShowUploadChoice(true); }
      else { updateCurrentPost({ mediaUrls: [...currentPost.mediaUrls, ...newUrls] }); }
    } catch (err) { toast.error('Erro ao carregar arquivos.'); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  const handleSaveAction = async (status: string) => {
    setIsSaving(true);
    setResults([]);
    let totalItems = 0;
    posts.forEach(p => p.schedules.forEach(s => totalItems += s.placements.length));
    setSavingProgress({ current: 0, total: totalItems });

    try {
      for (let pIdx = 0; pIdx < posts.length; pIdx++) {
        const postData = posts[pIdx];
        for (const schedule of postData.schedules) {
          for (const placement of schedule.placements) {
            const account = connectedAccounts.find(a => a.id === placement.accountId);
            if (!account) continue;
            const [year, month, day] = schedule.date.split('-').map(Number);
            const [hours, minutes] = schedule.time.split(':').map(Number);
            const scheduledAt = new Date(year, month - 1, day, hours, minutes).toISOString();

            try {
              await onSave({ post: {
                content: postData.content, platforms: [account.platform],
                content_type: placement.format, media_urls: postData.mediaUrls,
                status: status === 'published' ? 'published' : status,
                scheduled_at: status === 'published' ? new Date().toISOString() : scheduledAt,
                client_id: post?.client_id || clientId,
              }, silent: true });
              setResults(prev => [...prev, { id: crypto.randomUUID(), title: `Post ${pIdx + 1}`, platform: account.platform as SocialPlatform, format: placement.format, status: 'success' }]);
            } catch (err: any) {
              setResults(prev => [...prev, { id: crypto.randomUUID(), title: `Post ${pIdx + 1}`, platform: account.platform as SocialPlatform, format: placement.format, status: 'error', error: err.message }]);
            }
            setSavingProgress(prev => ({ ...prev, current: prev.current + 1 }));
          }
        }
      }
      setShowReportModal(true);
    } finally { setIsSaving(false); }
  };

  const updateCurrentPost = (updates: Partial<PostData>) => setPosts(prev => prev.map((p, i) => i === activeIndex ? { ...p, ...updates } : p));

  const steps = [
    { id: 1, label: 'Mídia', icon: ImageIcon },
    { id: 2, label: 'Legenda', icon: Type },
    { id: 3, label: 'Canais', icon: Share2 },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col overflow-hidden">
          {isSaving && (
            <div className="absolute inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-bold">Publicando...</p>
              <p className="text-sm text-muted-foreground">{savingProgress.current} de {savingProgress.total}</p>
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

            <div className="flex items-center gap-2">
              {posts.length > 1 && (
                <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
                  {posts.map((_, i) => (
                    <Button key={i} variant={activeIndex === i ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setActiveIndex(i)}>
                      {i + 1}
                    </Button>
                  ))}
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}><X className="h-5 w-5" /></Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr,400px]">
            {/* Área de Configuração */}
            <div className="flex flex-col h-full bg-background">
              <ScrollArea className="flex-1">
                <div className="p-8 max-w-2xl mx-auto w-full space-y-8">
                  
                  {/* PASSO 1: MÍDIA */}
                  {step === 1 && (
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
                        <p className="font-medium">Clique para carregar</p>
                        <p className="text-sm text-muted-foreground mt-1">Arraste arquivos ou clique aqui</p>
                        {uploading && (
                          <div className="mt-6 max-w-xs mx-auto space-y-2">
                            <Progress value={uploadProgress} className="h-1.5" />
                            <p className="text-xs text-primary font-bold animate-pulse">CARREGANDO...</p>
                          </div>
                        )}
                      </div>
                      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleFileUpload(e.target.files)} />

                      {currentPost.mediaUrls.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {currentPost.mediaUrls.map((url, i) => (
                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-border group shadow-sm">
                              <img src={url} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => updateCurrentPost({ mediaUrls: currentPost.mediaUrls.filter((_, idx) => idx !== i) })}
                                className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PASSO 2: LEGENDA */}
                  {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h2 className="text-2xl font-bold">O que vamos dizer?</h2>
                          <p className="text-muted-foreground">Escreva uma legenda envolvente para seu público.</p>
                        </div>
                        <Button 
                          variant="outline" 
                          className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
                          onClick={() => setShowAICaptionModal(true)}
                        >
                          <Sparkles className="h-4 w-4" />
                          Gerar com IA
                        </Button>
                      </div>

                      <div className="relative">
                        <Textarea 
                          value={currentPost.content} 
                          onChange={e => updateCurrentPost({ content: e.target.value })}
                          placeholder="Escreva aqui sua legenda... Use #hashtags para aumentar o alcance."
                          className="min-h-[300px] text-lg p-6 rounded-2xl border-2 focus-visible:ring-primary/20 resize-none"
                        />
                        <div className="absolute bottom-4 right-4 text-xs text-muted-foreground font-mono">
                          {currentPost.content.length} caracteres
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PASSO 3: CANAIS E AGENDAMENTO */}
                  {step === 3 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-bold">Onde e quando?</h2>
                        <p className="text-muted-foreground">Selecione as redes sociais e o horário da publicação.</p>
                      </div>

                      {currentPost.schedules.map((schedule) => (
                        <div key={schedule.id} className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data</Label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                <Input type="date" value={schedule.date} onChange={e => updateCurrentPost({ schedules: currentPost.schedules.map(s => s.id === schedule.id ? { ...s, date: e.target.value } : s) })} className="pl-10 h-12 rounded-xl border-2" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Horário</Label>
                              <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                <Input type="time" value={schedule.time} onChange={e => updateCurrentPost({ schedules: currentPost.schedules.map(s => s.id === schedule.id ? { ...s, time: e.target.value } : s) })} className="pl-10 h-12 rounded-xl border-2" />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selecione os Canais</Label>
                            <div className="grid gap-3">
                              {connectedAccounts.map(acc => (
                                <div key={acc.id} className="flex items-center justify-between p-4 rounded-2xl border-2 bg-muted/5 hover:bg-muted/10 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <PlatformIcon platform={acc.platform as SocialPlatform} size="md" variant="circle" />
                                    <div>
                                      <p className="font-bold text-sm">{acc.account_name}</p>
                                      <p className="text-xs text-muted-foreground">@{acc.username}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    {['feed', 'stories', 'reels'].map(fmt => {
                                      const isSelected = schedule.placements.some(p => p.accountId === acc.id && p.format === fmt);
                                      return (
                                        <TooltipProvider key={fmt}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={() => togglePlacementInSchedule(schedule.id, acc.id, fmt as ContentType)}
                                                className={cn(
                                                  "h-10 w-10 rounded-xl border-2 flex items-center justify-center transition-all",
                                                  isSelected ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-background border-border text-muted-foreground hover:border-primary/50"
                                                )}
                                              >
                                                {fmt === 'feed' && <LayoutGrid className="h-4 w-4" />}
                                                {fmt === 'stories' && <CircleDashed className="h-4 w-4" />}
                                                {fmt === 'reels' && <Film className="h-4 w-4" />}
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent className="capitalize">{fmt}</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
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
                      disabled={step === 1 && currentPost.mediaUrls.length === 0}
                    >
                      Próximo Passo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => handleSaveAction('draft')}>Salvar Rascunho</Button>
                      <Button onClick={() => handleSaveAction('scheduled')} className="gap-2 shadow-xl shadow-primary/20 px-8">
                        <Zap className="h-4 w-4" />
                        Finalizar e Agendar
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
                  {['instagram', 'facebook', 'tiktok'].map(p => (
                    <button 
                      key={p} 
                      onClick={() => setPreviewPlatform(p as SocialPlatform)}
                      className={cn(
                        "p-1.5 rounded-md transition-all",
                        previewPlatform === p ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "opacity-30 hover:opacity-60"
                      )}
                    >
                      <PlatformIcon platform={p as SocialPlatform} size="xs" />
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
                <div className="w-full max-w-[320px] animate-in fade-in zoom-in-95 duration-500">
                  <div className="shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2.5rem] overflow-hidden border-8 border-black bg-black">
                    <PostPreview
                      content={currentPost.content}
                      mediaUrl={currentPost.mediaUrls[0]}
                      platform={previewPlatform}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modais Auxiliares */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Publicações Processadas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {results.map((r, i) => (
              <div key={i} className="p-4 rounded-xl border bg-muted/30 flex items-center gap-4">
                <PlatformIcon platform={r.platform} size="sm" variant="circle" />
                <div className="flex-1">
                  <p className="text-sm font-bold">{r.title}</p>
                  <Badge variant={r.status === 'success' ? 'default' : 'destructive'} className="text-[10px] mt-1">
                    {r.status === 'success' ? 'Sucesso' : 'Erro'}
                  </Badge>
                </div>
                {r.status === 'error' && (
                  <Button variant="ghost" size="icon" onClick={() => window.open(`https://wa.me/258868499221?text=Erro: ${r.error}`)}>
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button onClick={() => { setShowReportModal(false); onOpenChange(false); }} className="w-full">Concluir</Button>
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
        onCaptionGenerated={(c) => updateCurrentPost({ content: c })}
      />
    </>
  );
}