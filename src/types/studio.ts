import { LucideIcon, Palette, Sparkles, Image, Paintbrush, Video, Maximize } from 'lucide-react';

// 5 modos de geração
export type GenerationMode = 'original' | 'copy' | 'inspiration' | 'product' | 'template' | 'squad';

export type FlyerSquadAgent = 'orchestrator' | 'copywriter' | 'photographer' | 'designer' | 'reviewer' | 'publisher';

export interface SquadLog {
  agent: FlyerSquadAgent;
  action: string;
  output?: string;
  timestamp: string;
  status: 'pending' | 'working' | 'completed' | 'failed' | 'rejected';
  feedback?: string;
}

export interface FlyerSquadMetadata {
  session_id: string;
  current_agent: FlyerSquadAgent;
  logs: SquadLog[];
  reference_flyer_url?: string;
  product_image_url?: string;
  copy?: {
    headline: string;
    subheadline: string;
    body: string;
    cta: string;
    tone: string;
  };
  visual_plan?: {
    background_prompt: string;
    assets_needed: string[];
    layout_notes: string;
  };
}

// Tamanhos disponíveis
export type StudioImageSize = '1080x1080' | '1080x1920' | '1920x1080' | '1080x1350' | '1280x720';

// Configuração de tamanho
export interface SizeConfig {
  value: StudioImageSize;
  label: string;
  aspectRatio: string;
  orientation: string;
  width: number;
  height: number;
}

// ── Studio Tools ──────────────────────────────────────────────────────────

export type StudioToolCategory = 'create_image' | 'editing' | 'squad' | 'create_video';

export interface StudioTool {
  id: string;
  label: string;
  description: string;
  category: StudioToolCategory;
  icon: LucideIcon;
  requiresInputImage?: boolean;
  inputLabel?: string;
  promptPlaceholder: string;
  gradientFrom: string;
  gradientTo: string;
  previewImage?: string;
  status?: 'active' | 'development';
}

export interface StudioImage {
  id: string;
  organization_id: string;
  created_by: string;
  tool_id: string;
  prompt: string;
  image_url: string;
  size: string;
  style: string;
  model: string;
  input_image_url?: string | null;
  title?: string | null;
  created_at: string;
}

export interface StudioCarousel {
  id: string;
  project_id: string;
  organization_id: string;
  created_by: string;
  prompt: string;
  image_urls: string[];
  size: string;
  style?: string;
  niche?: string;
  model?: string;
  generation_mode?: string;
  title?: string;
  social_caption?: string;
  usage_prompt?: number;
  usage_candidates?: number;
  model_meta?: string;
  created_at: string;
}

export interface ToolGenerationSettings {
  toolId: string;
  prompt: string;
  size: StudioImageSize;
  style: 'vivid' | 'natural';
  model: 'gemini-flash' | 'gemini-pro';
  inputImage?: string;
}

export const STUDIO_TOOL_CATEGORIES: { id: StudioToolCategory; label: string; icon: LucideIcon }[] = [
  { id: 'squad', label: 'Especialistas', icon: Sparkles },
  { id: 'create_image', label: 'Criar Imagens com IA', icon: Palette },
  { id: 'create_video', label: 'Criar Vídeos com IA', icon: Video },
];

