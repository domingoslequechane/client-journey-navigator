import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Video, Play, Sparkles, Image as ImageIcon, Download,
  ArrowLeft, History, Wand2, Loader2, RefreshCw, ChevronRight, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface VideoGeneratorStudioProps {
  projectId: string;
  onBackToHub: () => void;
}

interface GeneratedVideo {
  id: string;
  prompt: string;
  status: 'processing' | 'completed' | 'failed';
  video_url: string | null;
  aspect_ratio?: string;
  duration_seconds?: number;
  created_at: string;
}

export function VideoGeneratorStudio({ projectId, onBackToHub }: VideoGeneratorStudioProps) {
  const [project, setProject] = useState<any>(null);
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [duration, setDuration] = useState(8);
  const [firstFrameBase64, setFirstFrameBase64] = useState<string | null>(null);
  const [lastFrameBase64, setLastFrameBase64] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<GeneratedVideo | null>(null);
  const [extendingFrom, setExtendingFrom] = useState<GeneratedVideo | null>(null);
  const [isCapturingFrame, setIsCapturingFrame] = useState(false);
  const { user } = useAuth();
  
  const pollingInterval = useRef<any>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchProject();
    fetchVideos();
    
    pollingInterval.current = setInterval(() => {
      setVideos(currentVideos => {
        const hasProcessing = currentVideos.some(v => v.status === 'processing');
        if (hasProcessing) fetchVideos(false);
        return currentVideos;
      });
    }, 15000);

    return () => clearInterval(pollingInterval.current);
  }, [projectId]);

  const fetchProject = async () => {
    const { data } = await supabase.from('video_projects').select('*').eq('id', projectId).single();
    if (data) setProject(data);
  };

  const fetchVideos = async (showLoading = true) => {
    const { data } = await supabase
      .from('generated_videos')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (data) {
      setVideos(data);
      if (!previewVideo && data.length > 0 && data[0].status === 'completed') {
        if (showLoading) setPreviewVideo(data[0]);
      }
    }
  };

  // Capture last frame from video via canvas
  const captureLastFrame = useCallback(async (video: GeneratedVideo): Promise<string | null> => {
    if (!video.video_url) return null;
    
    return new Promise((resolve) => {
      const vid = document.createElement('video');
      vid.crossOrigin = 'anonymous';
      vid.src = video.video_url!;
      vid.preload = 'metadata';
      
      vid.onloadedmetadata = () => {
        vid.currentTime = Math.max(0, vid.duration - 0.1);
      };
      
      vid.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = vid.videoWidth || 1280;
          canvas.height = vid.videoHeight || 720;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          resolve(dataUrl);
        } catch {
          resolve(null);
        }
      };
      
      vid.onerror = () => resolve(null);
      
      // Timeout fallback
      setTimeout(() => resolve(null), 8000);
    });
  }, []);

  const handleExtendVideo = async (video: GeneratedVideo) => {
    setIsCapturingFrame(true);
    try {
      const lastFrame = await captureLastFrame(video);
      if (lastFrame) {
        setFirstFrameBase64(lastFrame);
        toast.success('Último frame capturado! Descreva o que acontece a seguir.');
      } else {
        // If canvas capture fails (CORS etc.), still enter extend mode without frame
        toast.info('A estender sem frame inicial (modo texto). Escreva o que acontece a seguir.');
      }
      setExtendingFrom(video);
      setAspectRatio((video.aspect_ratio as '16:9' | '9:16') || aspectRatio);
      setDuration(video.duration_seconds || duration);
      setLastFrameBase64(null);
      // Focus textarea
      setTimeout(() => {
        const ta = document.querySelector<HTMLTextAreaElement>('#prompt-textarea');
        ta?.focus();
      }, 100);
    } catch {
      toast.error('Erro ao capturar o frame. Tente escrever o prompt manualmente.');
    } finally {
      setIsCapturingFrame(false);
    }
  };

  const cancelExtend = () => {
    setExtendingFrom(null);
    setFirstFrameBase64(null);
    setLastFrameBase64(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'first' | 'last') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (target === 'first') setFirstFrameBase64(base64);
      else setLastFrameBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !firstFrameBase64) {
      toast.error('Insira um prompt de texto ou uma imagem inicial');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          project_id: projectId,
          organization_id: project.organization_id,
          prompt,
          aspect_ratio: aspectRatio,
          duration_seconds: duration,
          first_frame_base64: firstFrameBase64?.split(',')[1],
          first_frame_mime: firstFrameBase64?.substring(firstFrameBase64.indexOf(":")+1, firstFrameBase64.indexOf(";")),
          last_frame_base64: lastFrameBase64?.split(',')[1],
          last_frame_mime: lastFrameBase64?.substring(lastFrameBase64.indexOf(":")+1, lastFrameBase64.indexOf(";")),
          extend_from_video_id: extendingFrom?.id ?? null,
        }
      });

      if (error) throw error;
      if (data && data._error) throw new Error(data.message);
      
      toast.success(extendingFrom 
        ? 'Estendendo o vídeo! Pronto em alguns minutos.' 
        : 'Geração iniciada! O vídeo estará pronto em alguns minutos.'
      );
      setPrompt('');
      cancelExtend();
      fetchVideos(false);
      checkVideoStatus(data.video_id, data.operation_name);

    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar geração');
    } finally {
      setIsGenerating(false);
    }
  };

  const checkVideoStatus = async (videoId: string, operationName: string) => {
    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-video-status', {
          body: { video_id: videoId, operation_name: operationName }
        });
        
        if (error) { console.error("Polling error:", error); return; }

        if (data.status === 'completed' || data.status === 'failed') {
          fetchVideos(false);
          if (data.status === 'completed') toast.success('Novo vídeo gerado com sucesso!');
          if (data.status === 'failed') toast.error(`Falha ao gerar vídeo: ${data.error}`);
        } else {
          setTimeout(poll, 15000);
        }
      } catch (err) {
        console.error("Polling catch error:", err);
      }
    };
    setTimeout(poll, 15000);
  };

  const activeVideo = previewVideo || videos.find(v => v.status === 'completed');

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative">
      {/* ── Left Sidebar: History ── */}
      <div className="w-[300px] border-r bg-muted/10 flex flex-col h-full shrink-0">
        <div className="h-16 border-b flex items-center px-4 gap-3 bg-background">
          <Button variant="ghost" size="icon" onClick={onBackToHub} className="-ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 overflow-hidden">
            <h2 className="font-semibold truncate">{project?.name || 'Projeto sem nome'}</h2>
            <p className="text-xs text-muted-foreground truncate">Gerador de Vídeo AI</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Histório</h3>
            {videos.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-[10px]">{videos.length}</Badge>
            )}
          </div>

          {videos.length === 0 && (
            <div className="text-center py-10 opacity-50">
              <Video className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Nenhum vídeo ainda</p>
            </div>
          )}

          {videos.map(video => (
            <Card 
              key={video.id} 
              className={`overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 relative group ${previewVideo?.id === video.id ? 'ring-2 ring-primary bg-primary/5' : ''} ${extendingFrom?.id === video.id ? 'ring-2 ring-orange-500/70' : ''}`}
              onClick={() => video.status === 'completed' && setPreviewVideo(video)}
            >
              <div className="aspect-video bg-black/10 relative flex items-center justify-center">
                {video.status === 'processing' ? (
                  <div className="flex flex-col items-center gap-2">
                    <Sparkles className="h-5 w-5 animate-pulse text-primary" />
                    <span className="text-xs font-medium text-primary animate-pulse">Gerando...</span>
                  </div>
                ) : video.status === 'failed' ? (
                  <div className="text-destructive text-xs">Falhou</div>
                ) : (
                  <>
                    <video src={video.video_url || ''} className="w-full h-full object-cover" />
                    {/* Extend overlay on hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      <Button
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white text-xs gap-1.5 w-full"
                        onClick={(e) => { e.stopPropagation(); handleExtendVideo(video); }}
                        disabled={isCapturingFrame}
                      >
                        {isCapturingFrame ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
                        Estender
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs gap-1.5 w-full bg-white/10 hover:bg-white/20 text-white border-none"
                        onClick={(e) => { e.stopPropagation(); setPreviewVideo(video); }}
                      >
                        <Play className="h-3 w-3 fill-white" /> Ver
                      </Button>
                    </div>
                  </>
                )}
              </div>
              <div className="p-2 border-t text-xs">
                <p className="line-clamp-2 text-muted-foreground" title={video.prompt}>{video.prompt}</p>
                <p className="text-[10px] text-muted-foreground mt-1 opacity-50">
                  {formatDistanceToNow(new Date(video.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Main Area: Player & Controls ── */}
      <div className="flex-1 flex flex-col relative h-full min-w-0">
        {/* Player Viewport */}
        <div className="flex-1 min-h-0 bg-black/5 p-4 md:p-8 flex md:flex-row flex-col items-stretch justify-center relative shadow-inner overflow-hidden gap-6">
          <div className="flex-1 min-w-0 min-h-0 flex items-center justify-center relative">
            {activeVideo ? (
              <>
                <video 
                  ref={mainVideoRef}
                  src={activeVideo.video_url || ''} 
                  controls 
                  autoPlay 
                  loop 
                  className="w-full h-full object-cover rounded-lg shadow-xl"
                />
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <Button size="sm" variant="secondary" className="bg-black/50 text-white border-none hover:bg-black/80 backdrop-blur" onClick={() => window.open(activeVideo.video_url || '', '_blank')}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                </div>
              </>
            ) : (
              <div 
                 className={`bg-black rounded-lg overflow-hidden shadow-2xl relative transition-all duration-300 shrink-0 ${
                   aspectRatio === '9:16' 
                     ? 'h-full max-h-full aspect-[9/16]' 
                     : 'w-full max-w-4xl aspect-video max-h-full'
                 }`}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 bg-gradient-to-tr from-gray-900 to-gray-800">
                  <Wand2 className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium text-center px-4">O seu filme começa aqui</p>
                  <p className="text-sm opacity-70 text-center px-4 mt-2">Escreva um prompt abaixo ou forneça uma imagem para começar.</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Right Panel for Active Video Details */}
          {activeVideo && (
            <div className="w-full md:w-72 shrink-0 bg-background rounded-xl border shadow-xl p-5 flex flex-col gap-4 overflow-y-auto">
              <h3 className="font-semibold text-base border-b pb-2">Detalhes da Cena</h3>
              
              <div className="flex-1">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Prompt Utilizado</span>
                <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground bg-muted p-3 rounded-lg max-h-40 overflow-y-auto">
                  {activeVideo.prompt}
                </div>
              </div>

              {/* Extend Button */}
              <Button 
                className="w-full shrink-0 bg-orange-500 hover:bg-orange-600 text-white gap-2"
                onClick={() => handleExtendVideo(activeVideo)}
                disabled={isCapturingFrame || activeVideo.status !== 'completed'}
              >
                {isCapturingFrame 
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> A capturar frame...</>
                  : <><ChevronRight className="w-4 h-4" /> Estender este Vídeo</>
                }
              </Button>

              <Button 
                className="w-full shrink-0" 
                variant="outline" 
                onClick={() => {
                  setPrompt(activeVideo.prompt);
                  setAspectRatio((activeVideo.aspect_ratio as '16:9' | '9:16') || '16:9');
                  setDuration(activeVideo.duration_seconds || 8);
                  toast.success("Prompt carregado para o editor!");
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Reutilizar Prompt
              </Button>
            </div>
          )}
        </div>

        {/* Extend Mode Banner */}
        {extendingFrom && (
          <div className="bg-orange-500/10 border-t border-orange-500/30 px-4 py-2 flex items-center gap-3 shrink-0">
            <ChevronRight className="h-4 w-4 text-orange-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">Modo Estender — </span>
              <span className="text-xs text-orange-600/80 dark:text-orange-400/80 truncate">
                {firstFrameBase64 ? 'Último frame capturado ✓' : 'Frame não capturado (modo texto)'}. Descreva o que acontece a seguir.
              </span>
            </div>
            {firstFrameBase64 && (
              <img src={firstFrameBase64} className="h-8 w-14 rounded object-cover border border-orange-500/30 shrink-0" />
            )}
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-orange-500 hover:text-orange-700" onClick={cancelExtend}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Console / Prompt Editor Toolbar */}
        <div className="bg-background border-t p-4 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10 flex flex-col md:flex-row gap-4 items-end">
          
          {/* Keyframes Inputs — hidden in extend mode (frame already captured) */}
          {!extendingFrom && (
            <div className="flex gap-2">
              <div className="relative group">
                <input type="file" id="firstFrame" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'first')} />
                <div className={`h-16 w-24 rounded-md border flex items-center justify-center bg-muted overflow-hidden relative cursor-pointer hover:border-primary/50 transition-colors ${firstFrameBase64 ? 'border-primary/30' : 'border-dashed'}`} onClick={() => document.getElementById('firstFrame')?.click()}>
                  {firstFrameBase64 ? (
                    <>
                      <img src={firstFrameBase64} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-white text-center py-0.5">Inicial</div>
                    </>
                  ) : (
                    <div className="text-center p-1">
                      <ImageIcon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Start Frame</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative group">
                <input type="file" id="lastFrame" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'last')} disabled={!firstFrameBase64}/>
                <div className={`h-16 w-24 rounded-md border flex items-center justify-center bg-muted overflow-hidden relative ${lastFrameBase64 ? 'border-primary/30 cursor-pointer hover:border-primary/50' : firstFrameBase64 ? 'border-dashed cursor-pointer hover:border-primary/50' : 'opacity-50 cursor-not-allowed'}`} onClick={() => firstFrameBase64 && document.getElementById('lastFrame')?.click()}>
                  {lastFrameBase64 ? (
                    <>
                      <img src={lastFrameBase64} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-white text-center py-0.5">Final</div>
                    </>
                  ) : (
                    <div className="text-center p-1">
                      <ImageIcon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">End Frame</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Extend mode: show captured frame thumbnail */}
          {extendingFrom && firstFrameBase64 && (
            <div className="relative shrink-0">
              <div className="h-16 w-24 rounded-md border border-orange-500/40 overflow-hidden relative">
                <img src={firstFrameBase64} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-orange-500/80 text-[9px] text-white text-center py-0.5 font-semibold">CONT.</div>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col gap-2 w-full">
             <div className="flex items-center gap-4 px-1">
                <div className="flex items-center gap-1.5 flex-1">
                   <div className="flex gap-1 border rounded-md p-0.5 bg-muted/30">
                      <Button variant={aspectRatio === '16:9' ? 'secondary' : 'ghost'} size="sm" className="h-6 px-2 text-xs" onClick={() => setAspectRatio('16:9')}>16:9</Button>
                      <Button variant={aspectRatio === '9:16' ? 'secondary' : 'ghost'} size="sm" className="h-6 px-2 text-xs" onClick={() => setAspectRatio('9:16')}>9:16</Button>
                   </div>
                   
                   <div className="flex gap-1 border rounded-md p-0.5 bg-muted/30 ml-2">
                      <Button variant={duration === 4 ? 'secondary' : 'ghost'} size="sm" className="h-6 px-2 text-xs" onClick={() => setDuration(4)}>4s</Button>
                      <Button variant={duration === 8 ? 'secondary' : 'ghost'} size="sm" className="h-6 px-2 text-xs" onClick={() => setDuration(8)}>8s</Button>
                   </div>

                   <Badge variant="outline" className="ml-auto font-mono text-[10px] bg-indigo-500/10 text-indigo-500 border-indigo-500/20">Veo 3.1 Pro</Badge>
                </div>
             </div>

             <div className="relative">
               <Textarea 
                 id="prompt-textarea"
                 placeholder={extendingFrom 
                   ? "Descreva o que acontece a seguir neste vídeo..." 
                   : "Descreva a ação cinematográfica. Ex: A câmera sobrevoa lentamente um vale místico coberto de nevoeiro enquanto o sol nasce..."
                 }
                 className={`resize-none h-16 pr-28 text-sm transition-colors ${extendingFrom ? 'border-orange-500/40 focus-visible:ring-orange-500/20' : ''}`}
                 value={prompt}
                 onChange={e => setPrompt(e.target.value)}
                 onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isGenerating) handleGenerate();
                  }
                 }}
               />
               <Button 
                size="sm" 
                className={`absolute bottom-2 right-2 rounded-full px-5 ${extendingFrom ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                onClick={handleGenerate}
                disabled={isGenerating || (!prompt.trim() && !firstFrameBase64)}
               >
                 {isGenerating 
                   ? <Loader2 className="h-4 w-4 animate-spin" />
                   : extendingFrom 
                     ? <><ChevronRight className="h-4 w-4 mr-1" />Estender</>
                     : <><Sparkles className="h-4 w-4 mr-1" />Gerar</>
                 }
               </Button>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
