// Link Tree Types

export interface LinkBlock {
  id: string;
  link_page_id: string;
  type: 'button' | 'text' | 'image' | 'video' | 'social' | 'divider' | 'email-form';
  content: {
    title?: string;
    url?: string;
    imageUrl?: string;
    videoUrl?: string;
    text?: string;
    socials?: { platform: string; url: string }[];
  };
  style?: {
    backgroundColor?: string;
    textColor?: string;
    isTransparent?: boolean;
  };
  is_enabled: boolean;
  sort_order: number;
  clicks: number;
  created_at: string;
  updated_at: string;
}

export interface LinkPageTheme {
  backgroundColor: string;
  primaryColor: string;
  textColor: string;
  fontFamily: string;
  buttonStyle: 'solid' | 'glass' | 'outline' | 'soft';
  buttonRadius: 'pill' | 'rounded' | 'soft' | 'square';
  backgroundImage?: string;
  buttonOpacity?: number;
}

export interface LinkPage {
  id: string;
  client_id: string;
  organization_id: string;
  name: string;
  slug: string;
  logo_url?: string;
  bio?: string;
  theme: LinkPageTheme;
  is_published: boolean;
  custom_domain?: string;
  created_at: string;
  updated_at: string;
  blocks?: LinkBlock[];
}

export interface LinkAnalytics {
  id: string;
  link_page_id: string;
  link_block_id?: string;
  event_type: 'view' | 'click';
  created_at: string;
}

// Template definitions
export interface LinkTreeTemplate {
  id: string;
  name: string;
  thumbnail?: string;
  isColorOnly?: boolean;
  theme: LinkPageTheme;
}

// Color-only templates (no background image)
export const COLOR_ONLY_TEMPLATES: LinkTreeTemplate[] = [
  {
    id: 'color-purple',
    name: 'Roxo',
    isColorOnly: true,
    theme: {
      backgroundColor: '#7c3aed',
      primaryColor: '#ffffff',
      textColor: '#ffffff',
      fontFamily: 'Inter',
      buttonStyle: 'outline',
      buttonRadius: 'pill',
    }
  },
  {
    id: 'color-blue',
    name: 'Azul',
    isColorOnly: true,
    theme: {
      backgroundColor: '#2563eb',
      primaryColor: '#ffffff',
      textColor: '#ffffff',
      fontFamily: 'Inter',
      buttonStyle: 'solid',
      buttonRadius: 'rounded',
    }
  },
  {
    id: 'color-green',
    name: 'Verde',
    isColorOnly: true,
    theme: {
      backgroundColor: '#16a34a',
      primaryColor: '#ffffff',
      textColor: '#ffffff',
      fontFamily: 'Poppins',
      buttonStyle: 'solid',
      buttonRadius: 'pill',
    }
  },
  {
    id: 'color-pink',
    name: 'Rosa',
    isColorOnly: true,
    theme: {
      backgroundColor: '#ec4899',
      primaryColor: '#ffffff',
      textColor: '#ffffff',
      fontFamily: 'Nunito',
      buttonStyle: 'soft',
      buttonRadius: 'rounded',
    }
  },
  {
    id: 'color-orange',
    name: 'Laranja',
    isColorOnly: true,
    theme: {
      backgroundColor: '#ea580c',
      primaryColor: '#ffffff',
      textColor: '#ffffff',
      fontFamily: 'Montserrat',
      buttonStyle: 'outline',
      buttonRadius: 'soft',
    }
  },
  {
    id: 'color-dark',
    name: 'Escuro',
    isColorOnly: true,
    theme: {
      backgroundColor: '#18181b',
      primaryColor: '#fafafa',
      textColor: '#fafafa',
      fontFamily: 'Inter',
      buttonStyle: 'outline',
      buttonRadius: 'rounded',
    }
  },
  {
    id: 'color-light',
    name: 'Claro',
    isColorOnly: true,
    theme: {
      backgroundColor: '#f8fafc',
      primaryColor: '#0f172a',
      textColor: '#0f172a',
      fontFamily: 'Inter',
      buttonStyle: 'solid',
      buttonRadius: 'rounded',
    }
  },
  {
    id: 'color-teal',
    name: 'Teal',
    isColorOnly: true,
    theme: {
      backgroundColor: '#0d9488',
      primaryColor: '#ffffff',
      textColor: '#ffffff',
      fontFamily: 'Quicksand',
      buttonStyle: 'glass',
      buttonRadius: 'pill',
    }
  },
  {
    id: 'color-red',
    name: 'Vermelho',
    isColorOnly: true,
    theme: {
      backgroundColor: '#dc2626',
      primaryColor: '#ffffff',
      textColor: '#ffffff',
      fontFamily: 'Oswald',
      buttonStyle: 'solid',
      buttonRadius: 'soft',
    }
  },
  {
    id: 'color-indigo',
    name: 'Índigo',
    isColorOnly: true,
    theme: {
      backgroundColor: '#4f46e5',
      primaryColor: '#e0e7ff',
      textColor: '#ffffff',
      fontFamily: 'Space Grotesk',
      buttonStyle: 'glass',
      buttonRadius: 'rounded',
    }
  },
];

