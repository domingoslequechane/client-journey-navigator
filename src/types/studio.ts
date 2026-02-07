export interface StudioProject {
  id: string;
  organization_id: string;
  created_by: string;
  client_id: string | null;
  name: string;
  description: string | null;
  niche: string | null;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  ai_instructions: string | null;
  ai_restrictions: string | null;
  logo_images: string[];
  reference_images: string[];
  template_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioFlyer {
  id: string;
  project_id: string;
  organization_id: string;
  created_by: string;
  prompt: string;
  image_url: string;
  size: string;
  style: string;
  niche: string | null;
  model: string;
  generation_mode: string;
  created_at: string;
}

export interface StudioFlyerRating {
  id: string;
  flyer_id: string;
  user_id: string;
  rating: number;
  feedback: string | null;
  created_at: string;
}

export interface StudioAILearning {
  id: string;
  project_id: string;
  user_id: string;
  learning_type: 'preference' | 'correction' | 'style' | 'feedback';
  content: string;
  context: string | null;
  created_at: string;
}

// 3 modos de geração (removidos Produto Exato e Template)
export type GenerationMode = 'original' | 'copy' | 'inspiration';

// Tamanhos disponíveis
export type FlyerSize = '1080x1080' | '1080x1920' | '1920x1080' | '1080x1350' | '1280x720';

// Configuração de tamanho
export interface SizeConfig {
  value: FlyerSize;
  label: string;
  aspectRatio: string;
  orientation: string;
  width: number;
  height: number;
}

// Nichos com produtos específicos
export type FlyerNiche = 
  | 'Construção'
  | 'Mobiliário'
  | 'Automóvel'
  | 'Imobiliário'
  | 'Restaurante'
  | 'Beleza'
  | 'Saúde'
  | 'Tecnologia'
  | 'Moda'
  | 'Fitness'
  | 'Pet Shop'
  | 'Agricultura'
  | 'Ótica'
  | 'Farmácia'
  | 'Joalharia'
  | 'Eventos'
  | 'Educação'
  | 'Outro';

// Tom/Mood
export type FlyerMood = 
  | 'Profissional'
  | 'Moderno'
  | 'Minimalista'
  | 'Vibrante'
  | 'Elegante'
  | 'Rústico'
  | 'Tecnológico'
  | 'Divertido'
  | 'Luxuoso'
  | 'Corporativo';

// Cores simplificadas
export type FlyerColorScheme = 
  | 'Cores do Cliente'
  | 'Aleatórias (IA escolhe)';

// Elementos visuais
export type FlyerElement = 
  | 'Produto 3D'
  | 'Pessoas'
  | 'Paisagem'
  | 'Abstrato'
  | 'Ícones'
  | 'Formas Geométricas'
  | 'Gradientes'
  | 'Texturas';

// Configurações completas de geração
export interface GenerationSettings {
  prompt: string;
  size: FlyerSize;
  style: 'vivid' | 'natural';
  mode: GenerationMode;
  model: 'gemini-flash' | 'gemini-pro';
  // Campos opcionais
  mood?: FlyerMood;
  colors?: FlyerColorScheme;
  elements?: FlyerElement;
  preserveProduct?: boolean;
  productImage?: string;
}

// Constantes
export const SIZE_OPTIONS: SizeConfig[] = [
  { value: '1080x1080', label: 'Instagram Post', aspectRatio: '1:1', orientation: 'Quadrado', width: 1080, height: 1080 },
  { value: '1080x1920', label: 'Stories', aspectRatio: '9:16', orientation: 'Retrato (Stories)', width: 1080, height: 1920 },
  { value: '1920x1080', label: 'Banner/Paisagem', aspectRatio: '16:9', orientation: 'Paisagem (Banner)', width: 1920, height: 1080 },
  { value: '1080x1350', label: 'Carrossel', aspectRatio: '4:5', orientation: 'Retrato (Carrossel)', width: 1080, height: 1350 },
  { value: '1280x720', label: 'YouTube Thumbnail', aspectRatio: '16:9', orientation: 'YouTube Thumbnail', width: 1280, height: 720 },
];

export const NICHE_OPTIONS: FlyerNiche[] = [
  'Construção', 'Mobiliário', 'Automóvel', 'Imobiliário', 'Restaurante',
  'Beleza', 'Saúde', 'Tecnologia', 'Moda', 'Fitness', 'Pet Shop',
  'Agricultura', 'Ótica', 'Farmácia', 'Joalharia', 'Eventos', 'Educação', 'Outro'
];

export const MOOD_OPTIONS: FlyerMood[] = [
  'Profissional', 'Moderno', 'Minimalista', 'Vibrante', 'Elegante',
  'Rústico', 'Tecnológico', 'Divertido', 'Luxuoso', 'Corporativo'
];

export const COLOR_SCHEME_OPTIONS: FlyerColorScheme[] = [
  'Cores do Cliente', 'Aleatórias (IA escolhe)'
];

export const ELEMENT_OPTIONS: FlyerElement[] = [
  'Produto 3D', 'Pessoas', 'Paisagem', 'Abstrato',
  'Ícones', 'Formas Geométricas', 'Gradientes', 'Texturas'
];

export const MODE_OPTIONS: { value: GenerationMode; label: string; description: string }[] = [
  { value: 'original', label: 'Criação Original', description: 'Design 100% original com estética brasileira' },
  { value: 'copy', label: 'Cópia de Referência', description: 'Copia layout exato das referências do projeto' },
  { value: 'inspiration', label: 'Inspiração', description: 'Original mas inspirado nas referências' },
];

export const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans', 'Lato',
  'Playfair Display', 'Bebas Neue', 'Oswald', 'Raleway', 'Nunito',
  'Source Sans Pro', 'PT Sans', 'Ubuntu', 'Merriweather',
  'Dancing Script', 'Pacifico', 'Lobster', 'Righteous', 'Archivo Black',
];
