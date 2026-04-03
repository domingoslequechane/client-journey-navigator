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
  ChevronRight,
  ArrowRight,
  MonitorPlay,
  Info,
  Eye,
  Maximize,
  Smartphone,
  Monitor,
  RectangleHorizontal,
  RectangleVertical,
  Layout,
  Layers,
  Copy,
  RotateCcw
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
import JSZip from 'jszip';
import { useNavigate } from 'react-router-dom';
import { renderCarouselSlide, getSlideDimensions, getRatioKey, dataUrlToBlob } from '@/lib/carouselCanvasRenderer';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { StudioTool, FlyerSquadAgent, SquadLog } from '@/types/studio';

interface CarouselSquadViewProps {
  tool: StudioTool;
  projectId?: string;
  onBackToHub?: () => void;
}

const AGENTS: { id: FlyerSquadAgent; label: string; icon: any; color: string; description: string }[] = [
  { id: 'orchestrator', label: 'Orquestrador', icon: Sparkles, color: 'text-yellow-500', description: 'Analisa o cliente e define a estratégia' },
  { id: 'copywriter', label: 'Copywriter', icon: UserPen, color: 'text-blue-500', description: 'Define objetivo e conteúdo textual' },
  { id: 'designer', label: 'Designer', icon: Palette, color: 'text-purple-500', description: 'Renderiza o carrossel final' },
  { id: 'reviewer', label: 'Revisor', icon: ClipboardCheck, color: 'text-green-500', description: 'Garante a qualidade máxima' },
  { id: 'publisher', label: 'Publicador', icon: Send, color: 'text-indigo-500', description: 'Entrega o produto pronto' },
];

const CAROUSEL_OBJECTIVES = [
  { id: 'venda', label: 'Venda', emoji: '💰' },
  { id: 'consciencializacao', label: 'Consciencialização', emoji: '📢' },
  { id: 'engajamento', label: 'Engajamento', emoji: '💬' },
  { id: 'educativo', label: 'Educativo', emoji: '📚' },
  { id: 'institucional', label: 'Institucional', emoji: '🏢' },
];

const CAROUSEL_TONES = [
  { id: 'direto', label: 'Direto', emoji: '😎' },
  { id: 'casual', label: 'Casual', emoji: '🤗' },
  { id: 'persuasivo', label: 'Persuasivo', emoji: '🤩' },
  { id: 'alegre', label: 'Alegre', emoji: '🥳' },
  { id: 'amigavel', label: 'Amigável', emoji: '😊' },
];

const CAROUSEL_COPY_LENGTHS = [
  { id: 'curta', label: 'Curta' },
  { id: 'media', label: 'Média' },
  { id: 'longa', label: 'Longa' },
];