export const LINK_TREE_TEMPLATES: LinkTreeTemplate[] = [
  {
    id: 'oceano',
    name: 'Oceano',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#0c4a6e',
      primaryColor: '#38bdf8',
      textColor: '#ffffff',
      fontFamily: 'Inter',
      buttonStyle: 'outline',
      buttonRadius: 'pill',
    }
  },
  {
    id: 'fashion',
    name: 'Fashion',
    thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#1a1a1a',
      primaryColor: '#f5f5f5',
      textColor: '#ffffff',
      fontFamily: 'Playfair Display',
      buttonStyle: 'solid',
      buttonRadius: 'soft',
    }
  },
  {
    id: 'confeiteira',
    name: 'Confeiteira',
    thumbnail: 'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#fdf2f8',
      primaryColor: '#ec4899',
      textColor: '#831843',
      fontFamily: 'Poppins',
      buttonStyle: 'soft',
      buttonRadius: 'rounded',
    }
  },
  {
    id: 'elegante',
    name: 'Elegante',
    thumbnail: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#1c1917',
      primaryColor: '#d4af37',
      textColor: '#fafaf9',
      fontFamily: 'Cormorant Garamond',
      buttonStyle: 'outline',
      buttonRadius: 'soft',
    }
  },
  {
    id: 'abstract',
    name: 'Abstract',
    thumbnail: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#6366f1',
      primaryColor: '#a5b4fc',
      textColor: '#ffffff',
      fontFamily: 'Space Grotesk',
      buttonStyle: 'glass',
      buttonRadius: 'rounded',
    }
  },
  {
    id: 'minimal',
    name: 'Minimal',
    thumbnail: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#fafafa',
      primaryColor: '#18181b',
      textColor: '#27272a',
      fontFamily: 'Inter',
      buttonStyle: 'outline',
      buttonRadius: 'rounded',
    }
  },
  {
    id: 'neon',
    name: 'Neon',
    thumbnail: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#0f0f23',
      primaryColor: '#00ff88',
      textColor: '#ffffff',
      fontFamily: 'Orbitron',
      buttonStyle: 'outline',
      buttonRadius: 'pill',
    }
  },
  {
    id: 'pastel',
    name: 'Pastel',
    thumbnail: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#fef3c7',
      primaryColor: '#f97316',
      textColor: '#78350f',
      fontFamily: 'Nunito',
      buttonStyle: 'soft',
      buttonRadius: 'pill',
    }
  },
  {
    id: 'natureza',
    name: 'Natureza',
    thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#14532d',
      primaryColor: '#4ade80',
      textColor: '#ffffff',
      fontFamily: 'Lora',
      buttonStyle: 'solid',
      buttonRadius: 'rounded',
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    thumbnail: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#1c1917',
      primaryColor: '#fb923c',
      textColor: '#fafaf9',
      fontFamily: 'Montserrat',
      buttonStyle: 'solid',
      buttonRadius: 'pill',
    }
  },
  {
    id: 'urban',
    name: 'Urban',
    thumbnail: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#27272a',
      primaryColor: '#a78bfa',
      textColor: '#f4f4f5',
      fontFamily: 'Roboto',
      buttonStyle: 'glass',
      buttonRadius: 'soft',
    }
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    thumbnail: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#0c0a09',
      primaryColor: '#c084fc',
      textColor: '#fafaf9',
      fontFamily: 'Exo 2',
      buttonStyle: 'glass',
      buttonRadius: 'pill',
    }
  },
  {
    id: 'coffee',
    name: 'Coffee',
    thumbnail: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#292524',
      primaryColor: '#a3936e',
      textColor: '#fafaf9',
      fontFamily: 'Libre Baskerville',
      buttonStyle: 'solid',
      buttonRadius: 'soft',
    }
  },
  {
    id: 'praia',
    name: 'Praia',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#f0fdfa',
      primaryColor: '#14b8a6',
      textColor: '#134e4a',
      fontFamily: 'Quicksand',
      buttonStyle: 'soft',
      buttonRadius: 'pill',
    }
  },
  {
    id: 'studio',
    name: 'Studio',
    thumbnail: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#18181b',
      primaryColor: '#ef4444',
      textColor: '#fafafa',
      fontFamily: 'DM Sans',
      buttonStyle: 'outline',
      buttonRadius: 'soft',
    }
  },
  {
    id: 'fitness',
    name: 'Fitness',
    thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=600&fit=crop',
    theme: {
      backgroundColor: '#0f172a',
      primaryColor: '#22d3ee',
      textColor: '#f8fafc',
      fontFamily: 'Oswald',
      buttonStyle: 'solid',
      buttonRadius: 'rounded',
    }
  },
];

