import { addDays, subDays, format } from 'date-fns';

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'twitter';

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface SocialPost {
  id: string;
  content: string;
  mediaUrl?: string;
  platforms: SocialPlatform[];
  scheduledAt: string;
  status: PostStatus;
  clientId?: string;
  metrics?: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    impressions: number;
  };
}

export interface SocialMetrics {
  platform: SocialPlatform;
  followers: number;
  followersGrowth: number;
  postsCount: number;
  avgReach: number;
  avgEngagement: number;
  weeklyData: { date: string; followers: number; reach: number; engagement: number }[];
}

export const PLATFORM_CONFIG: Record<SocialPlatform, { label: string; color: string; charLimit: number; icon: string }> = {
  instagram: { label: 'Instagram', color: 'bg-pink-500', charLimit: 2200, icon: '📸' },
  facebook: { label: 'Facebook', color: 'bg-blue-600', charLimit: 63206, icon: '👤' },
  linkedin: { label: 'LinkedIn', color: 'bg-blue-700', charLimit: 3000, icon: '💼' },
  tiktok: { label: 'TikTok', color: 'bg-gray-900 dark:bg-gray-100', charLimit: 2200, icon: '🎵' },
  twitter: { label: 'Twitter/X', color: 'bg-sky-500', charLimit: 280, icon: '🐦' },
};

export const STATUS_CONFIG: Record<PostStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  scheduled: { label: 'Agendado', variant: 'outline' },
  published: { label: 'Publicado', variant: 'default' },
  failed: { label: 'Falhou', variant: 'destructive' },
};

const today = new Date();

export const MOCK_POSTS: SocialPost[] = [
  {
    id: '1',
    content: '🚀 Lançamento do nosso novo produto! Confira as novidades e descubra como podemos ajudar o seu negócio a crescer. Link na bio! #marketing #digital',
    mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop',
    platforms: ['instagram', 'facebook'],
    scheduledAt: format(subDays(today, 5), "yyyy-MM-dd'T'10:00:00"),
    status: 'published',
    metrics: { likes: 245, comments: 32, shares: 18, reach: 4520, impressions: 6200 },
  },
  {
    id: '2',
    content: 'Dicas essenciais para melhorar sua presença digital em 2025. Thread 🧵👇',
    platforms: ['twitter', 'linkedin'],
    scheduledAt: format(subDays(today, 4), "yyyy-MM-dd'T'14:30:00"),
    status: 'published',
    metrics: { likes: 89, comments: 15, shares: 42, reach: 2100, impressions: 3800 },
  },
  {
    id: '3',
    content: '📊 Case de sucesso: Como ajudamos nosso cliente a aumentar o engajamento em 150% em apenas 3 meses. Quer saber como? #casesdesucesso #marketingdigital',
    mediaUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop',
    platforms: ['instagram', 'linkedin', 'facebook'],
    scheduledAt: format(subDays(today, 3), "yyyy-MM-dd'T'09:00:00"),
    status: 'published',
    metrics: { likes: 312, comments: 28, shares: 55, reach: 5800, impressions: 8400 },
  },
  {
    id: '4',
    content: '🎬 Bastidores da produção do nosso último vídeo. Muita criatividade e trabalho em equipe!',
    mediaUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=400&fit=crop',
    platforms: ['tiktok', 'instagram'],
    scheduledAt: format(subDays(today, 2), "yyyy-MM-dd'T'18:00:00"),
    status: 'published',
    metrics: { likes: 1203, comments: 87, shares: 234, reach: 15000, impressions: 22000 },
  },
  {
    id: '5',
    content: 'Webinar gratuito: "Estratégias de Social Media para 2025". Inscreva-se agora! 📅 Link nos comentários.',
    platforms: ['linkedin', 'facebook', 'twitter'],
    scheduledAt: format(subDays(today, 1), "yyyy-MM-dd'T'11:00:00"),
    status: 'published',
    metrics: { likes: 156, comments: 43, shares: 67, reach: 3200, impressions: 5100 },
  },
  {
    id: '6',
    content: '✨ Novo post para o feed! Confira as tendências de design para este mês. Qual é a sua favorita? Comente abaixo! 👇',
    mediaUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=400&fit=crop',
    platforms: ['instagram'],
    scheduledAt: format(today, "yyyy-MM-dd'T'15:00:00"),
    status: 'scheduled',
  },
  {
    id: '7',
    content: '5 ferramentas indispensáveis para gestão de redes sociais. Salve este post! 🔖 #socialmedia #tools',
    platforms: ['instagram', 'facebook', 'linkedin'],
    scheduledAt: format(addDays(today, 1), "yyyy-MM-dd'T'10:00:00"),
    status: 'scheduled',
  },
  {
    id: '8',
    content: 'Enquete: Qual rede social traz mais resultados para o seu negócio? 📊',
    platforms: ['twitter', 'linkedin'],
    scheduledAt: format(addDays(today, 1), "yyyy-MM-dd'T'16:00:00"),
    status: 'scheduled',
  },
  {
    id: '9',
    content: '🎯 Planejamento é tudo! Veja como organizamos o calendário editorial dos nossos clientes.',
    mediaUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=400&fit=crop',
    platforms: ['instagram', 'linkedin'],
    scheduledAt: format(addDays(today, 2), "yyyy-MM-dd'T'09:30:00"),
    status: 'scheduled',
  },
  {
    id: '10',
    content: 'Novo vídeo: Tutorial completo de Reels para iniciantes. 🎥',
    platforms: ['tiktok', 'instagram'],
    scheduledAt: format(addDays(today, 3), "yyyy-MM-dd'T'12:00:00"),
    status: 'draft',
  },
  {
    id: '11',
    content: 'Depoimento do nosso cliente sobre os resultados alcançados. Orgulho demais! 💪',
    platforms: ['facebook', 'linkedin'],
    scheduledAt: format(addDays(today, 4), "yyyy-MM-dd'T'14:00:00"),
    status: 'draft',
  },
  {
    id: '12',
    content: '📈 Relatório mensal: crescemos 25% em seguidores! Obrigado a todos que nos acompanham.',
    platforms: ['instagram', 'twitter'],
    scheduledAt: format(addDays(today, 5), "yyyy-MM-dd'T'10:00:00"),
    status: 'draft',
  },
  {
    id: '13',
    content: 'Erro no upload da imagem. Tentativa de publicação falhou.',
    platforms: ['instagram'],
    scheduledAt: format(subDays(today, 1), "yyyy-MM-dd'T'08:00:00"),
    status: 'failed',
  },
  {
    id: '14',
    content: '🌟 Motivação de segunda-feira! Comece a semana com energia e foco nos seus objetivos.',
    mediaUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=400&fit=crop',
    platforms: ['instagram', 'facebook', 'linkedin', 'twitter'],
    scheduledAt: format(addDays(today, 7), "yyyy-MM-dd'T'08:00:00"),
    status: 'scheduled',
  },
  {
    id: '15',
    content: 'Live amanhã às 19h! Tema: Como criar conteúdo que converte. Ativa o lembrete! 🔔',
    platforms: ['instagram', 'tiktok'],
    scheduledAt: format(addDays(today, 6), "yyyy-MM-dd'T'17:00:00"),
    status: 'scheduled',
  },
];

