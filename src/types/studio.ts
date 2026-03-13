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
  footer_text: string | null;
  logo_images: string[];
  reference_images: string[];
  template_image: string | null;
  template_definition?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface StudioFlyer {
  id: string;
  project_id: string;
  organization_id: string;
  created_by: string;
  prompt: string;
  title?: string;
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

// 5 modos de geração
export type GenerationMode = 'original' | 'copy' | 'inspiration' | 'product' | 'template';

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
  | 'Material de Construção'
  | 'Material Decorativo'
  | 'Mobiliário'
  | 'Automóvel'
  | 'Peças Automóveis'
  | 'Imobiliário'
  | 'Restaurante'
  | 'Padaria & Confeitaria'
  | 'Supermercado'
  | 'Beleza'
  | 'Barbearia'
  | 'Saúde'
  | 'Clínica Médica'
  | 'Farmácia'
  | 'Tecnologia'
  | 'Informática'
  | 'Moda'
  | 'Calçados'
  | 'Fitness'
  | 'Pet Shop'
  | 'Agricultura'
  | 'Ótica'
  | 'Joalharia'
  | 'Eventos'
  | 'Educação'
  | 'Contabilidade'
  | 'Advocacia'
  | 'Seguros'
  | 'Logística'
  | 'Gráfica & Impressão'
  | 'Limpeza & Higiene'
  | 'Eletrodomésticos'
  | 'Eletrônicos'
  | 'Papelaria'
  | 'Brinquedos'
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
  allowManipulation?: boolean;
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
  'Construção', 'Material de Construção', 'Material Decorativo', 'Mobiliário',
  'Automóvel', 'Peças Automóveis', 'Imobiliário',
  'Restaurante', 'Padaria & Confeitaria', 'Supermercado',
  'Beleza', 'Barbearia', 'Saúde', 'Clínica Médica', 'Farmácia',
  'Tecnologia', 'Informática', 'Moda', 'Calçados', 'Fitness',
  'Pet Shop', 'Agricultura', 'Ótica', 'Joalharia', 'Eventos', 'Educação',
  'Contabilidade', 'Advocacia', 'Seguros', 'Logística',
  'Gráfica & Impressão', 'Limpeza & Higiene', 'Eletrodomésticos',
  'Eletrônicos', 'Papelaria', 'Brinquedos', 'Outro'
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
  { value: 'original', label: 'Modo Original', description: 'IA decide livremente. Sem copiar refs.' },
  { value: 'copy', label: 'Modo Cópia', description: 'Cópia EXATA do template. Altera só texto/cores.' },
  { value: 'inspiration', label: 'Modo Inspiração', description: 'Resultado mais próximo possível da referência.' },
  { value: 'product', label: 'Modo Produto', description: 'Preserva o(s) produto(s) exatamente como na foto.' },
  { value: 'template', label: 'Modo Template', description: 'Fiel ao layout aprovado, novo fundo e imagens.' },
];

export const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans', 'Lato',
  'Playfair Display', 'Bebas Neue', 'Oswald', 'Raleway', 'Nunito',
  'Source Sans Pro', 'PT Sans', 'Ubuntu', 'Merriweather',
  'Dancing Script', 'Pacifico', 'Lobster', 'Righteous', 'Archivo Black',
];

export interface InspirationTemplate {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string; // Pode ser um gradiente visual no começo
  ai_instructions: string;
  badge?: string;
}