import { Instagram, Music2, Youtube, Twitter, Facebook, Linkedin, MessageCircle, Music, Globe, Github, MessageSquare, Send, Twitch } from 'lucide-react';
import { Pin } from 'lucide-react';

export const SOCIAL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F' },
  { id: 'tiktok', name: 'TikTok', icon: Music2, color: '#000000' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000' },
  { id: 'twitter', name: 'X (Twitter)', icon: Twitter, color: '#1DA1F2' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
  { id: 'spotify', name: 'Spotify', icon: Music, color: '#1DB954' },
  { id: 'website', name: 'Website', icon: Globe, color: '#6366F1' },
  { id: 'pinterest', name: 'Pinterest', icon: Globe, color: '#E60023' },
  { id: 'github', name: 'GitHub', icon: Github, color: '#181717' },
  { id: 'discord', name: 'Discord', icon: MessageSquare, color: '#5865F2' },
  { id: 'telegram', name: 'Telegram', icon: Send, color: '#26A5E4' },
  { id: 'twitch', name: 'Twitch', icon: Twitch, color: '#9146FF' },
];

// Google Fonts available
export const GOOGLE_FONTS: { name: string; value: string; link: string }[] = [
  { name: 'Inter', value: 'Inter', link: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  { name: 'Poppins', value: 'Poppins', link: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap' },
  { name: 'Montserrat', value: 'Montserrat', link: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap' },
  { name: 'Roboto', value: 'Roboto', link: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap' },
  { name: 'Open Sans', value: 'Open Sans', link: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap' },
  { name: 'Lato', value: 'Lato', link: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap' },
  { name: 'Playfair Display', value: 'Playfair Display', link: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap' },
  { name: 'Cormorant Garamond', value: 'Cormorant Garamond', link: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap' },
  { name: 'Space Grotesk', value: 'Space Grotesk', link: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap' },
  { name: 'Nunito', value: 'Nunito', link: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap' },
  { name: 'Quicksand', value: 'Quicksand', link: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap' },
  { name: 'DM Sans', value: 'DM Sans', link: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap' },
  { name: 'Oswald', value: 'Oswald', link: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap' },
  { name: 'Exo 2', value: 'Exo 2', link: 'https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700&display=swap' },
  { name: 'Orbitron', value: 'Orbitron', link: 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&display=swap' },
  { name: 'Lora', value: 'Lora', link: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap' },
  { name: 'Libre Baskerville', value: 'Libre Baskerville', link: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap' },
];
