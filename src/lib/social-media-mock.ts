import { addDays, subDays, format } from 'date-fns';

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'twitter' | 'youtube' | 'pinterest' | 'threads';

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export type ContentType = 'feed' | 'stories' | 'reels' | 'carousel' | 'video' | 'text';

export interface SocialPost {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  platforms: SocialPlatform[];
  scheduledAt: string;
  status: PostStatus;
  contentType: ContentType;
  clientName?: string;
  hashtags?: string[];
  metrics?: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    impressions: number;
    saves?: number;
    clicks?: number;
  };
}

export interface ConnectedAccount {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  username: string;
  avatarUrl?: string;
  connected: boolean;
  followers?: number;
}

export interface SocialMetrics {
  platform: SocialPlatform;
  followers: number;
  followersGrowth: number;
  postsCount: number;
  avgReach: number;
  avgEngagement: number;
  totalImpressions: number;
  totalClicks: number;
  weeklyData: { date: string; followers: number; reach: number; engagement: number; impressions: number }[];
}

export const PLATFORM_CONFIG: Record<SocialPlatform, { label: string; color: string; bgColor: string; charLimit: number; }> = {
  instagram: { label: 'Instagram', color: 'text-[hsl(330,70%,50%)]', bgColor: 'bg-gradient-to-br from-[hsl(330,70%,50%)] via-[hsl(350,80%,55%)] to-[hsl(30,90%,55%)]', charLimit: 2200 },
  facebook: { label: 'Facebook', color: 'text-[hsl(220,70%,50%)]', bgColor: 'bg-[hsl(220,70%,50%)]', charLimit: 63206 },
  linkedin: { label: 'LinkedIn', color: 'text-[hsl(210,80%,40%)]', bgColor: 'bg-[hsl(210,80%,40%)]', charLimit: 3000 },
  tiktok: { label: 'TikTok', color: 'text-foreground', bgColor: 'bg-foreground', charLimit: 2200 },
  twitter: { label: 'X (Twitter)', color: 'text-foreground', bgColor: 'bg-foreground', charLimit: 280 },
  youtube: { label: 'YouTube', color: 'text-[hsl(0,80%,50%)]', bgColor: 'bg-[hsl(0,80%,50%)]', charLimit: 5000 },
  pinterest: { label: 'Pinterest', color: 'text-[hsl(350,80%,45%)]', bgColor: 'bg-[hsl(350,80%,45%)]', charLimit: 500 },
  threads: { label: 'Threads', color: 'text-foreground', bgColor: 'bg-foreground', charLimit: 500 },
};

export const STATUS_CONFIG: Record<PostStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  draft: { label: 'Rascunho', variant: 'secondary', color: 'text-muted-foreground' },
  scheduled: { label: 'Agendado', variant: 'outline', color: 'text-[hsl(var(--info))]' },
  published: { label: 'Publicado', variant: 'default', color: 'text-[hsl(var(--success))]' },
  failed: { label: 'Falhou', variant: 'destructive', color: 'text-destructive' },
};

export const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: string }> = {
  feed: { label: 'Feed', icon: '🖼️' },
  stories: { label: 'Stories', icon: '📱' },
  reels: { label: 'Reels', icon: '🎬' },
  carousel: { label: 'Carrossel', icon: '🔄' },
  video: { label: 'Vídeo', icon: '📹' },
  text: { label: 'Texto', icon: '📝' },
};

const today = new Date();