export const INSPIRATION_TEMPLATES: InspirationTemplate[] = [
  {
    id: 'minimalist-clean',
    name: 'Minimalista & Clean',
    description: 'Design focado no vazio com tipografia elegante.',
    thumbnailUrl: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    ai_instructions: 'ESTILO: Minimalista Extremo. Use muito espaço negativo (white space). Tipografia limpa, sem serifs ou serifadas finas luxuosas. O produto/elemento deve estar isolado num fundo suave e liso. NADA de poluição visual, elementos geométricos apenas se forem muito discretos (linhas finas ou um único círculo de contraste).',
    badge: 'Pop'
  },
  {
    id: 'neon-cyber',
    name: 'Neon Cyberpunk',
    description: 'Cores vibrantes, alto contraste e glows intensos.',
    thumbnailUrl: 'linear-gradient(135deg, #1f005c 0%, #5b0060 30%, #870160 50%, #ac255e 80%, #ca485c 100%)',
    ai_instructions: 'ESTILO: Neon Cyberpunk. Fundo escuro (preto, roxo profundo ou azul marinho). Muito uso de luzes Neon vibrantes (rosa, ciano, roxo) banhando o produto. Elementos brilhantes, reflexos em piso metálico ou molhado. Atmosfera muito moderna, tecnológica e ligeiramente agressiva.',
    badge: 'Tech'
  },
  {
    id: 'luxury-gold',
    name: 'Elegante & Luxo',
    description: 'Tons escuros com detalhes dourados, textura premium.',
    thumbnailUrl: 'linear-gradient(135deg, #000000 0%, #1e1e1e 50%, #b8860b 100%)',
    ai_instructions: 'ESTILO: Luxo Extremo. Paleta base preta, azul marinho profundo ou verde esmeralda, acentuada EXCLUSIVAMENTE por dourado ou prata reflexivo. Materiais do fundo devem parecer veludo, mármore negro ou couro. Iluminação de estúdio dramática (chiaroscuro) destacando a altíssima qualidade. Tipografia clássica, espaçada, elegante.',
    badge: 'Premium'
  },
  {
    id: 'vibrant-promo',
    name: 'Promoção Vibrante',
    description: 'Layout para vendas, energia alta e fácil leitura.',
    thumbnailUrl: 'linear-gradient(135deg, #fceabf 0%, #ff5e62 100%)',
    ai_instructions: 'ESTILO: Promoção Comercial/Varejo. Energia LATENTE Altíssima. Formas geométricas grandes, blocos sólidos de cor, faixas inclinadas de atenção. Cores saturadas (amarelo, vermelho, azul). O CTA ("Compre", "Promoção") deve brilhar na arte. Produto posicionado no centro, grande. Fontes block pesadas e impactantes.',
    badge: 'Vendas'
  },
  {
    id: 'organic-nature',
    name: 'Natureza Orgânica',
    description: 'Luz do sol, texturas naturais, folhas, frescor.',
    thumbnailUrl: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', // será atualizado pra tons orgânicos
    ai_instructions: 'ESTILO: Orgânico e Fresco. Use iluminação natural (golden hour ou luz de manhã). Ambiente com elementos da natureza: sombras de folhas de palma projetadas, pedaços de madeira natural, pedra, água respingando. Tipografia suave. Sensação geral de saúde, pureza e calma. Cores terrosas e verdes naturais com fundo claro.',
  },
  {
    id: 'corporate-trust',
    name: 'Confiança Corporativa',
    description: 'Seriedade, simetria, azul e cinza profissionais.',
    thumbnailUrl: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    ai_instructions: 'ESTILO: Corporativo B2B / Business Trust. Layouts organizados em grid e modulares. Formas retangulares. Cores frias que passam confiança (azul escuro, cinza, prateado). Fundos desfocados de escritório moderno em vidro ou formas poligonais discretas. Sensação de precisão, estabilidade, autoridade financeira/legal.',
  }
];

export interface InspirationFlyer {
  id: string;
  url: string;
  category: string;
  alt: string;
}

// ── Studio Tools ──────────────────────────────────────────────────────────

export type StudioToolCategory = 'create_image' | 'editing';

import { LucideIcon, Palette, Sparkles, Image, Paintbrush, Box, Layers, Wand2 } from 'lucide-react';

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