export const STUDIO_TOOLS: StudioTool[] = [
  {
    id: 'recolor',
    label: 'Recolorar',
    description: 'Recolora produtos ou imagens com novas paletas',
    category: 'create_image',
    icon: Paintbrush,
    requiresInputImage: true,
    inputLabel: 'Imagem a recolorir',
    promptPlaceholder: 'Ex: Mudar para tons azul navy com acabamento metálico...',
    gradientFrom: '#f59e0b',
    gradientTo: '#ef4444',
    previewImage: '/inspiration/recolor_preview_landscape.png',
  },
  {
    id: 'upscale',
    label: 'Upscale HD (Para Impressão)',
    description: 'Aumente extrema a resolução e qualidade (Upscale 4x) para impressão sem distorcer',
    category: 'create_image',
    icon: Maximize,
    requiresInputImage: true,
    inputLabel: 'Imagem a melhorar',
    promptPlaceholder: 'Detalhes que deseja realçar (Opcional)...',
    gradientFrom: '#eab308',
    gradientTo: '#ea580c',
    previewImage: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=800&auto=format&fit=crop',
  },
  // ── Squad Specialists ──────────────────────────────────────────────
  {
    id: 'flyer',
    label: 'Flyer',
    description: 'Criação profissional de flyers com um time de especialistas IA',
    category: 'squad',
    icon: Sparkles,
    requiresInputImage: true,
    inputLabel: 'Produto principal',
    promptPlaceholder: 'Ex: Black Friday com descontos imperdíveis...',
    gradientFrom: '#8b5cf6',
    gradientTo: '#d946ef',
    previewImage: '/inspiration/flyer_clean_mockup.png',
  },
  {
    id: 'carousel',
    label: 'Carrossel',
    description: 'Criação de publicações multicamadas (sequência de imagens) para redes sociais',
    category: 'squad',
    icon: Sparkles,
    requiresInputImage: true,
    inputLabel: 'Produto principal',
    promptPlaceholder: 'Ex: Conteúdo educativo passo-a-passo sobre marketing...',
    gradientFrom: '#f43f5e',
    gradientTo: '#ec4899',
    previewImage: '/inspiration/carousel_clean_mockup.png',
  },
  // ── Criar Imagens com IA ────────────────────────────────────────────────
  {
    id: 'product-beautifier',
    label: 'Embelezar Produto',
    description: 'Embeleze fotos de produtos com fundo premium',
    category: 'create_image',
    icon: Sparkles,
    requiresInputImage: true,
    inputLabel: 'Foto do produto',
    promptPlaceholder: 'Ex: Fundo de estúdio branco minimalista com sombra suave...',
    gradientFrom: '#06b6d4',
    gradientTo: '#3b82f6',
    previewImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800&ar=16:9&crop=entropy',
  },
  {
    id: 'product-staging',
    label: 'Cenário de Produto',
    description: 'Coloque produtos em ambientes realistas',
    category: 'create_image',
    icon: Image,
    requiresInputImage: true,
    inputLabel: 'Foto do produto',
    promptPlaceholder: 'Ex: Sala de estar moderna com luz natural do fim do dia...',
    gradientFrom: '#10b981',
    gradientTo: '#059669',
    previewImage: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=800&ar=16:9&crop=entropy',
  },
  // ── Criar Vídeos com IA ──────────────────────────────────────────────────
  {
    id: 'video-generator',
    label: 'Gerador de Vídeo',
    description: 'Transforme texto e imagens em vídeos incríveis com a nova IA Veo 3.1',
    category: 'create_video',
    icon: Video,
    requiresInputImage: false,
    inputLabel: 'Imagens iniciais ou finais',
    promptPlaceholder: 'Ex: A câmera se aproxima de um escritório moderno... ',
    gradientFrom: '#8b5cf6',
    gradientTo: '#ef4444',
    previewImage: 'https://images.unsplash.com/photo-1578022761797-b8636ac1773c?q=80&w=800&auto=format&fit=crop',
    status: 'development',
  },
  {
    id: 'longa-metragem',
    label: 'Extender Vídeo (Longa Metragem)',
    description: 'Crie um vídeo estendido encadeando múltiplas cenas e prompts.',
    category: 'create_video',
    icon: Video,
    requiresInputImage: false,
    inputLabel: 'Imagens e clipes',
    promptPlaceholder: 'Adicione múltiplos cenários...',
    gradientFrom: '#06b6d4',
    gradientTo: '#d946ef',
    previewImage: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=800&auto=format&fit=crop',
    status: 'development',
  },
];
