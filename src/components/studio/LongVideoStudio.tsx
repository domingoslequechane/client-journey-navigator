import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Video, Play, Plus, Trash2, Wand2, Download, RefreshCw, 
  ArrowLeft, Film, Loader2, ChevronRight, ChevronDown, 
  Layers, Settings2, Clock, Image as ImageIcon, CheckCircle2, Clapperboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { AutoDirectorPanel } from '@/components/studio/AutoDirectorPanel';

interface LongVideoStudioProps {
  projectId: string;
  onBackToHub: () => void;
}

interface VideoSegment {
  id: string;
  prompt: string;
  video_url: string | null;
  status: string;
  thumbnail_url: string | null;
  created_at: string;
  duration_seconds: number;
  aspect_ratio: string;
  order_index?: number;
}

export function LongVideoStudio({ projectId, onBackToHub }: LongVideoStudioProps) {
  const { user } = useAuth();
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [newPrompt, setNewPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [duration, setDuration] = useState('8');
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [showAutoDirector, setShowAutoDirector] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchProject();
    fetchSegments();
    
    // Subscribe to changes in video_generations for this project
    const channel = supabase
      .channel('video_segments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_generations',
          filter: `project_id=eq.${projectId}`
        },
        () => {
          fetchSegments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const fetchProject = async () => {
    const { data } = await supabase.from('video_projects').select('*').eq('id', projectId).single();
    if (data) setProject(data);
  };

  const fetchSegments = async () => {
    try {
      const { data, error } = await supabase
        .from('video_generations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSegments(data || []);
      // If no segments yet, default to Auto-Director
      if (!data || data.length === 0) {
        setShowAutoDirector(true);
      }
      if (data && data.length > 0 && activeSegmentIndex === -1) {
        setActiveSegmentIndex(0);
      }
    } catch (error) {
      console.error('Error fetching segments:', error);
      toast.error('Erro ao carregar cenas');
    } finally {
      setIsLoading(false);
    }
  };

  const activeSegment = segments[activeSegmentIndex];

  const handleGenerateNext = async () => {
    if (!newPrompt.trim()) {
       toast.error("Escreva o que acontece na próxima cena.");
       return;
    }

    setIsGenerating(true);
    try {
      // Logic for "Extend": Use the last frame of the previous segment as the start frame
      const lastSegment = segments.length > 0 ? segments[segments.length - 1] : null;
      
      // In a real implementation, we'd extract the last frame from lastSegment.video_url
      // For now, we'll let the user provide images or just prompt extension.
      // The Veo 3.1 API supports "lastFrame" as a reference for smoothness.

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          prompt: newPrompt,
          aspect_ratio: aspectRatio,
          duration_seconds: duration,
          // If there's a previous video, we could theoretically pass its URI to the edge function
          // to use as a starting frame reference.
        }),
      });

      const result = await response.json();

      if (!response.ok || result._error) {
        throw new Error(result.error || result.message || 'Erro ao iniciar geração');
      }

      toast.success("Iniciando criação da nova cena!");
      setNewPrompt('');
      
    } catch (error: any) {
      console.error("Erro na geração:", error);
      toast.error(error.message || "Erro ao conectar com o servidor");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
        <p className="text-muted-foreground animate-pulse">Organizando cronograma do filme...</p>
      </div>
    );
  }

  // Show Auto-Director panel when toggled or no segments yet
  if (!isLoading && showAutoDirector) {
    return (
      <AutoDirectorPanel
        projectId={projectId}
        organizationId={project?.organization_id || ''}
        onBack={() => {
          if (segments.length === 0) {
            onBackToHub();
          } else {
            setShowAutoDirector(false);
          }
        }}
      />
    );
  }

  return (
    <div className="flex h-full bg-black overflow-hidden select-none">
      
      {/* ── Left Sidebar: Scenes / Timeline ── */}
      <div className="w-16 md:w-20 border-r border-white/5 flex flex-col bg-[#050505] shrink-0 items-center py-6 gap-6 z-30">
        <Button variant="ghost" size="icon" onClick={onBackToHub} className="text-white/40 hover:text-white">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar items-center">
          {segments.map((segment, index) => (
            <div 
              key={segment.id}
              onClick={() => setActiveSegmentIndex(index)}
              className={cn(
                "w-12 h-12 rounded-lg overflow-hidden cursor-pointer transition-all border-2",
                activeSegmentIndex === index ? "border-primary scale-110 shadow-lg shadow-primary/20" : "border-white/10 hover:border-white/30"
              )}
            >
              {segment.thumbnail_url || segment.video_url ? (
                <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] font-bold">#{index+1}</div>
              ) : (
                <div className="h-full w-full bg-white/5 animate-pulse" />
              )}
            </div>
          ))}
          <Button variant="outline" size="icon" className="w-12 h-12 rounded-lg bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10 border-dashed">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        {/* Auto-Director shortcut at bottom */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowAutoDirector(true)}
          className="text-white/40 hover:text-white hover:bg-white/10 w-12 h-12 rounded-lg"
          title="Auto-Diretor"
        >
          <Clapperboard className="h-5 w-5" />
        </Button>
      </div>

      {/* ── Main Workspace ── */}
      <div className="flex-1 flex flex-col relative bg-[#0a0a0a] min-w-0">
        
        {/* Main Viewport (Player Card) */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-12 relative">
          <div className="w-full h-full max-w-5xl flex items-center justify-center relative rounded-[40px] overflow-hidden bg-[#111] shadow-2xl border border-white/5">
            {activeSegment ? (
              <video 
                ref={videoRef}
                src={activeSegment.video_url || ''} 
                controls={!!activeSegment.video_url}
                autoPlay 
                loop 
                className={cn(
                  "max-w-full max-h-full transition-opacity duration-700",
                  !activeSegment.video_url && "opacity-20"
                )}
              />
            ) : (
              <div className="flex flex-col items-center gap-6 text-white/20">
                <Film className="h-16 w-16" />
                <p className="text-xl font-light tracking-widest uppercase">Pronto para filmar</p>
              </div>
            )}
            
            {/* Top Indicator */}
            {activeSegment && !activeSegment.video_url && (
              <div className="absolute top-8 left-8 flex items-center gap-3">
                <Video className="h-5 w-5 text-white/50" />
                <span className="text-white/70 font-mono text-sm">12%</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Creative Console (Control Bar) ── */}
        <div className="p-8 pb-10 flex flex-col items-center gap-8 bg-gradient-to-t from-black to-transparent">
          
          {/* Main Input Field */}
          <div className="w-full max-w-3xl bg-[#1a1a1a] rounded-[32px] p-6 shadow-2xl border border-white/10 relative group focus-within:ring-2 focus-within:ring-primary/20 transition-all">
             <Textarea 
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="Qual é a próxima etapa?"
                className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-white/20 resize-none min-h-[60px] text-lg font-light leading-relaxed"
             />
             
             <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2 bg-[#252525] px-4 py-2 rounded-2xl border border-white/5 cursor-pointer hover:bg-[#303030] transition-colors">
                   <span className="text-xs font-semibold text-white/60">Veo 3.1 - Pro</span>
                   <ChevronDown className="h-4 w-4 text-white/30" />
                </div>
                
                <div className="bg-[#f27041] p-3 rounded-2xl shadow-lg shadow-[#f27041]/20 cursor-pointer active:scale-90 transition-transform">
                   <Wand2 className="h-6 w-6 text-white" />
                </div>
             </div>
          </div>

          {/* Action Buttons Hub */}
          <div className="flex flex-wrap items-center justify-center gap-4">
             <Button 
                onClick={handleGenerateNext}
                disabled={isGenerating}
                className="h-14 px-8 rounded-3xl bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-white/5 text-white gap-3 flex items-center transition-all hover:scale-105 active:scale-95"
             >
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5 rotate-[-45deg]" />}
                <span className="font-semibold">Estender</span>
             </Button>

             <Button variant="ghost" className="h-14 px-8 rounded-3xl bg-[#141414] hover:bg-[#1a1a1a] border border-white/5 text-white gap-3 transition-all hover:scale-105 active:scale-95">
                <Plus className="h-5 w-5" />
                <span className="font-semibold">Inserir</span>
             </Button>

             <Button variant="ghost" className="h-14 px-8 rounded-3xl bg-[#141414] hover:bg-[#1a1a1a] border border-white/5 text-white gap-3 transition-all hover:scale-105 active:scale-95">
                <Trash2 className="h-5 w-5" />
                <span className="font-semibold">Remover</span>
             </Button>

             <Button variant="ghost" className="h-14 px-8 rounded-3xl bg-[#141414] hover:bg-[#1a1a1a] border border-white/5 text-white gap-3 transition-all hover:scale-105 active:scale-95">
                <Video className="h-5 w-5" />
                <span className="font-semibold">Câmera</span>
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