export interface ToolGenerationSettings {
  toolId: string;
  prompt: string;
  size: FlyerSize;
  style: 'vivid' | 'natural';
  model: 'gemini-flash' | 'gemini-pro';
  inputImage?: string;
}

export const STUDIO_TOOL_CATEGORIES: { id: StudioToolCategory; label: string; icon: LucideIcon }[] = [
  { id: 'create_image', label: 'Criar Imagens com IA', icon: Palette },
  // { id: 'editing', label: 'Todas as Ferramentas', icon: Layers },
];

export const STUDIO_TOOLS: StudioTool[] = [
  // ── Criar Imagens com IA ────────────────────────────────────────────────
  /* {
    id: 'flyer',
    label: 'Flyer',
    description: 'Crie flyers promocionais para o seu negócio',
    category: 'create_image',
    emoji: '📋',
    promptPlaceholder: 'Ex: Promoção de Black Friday com 50% de desconto...',
    gradientFrom: '#6366f1',
    gradientTo: '#8b5cf6',
    previewImage: '/inspiration/flyer_preview_landscape.png',
  }, */
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
  /* {
    id: 'virtual-model',
    label: 'Modelo Virtual',
    description: 'Vista roupas num modelo virtual profissional',
    category: 'create_image',
    emoji: '👗',
    requiresInputImage: true,
    inputLabel: 'Foto da roupa/produto',
    promptPlaceholder: 'Ex: Modelo feminino, estúdio clean, postura natural...',
    gradientFrom: '#ec4899',
    gradientTo: '#8b5cf6',
    previewImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800&ar=16:9&crop=entropy',
  }, */
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
  /* {
    id: 'edit-with-ai',
    label: 'Editar com IA',
    description: 'Edite qualquer imagem com instructions em texto',
    category: 'create_image',
    emoji: '🖊️',
    requiresInputImage: true,
    inputLabel: 'Imagem para editar',
    promptPlaceholder: 'Ex: Remover o fundo e adicionar neve ao redor...',
    gradientFrom: '#f97316',
    gradientTo: '#ef4444',
    previewImage: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800&ar=16:9&crop=entropy',
  },
  {
    id: 'ghost-mannequin',
    label: 'Manequim Fantasma',
    description: 'Remova manequins deixando a roupa sem suporte',
    category: 'create_image',
    emoji: '👕',
    requiresInputImage: true,
    inputLabel: 'Foto com manequim',
    promptPlaceholder: 'Ex: Camisola azul com interior visível no pescoço...',
    gradientFrom: '#6366f1',
    gradientTo: '#3b82f6',
    previewImage: '/inspiration/ghost_mannequin_preview_landscape.png',
  },
  {
    id: 'flat-lay',
    label: 'Composição Plana',
    description: 'Crie composições flat lay estilizadas de produtos',
    category: 'create_image',
    emoji: '📐',
    requiresInputImage: true,
    inputLabel: 'Foto do produto',
    promptPlaceholder: 'Ex: Fundo de madeira clara com flores secas ao redor...',
    gradientFrom: '#84cc16',
    gradientTo: '#22c55e',
    previewImage: '/inspiration/flat_lay_preview_landscape.png',
  },
  {
    id: 'logo',
    label: 'Logotipo',
    description: 'Crie logotipos profissionais com IA',
    category: 'create_image',
    emoji: '🏷️',
    promptPlaceholder: 'Ex: Logo minimalista para restaurante de sushi, tons azul e branco...',
    gradientFrom: '#1e40af',
    gradientTo: '#1d4ed8',
    previewImage: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=800&ar=16:9&crop=entropy',
  },
  {
    id: 'create-any-image',
    label: 'Criar Qualquer Imagem',
    description: 'Crie qualquer imagem com imaginação livre',
    category: 'create_image',
    emoji: '🌟',
    promptPlaceholder: 'Descreva a imagem que imagina com o máximo de detalhes...',
    gradientFrom: '#f59e0b',
    gradientTo: '#d97706',
    previewImage: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800&ar=16:9&crop=entropy',
  },
  {
    id: 'instagram-story',
    label: 'Story do Instagram',
    description: 'Stories otimizados 9:16 para Instagram',
    category: 'create_image',
    emoji: '📱',
    promptPlaceholder: 'Ex: Story de promoção de verão com cores vibrantes...',
    gradientFrom: '#e11d48',
    gradientTo: '#9333ea',
    previewImage: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&q=80&w=800&ar=16:9&crop=entropy',
  },
  {
    id: 'product-photography',
    label: 'Fotografia de Produto',
    description: 'Fotografia profissional de produto com IA',
    category: 'create_image',
    emoji: '📷',
    requiresInputImage: true,
    inputLabel: 'Foto original do produto',
    promptPlaceholder: 'Ex: Fotografia de estúdio com fundo branco e iluminação lateral...',
    gradientFrom: '#0ea5e9',
    gradientTo: '#0284c7',
    previewImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800&ar=16:9&crop=entropy',
  },
  {
    id: 'product-packaging',
    label: 'Embalagem de Produto',
    description: 'Mockup de embalagens criativas e profissionais',
    category: 'create_image',
    emoji: '📦',
    promptPlaceholder: 'Ex: Caixa de chá premium com design japonês, dourado e verde...',
    gradientFrom: '#ca8a04',
    gradientTo: '#b45309',
    previewImage: '/inspiration/product_packaging_preview_landscape.png',
  }, */

  // ── Ferramentas de Edição ───────────────────────────────────────────────
  /* {
    id: 'ai-backgrounds',
    label: 'Fundos com IA',
    description: 'Substitua fundos de imagens por cenários IA',
    category: 'editing',
    emoji: '🖼️',
    requiresInputImage: true,
    inputLabel: 'Imagem original',
    promptPlaceholder: 'Ex: Substituir fundo por floresta tropical ao pôr do sol...',
    gradientFrom: '#059669',
    gradientTo: '#047857',
    previewImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800&ar=16:9&crop=entropy',
  },
  {
    id: 'ai-expand',
    label: 'Expandir com IA',
    description: 'Expanda imagens além dos limites originais',
    category: 'editing',
    emoji: '↔️',
    requiresInputImage: true,
    inputLabel: 'Imagem a expandir',
    promptPlaceholder: 'Ex: Expandir para a esquerda mostrando rua...',
    gradientFrom: '#0284c7',
    gradientTo: '#0369a1',
    previewImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800&ar=16:9&crop=entropy',
  },
  {
    id: 'ai-images',
    label: 'Imagens com IA',
    description: 'Geração livre de imagens com IA avançada',
    category: 'editing',
    emoji: '🤖',
    promptPlaceholder: 'Descreva a imagem detalhadamente...',
    gradientFrom: '#7c3aed',
    gradientTo: '#5b21b6',
    previewImage: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800&ar=16:9&crop=entropy',
  },
  {
    id: 'ai-shadows',
    label: 'Sombras com IA',
    description: 'Adicione sombras realistas a objetos',
    category: 'editing',
    emoji: '🌑',
    requiresInputImage: true,
    inputLabel: 'Imagem do produto',
    promptPlaceholder: 'Ex: Sombra suave de estúdio luz lateral...',
    gradientFrom: '#374151',
    gradientTo: '#111827',
    previewImage: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=800&ar=16:9&crop=entropy',
  },
  {
    id: 'background-remover',
    label: 'Remover Fundo',
    description: 'Remova fundos automaticamente',
    category: 'editing',
    emoji: '✂️',
    requiresInputImage: true,
    inputLabel: 'Imagem com fundo',
    promptPlaceholder: 'Ex: Remover fundo...',
    gradientFrom: '#dc2626',
    gradientTo: '#b91c1c',
    previewImage: 'https://images.unsplash.com/photo-1558864559-ed673ba3610b?auto=format&fit=crop&q=80&w=800&ar=16:9&crop=entropy',
  },
  {
    id: 'resize',
    label: 'Redimensionar',
    description: 'Redimensione para qualquer formato',
    category: 'editing',
    emoji: '📐',
    requiresInputImage: true,
    inputLabel: 'Imagem a redimensionar',
    promptPlaceholder: 'Ex: Formato 9:16 de Stories...',
    gradientFrom: '#2563eb',
    gradientTo: '#1d4ed8',
    previewImage: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=800&ar=16:9&crop=entropy',
  },
  {
    id: 'retouch',
    label: 'Retocar',
    description: 'Retoques profissionais em fotos',
    category: 'editing',
    emoji: '💄',
    requiresInputImage: true,
    inputLabel: 'Foto a retocar',
    promptPlaceholder: 'Ex: Retocar pele e suavizar...',
    gradientFrom: '#db2777',
    gradientTo: '#be185d',
    previewImage: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=800&ar=16:9&crop=entropy',
  }, */
];

