// Types and configs only - no mock data used in production anymore

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'twitter' | 'youtube' | 'pinterest' | 'threads' | 'whatsapp';

export type PostStatus = 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'published' | 'failed' | 'rejected' | 'local_editing';

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
  clientId?: string;
  hashtags?: string[];
  approvalToken?: string;
  notes?: string;
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
  clientId?: string | null;
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
  whatsapp: { label: 'WhatsApp', color: 'text-[hsl(142,70%,45%)]', bgColor: 'bg-[hsl(142,70%,45%)]', charLimit: 4096 },
};

export const STATUS_CONFIG: Record<PostStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  draft: { label: 'Rascunho', variant: 'secondary', color: 'text-muted-foreground' },
  pending_approval: { label: 'Aguardando Aprovação', variant: 'outline', color: 'text-[hsl(var(--warning))]' },
  approved: { label: 'Aprovado', variant: 'default', color: 'text-[hsl(var(--success))]' },
  scheduled: { label: 'Agendado', variant: 'outline', color: 'text-[hsl(var(--info))]' },
  published: { label: 'Publicado', variant: 'default', color: 'text-[hsl(var(--success))]' },
  failed: { label: 'Falhou', variant: 'destructive', color: 'text-destructive' },
  rejected: { label: 'Rejeitado', variant: 'destructive', color: 'text-destructive' },
  local_editing: { label: 'A Editar', variant: 'outline', color: 'text-orange-500' },
};

export const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: string; platforms: SocialPlatform[] }> = {
  feed: { label: 'Feed', icon: 'feed', platforms: ['instagram', 'facebook', 'linkedin', 'twitter', 'pinterest', 'threads'] },
  stories: { label: 'Stories', icon: 'stories', platforms: ['instagram', 'facebook'] },
  reels: { label: 'Reels', icon: 'reels', platforms: ['instagram', 'facebook', 'tiktok', 'youtube'] },
  carousel: { label: 'Carrossel', icon: 'carousel', platforms: ['instagram', 'facebook', 'linkedin', 'twitter', 'pinterest', 'threads'] },
  video: { label: 'Vídeo', icon: 'video', platforms: ['facebook', 'linkedin', 'tiktok', 'youtube', 'pinterest'] },
  text: { label: 'Texto', icon: 'text', platforms: ['linkedin', 'twitter', 'threads'] },
};

export const ALL_PLATFORMS: SocialPlatform[] = ['instagram', 'facebook', 'linkedin', 'tiktok', 'twitter', 'youtube', 'pinterest', 'threads', 'whatsapp'];