const CAROUSEL_SIZES = [
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

export function CarouselSquadView({ tool, projectId, onBackToHub }: CarouselSquadViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organizationId: orgId } = useOrganization();
  const [objective, setObjective] = useState<string>('venda');
  const [tone, setTone] = useState<string>('direto');
  const [copyLength, setCopyLength] = useState<string>('media');
  const [refMode, setRefMode] = useState<'similar' | 'inspired' | 'new'>('similar');
  const [aspectRatio, setAspectRatio] = useState<string>('square');
  const [numberOfSlides, setNumberOfSlides] = useState<number>(0);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [approvedTemplateImage, setApprovedTemplateImage] = useState<string | null>(null);
  const [allowImageManipulation, setAllowImageManipulation] = useState<boolean>(true);
  const [briefing, setBriefing] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [logs, setLogs] = useState<SquadLog[]>([]);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [resultCaption, setResultCaption] = useState<string | null>(null);
  const [isWaitingForCopyApproval, setIsWaitingForCopyApproval] = useState(false);
  const [editableCopy, setEditableCopy] = useState<any>(null);
  const [copyApprovalResolve, setCopyApprovalResolve] = useState<{resolve: (val: any) => void} | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isSpecialistMode, setIsSpecialistMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('carousel_specialist_mode');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [totalUsage, setTotalUsage] = useState({ promptTokens: 0, candidatesTokens: 0 });
  const [generationMode, setGenerationMode] = useState<'ai' | 'js'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('carousel_generation_mode') as 'ai' | 'js') || 'ai';
    }
    return 'ai';
  });
  const [agentUsage, setAgentUsage] = useState<Partial<Record<FlyerSquadAgent, { prompt: number, candidates: number, model: string } | null>>>({
    orchestrator: null,
    copywriter: null,
    designer: null,
    reviewer: null,
    publisher: null
  });
  const [showCostSummary, setShowCostSummary] = useState(false);
  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    localStorage.setItem('carousel_specialist_mode', JSON.stringify(isSpecialistMode));
  }, [isSpecialistMode]);

  useEffect(() => {
    localStorage.setItem('carousel_generation_mode', generationMode);
  }, [generationMode]);

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
      if (settings.numberOfSlides) setNumberOfSlides(settings.numberOfSlides);
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

  // Fetch Carousel History
  const { data: history = [], refetch: refetchHistory, isRefetching: isRefreshingHistory } = useQuery({
    queryKey: ['carousel-history', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('studio_carousels')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId
  });

  // Preview images for the CURRENTLY OPENED carousel
  const currentCarouselImages = previewIndex !== null
    ? (activeTab === 'history' 
        ? (history[previewIndex]?.image_urls || [])
        : resultImages)
    : [];

  const handleNextPreview = () => {
    if (previewIndex === null || activeSlideIndex >= currentCarouselImages.length - 1) return;
    setActiveSlideIndex(activeSlideIndex + 1);
  };

  const handlePrevPreview = () => {
    if (previewIndex === null || activeSlideIndex <= 0) return;
    setActiveSlideIndex(activeSlideIndex - 1);
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
  }, [previewIndex, activeSlideIndex, currentCarouselImages]);

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
  
  // Extract Supabase storage path from public URL
  const extractStoragePath = (publicUrl: string): string | null => {
    try {
      const url = new URL(publicUrl);
      // Path format: /storage/v1/object/public/studio-assets/ORG_ID/...
      const match = url.pathname.match(/\/storage\/v1\/object\/public\/studio-assets\/(.+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  // Download using Supabase SDK - bypasses CORS issues entirely
  const handleDownload = async (url: string, filename: string = 'carrossel.png') => {
    const toastId = toast.loading('A preparar download...');
    try {
      const storagePath = extractStoragePath(url);
      let blob: Blob;

      if (storagePath) {
        // Use Supabase SDK which handles auth and CORS
        const { data, error } = await supabase.storage.from('studio-assets').download(storagePath);
        if (error || !data) throw new Error(error?.message || 'Falha no download');
        blob = data;
      } else {
        // Fallback: direct fetch for non-Supabase URLs
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        blob = await res.blob();
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 3000);
      toast.success('Download iniciado!', { id: toastId });
    } catch (e: any) {
      console.error('Download error:', e);
      toast.error('Erro ao baixar: ' + e.message, { id: toastId });
    }
  };

  const handleBatchDownloadZip = async (urls: string[], zipName: string = 'carrossel-completo.zip') => {
    const toastId = toast.loading(`A preparar ZIP (0/${urls.length})...`);
    try {
      const zip = new JSZip();

      for (let index = 0; index < urls.length; index++) {
        toast.loading(`A preparar ZIP (${index + 1}/${urls.length})...`, { id: toastId });
        const url = urls[index];
        const storagePath = extractStoragePath(url);
        let blob: Blob;

        if (storagePath) {
          const { data, error } = await supabase.storage.from('studio-assets').download(storagePath);
          if (error || !data) throw new Error(`Slide ${index + 1}: ` + (error?.message || 'Falha'));
          blob = data;
        } else {
          const res = await fetch(url);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          blob = await res.blob();
        }

        zip.file(`${index + 1}.png`, blob);
      }

      toast.loading('A gerar arquivo ZIP...', { id: toastId });
      const content = await zip.generateAsync({ type: 'blob' });
      const blobUrl = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = zipName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 3000);
      toast.success('Carrossel ZIP descarregado!', { id: toastId });
    } catch (e: any) {
      console.error('ZIP error:', e);
      toast.error('Erro ao gerar ZIP: ' + e.message, { id: toastId });
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
      toast.error('Informe os detalhes/briefing para o Carrossel');
      return;
    }
    if (!orgId) {
      toast.error('Organização não encontrada');
      return;
    }

    setIsProcessing(true);
    setResultImages([]);
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
    
    let currentContext: any = {
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
        objective: CAROUSEL_OBJECTIVES.find(o => o.id === objective)?.label || objective,
        tone: CAROUSEL_TONES.find(t => t.id === tone)?.label || tone,
        copyLength: CAROUSEL_COPY_LENGTHS.find(l => l.id === copyLength)?.label || copyLength,
        referenceMode: refMode,
        size: CAROUSEL_SIZES.find(s => s.id === aspectRatio)?.label || aspectRatio,
        dimensions: CAROUSEL_SIZES.find(s => s.id === aspectRatio)?.dimensions || '1080x1080',
        ratio: CAROUSEL_SIZES.find(s => s.id === aspectRatio)?.ratio || '1:1',
        numberOfSlides,
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
      let lastImageUrls: string[] = []; 
      
      // Local accumulator for tokens (safest way in a loop)
      let accumulatedUsage = { prompt: 0, candidates: 0 };

      while (currentStepIdx < AGENTS.length && retryCount <= MAX_RETRIES) {
        setCurrentStep(currentStepIdx);
        const agent = AGENTS[currentStepIdx];
        
        if (agent.id === 'designer') {
          const slides = currentContext.copywriter?.slides || [];
          const totalSlides = slides.length;
          const finalImages: string[] = new Array(totalSlides).fill(null);

          // ── JS / Canvas Mode ─────────────────────────────────────────────
          if (generationMode === 'js') {
            setLogs(prev => [...prev, {
              agent: 'designer',
              action: `🖌️ Modo JS: Renderizando ${totalSlides} slides localmente...`,
              status: 'working',
              timestamp: new Date().toISOString()
            }]);

            // Load logo blob once via Supabase SDK (no CORS)
            let logoBlob: Blob | null = null;
            const logoUrl = currentContext.project?.logoUrl;
            if (logoUrl) {
              try {
                const pathMatch = new URL(logoUrl).pathname.match(/\/storage\/v1\/object\/public\/studio-assets\/(.+)/);
                if (pathMatch) {
                  const { data } = await supabase.storage.from('studio-assets').download(pathMatch[1]);
                  logoBlob = data;
                }
              } catch { /* logo optional */ }
            }

            const { width, height } = getSlideDimensions(aspectRatio);
            const ratioKey = getRatioKey(aspectRatio);

            for (let i = 0; i < totalSlides; i++) {
              setLogs(prev => [...prev, {
                agent: 'designer',
                action: `🖌️ Renderizando slide ${i + 1}/${totalSlides}...`,
                status: 'working',
                timestamp: new Date().toISOString()
              }]);
              
              // Load background image for this specific slide
              let slideBgBlob: Blob | null = null;
              if (productImages.length > 0) {
                try {
                  const imgDataUrl = productImages[i % productImages.length];
                  slideBgBlob = dataUrlToBlob(imgDataUrl);
                } catch { /* ignore */ }
              } else if (referenceImage) {
                try {
                  slideBgBlob = dataUrlToBlob(referenceImage);
                } catch { /* ignore */ }
              }

              // Load approved custom base template if any
              let customTemplateBlob: Blob | null = null;
              if (approvedTemplateImage) {
                try {
                  customTemplateBlob = dataUrlToBlob(approvedTemplateImage);
                } catch { /* ignore */ }
              }

              const slideBlob = await renderCarouselSlide({
                width,
                height,
                ratio: ratioKey,
                primaryColor: currentContext.project?.primaryColor || '#F97316',
                secondaryColor: currentContext.project?.secondaryColor || '#1a1a1a',
                fontFamily: currentContext.project?.primaryFont || 'Montserrat',
                logoBlob,
                productBlob: slideBgBlob,
                templateBlob: customTemplateBlob,
                headline: slides[i]?.headline || '',
                body: slides[i]?.body || '',
                slideIndex: i,
                totalSlides,
              });

              // Upload to Supabase Storage
              const fileName = `${orgId}/carousel-squad/${Date.now()}-slide${i + 1}.png`;
              await supabase.storage.from('studio-assets').upload(fileName, slideBlob, { contentType: 'image/png' });
              const { data: { publicUrl } } = supabase.storage.from('studio-assets').getPublicUrl(fileName);

              finalImages[i] = publicUrl;
              const visible = finalImages.filter(Boolean);
              setResultImages([...visible]);
              lastImageUrls = [...visible];

              setLogs(prev => [...prev, {
                agent: 'designer',
                action: `✅ Slide ${i + 1} renderizado.`,
                status: 'completed',
                timestamp: new Date().toISOString()
              }]);
            }

            currentContext.designer = { imageUrls: finalImages };
            currentStepIdx = 4; // Skip to Publisher
            continue;
          }

          // ── AI / Gemini Mode (Sequential com Contexto Visual) ─────────────────────────────

          setLogs(prev => [...prev, {
            agent: 'designer',
            action: `Iniciando Pipeline de Geração Sequencial IA — ${totalSlides} slides.`,
            status: 'working',
            timestamp: new Date().toISOString()
          }]);

          let previousSlideUrl: string | null = null;

          for (let i = 0; i < totalSlides; i++) {
            setCurrentStep(2); // Muda UI para Designer
            setLogs(prev => [...prev, {
              agent: 'designer',
              action: `Criando painel ${i + 1} de ${totalSlides}...`,
              status: 'working',
              timestamp: new Date().toISOString()
            }]);

            const designRes = await supabase.functions.invoke('carousel-squad-orchestrator', {
              body: { 
                agent: 'designer', 
                productImages, 
                referenceImage, 
                approvedTemplateImage, 
                refMode, 
                allowImageManipulation, 
                briefing, 
                organizationId: orgId, 
                projectId: projectId, 
                numSlides: numberOfSlides, 
                context: { 
                  ...currentContext, 
                  slideIndex: i, 
                  slideCopy: slides[i],
                  previousSlideUrl // Passa a imagem anterior como guia visual!
                } 
              }
            });

            if (designRes.error) {
               console.error(`Slide ${i+1} Edge Error:`, designRes.error);
               throw new Error(`Designer falhou no slide ${i + 1}: Edge Function Error (${designRes.error.message})`);
            }

            if (!designRes.data?.success) {
               const serverError = designRes.data?.error || 'Erro interno da IA';
               throw new Error(`Designer falhou no slide ${i + 1}: ${serverError}`);
            }

            const imageUrl = designRes.data.result.imageUrl;
            finalImages[i] = imageUrl;

            setLogs(prev => [...prev, {
                agent: 'designer',
                action: `✓ Slide ${i+1} renderizado.`,
                status: 'completed',
                timestamp: new Date().toISOString()
            }]);

            const visibleImages = finalImages.filter(img => img !== null);
            setResultImages([...visibleImages]);
            lastImageUrls = [...visibleImages];

            // Trigger Reviewer synchronously before moving to next slide
            setCurrentStep(3); // Animates UI back to Reviewer
            setLogs(prev => [...prev, {
                agent: 'reviewer',
                action: `Analisando alinhamento do slide ${i + 1}...`,
                status: 'working',
                timestamp: new Date().toISOString()
            }]);

            const { data: reviewData } = await supabase.functions.invoke('carousel-squad-orchestrator', {
              body: {
                agent: 'reviewer',
                organizationId: orgId,
                projectId: projectId,
                numSlides: numberOfSlides,
                context: { ...currentContext, slideIndex: i, imageUrl }
              }
            });

            if (reviewData?.success && reviewData.result.status === 'approved') {
              setLogs(prev => [...prev, {
                  agent: 'reviewer',
                  action: `✓ Slide ${i+1} aprovado pelo Diretor!`,
                  status: 'completed',
                  timestamp: new Date().toISOString()
              }]);
              // Guarda este slide perfeito como contexto visual para o próximo!
              previousSlideUrl = imageUrl;
            } else if (reviewData?.success && reviewData.result.status === 'rejected') {
              toast.warning(`Diretor de Arte sugeriu ajuste no Slide ${i+1}: ${reviewData.result.feedback}`);
              setLogs(prev => [...prev, {
                  agent: 'reviewer',
                  action: `⚠ Slide ${i+1} sugerido ajuste: ${reviewData.result.feedback}`,
                  status: 'failed',
                  timestamp: new Date().toISOString()
              }]);
              // Even if rejected, we use it as context so the next slide doesn't drift away
              previousSlideUrl = imageUrl;
            } else {
              previousSlideUrl = imageUrl;
            }

            if (designRes.data.usageMetadata) {
                accumulatedUsage.prompt += designRes.data.usageMetadata.promptTokens || 0;
                accumulatedUsage.candidates += designRes.data.usageMetadata.candidatesTokens || 0;
            }
          }

          // Complete Designer Step in Context
          currentContext.designer = { imageUrls: finalImages };
          currentStepIdx = 4; // Skip to Publisher
          continue;
        }

        const { data, error } = await supabase.functions.invoke('carousel-squad-orchestrator', {
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
            numSlides: numberOfSlides,
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
        }

        setLogs(prev => prev.map((log) => 
          log.agent === agent.id && log.status === 'working' ? { 
            ...log, 
            status: 'completed', 
            action: `${agent.label} concluído.`,
            output: JSON.stringify(data.result, null, 2)
          } : log
        ));

        if (agent.id === 'copywriter') {
          let copyData = data.result;
          
          // Pause and let user review the copy
          setIsWaitingForCopyApproval(true);
          setEditableCopy(copyData);
          
          const approvedCopy: any = await new Promise((resolve) => {
             setCopyApprovalResolve({ resolve });
          });
          
          setIsWaitingForCopyApproval(false);
          setCopyApprovalResolve(null);
          setEditableCopy(null);
          
          currentContext.copywriter = approvedCopy;
          if (approvedCopy.social_caption) {
            setResultCaption(approvedCopy.social_caption);
            lastCaption = approvedCopy.social_caption; 
          }
        }

        if (agent.id === 'publisher') {
          // publisher logs are handled in the final save block outside the loop
        }

        // Move to next agent
        currentStepIdx++;
      }

      // Final step: Save and Publish
      if (lastImageUrls.length > 0) {
        setLogs(prev => [...prev, {
          agent: 'publisher',
          action: 'Finalizando projeto e salvando histórico...',
          status: 'completed',
          timestamp: new Date().toISOString()
        }]);

        const { error: insertError } = await supabase.from('studio_carousels').insert({
          project_id: projectId,
          organization_id: orgId,
          image_urls: lastImageUrls,
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
        toast.success('Carrossel gerado com sucesso! 🚀');
      } else {
        throw new Error("Ocorreu um problema ao recuperar as imagens geradas pela IA. Tente novamente.");
      }
    } catch (error: any) {
      console.error('Squad Error:', error);
      toast.error(`Falha na geração: ${error.message}`);
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
        <StudioQuickMenu currentToolId="carousel" />
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
            <h2 className="text-lg font-bold tracking-tight">Gerador de Carrossel</h2>
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

        {/* Generation Mode Toggle */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Modo de Geração
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setGenerationMode('ai')}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
                generationMode === 'ai'
                  ? "bg-primary/10 border-primary/50 ring-1 ring-primary/30 text-foreground"
                  : "bg-background border-primary/10 text-muted-foreground hover:border-primary/20"
              )}
            >
              <Sparkles className={cn("h-5 w-5", generationMode === 'ai' ? "text-primary" : "text-muted-foreground")} />
              <span className="text-[11px] font-bold">IA Generativa</span>
              <span className="text-[9px] leading-tight opacity-70">Criativo, único por geração</span>
            </button>
            <button
              onClick={() => setGenerationMode('js')}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
                generationMode === 'js'
                  ? "bg-primary/10 border-primary/50 ring-1 ring-primary/30 text-foreground"
                  : "bg-background border-primary/10 text-muted-foreground hover:border-primary/20"
              )}
            >
              <Layers className={cn("h-5 w-5", generationMode === 'js' ? "text-primary" : "text-muted-foreground")} />
              <span className="text-[11px] font-bold">Template JS</span>
              <span className="text-[9px] leading-tight opacity-70">100% consistente, rápido</span>
            </button>
          </div>
          {generationMode === 'js' && (
            <p className="text-[10px] text-muted-foreground px-1 leading-relaxed">
              ✅ Layout programático garante logo, fontes e posições idênticos em todos os slides.
            </p>
          )}
        </div>

        {/* Tom de voz */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Tom de Voz
          </h3>
          <div className="flex flex-wrap gap-2">
            {CAROUSEL_TONES.map((t) => (
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
            {CAROUSEL_COPY_LENGTHS.map((l) => (
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

        
        {/* Number of Slides */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Número de Slides
          </h3>
          <div className="flex flex-wrap gap-2">
            {[0, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setNumberOfSlides(num);
                  saveSettings({ numberOfSlides: num });
                }}
                className={cn(
                  "py-2 px-4 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-2",
                  numberOfSlides === num 
                    ? "bg-primary border-primary text-white shadow-lg" 
                    : "bg-background border-primary/10 text-muted-foreground hover:border-primary/30"
                )}
              >
                {num === 0 && <Sparkles className="h-3 w-3" />}
                {num === 0 ? "Automático (IA decide)" : num}
              </button>
            ))}
          </div>
        </div>

        {/* Objective */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Objetivo do Carrossel
          </h3>
          <div className="flex flex-wrap gap-2">
            {CAROUSEL_OBJECTIVES.map((obj) => (
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

        {/* Carousel Size */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            3. Tamanho do Carrossel
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {CAROUSEL_SIZES.map((size) => (
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
            placeholder="Descreva o que deve constar no carrossel, ofertas, chamadas para ação..."
            className="min-h-[80px] max-h-[150px] resize-none border-primary/10 focus-visible:ring-primary/20 text-xs rounded-xl"
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
              Gerar Carrossel Profissional
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
              CRIAR CARROSEL
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
              {!isProcessing && resultImages.length === 0 && (
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
                      {project?.name || 'Carousel Engine'}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed text-balance px-10">
                      Envie o produto e o briefing. Nossos especialistas aplicarão as regras de marca do projeto para garantir o melhor resultado.
                    </p>
                  </div>
                </div>
              )}

              {isProcessing && !isWaitingForCopyApproval && (
                <div className="max-w-xl w-full bg-background rounded-[24px] border shadow-xl overflow-hidden mt-4 animate-in fade-in zoom-in duration-500">
                  <div className="p-6 border-b bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold flex items-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Gerando Carrossel
                      </h3>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {Math.round(((currentStep + 1) / AGENTS.length) * 100)}%
                      </Badge>
                    </div>
                    <Progress value={((currentStep + 1) / AGENTS.length) * 100} className="h-2 rounded-full" />
                  </div>

                  <div className="p-6 space-y-4 relative">
                    {/* Linha vertical que conecta os ícones */}
                    <div className="absolute left-[41px] top-[42px] bottom-[42px] w-[2px] bg-muted/60 z-0 rounded-full" />
                    
                    {AGENTS.map((agent, i) => {
                      if (generationMode === 'js' && agent.id === 'reviewer') return null;

                      const isActive = i === currentStep;
                      const isDone = i < currentStep && currentStep !== -1;
                      const isPending = i > currentStep;
                      
                      const agentLogs = logs.filter(l => l.agent === agent.id);
                      const lastLog = agentLogs.length > 0 ? agentLogs[agentLogs.length - 1] : null;

                      // Display the real action text if it's working or failed
                      let displayDesc = agent.description;
                      if (isActive && lastLog) {
                        displayDesc = lastLog.action;
                      } else if (isDone) {
                        displayDesc = "Concluído";
                      } else if (isPending) {
                        displayDesc = "Aguardando a vez...";
                      }

                      // Adjust status text color and style based on log status
                      let statusBadge = "Aguardando";
                      if (isActive) statusBadge = "Trabalhando";
                      if (isDone) statusBadge = "Verificado";
                      if (lastLog?.status === 'failed') statusBadge = "Tentando Novamente";

                      return (
                        <div key={agent.id} className={cn(
                          "flex gap-4 items-start transition-all duration-500 relative z-10",
                          isActive ? "opacity-100 translate-x-1" : "opacity-40",
                          isPending && "filter grayscale"
                        )}>
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all duration-500 border-2",
                            isActive ? "bg-primary text-white border-primary scale-110 shadow-primary/30" : 
                            isDone ? "bg-green-500 text-white border-green-500" : 
                            "bg-muted text-muted-foreground border-transparent"
                          )}>
                            {isDone && generationMode !== 'ai' ? <CheckCircle2 className="h-5 w-5" /> : 
                             isDone && generationMode === 'ai' && agent.id === 'designer' ? <CheckCircle2 className="h-5 w-5" /> : 
                            <agent.icon className={cn("h-5 w-5", isActive && "animate-pulse")} />}
                          </div>
                          
                          <div className="flex-1 space-y-0.5 pt-1.5">
                            <div className="flex items-center justify-between">
                              <span className={cn("font-bold text-xs tracking-tight transition-colors", isActive ? "text-foreground" : "text-muted-foreground")}>{agent.label}</span>
                              <span className={cn(
                                "text-[9px] font-black tracking-widest uppercase transition-colors px-2 py-0.5 rounded-full outline outline-1",
                                isActive ? "text-primary outline-primary/30 bg-primary/10 animate-pulse" : 
                                isDone ? "text-green-500 outline-green-500/30 bg-green-500/10" : 
                                "text-muted-foreground outline-transparent"
                              )}>{statusBadge}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className={cn(
                                "text-[11px] font-medium line-clamp-1 transition-colors duration-300",
                                isActive && "text-primary italic animate-in fade-in slide-in-from-left-2",
                                isDone && "text-muted-foreground",
                                isPending && "text-muted-foreground/50",
                                lastLog?.status === 'failed' && "text-amber-500"
                              )}>
                                {displayDesc}
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
                <div className="max-w-3xl w-full bg-background rounded-[24px] border shadow-xl mt-4 animate-in fade-in zoom-in duration-500 mb-20">
                  <div className="p-6 border-b bg-gradient-to-br from-primary/5 to-transparent flex flex-col gap-2">
                    <h3 className="font-bold flex items-center gap-2 text-sm text-primary">
                      ✨ Revisão de Copy
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Analise e modifique o conteúdo gerado pela IA antes de enviar para o Diretor de Arte (Designer).
                    </p>
                  </div>
                  <div className="p-6 pb-12 space-y-6">
                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Legenda (Social Caption)</Label>
                      <Textarea 
                        value={editableCopy.social_caption || ''} 
                        onChange={(e) => setEditableCopy({...editableCopy, social_caption: e.target.value})}
                        className="text-xs min-h-[100px] rounded-xl border-primary/20"
                      />
                    </div>
                    
                    <div className="space-y-4">
                      {editableCopy.slides?.map((slide: any, idx: number) => (
                        <div key={idx} className="p-4 border rounded-xl space-y-3 bg-muted/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="font-mono text-[10px] bg-background">Slide {idx + 1}</Badge>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[11px] font-bold">Headline (Título Forte)</Label>
                            <Input 
                              value={slide.headline || ''}
                              onChange={(e) => {
                                const newSlides = [...editableCopy.slides];
                                newSlides[idx] = { ...slide, headline: e.target.value };
                                setEditableCopy({ ...editableCopy, slides: newSlides });
                              }}
                              className="text-sm font-bold h-10 border-primary/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[11px] font-bold">Body (Corpo de Texto)</Label>
                            <Textarea 
                              value={slide.body || ''}
                              onChange={(e) => {
                                const newSlides = [...editableCopy.slides];
                                newSlides[idx] = { ...slide, body: e.target.value };
                                setEditableCopy({ ...editableCopy, slides: newSlides });
                              }}
                              className="text-xs min-h-[60px] resize-y border-primary/20"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button 
                      className="w-full h-12 rounded-xl text-xs font-black tracking-tight mt-6" 
                      onClick={() => copyApprovalResolve?.resolve(editableCopy)}
                    >
                      APROVAR COPY E CONTINUAR PARA DESIGN <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {resultImages.length > 0 && !isProcessing && (
                <div className="max-w-2xl w-full space-y-6 animate-in slide-in-from-bottom-8 duration-700 mt-4">
                  <div className="relative group rounded-[24px] overflow-hidden shadow-2xl border-4 border-background bg-muted cursor-zoom-in" onClick={() => setPreviewIndex(0)}>
                      
                      <div className="flex overflow-x-auto snap-x space-x-4 p-4 w-full">
                        {resultImages.map((img, idx) => (
                          <img 
                            key={idx} 
                            src={img} 
                            alt={`Final Slide ${idx + 1}`} 
                            className="w-3/4 max-w-sm h-auto snap-center rounded-[24px] shadow-sm ring-1 ring-background cursor-pointer hover:scale-[1.02] transition-transform" 
                            onClick={() => {
                              setPreviewIndex(0); // For create tab, previewIndex is just a toggle
                              setActiveSlideIndex(idx);
                            }}
                          />
                        ))}
                      </div>
  
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-8 pointer-events-none">
                        <div className="flex gap-3 items-center" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              size="default" 
                              className="rounded-xl h-12 px-6 shadow-xl pointer-events-auto"
                              onClick={() => handleBatchDownloadZip(resultImages, `carrossel-${project?.name || 'design'}.zip`)}
                            >
                              <Download className="mr-2 h-4 w-4" /> Download 4K (ZIP)
                            </Button>
                            <Button 
                              size="icon" 
                              variant="secondary" 
                              className="rounded-xl h-12 w-12 shadow-xl pointer-events-auto text-foreground" 
                              onClick={(e) => { e.stopPropagation(); setResultImages([]); }}
                            >
                              <X className="h-5 w-5" />
                            </Button>
                        </div>
                      </div>
                  </div>
                  <div className="flex justify-center">
                      <Button variant="outline" className="rounded-xl" onClick={() => {
                        setResultImages([]);
                        setResultCaption(null);
                      }}>
                        Criar outro Carrossel
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
                       .map((carousel) => (
                        <div 
                          key={carousel.id} 
                          className="group relative aspect-[3/4] bg-muted rounded-[24px] overflow-hidden border shadow-sm hover:shadow-xl transition-all cursor-zoom-in isolate"
                            onClick={() => {
                              const idx = history.findIndex(h => h.id === carousel.id);
                              setPreviewIndex(idx);
                              setActiveSlideIndex(0);
                            }}
                        >
                           <img 
                             src={carousel.image_urls?.[0]} 
                             alt={carousel.prompt} 
                             className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 transform-gpu will-change-transform" 
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all p-6 flex flex-col justify-end">
                              <p className="text-white text-xs line-clamp-2 mb-4 font-medium opacity-80">{carousel.prompt}</p>
                              <div className="flex gap-2">
                                 <Button 
                                   size="sm" 
                                   className="flex-1 rounded-xl h-10 bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     const idx = history.findIndex(h => h.id === carousel.id);
                                     setPreviewIndex(idx);
                                     setActiveSlideIndex(0);
                                   }}
                                 >
                                   <Eye className="h-4 w-4 mr-2" /> Ver
                                 </Button>
                                 <Button 
                                   size="icon" 
                                   className="rounded-xl h-10 w-10 bg-white text-black hover:bg-white/90"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     carousel.image_urls?.forEach((u: string, i: number) => handleDownload(u, `carousel-${carousel.id}-${i+1}.png`));
                                   }}
                                 >
                                   <Download className="h-4 w-4" />
                                 </Button>
                              </div>
                           </div>
                           <div className="absolute top-4 left-4">
                              <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-[9px]">
                                {formatDistanceToNow(new Date(carousel.created_at), { addSuffix: true, locale: ptBR })}
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
                      <p className="text-sm font-medium">Nenhum carrossel gerado neste projeto ainda.</p>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Image Preview Modal ── */}
      {previewIndex !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setPreviewIndex(null)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Navegação */}
          {currentCarouselImages.length > 1 && (
            <>
              {activeSlideIndex > 0 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 rounded-full h-12 w-12 hidden md:flex transition-all hover:scale-110"
                  onClick={(e) => { e.stopPropagation(); handlePrevPreview(); }}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}
              {activeSlideIndex < currentCarouselImages.length - 1 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 rounded-full h-12 w-12 hidden md:flex transition-all hover:scale-110"
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
            <div className="relative group flex-1 flex flex-col items-center justify-center gap-4">
              <img 
                src={currentCarouselImages[activeSlideIndex]} 
                alt="Carrossel Preview" 
                className="max-w-full max-h-[60vh] md:max-h-[80vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/10 transition-all duration-300" 
              />
              
              {/* Pontos de Paginação */}
              {currentCarouselImages.length > 1 && (
                <div className="flex gap-2 p-2 bg-black/40 backdrop-blur-md rounded-full shadow-lg">
                  {currentCarouselImages.map((_, dotIdx) => (
                    <div 
                      key={dotIdx}
                      role="button"
                      onClick={() => setActiveSlideIndex(dotIdx)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all duration-300 cursor-pointer",
                        activeSlideIndex === dotIdx 
                          ? "bg-primary w-6" 
                          : "bg-white/20 hover:bg-white/40"
                      )}
                    />
                  ))}
                </div>
              )}

              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge className="bg-black/60 backdrop-blur-md border-white/10">
                  {activeSlideIndex + 1} / {currentCarouselImages.length}
                </Badge>
              </div>
            </div>

            {/* Direita: Conteúdo e Legenda */}
            <div className="w-full md:w-[400px] shrink-0 flex flex-col gap-6 bg-white/5 backdrop-blur-xl rounded-[32px] p-6 border border-white/10 shadow-2xl">
              <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  Detalhes do Carrossel
                </h3>
                
                <div className="space-y-4 overflow-y-auto flex-1 pr-2">
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

              <div className="pt-6 border-t border-white/10 flex flex-col gap-3">
                <Button 
                  className="rounded-xl w-full h-12 font-bold shadow-xl bg-primary hover:bg-primary/90 text-white"
                  onClick={() => handleDownload(currentCarouselImages[activeSlideIndex], `${activeSlideIndex + 1}.png`)}
                >
                  <Download className="mr-2 h-5 w-5" /> Baixar Slide {activeSlideIndex + 1}
                </Button>
                
                {currentCarouselImages.length > 1 && (
                  <Button 
                    variant="secondary"
                    className="rounded-xl w-full h-12 font-bold shadow-xl text-foreground"
                    onClick={() => handleBatchDownloadZip(currentCarouselImages, `carrossel-${project?.name || 'historico'}.zip`)}
                  >
                    <Download className="mr-2 h-5 w-5" /> Baixar Carrossel Inteiro (ZIP)
                  </Button>
                )}
                
                <Button 
                  variant="outline"
                  className="rounded-xl w-full h-12 font-bold border-white/10 text-white hover:bg-white/5"
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