export const MOCK_ACCOUNTS: ConnectedAccount[] = [
  { id: '1', platform: 'instagram', accountName: 'Dream House - by Asif', username: '@dreamhouse_byasif', connected: true, followers: 12450, avatarUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=80&h=80&fit=crop' },
  { id: '2', platform: 'facebook', accountName: 'Dream House - Design', username: 'Dream House Design', connected: true, followers: 8930, avatarUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=80&h=80&fit=crop' },
  { id: '3', platform: 'linkedin', accountName: 'LinkedIn', username: '', connected: false },
  { id: '4', platform: 'tiktok', accountName: 'TikTok', username: '', connected: false },
  { id: '5', platform: 'twitter', accountName: 'X', username: '', connected: false },
  { id: '6', platform: 'youtube', accountName: 'YouTube', username: '', connected: false },
  { id: '7', platform: 'pinterest', accountName: 'Pinterest', username: '', connected: false },
  { id: '8', platform: 'threads', accountName: 'Threads', username: '', connected: false },
];

export const MOCK_POSTS: SocialPost[] = [
  {
    id: '1',
    content: '🚀 Lançamento do nosso novo produto! Confira as novidades e descubra como podemos ajudar o seu negócio a crescer. Link na bio!',
    mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop',
    platforms: ['instagram', 'facebook'],
    scheduledAt: format(subDays(today, 5), "yyyy-MM-dd'T'10:00:00"),
    status: 'published',
    contentType: 'feed',
    clientName: 'Dream House',
    hashtags: ['marketing', 'digital', 'lançamento'],
    metrics: { likes: 245, comments: 32, shares: 18, reach: 4520, impressions: 6200, saves: 45, clicks: 89 },
  },
  {
    id: '2',
    content: 'Dicas essenciais para melhorar sua presença digital em 2025. Thread 🧵👇',
    platforms: ['twitter', 'linkedin'],
    scheduledAt: format(subDays(today, 4), "yyyy-MM-dd'T'14:30:00"),
    status: 'published',
    contentType: 'text',
    clientName: 'Dream House',
    metrics: { likes: 89, comments: 15, shares: 42, reach: 2100, impressions: 3800, clicks: 156 },
  },
  {
    id: '3',
    content: '📊 Case de sucesso: Como ajudamos nosso cliente a aumentar o engajamento em 150% em apenas 3 meses. Quer saber como?',
    mediaUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop',
    platforms: ['instagram', 'linkedin', 'facebook'],
    scheduledAt: format(subDays(today, 3), "yyyy-MM-dd'T'09:00:00"),
    status: 'published',
    contentType: 'carousel',
    clientName: 'Dream House',
    hashtags: ['casesdesucesso', 'marketingdigital'],
    metrics: { likes: 312, comments: 28, shares: 55, reach: 5800, impressions: 8400, saves: 78, clicks: 234 },
  },
  {
    id: '4',
    content: '🎬 Bastidores da produção do nosso último vídeo. Muita criatividade e trabalho em equipe!',
    mediaUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=400&fit=crop',
    platforms: ['tiktok', 'instagram'],
    scheduledAt: format(subDays(today, 2), "yyyy-MM-dd'T'18:00:00"),
    status: 'published',
    contentType: 'reels',
    clientName: 'Dream House',
    metrics: { likes: 1203, comments: 87, shares: 234, reach: 15000, impressions: 22000, saves: 345, clicks: 567 },
  },
  {
    id: '5',
    content: 'Webinar gratuito: "Estratégias de Social Media para 2025". Inscreva-se agora! 📅 Link nos comentários.',
    platforms: ['linkedin', 'facebook', 'twitter'],
    scheduledAt: format(subDays(today, 1), "yyyy-MM-dd'T'11:00:00"),
    status: 'published',
    contentType: 'text',
    clientName: 'Dream House',
    metrics: { likes: 156, comments: 43, shares: 67, reach: 3200, impressions: 5100, clicks: 412 },
  },
  {
    id: '6',
    content: '✨ Novo post para o feed! Confira as tendências de design para este mês. Qual é a sua favorita? Comente abaixo! 👇',
    mediaUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=400&fit=crop',
    platforms: ['instagram'],
    scheduledAt: format(today, "yyyy-MM-dd'T'15:00:00"),
    status: 'scheduled',
    contentType: 'feed',
    clientName: 'Dream House',
    hashtags: ['design', 'tendências', 'feed'],
  },
  {
    id: '7',
    content: '5 ferramentas indispensáveis para gestão de redes sociais. Salve este post! 🔖',
    platforms: ['instagram', 'facebook', 'linkedin'],
    scheduledAt: format(addDays(today, 1), "yyyy-MM-dd'T'10:00:00"),
    status: 'scheduled',
    contentType: 'carousel',
    clientName: 'Dream House',
    hashtags: ['socialmedia', 'tools', 'marketing'],
  },
  {
    id: '8',
    content: 'Enquete: Qual rede social traz mais resultados para o seu negócio? 📊',
    platforms: ['twitter', 'linkedin'],
    scheduledAt: format(addDays(today, 1), "yyyy-MM-dd'T'16:00:00"),
    status: 'scheduled',
    contentType: 'text',
    clientName: 'Dream House',
  },
  {
    id: '9',
    content: '🎯 Planejamento é tudo! Veja como organizamos o calendário editorial dos nossos clientes.',
    mediaUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=400&fit=crop',
    platforms: ['instagram', 'linkedin'],
    scheduledAt: format(addDays(today, 2), "yyyy-MM-dd'T'09:30:00"),
    status: 'scheduled',
    contentType: 'feed',
    clientName: 'Dream House',
  },
  {
    id: '10',
    content: 'Novo vídeo: Tutorial completo de Reels para iniciantes. 🎥',
    platforms: ['tiktok', 'instagram'],
    scheduledAt: format(addDays(today, 3), "yyyy-MM-dd'T'12:00:00"),
    status: 'draft',
    contentType: 'reels',
    clientName: 'Dream House',
  },
  {
    id: '11',
    content: 'Depoimento do nosso cliente sobre os resultados alcançados. Orgulho demais! 💪',
    platforms: ['facebook', 'linkedin'],
    scheduledAt: format(addDays(today, 4), "yyyy-MM-dd'T'14:00:00"),
    status: 'draft',
    contentType: 'video',
    clientName: 'Dream House',
  },
  {
    id: '12',
    content: '📈 Relatório mensal: crescemos 25% em seguidores! Obrigado a todos que nos acompanham.',
    platforms: ['instagram', 'twitter'],
    scheduledAt: format(addDays(today, 5), "yyyy-MM-dd'T'10:00:00"),
    status: 'draft',
    contentType: 'feed',
    clientName: 'Dream House',
    hashtags: ['crescimento', 'resultados'],
  },
  {
    id: '13',
    content: 'Erro no upload da imagem. Tentativa de publicação falhou.',
    platforms: ['instagram'],
    scheduledAt: format(subDays(today, 1), "yyyy-MM-dd'T'08:00:00"),
    status: 'failed',
    contentType: 'feed',
    clientName: 'Dream House',
  },
  {
    id: '14',
    content: '🌟 Motivação de segunda-feira! Comece a semana com energia e foco nos seus objetivos.',
    mediaUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=400&fit=crop',
    platforms: ['instagram', 'facebook', 'linkedin', 'twitter'],
    scheduledAt: format(addDays(today, 7), "yyyy-MM-dd'T'08:00:00"),
    status: 'scheduled',
    contentType: 'feed',
    clientName: 'Dream House',
  },
  {
    id: '15',
    content: 'Live amanhã às 19h! Tema: Como criar conteúdo que converte. Ativa o lembrete! 🔔',
    platforms: ['instagram', 'tiktok'],
    scheduledAt: format(addDays(today, 6), "yyyy-MM-dd'T'17:00:00"),
    status: 'scheduled',
    contentType: 'video',
    clientName: 'Dream House',
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
      impressions: Math.floor(Math.random() * 8000) + 2000,
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
    totalImpressions: 186000,
    totalClicks: 4500,
    weeklyData: generateWeeklyData(12450),
  },
  {
    platform: 'facebook',
    followers: 8930,
    followersGrowth: 1.8,
    postsCount: 35,
    avgReach: 2100,
    avgEngagement: 2.1,
    totalImpressions: 98000,
    totalClicks: 2300,
    weeklyData: generateWeeklyData(8930),
  },
  {
    platform: 'linkedin',
    followers: 5620,
    followersGrowth: 6.5,
    postsCount: 22,
    avgReach: 1800,
    avgEngagement: 4.2,
    totalImpressions: 45000,
    totalClicks: 1800,
    weeklyData: generateWeeklyData(5620),
  },
  {
    platform: 'tiktok',
    followers: 23100,
    followersGrowth: 12.3,
    postsCount: 30,
    avgReach: 15000,
    avgEngagement: 7.5,
    totalImpressions: 450000,
    totalClicks: 12000,
    weeklyData: generateWeeklyData(23100),
  },
  {
    platform: 'twitter',
    followers: 3400,
    followersGrowth: 2.1,
    postsCount: 65,
    avgReach: 980,
    avgEngagement: 1.9,
    totalImpressions: 32000,
    totalClicks: 890,
    weeklyData: generateWeeklyData(3400),
  },
];