const generateWeeklyData = (baseFollowers: number) => {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const date = format(subDays(today, i * 7), 'yyyy-MM-dd');
    const growth = Math.floor(Math.random() * 200) + 50;
    data.push({
      date,
      followers: baseFollowers + growth * (6 - i),
      reach: Math.floor(Math.random() * 5000) + 1000,
      engagement: parseFloat((Math.random() * 5 + 1).toFixed(1)),
    });
  }
  return data;
};

export const MOCK_METRICS: SocialMetrics[] = [
  {
    platform: 'instagram',
    followers: 12450,
    followersGrowth: 4.2,
    postsCount: 48,
    avgReach: 3200,
    avgEngagement: 3.8,
    weeklyData: generateWeeklyData(12450),
  },
  {
    platform: 'facebook',
    followers: 8930,
    followersGrowth: 1.8,
    postsCount: 35,
    avgReach: 2100,
    avgEngagement: 2.1,
    weeklyData: generateWeeklyData(8930),
  },
  {
    platform: 'linkedin',
    followers: 5620,
    followersGrowth: 6.5,
    postsCount: 22,
    avgReach: 1800,
    avgEngagement: 4.2,
    weeklyData: generateWeeklyData(5620),
  },
  {
    platform: 'tiktok',
    followers: 23100,
    followersGrowth: 12.3,
    postsCount: 30,
    avgReach: 15000,
    avgEngagement: 7.5,
    weeklyData: generateWeeklyData(23100),
  },
  {
    platform: 'twitter',
    followers: 3400,
    followersGrowth: 2.1,
    postsCount: 65,
    avgReach: 980,
    avgEngagement: 1.9,
    weeklyData: generateWeeklyData(3400),
  },
];
