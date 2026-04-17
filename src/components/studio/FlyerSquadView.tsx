"use client";

import { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Upload, 
  Download,
  Image as ImageIcon, 
  UserPen, 
  Camera, 
  Palette, 
  ClipboardCheck, 
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  ArrowLeft,
  ChevronLeft,
  Info,
  Eye,
  Maximize,
  Smartphone,
  Monitor,
  RectangleHorizontal,
  RectangleVertical,
  Layout,
  Copy,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from '@/lib/utils';
import { StudioQuickMenu } from './StudioQuickMenu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { StudioTool, FlyerSquadAgent, SquadLog } from '@/types/studio';

interface FlyerSquadViewProps {
  tool: StudioTool;
  projectId?: string;
  onBackToHub?: () => void;
}

const AGENTS: { id: FlyerSquadAgent; label: string; icon: any; color: string; description: string }[] = [
  { id: 'orchestrator', label: 'Orquestrador', icon: Sparkles, color: 'text-yellow-500', description: 'Analisa o cliente e define a estratégia' },
  { id: 'copywriter', label: 'Copywriter', icon: UserPen, color: 'text-blue-500', description: 'Define objetivo e conteúdo textual' },
  { id: 'designer', label: 'Designer', icon: Palette, color: 'text-purple-500', description: 'Renderiza o flyer final' },
  { id: 'reviewer', label: 'Revisor', icon: ClipboardCheck, color: 'text-green-500', description: 'Garante a qualidade máxima' },
  { id: 'publisher', label: 'Publicador', icon: Send, color: 'text-indigo-500', description: 'Entrega o produto pronto' },
];

const FLYER_OBJECTIVES = [
  { id: 'venda', label: 'Venda', emoji: '💰' },
  { id: 'consciencializacao', label: 'Consciencialização', emoji: '📢' },
  { id: 'engajamento', label: 'Engajamento', emoji: '💬' },
  { id: 'educativo', label: 'Educativo', emoji: '📚' },
  { id: 'institucional', label: 'Institucional', emoji: '🏢' },
];

const FLYER_TONES = [
  { id: 'direto', label: 'Direto', emoji: '😎' },
  { id: 'casual', label: 'Casual', emoji: '🤗' },
  { id: 'persuasivo', label: 'Persuasivo', emoji: '🤩' },
  { id: 'alegre', label: 'Alegre', emoji: '🥳' },
  { id: 'amigavel', label: 'Amigável', emoji: '😊' },
];

const FLYER_COPY_LENGTHS = [
  { id: 'curta', label: 'Curta' },
  { id: 'media', label: 'Média' },
  { id: 'longa', label: 'Longa' },
];

const FLYER_SIZES = [
  { id: 'square', label: 'Quadrado (1:1)', icon: Maximize, ratio: '1:1', dimensions: '1080x1080' },
  { id: 'story', label: 'Story (9:16)', icon: Smartphone, ratio: '9:16', dimensions: '1080x1920' },
  { id: 'landscape', label: 'Horizontal (16:9)', icon: RectangleHorizontal, ratio: '16:9', dimensions: '1920x1080' },
  { id: 'portrait', label: 'Retrato (4:5)', icon: RectangleVertical, ratio: '4:5', dimensions: '1080x1350' },
];

const resizeImage = (base64Str: string, maxWidth: number = 1536, maxHeight: number = 1536): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
  });
};