export const INSPIRATION_FLYERS: InspirationFlyer[] = [
  {
    id: 'varejo-1',
    url: '/inspiration/varejo-1.jpg',
    category: 'Varejo',
    alt: 'Carnes e Hortifruti Promo'
  },
  {
    id: 'varejo-2',
    url: '/inspiration/varejo-2.jpg',
    category: 'Varejo',
    alt: 'Layout Supermercado Oferta Dia'
  },
  {
    id: 'varejo-3',
    url: '/inspiration/varejo-3.jpg',
    category: 'Varejo',
    alt: 'Varejo Leite e Descontos'
  },
  {
    id: 'varejo-4',
    url: '/inspiration/varejo-4.jpg',
    category: 'Varejo',
    alt: 'Mercado Confiança 3D'
  },
  {
    id: 'saude-1',
    url: '/inspiration/saude-1.jpg',
    category: 'Saúde',
    alt: 'Odontologia Sorriso'
  },
  {
    id: 'saude-2',
    url: '/inspiration/saude-2.jpg',
    category: 'Saúde',
    alt: 'Odonto Pediatria Clínica'
  },
  {
    id: 'saude-3',
    url: '/inspiration/saude-3.jpg',
    category: 'Saúde',
    alt: 'Limpeza Dental Flyer'
  },
  {
    id: 'saude-4',
    url: '/inspiration/saude-4.jpg',
    category: 'Saúde',
    alt: 'Ortopedia Hospital'
  },
  {
    id: 'saude-5',
    url: '/inspiration/saude-5.jpg',
    category: 'Saúde',
    alt: 'Odonto Prevenção Cuidado'
  },
  {
    id: 'tech-1',
    url: '/inspiration/tech-1.jpg',
    category: 'Tecnologia',
    alt: 'Agência Design Tech'
  },
  {
    id: 'tech-2',
    url: '/inspiration/tech-2.jpg',
    category: 'Tecnologia',
    alt: 'Social Media Trader'
  },
  {
    id: 'tech-3',
    url: '/inspiration/tech-3.jpg',
    category: 'Tecnologia',
    alt: 'iPhone 17 Pro Lançamento'
  },
  {
    id: 'tech-4',
    url: '/inspiration/tech-4.jpg',
    category: 'Tecnologia',
    alt: 'AirPods Max Minimalista'
  },
  {
    id: 'tech-5',
    url: '/inspiration/tech-5.jpg',
    category: 'Tecnologia',
    alt: 'Xbox Series X Promo'
  },
  {
    id: 'food-1',
    url: '/inspiration/food-1.jpg',
    category: 'Restaurante',
    alt: 'Doces Cupcake Premium'
  },
  {
    id: 'food-2',
    url: '/inspiration/food-2.jpg',
    category: 'Restaurante',
    alt: 'Burger Artesanal Promo'
  },
  {
    id: 'food-3',
    url: '/inspiration/food-3.jpg',
    category: 'Restaurante',
    alt: 'Italian Pastries Croissant'
  },
  {
    id: 'food-4',
    url: '/inspiration/food-4.jpg',
    category: 'Restaurante',
    alt: 'Dois Burgers Oferta'
  },
  {
    id: 'food-5',
    url: '/inspiration/food-5.jpg',
    category: 'Restaurante',
    alt: 'Special Food Steak Menu'
  },
  {
    id: 'beauty-1',
    url: '/inspiration/beauty-1.jpg',
    category: 'Estética',
    alt: 'Depilação Tabela Preços'
  },
  {
    id: 'beauty-2',
    url: '/inspiration/beauty-2.jpg',
    category: 'Estética',
    alt: 'Skin Care Produtos Dove'
  },
  {
    id: 'beauty-3',
    url: '/inspiration/beauty-3.jpg',
    category: 'Estética',
    alt: 'Harmonização Facial Detalhes'
  },
  {
    id: 'beauty-4',
    url: '/inspiration/beauty-4.jpg',
    category: 'Estética',
    alt: 'Massagem Facial Clínica'
  },
  {
    id: 'beauty-5',
    url: '/inspiration/beauty-5.jpg',
    category: 'Estética',
    alt: 'Tratamento Pele Produtos'
  },
  {
    id: 'auto-1',
    url: '/inspiration/auto-1.jpg',
    category: 'Automotivo',
    alt: 'Seguro Auto Família'
  },
  {
    id: 'auto-2',
    url: '/inspiration/auto-2.jpg',
    category: 'Automotivo',
    alt: 'Moto Apsonic Urbana'
  },
  {
    id: 'auto-3',
    url: '/inspiration/auto-3.jpg',
    category: 'Automotivo',
    alt: 'Bike Adventure Aventura'
  },
  {
    id: 'auto-4',
    url: '/inspiration/auto-4.jpg',
    category: 'Automotivo',
    alt: 'Triciclo Baton Moise'
  },
  {
    id: 'auto-5',
    url: '/inspiration/auto-5.jpg',
    category: 'Automotivo',
    alt: 'Suspensão e Amortecedores'
  },
  {
    id: 'corp-1',
    url: '/inspiration/corp-1.jpg',
    category: 'Corporativo',
    alt: 'Agência Conectando Marcas'
  },
  {
    id: 'corp-2',
    url: '/inspiration/corp-2.jpg',
    category: 'Corporativo',
    alt: 'Conta PJ Banco'
  },
  {
    id: 'corp-3',
    url: '/inspiration/corp-3.jpg',
    category: 'Corporativo',
    alt: 'Construtora Fase Final'
  },
  {
    id: 'corp-4',
    url: '/inspiration/corp-4.jpg',
    category: 'Corporativo',
    alt: 'Imobiliária Aluguel Rápido'
  },
  {
    id: 'corp-5',
    url: '/inspiration/corp-5.jpg',
    category: 'Corporativo',
    alt: 'Transportadora Dinâmica Logística'
  },
  {
    id: 'event-1',
    url: '/inspiration/event-1.jpg',
    category: 'Eventos',
    alt: 'Campus Trip Excursão'
  },
  {
    id: 'event-2',
    url: '/inspiration/event-2.jpg',
    category: 'Eventos',
    alt: 'Clima Africa Premiação'
  },
  {
    id: 'event-3',
    url: '/inspiration/event-3.jpg',
    category: 'Eventos',
    alt: 'A Mose Live In Concert'
  },
  {
    id: 'event-4',
    url: '/inspiration/event-4.jpg',
    category: 'Eventos',
    alt: 'DJ Guest Domingo Night'
  },
  {
    id: 'event-5',
    url: '/inspiration/event-5.jpg',
    category: 'Eventos',
    alt: 'Culto de Mulheres Adoração'
  }
];
