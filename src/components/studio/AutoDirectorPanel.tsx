import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Wand2, ChevronRight, Loader2, Check, Pencil, X, Play, Pause,
  SkipForward, RotateCcw, Sparkles, Film, AlertCircle, RefreshCw,
  ChevronLeft, Clapperboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Scene {
  scene_number: number;
  title: string;
  prompt: string;
  duration_seconds: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  video_url?: string | null;
  video_id?: string;
  operation_name?: string;
}

interface AutoDirectorPanelProps {
  projectId: string;
  organizationId: string;
  onBack: () => void;
}

type Step = 'script' | 'review' | 'generating' | 'player';

const STYLES = [
  { label: 'Cinematográfico', value: 'cinematic, film noir, dramatic lighting, 4K' },
  { label: 'Documental', value: 'documentary, natural lighting, realistic, handheld camera' },
  { label: 'Publicitário', value: 'commercial, clean, bright, professional advertising' },
  { label: 'Drama', value: 'dramatic, emotional, intimate, close-ups, soft lighting' },
  { label: 'Acção', value: 'action, dynamic, fast cuts, motion blur, high energy' },
  { label: 'Fantasia', value: 'fantasy, magical, dreamlike, vibrant colors, epic scale' },
];

export function AutoDirectorPanel({ projectId, organizationId, onBack }: AutoDirectorPanelProps) {
  const [step, setStep] = useState<Step>('script');
  const [script, setScript] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [durationPerScene, setDurationPerScene] = useState(8);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].value);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [currentGenerating, setCurrentGenerating] = useState(0);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [isPlayerPlaying, setIsPlayerPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scenesRef = useRef<Scene[]>([]);

  scenesRef.current = scenes;

  const completedScenes = scenes.filter(s => s.status === 'completed');
  const totalScenes = scenes.length;
  const completedCount = scenes.filter(s => s.status === 'completed' || s.status === 'failed').length;
  const progress = totalScenes > 0 ? (completedCount / totalScenes) * 100 : 0;

  // ── Step 1: Decompose script ──────────────────────────────────────────
  const handleDecompose = async () => {
    if (!script.trim()) {
      toast.error('Por favor, insira o roteiro ou história');
      return;
    }
    setIsDecomposing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/decompose-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ script, aspect_ratio: aspectRatio, duration_per_scene: durationPerScene, style: selectedStyle }),
      });

      const data = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro desconhecido do servidor');
      }

      const scenesWithStatus: Scene[] = data.scenes.map((s: any) => ({
        ...s,
        status: 'pending',
      }));
      setScenes(scenesWithStatus);
      setStep('review');
    } catch (err: any) {
      toast.error('Erro ao analisar roteiro: ' + err.message);
    } finally {
      setIsDecomposing(false);
    }
  };

  // ── Step 2 → 3: Generate all scenes sequentially ─────────────────────
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const generateSceneWithRetry = async (scene: Scene, index: number, maxRetries = 3): Promise<{ video_id: string; operation_name: string }> => {
    let lastError: any;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        const backoff = attempt * 45000; // 45s, 90s
        toast.info(`Cena ${index + 1}: Aguardando ${backoff / 1000}s antes de tentar novamente...`);
        await sleep(backoff);
      }
      try {
        const { data, error } = await supabase.functions.invoke('generate-video', {
          body: {
            project_id: projectId,
            organization_id: organizationId,
            prompt: scene.prompt,
            aspect_ratio: aspectRatio,
            duration_seconds: scene.duration_seconds,
          },
        });

        if (error) throw error;
        if (data?._error) {
          const msg = data.message || '';
          // 429 quota error - retry
          if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
            throw new Error('QUOTA_EXCEEDED');
          }
          throw new Error(msg || 'Erro desconhecido na geração');
        }
        return { video_id: data.video_id, operation_name: data.operation_name };
      } catch (err: any) {
        lastError = err;
        if (err.message !== 'QUOTA_EXCEEDED') break; // Don't retry non-quota errors
      }
    }
    throw lastError;
  };

  const handleGenerateAll = async () => {
    setStep('generating');
    setCurrentGenerating(0);

    const updated = [...scenesRef.current];

    for (let i = 0; i < updated.length; i++) {
      setCurrentGenerating(i);
      updated[i] = { ...updated[i], status: 'processing' };
      setScenes([...updated]);

      // Add delay between scenes (except the first) to respect Veo rate limits
      if (i > 0) {
        await sleep(30000); // 30s between scene requests
      }

      try {
        const { video_id, operation_name } = await generateSceneWithRetry(updated[i], i);

        updated[i] = { ...updated[i], video_id, operation_name };
        setScenes([...updated]);

        // Poll until this scene is done
        const result = await pollUntilDone(video_id, operation_name);
        updated[i] = { ...updated[i], status: result.status as any, video_url: result.video_url };
        setScenes([...updated]);

        if (result.status === 'completed') {
          toast.success(`✓ Cena ${i + 1} de ${updated.length} concluída!`);
        }
      } catch (err: any) {
        updated[i] = { ...updated[i], status: 'failed' };
        setScenes([...updated]);
        const msg = err.message === 'QUOTA_EXCEEDED'
          ? `Cena ${i + 1}: Limite da API Veo atingido. Tenta com menos cenas.`
          : `Cena ${i + 1} falhou: ${err.message}`;
        toast.error(msg);
      }
    }

    setStep('player');
    setPlayerIndex(0);
    const succeeded = updated.filter(s => s.status === 'completed').length;
    if (succeeded > 0) {
      toast.success(`🎬 Filme pronto! ${succeeded}/${updated.length} cenas geradas.`);
    } else {
      toast.error('Nenhuma cena foi gerada. Verifica a quota da API Veo no Google AI Studio.');
    }
  };

  const pollUntilDone = (videoId: string, operationName: string): Promise<{ status: string; video_url: string | null }> => {
    return new Promise((resolve) => {
      const check = async () => {
        try {
          const { data } = await supabase.functions.invoke('check-video-status', {
            body: { video_id: videoId, operation_name: operationName },
          });
          if (data?.status === 'completed' || data?.status === 'failed') {
            resolve({ status: data.status, video_url: data.video_url ?? null });
          } else {
            setTimeout(check, 20000);
          }
        } catch {
          setTimeout(check, 25000);
        }
      };
      setTimeout(check, 20000);
    });
  };

  // ── Player controls ───────────────────────────────────────────────────
  const handleVideoEnded = useCallback(() => {
    const next = playerIndex + 1;
    if (next < completedScenes.length) {
      setPlayerIndex(next);
    } else {
      setPlayerIndex(0); // loop back to start
    }
  }, [playerIndex, completedScenes.length]);

  useEffect(() => {
    if (step === 'player' && videoRef.current && completedScenes[playerIndex]) {
      videoRef.current.load();
      if (isPlayerPlaying) videoRef.current.play().catch(() => {});
    }
  }, [playerIndex, step]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlayerPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
    setIsPlayerPlaying(!isPlayerPlaying);
  };

  const skipNext = () => {
    const next = (playerIndex + 1) % completedScenes.length;
    setPlayerIndex(next);
  };

  const skipPrev = () => {
    const prev = (playerIndex - 1 + completedScenes.length) % completedScenes.length;
    setPlayerIndex(prev);
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────

  // Step 1: Script input
  if (step === 'script') {
    return (
      <div className="h-full flex flex-col bg-background overflow-y-auto">
        {/* Header */}
        <div className="h-16 border-b flex items-center px-6 gap-3 shrink-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-lg">Auto-Diretor</h1>
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">BETA</Badge>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-start p-6 md:p-10 max-w-3xl mx-auto w-full gap-8">
          {/* Intro */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center mx-auto shadow-xl">
              <Wand2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Cole o seu Roteiro</h2>
            <p className="text-muted-foreground max-w-md">
              A IA vai dividir automaticamente em cenas cinematográficas, gerar cada vídeo e montar o filme sequencialmente.
            </p>
          </div>

          {/* Script area */}
          <div className="w-full space-y-2">
            <label className="text-sm font-medium">Roteiro ou História</label>
            <Textarea
              value={script}
              onChange={e => setScript(e.target.value)}
              placeholder="Cole aqui o seu roteiro, história ou argumento completo. Pode ser em português ou inglês.

Exemplo:
'A história começa numa manhã fria em Lisboa. João acorda e olha pela janela, vendo a cidade coberta de nevoeiro. Ele desce as escadas apressado, pega no casaco e sai para a rua. As ruas estão vazias enquanto ele caminha em direcção ao café habitual. O barista sorri e começa a preparar o café sem que João precise de pedir...'
"
              className="min-h-[200px] resize-none text-sm leading-relaxed"
            />
            <p className="text-xs text-muted-foreground text-right">{script.trim().split(/\s+/).filter(Boolean).length} palavras</p>
          </div>

          {/* Settings */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Aspect ratio */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Formato</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAspectRatio('16:9')}
                  className={cn('flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors', aspectRatio === '16:9' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50')}
                >
                  16:9
                </button>
                <button
                  onClick={() => setAspectRatio('9:16')}
                  className={cn('flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors', aspectRatio === '9:16' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50')}
                >
                  9:16
                </button>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Duração por Cena</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDurationPerScene(4)}
                  className={cn('flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors', durationPerScene === 4 ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50')}
                >
                  4s
                </button>
                <button
                  onClick={() => setDurationPerScene(8)}
                  className={cn('flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors', durationPerScene === 8 ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50')}
                >
                  8s
                </button>
              </div>
            </div>

            {/* Style */}
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-medium">Estilo Visual</label>
              <select
                value={selectedStyle}
                onChange={e => setSelectedStyle(e.target.value)}
                className="w-full h-[42px] border border-border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {STYLES.map(s => (
                  <option key={s.label} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CTA */}
          <Button
            size="lg"
            className="w-full max-w-md h-14 text-base gap-3 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white shadow-xl"
            onClick={handleDecompose}
            disabled={isDecomposing || !script.trim()}
          >
            {isDecomposing ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> A analisar roteiro...</>
            ) : (
              <><Sparkles className="h-5 w-5" /> Analisar & Criar Cenas</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: Scene review
  if (step === 'review') {
    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b flex items-center px-6 gap-3 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setStep('script')} className="-ml-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">Revisão das Cenas</h1>
            <p className="text-xs text-muted-foreground">{scenes.length} cenas · {scenes.reduce((a, s) => a + s.duration_seconds, 0)}s de vídeo total</p>
          </div>
          <Button
            className="gap-2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
            onClick={handleGenerateAll}
          >
            <Film className="h-4 w-4" /> Gerar Filme
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Reveja e edite os prompts de cada cena antes de gerar. Clique no ✏️ para editar.
          </p>

          <div className="space-y-3">
            {scenes.map((scene, i) => (
              <div key={i} className="border rounded-xl p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">{scene.title}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px]">{scene.duration_seconds}s</Badge>
                        <button
                          className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => { setEditingIndex(i); setEditValue(scene.prompt); }}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {editingIndex === i ? (
                      <div className="space-y-2 mt-2">
                        <Textarea
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="text-xs resize-none min-h-[80px]"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => {
                            const updated = [...scenes];
                            updated[i] = { ...updated[i], prompt: editValue };
                            setScenes(updated);
                            setEditingIndex(null);
                          }}>
                            <Check className="h-3 w-3" /> Guardar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingIndex(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{scene.prompt}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Generating progress
  if (step === 'generating') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background p-8 gap-8">
        <div className="w-full max-w-lg space-y-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center mx-auto shadow-xl animate-pulse">
            <Film className="h-10 w-10 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">A Criar o Filme...</h2>
            <p className="text-muted-foreground mt-1">
              Cena {currentGenerating + 1} de {totalScenes} · Cada cena demora ~2 min
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-purple-600 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Scene list */}
          <div className="w-full space-y-2 text-left">
            {scenes.map((scene, i) => (
              <div key={i} className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-all',
                scene.status === 'completed' ? 'border-green-500/30 bg-green-500/5' :
                scene.status === 'processing' ? 'border-orange-500/30 bg-orange-500/5' :
                scene.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
                'border-border bg-muted/20 opacity-50'
              )}>
                <div className="shrink-0">
                  {scene.status === 'completed' && <Check className="h-4 w-4 text-green-500" />}
                  {scene.status === 'processing' && <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />}
                  {scene.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  {scene.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{scene.title}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {scene.status === 'completed' ? '✓ Pronto' :
                   scene.status === 'processing' ? 'A gerar...' :
                   scene.status === 'failed' ? '✗ Falhou' : 'Aguarda'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Sequential Player
  if (step === 'player') {
    const currentScene = completedScenes[playerIndex];

    return (
      <div className="h-full flex flex-col bg-black overflow-hidden">
        {/* Video area */}
        <div className="flex-1 relative min-h-0">
          {currentScene ? (
            <video
              ref={videoRef}
              src={currentScene.video_url || ''}
              className="w-full h-full object-cover"
              autoPlay={isPlayerPlaying}
              onEnded={handleVideoEnded}
              onPlay={() => setIsPlayerPlaying(true)}
              onPause={() => setIsPlayerPlaying(false)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30">
              <AlertCircle className="h-12 w-12" />
            </div>
          )}

          {/* Overlay: scene info */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="bg-black/60 backdrop-blur rounded-full px-3 py-1.5 text-white text-xs font-medium">
              Cena {playerIndex + 1} / {completedScenes.length}
            </div>
            {currentScene && (
              <div className="bg-black/60 backdrop-blur rounded-full px-3 py-1.5 text-white text-xs">
                {currentScene.title}
              </div>
            )}
          </div>

          {/* Failed scenes warning */}
          {scenes.some(s => s.status === 'failed') && (
            <div className="absolute top-4 right-4 bg-red-500/80 backdrop-blur rounded-full px-3 py-1.5 text-white text-xs">
              {scenes.filter(s => s.status === 'failed').length} cena(s) falharam
            </div>
          )}

          {/* Scene thumbnails strip */}
          <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center gap-2 px-4">
            {completedScenes.map((_, i) => (
              <button
                key={i}
                onClick={() => setPlayerIndex(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === playerIndex ? 'bg-white w-8' : 'bg-white/40 hover:bg-white/60 w-4'
                )}
              />
            ))}
          </div>
        </div>

        {/* Controls bar */}
        <div className="bg-black border-t border-white/10 px-6 py-4 flex items-center gap-4 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={onBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2 mx-auto">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-10 w-10"
              onClick={skipPrev}
              disabled={completedScenes.length <= 1}
            >
              <SkipForward className="h-5 w-5 rotate-180" />
            </Button>

            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-white text-black hover:bg-white/90 shadow-xl"
              onClick={togglePlay}
            >
              {isPlayerPlaying ? <Pause className="h-5 w-5 fill-black" /> : <Play className="h-5 w-5 fill-black ml-0.5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-10 w-10"
              onClick={skipNext}
              disabled={completedScenes.length <= 1}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white hover:bg-white/10 gap-2"
            onClick={() => setStep('script')}
          >
            <RotateCcw className="h-4 w-4" />
            Novo Filme
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