export function FlyerSquadView({ tool, projectId, onBackToHub }: FlyerSquadViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organizationId: orgId } = useOrganization();
  const [objective, setObjective] = useState<string>('venda');
  const [tone, setTone] = useState<string>('direto');
  const [copyLength, setCopyLength] = useState<string>('media');
  const [refMode, setRefMode] = useState<'similar' | 'inspired' | 'new'>('similar');
  const [aspectRatio, setAspectRatio] = useState<string>('square');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [approvedTemplateImage, setApprovedTemplateImage] = useState<string | null>(null);
  const [allowImageManipulation, setAllowImageManipulation] = useState<boolean>(true);
  const [briefing, setBriefing] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [logs, setLogs] = useState<SquadLog[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultCaption, setResultCaption] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSpecialistMode, setIsSpecialistMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flyer_specialist_mode');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [totalUsage, setTotalUsage] = useState({ promptTokens: 0, candidatesTokens: 0 });
  const [agentUsage, setAgentUsage] = useState<Partial<Record<FlyerSquadAgent, { prompt: number, candidates: number, model: string } | null>>>({
    orchestrator: null,
    copywriter: null,
    designer: null,
    reviewer: null,
    publisher: null
  });
  const [showCostSummary, setShowCostSummary] = useState(false);
  const [isWaitingForCopyApproval, setIsWaitingForCopyApproval] = useState(false);
  const [editableCopy, setEditableCopy] = useState<any>(null);
  const [copyApprovalResolve, setCopyApprovalResolve] = useState<{ resolve: (value: any) => void } | null>(null);
  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    localStorage.setItem('flyer_specialist_mode', JSON.stringify(isSpecialistMode));
  }, [isSpecialistMode]);

  const playCompletionSound = () => {
    if (isSpecialistMode) {
      const audio = new Audio('/universfield-notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.error("Error playing sound:", e));
    }
  };

  const productInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const approvedTemplateInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);

  // Fetch Project context
  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['studio-project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('studio_projects')
        .select(`
          *,
          clients (company_name, notes, phone, website, email, address)
        `)
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId
  });

  // Load settings from project
  useEffect(() => {
    if (project?.settings && isInitialLoad.current) {
      const settings = project.settings as any;
      if (settings.objective) setObjective(settings.objective);
      if (settings.tone) setTone(settings.tone);
      if (settings.copyLength) setCopyLength(settings.copyLength);
      if (settings.refMode) setRefMode(settings.refMode);
      if (settings.aspectRatio) setAspectRatio(settings.aspectRatio);
      if (settings.briefing) setBriefing(settings.briefing);
      if (settings.hasOwnProperty('allowImageManipulation')) setAllowImageManipulation(settings.allowImageManipulation);
      if (settings.productImages) setProductImages(settings.productImages);
      else if (settings.productImage) setProductImages([settings.productImage]);
      if (settings.referenceImage) setReferenceImage(settings.referenceImage);
      if (settings.approvedTemplateImage) setApprovedTemplateImage(settings.approvedTemplateImage);
      isInitialLoad.current = false;
    } else if (!loadingProject && !project?.settings) {
      isInitialLoad.current = false;
    }
  }, [project, loadingProject]);

  const saveSettings = async (updates: any) => {
    if (!projectId || isInitialLoad.current) return;
    setIsSavingSettings(true);
    
    // Optimistic update to query cache to avoid race conditions
    queryClient.setQueryData(['studio-project', projectId], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        settings: { ...(old.settings || {}), ...updates }
      };
    });

    try {
      const latest = queryClient.getQueryData(['studio-project', projectId]) as any;
      const { error } = await supabase
        .from('studio_projects')
        .update({ settings: latest.settings })
        .eq('id', projectId);
      
      if (error) throw error;
    } catch (e) {
      console.error("Error saving settings:", e);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Debounced briefing save
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentBriefing = (project?.settings as any)?.briefing;
      if (!isInitialLoad.current && currentBriefing !== briefing) {
        saveSettings({ briefing });
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [briefing, project]);

  // Fetch Flyer History
  const { data: history = [], refetch: refetchHistory, isRefetching: isRefreshingHistory } = useQuery({
    queryKey: ['flyer-history', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('studio_flyers')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId
  });

  // Preview List Logic
  const previewImages = activeTab === 'history' 
    ? history.map(h => h.image_url)
    : resultImage ? [resultImage] : [];

  const handleNextPreview = () => {
    if (previewIndex === null || previewIndex >= previewImages.length - 1) return;
    setPreviewIndex(previewIndex + 1);
  };

  const handlePrevPreview = () => {
    if (previewIndex === null || previewIndex <= 0) return;
    setPreviewIndex(previewIndex - 1);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewIndex === null) return;
      if (e.key === 'ArrowRight') handleNextPreview();
      if (e.key === 'ArrowLeft') handlePrevPreview();
      if (e.key === 'Escape') setPreviewIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, previewImages]);

  // Touch Swipe Logic
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) handleNextPreview();
    if (isRightSwipe) handlePrevPreview();
  };
  
  const handleDownload = async (url: string, filename: string = 'flyer.png') => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Download iniciado!');
    } catch (e) {
      console.error('Download error:', e);
      toast.error('Erro ao baixar imagem');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'reference' | 'approvedTemplate') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (type === 'reference') {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = async (prev) => {
        const base64 = prev.target?.result as string;
        const optimized = await resizeImage(base64);
        setReferenceImage(optimized);
        saveSettings({ referenceImage: optimized });
      };
      reader.readAsDataURL(file);
    } else if (type === 'approvedTemplate') {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = async (prev) => {
        const base64 = prev.target?.result as string;
        const optimized = await resizeImage(base64);
        setApprovedTemplateImage(optimized);
        saveSettings({ approvedTemplateImage: optimized });
      };
      reader.readAsDataURL(file);
    } else {
      // Product images (up to 4)
      const remainingSlots = 4 - productImages.length;
      files.slice(0, remainingSlots).forEach(file => {
        const reader = new FileReader();
        reader.onload = async (prev) => {
          const base64 = prev.target?.result as string;
          const optimized = await resizeImage(base64);
          setProductImages(prevImages => {
            const next = [...prevImages, optimized].slice(0, 4);
            saveSettings({ productImages: next });
            return next;
          });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const startSquad = async () => {
    if (!projectId || !project) {
      toast.error('Projeto não identificado');
      return;
    }
    if (!briefing.trim()) {
      toast.error('Informe os detalhes/briefing para o Flyer');
      return;
    }
    if (!orgId) {
      toast.error('Organização não encontrada');
      return;
    }

    setIsProcessing(true);
    setResultImage(null);
    setLogs([]);
    setTotalUsage({ promptTokens: 0, candidatesTokens: 0 });
    setAgentUsage({
      orchestrator: null,
      copywriter: null,
      photographer: null,
      designer: null,
      reviewer: null,
      publisher: null
    });
    
    let currentContext = {
      project: {
        name: project.name,
        niche: project.niche,
        primaryColor: project.primary_color,
        secondaryColor: project.secondary_color,
        instructions: project.ai_instructions,
        restrictions: project.ai_restrictions,
        clientName: project.clients?.company_name,
        contactInfo: {
          phone: project.clients?.phone,
          website: project.clients?.website,
          email: project.clients?.email,
          address: project.clients?.address
        },
        description: project.description,
        websiteUrl: (project.settings as any)?.website_url,
        captionInstructions: (project.settings as any)?.caption_instructions,
        logoUrl: project.logo_images?.[0],
        objective: FLYER_OBJECTIVES.find(o => o.id === objective)?.label || objective,
        tone: FLYER_TONES.find(t => t.id === tone)?.label || tone,
        copyLength: FLYER_COPY_LENGTHS.find(l => l.id === copyLength)?.label || copyLength,
        referenceMode: refMode,
        size: FLYER_SIZES.find(s => s.id === aspectRatio)?.label || aspectRatio,
        dimensions: FLYER_SIZES.find(s => s.id === aspectRatio)?.dimensions || '1080x1080',
        ratio: FLYER_SIZES.find(s => s.id === aspectRatio)?.ratio || '1:1',
        primaryFont: (project.settings as any)?.primary_font || null
      }
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let lastCaption = ''; 
      let currentStepIdx = 0;
      let retryCount = 0;
      const MAX_RETRIES = 3;
      let lastImageUrl: string | null = null; 
      
      // Local accumulator for tokens (safest way in a loop)
      let accumulatedUsage = { prompt: 0, candidates: 0 };

      while (currentStepIdx < AGENTS.length && retryCount <= MAX_RETRIES) {
        setCurrentStep(currentStepIdx);
        const agent = AGENTS[currentStepIdx];
        
        const newLog: SquadLog = {
          agent: agent.id,
          action: `${agent.label} trabalhando${agent.id === 'designer' && retryCount > 0 ? ` (revisão ${retryCount})` : ''}...`,
          status: 'working',
          timestamp: new Date().toISOString()
        };
        setLogs(prev => [...prev, newLog]);

        const { data, error } = await supabase.functions.invoke('flyer-squad-orchestrator', {
          body: {
            agent: agent.id,
            productImages,
            referenceImage,
            approvedTemplateImage,
            refMode,
            allowImageManipulation,
            briefing,
            organizationId: orgId,
            projectId: projectId,
            context: currentContext
          }
        });

        if (error || !data.success) {
          throw new Error(error?.message || data?.error || `Erro no ${agent.label}`);
        }

        currentContext[agent.id] = data.result;
        
        // Accumulate tokens
        if (data.usageMetadata) {
          accumulatedUsage.prompt += (data.usageMetadata.promptTokenCount || 0);
          accumulatedUsage.candidates += (data.usageMetadata.candidatesTokenCount || 0);
          
          setAgentUsage(prev => ({
            ...prev,
            [agent.id]: {
              prompt: (prev[agent.id]?.prompt || 0) + (data.usageMetadata.promptTokenCount || 0),
              candidates: (prev[agent.id]?.candidates || 0) + (data.usageMetadata.candidatesTokenCount || 0),
              model: (agent.id === 'designer') ? 'Gemini 3.1 Flash Image Preview' : 'Gemini 3.1 Pro Preview'
            }
          }));
          
          setTotalUsage(prev => ({
            promptTokens: prev.promptTokens + (data.usageMetadata.promptTokenCount || 0),
            candidatesTokens: prev.candidatesTokens + (data.usageMetadata.candidatesTokenCount || 0)
          }));
          
          console.log(`[FlyerSquad] Agent ${agent.id} usage:`, data.usageMetadata);
        }

        setLogs(prev => prev.map((log) => 
          log.agent === agent.id && log.status === 'working' ? { 
            ...log, 
            status: 'completed', 
            action: `${agent.label} concluído.`,
            output: JSON.stringify(data.result, null, 2)
          } : log
        ));

        if (agent.id === 'copywriter' && data.result.social_caption) {
          setResultCaption(data.result.social_caption);
          lastCaption = data.result.social_caption; // Track synchronously

          // --- PAUSE FOR HUMAN REVIEW ---
          setIsWaitingForCopyApproval(true);
          setEditableCopy({
            social_caption: data.result.social_caption,
            headline: data.result.headline || data.result.copy?.headline || '',
            subheadline: data.result.subheadline || data.result.copy?.subheadline || '',
            body: data.result.body || data.result.copy?.body || '',
            cta: data.result.cta || data.result.copy?.cta || ''
          });

          // Create a promise and store the resolve function
          const selection = await new Promise<any>((resolve) => {
            setCopyApprovalResolve({ resolve });
          });

          // Reset approval state
          setIsWaitingForCopyApproval(false);
          setCopyApprovalResolve(null);

          // Update context with the (possibly) edited copy
          data.result.social_caption = selection.social_caption;
          data.result.headline = selection.headline;
          data.result.subheadline = selection.subheadline;
          data.result.body = selection.body;
          data.result.cta = selection.cta;
          
          currentContext[agent.id] = data.result;
          lastCaption = selection.social_caption;
        }

        if (agent.id === 'designer' && data.result.imageUrl) {
          setResultImage(data.result.imageUrl);
          lastImageUrl = data.result.imageUrl; // BUG FIX: Track synchronously
        }

        if (agent.id === 'reviewer') {
          if (data.result.status === 'rejected') {
            toast.error(
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                  <AlertCircle className="w-4 h-4" />
                  <span>Revisão do Diretor de Arte</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                  {data.result.feedback}
                </p>
                <div className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  O Designer está a fazer as correções (Tentativa {retryCount + 1} de {MAX_RETRIES})...
                </div>
              </div>,
              { 
                duration: 8000, 
                className: "!bg-[#0a0a0a]/95 !backdrop-blur-xl !border-l-4 !border-l-primary !border-y !border-r !border-white/5 !shadow-2xl !rounded-xl !p-4" 
              }
            );
            
            currentContext['reviewer_feedback'] = data.result.feedback;
            retryCount++;
            currentStepIdx = 2; // Go back to Designer
            continue;
          } else {
            toast.success(
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-green-500 font-bold text-[10px] uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Diretor de Arte</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  Arte aprovada com louvor! Score: <span className="font-bold text-green-500">{data.result.score}/10</span> ✨
                </p>
              </div>,
              { 
                duration: 5000,
                className: "!bg-[#0a0a0a]/95 !backdrop-blur-xl !border-l-4 !border-l-green-500 !border-y !border-r !border-white/5 !shadow-2xl !rounded-xl !p-4"
              }
            );
          }
        }

        // Move to next agent
        currentStepIdx++;
      }

      // Final step: Save and Publish
      // BUG FIX: Use the synchronous lastImageUrl variable, not the async React state
      if (lastImageUrl) {
        setLogs(prev => [...prev, {
          agent: 'publisher',
          action: 'Publicando e salvando histórico...',
          status: 'completed',
          timestamp: new Date().toISOString()
        }]);

        const { error: insertError } = await supabase.from('studio_flyers').insert({
          project_id: projectId,
          organization_id: orgId,
          image_url: lastImageUrl,
          social_caption: lastCaption || resultCaption,
          prompt: briefing,
          created_by: user.id,
          title: project.name,
          niche: project.niche,
          size: aspectRatio,
          style: tone,
          usage_prompt: accumulatedUsage.prompt,
          usage_candidates: accumulatedUsage.candidates,
          model: 'Gemini 3.1 Suite',
          model_meta: JSON.stringify(agentUsage)
        });

        if (insertError) throw insertError;
        
        // Finalize state update
        setTotalUsage({
          promptTokens: accumulatedUsage.prompt,
          candidatesTokens: accumulatedUsage.candidates
        });

        await refetchHistory();
        playCompletionSound();
      }

      toast.success(
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>Sucesso Total</span>
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed font-medium">
            Flyer gerado e publicado no histórico! 🚀
          </p>
        </div>,
        { 
          duration: 6000,
          className: "!bg-[#0a0a0a]/95 !backdrop-blur-xl !border-l-4 !border-l-primary !border-y !border-r !border-white/5 !shadow-2xl !rounded-xl !p-4"
        }
      );
    } catch (error: any) {
      console.error('Squad Error:', error);
      toast.error(
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-destructive font-bold text-[10px] uppercase tracking-wider">
            <AlertCircle className="w-4 h-4" />
            <span>Erro na Operação</span>
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed">
            {error.message || 'Ocorreu um problema inesperado na geração do flyer.'}
          </p>
        </div>,
        { 
          duration: 5000,
          className: "!bg-[#0a0a0a]/95 !backdrop-blur-xl !border-l-4 !border-l-destructive !border-y !border-r !border-white/5 !shadow-2xl !rounded-xl !p-4"
        }
      );
      setLogs(prev => prev.map(log => 
        log.status === 'working' ? { ...log, status: 'failed', action: `Erro: ${error.message}` } : log
      ));
    } finally {
      setIsProcessing(false);
      setCurrentStep(-1);
    }
  };

  if (loadingProject && isInitialLoad.current) {
    return (
      <div className="flex h-screen items-center justify-center bg-background w-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando sua sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full md:h-screen bg-background relative overflow-hidden w-full">
      <div className="hidden md:block shrink-0 h-full border-r">
        <StudioQuickMenu currentToolId="flyer" />
      </div>

      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden lg:flex-row">
      {/* ── Configuration Sidebar ── */}
      <div className="w-full lg:w-[380px] border-r overflow-y-auto p-5 pb-6 space-y-6 bg-muted/5 shadow-inner shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full" 
            onClick={onBackToHub}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight">Gerador de Flyer</h2>
          </div>
        </div>

        {/* Project Context */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              1. Identidade de Marca
            </h3>
          </div>
          
          {loadingProject ? (
            <div className="h-11 rounded-xl bg-muted animate-pulse" />
          ) : project && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-3">
               <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg shrink-0 border shadow-xs" 
                    style={{ background: `linear-gradient(135deg, ${project.primary_color}, ${project.secondary_color})` }} 
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{project.name}</p>
                    <p className="text-[10px] text-muted-foreground">{project.clients?.company_name}</p>
                  </div>
               </div>
               <div className="flex flex-wrap gap-1.5 pt-1">
                  {project.niche && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{project.niche}</Badge>}
                  {project.ai_instructions && <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/20">Brand Rules Ativa</Badge>}
               </div>
            </div>
          )}
        </div>

        {/* Tom de voz */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Tom de Voz
          </h3>
          <div className="flex flex-wrap gap-2">
            {FLYER_TONES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTone(t.id);
                  saveSettings({ tone: t.id });
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-medium transition-all",
                  tone === t.id 
                    ? "bg-primary/10 border-orange-500/50 text-foreground ring-1 ring-orange-500/30" 
                    : "bg-background border-primary/10 text-muted-foreground hover:border-primary/30"
                )}
              >
                <span>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tamanho (Duração/Extensão) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Extensão do Texto
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {FLYER_COPY_LENGTHS.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  setCopyLength(l.id);
                  saveSettings({ copyLength: l.id });
                }}
                className={cn(
                  "py-2.5 rounded-xl border text-[11px] font-bold transition-all",
                  copyLength === l.id 
                    ? "bg-primary/10 border-orange-500/50 text-foreground ring-1 ring-orange-500/30" 
                    : "bg-background border-primary/10 text-muted-foreground hover:border-primary/30"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Objective */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Objetivo do Flyer
          </h3>
          <div className="flex flex-wrap gap-2">
            {FLYER_OBJECTIVES.map((obj) => (
              <button
                key={obj.id}
                onClick={() => {
                  setObjective(obj.id);
                  saveSettings({ objective: obj.id });
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-medium transition-all",
                  objective === obj.id 
                    ? "bg-primary/10 border-orange-500/50 text-foreground ring-1 ring-orange-500/30" 
                    : "bg-background border-primary/10 text-muted-foreground hover:border-primary/30"
                )}
              >
                <span>{obj.emoji}</span>
                {obj.label}
              </button>
            ))}
          </div>
        </div>

        {/* Flyer Size */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            3. Tamanho do Flyer
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {FLYER_SIZES.map((size) => (
              <button
                key={size.id}
                onClick={() => {
                  setAspectRatio(size.id);
                  saveSettings({ aspectRatio: size.id });
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border transition-all",
                  aspectRatio === size.id 
                    ? "bg-primary border-primary text-white shadow-lg scale-105" 
                    : "bg-background border-primary/10 text-muted-foreground hover:border-primary/30 hover:bg-primary/5"
                )}
              >
                <size.icon className={cn("h-5 w-5", aspectRatio === size.id ? "text-white" : "text-primary")} />
                <span className="text-[8px] font-bold uppercase tracking-tighter truncate w-full text-center">
                  {size.ratio}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Briefing */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            4. Detalhes do Conteúdo (Briefing)
          </h3>
          <Textarea 
            placeholder="Descreva o que deve constar no flyer, ofertas, chamadas para ação..."
            className="min-h-[160px] resize-y border-primary/10 focus-visible:ring-primary/20 text-xs rounded-xl"
            value={briefing}
            onChange={(e) => setBriefing(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              5. Elementos Visuais (Max 4)
            </h3>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
              const val = !allowImageManipulation;
              setAllowImageManipulation(val);
              saveSettings({ allowImageManipulation: val });
            }}>
              <span className="text-[10px] text-muted-foreground font-medium select-none">Permitir manipulação pelas IA</span>
              <Switch 
                checked={allowImageManipulation}
                onCheckedChange={(val) => {
                  setAllowImageManipulation(val);
                  saveSettings({ allowImageManipulation: val });
                }}
                className="scale-75 origin-right"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((index) => (
                <div 
                  key={index}
                  onClick={() => !productImages[index] && productInputRef.current?.click()}
                  className={cn(
                    "relative aspect-square rounded-xl border border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center gap-2 overflow-hidden",
                    productImages[index] ? "border-solid border-primary/20 bg-muted/40" : "hover:border-primary/40 hover:bg-primary/5 border-muted-foreground/30"
                  )}
                >
                  {productImages[index] ? (
                    <>
                      <img src={productImages[index]} className="w-full h-full object-contain p-1.5" alt={`Product ${index + 1}`} />
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const next = productImages.filter((_, i) => i !== index);
                          setProductImages(next); 
                          saveSettings({ productImages: next }); 
                        }} 
                        className="absolute top-1 right-1 bg-destructive/90 hover:bg-destructive text-white rounded-full p-1 shadow-sm border border-background backdrop-blur-sm transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-center p-2">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-[10px] font-medium leading-tight">Carregar<br/>Foto {index + 1}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <input 
              type="file" 
              ref={productInputRef} 
              hidden 
              accept="image/*" 
              multiple 
              onChange={(e) => handleFileSelect(e, 'product')} 
            />
          </div>

        {/* Reference Image */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              6. Referência
            </h3>
            <span className="text-[10px] text-muted-foreground font-medium">Opcional</span>
          </div>

          <div className="space-y-2">
             <div 
              className={cn(
                "relative aspect-square rounded-2xl border-2 border-dashed transition-all group flex flex-col items-center justify-center gap-2 overflow-hidden",
                referenceImage ? "border-solid border-primary/30 bg-muted/20" : "hover:border-primary/40 hover:bg-primary/5 border-primary/20"
              )}
            >
              {/* Reference Mode Overlay */}
              {referenceImage && (
                <div className="absolute top-3 left-3 right-3 z-10 flex p-1 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg">
                  {(['similar', 'inspired', 'new'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRefMode(mode);
                        saveSettings({ refMode: mode });
                      }}
                      className={cn(
                        "flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all",
                        refMode === mode 
                          ? "bg-primary text-white shadow-md ring-1 ring-white/20 scale-[1.02]" 
                          : "text-white/60 hover:text-white"
                      )}
                    >
                      {mode === 'similar' ? 'Similar' : mode === 'inspired' ? 'Inspirado' : 'Novo'}
                    </button>
                  ))}
                </div>
              )}

              {referenceImage ? (
                <div className="w-full h-full cursor-pointer" onClick={() => referenceInputRef.current?.click()}>
                  <img src={referenceImage} className="w-full h-full object-cover" alt="Ref" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-background/80 backdrop-blur-md p-2 rounded-full shadow-lg">
                        <Plus className="h-5 w-5 text-primary" />
                      </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setReferenceImage(null); saveSettings({ referenceImage: null }); }} className="absolute bottom-3 right-3 bg-destructive text-white rounded-full p-1.5 shadow-xl border border-white/20 active:scale-90 transition-transform z-20 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 cursor-pointer w-full h-full justify-center" onClick={() => referenceInputRef.current?.click()}>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">Estilo</span>
                </div>
              )}
              <input type="file" ref={referenceInputRef} hidden accept="image/*" onChange={(e) => handleFileSelect(e, 'reference')} />
            </div>
          </div>
        </div>

        {/* Approved Template Image */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              7. Template Aprovado
            </h3>
            <span className="text-[10px] text-muted-foreground font-medium">Opcional</span>
          </div>

          <div className="space-y-2">
             <div 
              className={cn(
                "relative aspect-square rounded-2xl border-2 border-dashed transition-all group flex flex-col items-center justify-center gap-2 overflow-hidden",
                approvedTemplateImage ? "border-solid border-primary/30 bg-muted/20" : "hover:border-primary/40 hover:bg-primary/5 border-primary/20"
              )}
            >
              {approvedTemplateImage ? (
                <div className="w-full h-full cursor-pointer" onClick={() => approvedTemplateInputRef.current?.click()}>
                  <img src={approvedTemplateImage} className="w-full h-full object-cover" alt="Approved Template" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-background/80 backdrop-blur-md p-2 rounded-full shadow-lg">
                        <Plus className="h-5 w-5 text-primary" />
                      </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setApprovedTemplateImage(null); saveSettings({ approvedTemplateImage: null }); }} className="absolute bottom-3 right-3 bg-destructive text-white rounded-full p-1.5 shadow-xl border border-white/20 active:scale-90 transition-transform z-20 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 cursor-pointer w-full h-full justify-center" onClick={() => approvedTemplateInputRef.current?.click()}>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors text-center px-4">Template Opcional</span>
                </div>
              )}
              <input type="file" ref={approvedTemplateInputRef} hidden accept="image/*" onChange={(e) => handleFileSelect(e, 'approvedTemplate')} />
            </div>
          </div>
        </div>

        <Button 
          className="w-full h-12 text-sm font-bold rounded-xl shadow-md transition-all mt-4"
          onClick={startSquad}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Flyer Profissional
            </>
          )}
        </Button>
      </div>

      {/* ── Main Production Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/20 relative">
        {/* Production Header */}
        <div className="h-14 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4 h-full">
            <button 
              onClick={() => setActiveTab('create')}
              className={cn(
                "h-full px-4 text-xs font-bold tracking-tight transition-all border-b-2",
                activeTab === 'create' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              CRIAR FLYER
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={cn(
                "h-full px-4 text-xs font-bold tracking-tight transition-all border-b-2 flex items-center gap-2",
                activeTab === 'history' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              HISTÓRICO
              {history.length > 0 && <Badge variant="secondary" className="px-1 text-[9px] h-3.5 min-w-[14px] flex items-center justify-center font-mono">{history.length}</Badge>}
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10 shrink-0 shadow-sm">
               {activeTab === 'create' ? (
                 <div className="flex items-center gap-2">
                   <Switch 
                     id="specialist-mode-toggle"
                     checked={isSpecialistMode}
                     onCheckedChange={setIsSpecialistMode}
                     className="scale-75"
                   />
                   <span className="text-[9px] font-bold text-primary/60 uppercase tracking-tighter">Habilitar Alerta</span>
                 </div>
               ) : (
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   disabled={isRefreshingHistory}
                   className="h-7 px-2 -ml-1 gap-1.5 rounded-lg text-primary hover:text-primary transition-colors disabled:opacity-50 hover:bg-primary/10"
                   onClick={() => {
                     setCurrentPage(1);
                     refetchHistory();
                     toast.promise(refetchHistory(), {
                       loading: 'Atualizando histórico...',
                       success: 'Histórico atualizado!',
                       error: 'Falha ao atualizar'
                     });
                   }}
                 >
                   <RotateCcw className={cn("h-3.5 w-3.5", isRefreshingHistory && "animate-spin")} />
                   <span className="text-[9px] font-bold uppercase tracking-tighter">Sincronizar</span>
                 </Button>
               )}
               <div className="w-px h-3 bg-primary/20 mx-1" />
               <Label 
                 htmlFor={activeTab === 'create' ? "specialist-mode-toggle" : undefined} 
                 className="text-[10px] font-black uppercase tracking-tight cursor-pointer whitespace-nowrap text-primary"
               >
                 Motor Especialista
               </Label>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
          {activeTab === 'create' ? (
            <>
              {!isProcessing && !resultImage && (
                <div className="max-w-lg w-full text-center mt-12 space-y-8 animate-in fade-in duration-700">
                  <div className="relative grid grid-cols-5 gap-3 max-w-sm mx-auto">
                    {AGENTS.map((agent) => (
                        <div key={agent.id} className="flex flex-col items-center gap-1.5">
                          <div className={cn("p-2.5 rounded-xl bg-background border shadow-xs transition-transform hover:scale-110", agent.color)}>
                            <agent.icon className="h-5 w-5" />
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black tracking-tighter text-foreground">
                      {project?.name || 'Flyer Engine'}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed text-balance px-10">
                      Envie o produto e o briefing. Nossos especialistas aplicarão as regras de marca do projeto para garantir o melhor resultado.
                    </p>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="max-w-xl w-full bg-background rounded-[24px] border shadow-xl overflow-hidden mt-4 animate-in fade-in zoom-in duration-500">
                  <div className="p-6 border-b bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold flex items-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Gerando Flyer
                      </h3>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {Math.round(((currentStep + 1) / AGENTS.length) * 100)}%
                      </Badge>
                    </div>
                    <Progress value={((currentStep + 1) / AGENTS.length) * 100} className="h-2 rounded-full" />
                  </div>

                  <div className="p-6 space-y-4">
                    {AGENTS.map((agent, i) => {
                      const isActive = i === currentStep;
                      const isDone = i < currentStep && currentStep !== -1;
                      const isPending = i > currentStep;

                      return (
                        <div key={agent.id} className={cn(
                          "flex gap-4 items-start transition-all duration-300",
                          isActive ? "opacity-100 translate-x-1" : "opacity-40",
                          isPending && "filter grayscale"
                        )}>
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors border-2",
                            isActive ? "bg-primary text-white border-primary animate-pulse" : 
                            isDone ? "bg-green-500 text-white border-green-500" : 
                            "bg-muted text-muted-foreground border-transparent"
                          )}>
                            {isDone ? <CheckCircle2 className="h-5 w-5" /> : <agent.icon className="h-5 w-5" />}
                          </div>
                          
                          <div className="flex-1 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs tracking-tight">{agent.label}</span>
                              {isActive && <span className="text-[8px] font-black tracking-widest text-primary uppercase animate-pulse">Trabalhando</span>}
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-muted-foreground line-clamp-1">
                                {isActive ? agent.description : isDone ? "Concluído" : "Aguardando..."}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isWaitingForCopyApproval && editableCopy && (
                <div className="max-w-xl w-full bg-background rounded-[24px] border shadow-xl mt-4 animate-in fade-in zoom-in duration-500 mb-20 scroll-mt-20">
                  <div className="p-6 border-b bg-gradient-to-br from-primary/5 to-transparent flex flex-col gap-2">
                    <h3 className="font-bold flex items-center gap-2 text-sm text-primary uppercase tracking-tighter">
                      <UserPen className="h-4 w-4" /> Revisão de Conteúdo (Copy)
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-70">
                      Revisando o trabalho do Copywriter IA
                    </p>
                  </div>
                  
                  <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chamada Principal (Headline)</Label>
                        <Input 
                          value={editableCopy.headline}
                          onChange={(e) => setEditableCopy({ ...editableCopy, headline: e.target.value })}
                          className="bg-muted/30 border-primary/10 rounded-xl h-12 font-bold text-sm"
                          placeholder="Ex: Oferta Imperdível"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subtítulo (Opcional)</Label>
                        <Input 
                          value={editableCopy.subheadline}
                          onChange={(e) => setEditableCopy({ ...editableCopy, subheadline: e.target.value })}
                          className="bg-muted/30 border-primary/10 rounded-xl h-10 text-xs"
                          placeholder="Ex: Apenas hoje na nossa loja"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Corpo do Texto</Label>
                        <Textarea 
                          value={editableCopy.body}
                          onChange={(e) => setEditableCopy({ ...editableCopy, body: e.target.value })}
                          className="bg-muted/30 border-primary/10 rounded-xl min-h-[100px] text-xs leading-relaxed"
                          placeholder="Descreva a oferta detalhadamente..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chamada para Ação (CTA)</Label>
                        <Input 
                          value={editableCopy.cta}
                          onChange={(e) => setEditableCopy({ ...editableCopy, cta: e.target.value })}
                          className="bg-muted/30 border-primary/10 rounded-xl h-10 text-xs font-bold text-primary"
                          placeholder="Ex: Clique no link da bio"
                        />
                      </div>

                      <div className="pt-4 border-t border-dashed border-primary/10 space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Legenda para Rede Social</Label>
                        <Textarea 
                          value={editableCopy.social_caption}
                          onChange={(e) => setEditableCopy({ ...editableCopy, social_caption: e.target.value })}
                          className="bg-primary/5 border-primary/10 rounded-xl min-h-[120px] text-xs italic"
                        />
                      </div>
                    </div>

                    <Button 
                      className="w-full h-12 rounded-xl text-xs font-black tracking-widest uppercase shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                      onClick={() => copyApprovalResolve?.resolve(editableCopy)}
                    >
                      APROVAR E ENVIAR PARA DESIGNER <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {resultImage && !isProcessing && (
                <div className="max-w-2xl w-full space-y-6 animate-in slide-in-from-bottom-8 duration-700 mt-4">
                  <div className="relative group rounded-[24px] overflow-hidden shadow-2xl border-4 border-background bg-muted cursor-zoom-in" onClick={() => setPreviewIndex(0)}>
                      <img src={resultImage} alt="Final Flyer" className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-8">
                        <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              size="default" 
                              className="rounded-xl h-12 px-6 shadow-xl"
                              onClick={() => handleDownload(resultImage, `flyer-${project?.name || 'design'}.png`)}
                            >
                              <Download className="mr-2 h-4 w-4" /> Download 4K
                            </Button>
                            <Button size="icon" variant="secondary" className="rounded-xl h-12 w-12 shadow-xl" onClick={() => setResultImage(null)}>
                              <X className="h-5 w-5" />
                            </Button>
                        </div>
                      </div>
                  </div>
                  <div className="flex justify-center">
                      <Button variant="outline" className="rounded-xl" onClick={() => {
                        setResultImage(null);
                        setResultCaption(null);
                      }}>
                        Criar outro Flyer
                      </Button>
                  </div>

                  {resultCaption && (
                    <div className="bg-background rounded-[24px] border shadow-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-200">
                      <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4 text-primary" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Legenda Sugerida</h4>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 rounded-lg text-[10px] font-bold"
                          onClick={() => {
                            navigator.clipboard.writeText(resultCaption);
                            toast.success('Legenda copiada!');
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1.5" /> COPIAR
                        </Button>
                      </div>
                      <div className="p-6">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground italic">
                          "{resultCaption}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* History View */
            <div className="max-w-5xl w-full space-y-8 animate-in fade-in duration-500">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                 {history.length > 0 ? (
                   <>
                     {history
                       .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                       .map((flyer) => (
                        <div 
                          key={flyer.id} 
                          className="group relative aspect-[3/4] bg-muted rounded-[24px] overflow-hidden border shadow-sm hover:shadow-xl transition-all cursor-zoom-in isolate"
                          onClick={() => {
                            const idx = history.findIndex(h => h.id === flyer.id);
                            setPreviewIndex(idx);
                          }}
                        >
                           <img 
                             src={flyer.image_url} 
                             alt={flyer.prompt} 
                             className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 transform-gpu will-change-transform" 
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all p-6 flex flex-col justify-end">
                              <p className="text-white text-xs line-clamp-2 mb-4 font-medium opacity-80">{flyer.prompt}</p>
                              <div className="flex gap-2">
                                 <Button 
                                   size="sm" 
                                   className="flex-1 rounded-xl h-10 bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     const idx = history.findIndex(h => h.id === flyer.id);
                                     setPreviewIndex(idx);
                                   }}
                                 >
                                   <Eye className="h-4 w-4 mr-2" /> Ver
                                 </Button>
                                 <Button 
                                   size="icon" 
                                   className="rounded-xl h-10 w-10 bg-white text-black hover:bg-white/90"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleDownload(flyer.image_url, `flyer-${flyer.id}.png`);
                                   }}
                                 >
                                   <Download className="h-4 w-4" />
                                 </Button>
                              </div>
                           </div>
                           <div className="absolute top-4 left-4">
                              <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-[9px]">
                                {formatDistanceToNow(new Date(flyer.created_at), { addSuffix: true, locale: ptBR })}
                              </Badge>
                           </div>
                        </div>
                     ))}
                     
                     {/* Pagination Controls */}
                     {history.length > ITEMS_PER_PAGE && (
                        <div className="col-span-full flex items-center justify-center gap-6 pt-8 pb-12">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full h-10 w-10 border border-primary/10 hover:bg-primary/5 text-primary disabled:opacity-30"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          
                          <div className="flex items-center font-mono text-sm font-bold tracking-widest text-muted-foreground/60">
                            <span className="text-primary">{currentPage}</span>
                            <span className="mx-2">/</span>
                            <span>{Math.ceil(history.length / ITEMS_PER_PAGE)}</span>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full h-10 w-10 border border-primary/10 hover:bg-primary/5 text-primary disabled:opacity-30"
                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(history.length / ITEMS_PER_PAGE), prev + 1))}
                            disabled={currentPage === Math.ceil(history.length / ITEMS_PER_PAGE)}
                          >
                            <ChevronLeft className="h-5 w-5 rotate-180" />
                          </Button>
                        </div>
                     )}
                   </>
                 ) : (
                   <div className="col-span-full flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">Nenhum flyer gerado neste projeto ainda.</p>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Image Preview Modal ── */}
      {previewIndex !== null && previewImages[previewIndex] && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setPreviewIndex(null)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Navegação */}
          {previewImages.length > 1 && (
            <>
              {previewIndex > 0 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 rounded-full h-12 w-12 hidden md:flex"
                  onClick={(e) => { e.stopPropagation(); handlePrevPreview(); }}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}
              {previewIndex < previewImages.length - 1 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 rounded-full h-12 w-12 hidden md:flex"
                  onClick={(e) => { e.stopPropagation(); handleNextPreview(); }}
                >
                  <ChevronLeft className="h-8 w-8 rotate-180" />
                </Button>
              )}
            </>
          )}

          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-6 right-6 text-white hover:bg-white/20 rounded-full z-50"
            onClick={() => setPreviewIndex(null)}
          >
            <X className="h-8 w-8" />
          </Button>
          
          <div className="relative w-full max-w-6xl flex flex-col md:flex-row items-center md:items-stretch gap-6" onClick={(e) => e.stopPropagation()}>
            {/* Esquerda: Imagem */}
            <div className="relative group flex-1 flex items-center justify-center">
              <img 
                src={previewImages[previewIndex]} 
                alt="Flyer Preview" 
                className="max-w-full max-h-[70vh] md:max-h-[85vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/10 transition-all duration-300" 
              />
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge className="bg-black/60 backdrop-blur-md border-white/10">
                  {previewIndex + 1} / {previewImages.length}
                </Badge>
              </div>
            </div>

            {/* Direita: Conteúdo e Legenda */}
            <div className="w-full md:w-[400px] shrink-0 flex flex-col gap-6 bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-2xl">
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  Detalhes do Flyer
                </h3>
                
                <div className="space-y-4 overflow-y-auto max-h-[40vh] md:max-h-[50vh] pr-2">
                  {((activeTab === 'history' && (history[previewIndex!] as any)?.social_caption) || (activeTab === 'create' && resultCaption)) ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">Sugestão de Legenda</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/10"
                          onClick={() => {
                            const cap = activeTab === 'history' ? (history[previewIndex!] as any).social_caption : resultCaption;
                            navigator.clipboard.writeText(cap);
                            toast.success('Legenda copiada!');
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1.5" /> COPIAR
                        </Button>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap italic">
                          "{activeTab === 'history' ? (history[previewIndex!] as any).social_caption : resultCaption}"
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-white/20">
                      <Send className="h-10 w-10 mb-2 opacity-10" />
                      <p className="text-xs font-bold uppercase tracking-widest">Sem legenda salva</p>
                    </div>
                  )}

                  {activeTab === 'history' && history[previewIndex!] && (
                    <div className="pt-4 border-t border-white/10 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                         <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Formato</p>
                            <p className="text-xs font-bold text-white">{history[previewIndex!].size || 'Original'}</p>
                         </div>
                         <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Data</p>
                            <p className="text-xs font-bold text-white">
                              {formatDistanceToNow(new Date(history[previewIndex!].created_at), { locale: ptBR })}
                            </p>
                         </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-3">
                <Button 
                  className="rounded-xl w-full h-12 font-bold shadow-xl bg-primary hover:bg-primary/90 text-white"
                  onClick={() => handleDownload(previewImages[previewIndex!], `flyer-HD.png`)}
                >
                  <Download className="mr-2 h-5 w-5" /> Baixar Imagem HD
                </Button>
                
                <Button 
                  variant="ghost"
                  className="rounded-xl w-full h-12 font-bold border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all"
                  onClick={() => setPreviewIndex(null)}
                >
                  Fechar Visualização
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      {/* Modal de Custos Ocultado por solicitação do usuário */}
    </div>
  );
}
