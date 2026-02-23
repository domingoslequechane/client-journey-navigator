import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, Eye, Heart, MousePointer, BarChart3, RefreshCw } from 'lucide-react';
import { PLATFORM_CONFIG, type SocialPlatform } from '@/lib/social-media-mock';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import type { SocialPostRow } from '@/hooks/useSocialPosts';
import { PlatformIcon } from './PlatformIcon';
import { cn } from '@/lib/utils';

interface MetricsDashboardProps {
  posts: SocialPostRow[];
  selectedClient?: string;
}

export function MetricsDashboard({ posts, selectedClient }: MetricsDashboardProps) {
  const { accounts, syncAccounts } = useSocialAccounts(selectedClient !== 'all' ? selectedClient : undefined);

  const totalFollowers = accounts.reduce((sum, a) => sum + (a.followers_count || 0), 0);
  const totalPosts = posts.length;
  const publishedPosts = posts.filter(p => p.status === 'published');

  const aggregatedMetrics = useMemo(() => {
    let totalLikes = 0, totalComments = 0, totalShares = 0, totalReach = 0, totalImpressions = 0, totalClicks = 0;
    publishedPosts.forEach(p => {
      const m = p.metrics as Record<string, number> | null;
      if (!m) return;
      totalLikes += m.likes || 0;
      totalComments += m.comments || 0;
      totalShares += m.shares || 0;
      totalReach += m.reach || 0;
      totalImpressions += m.impressions || 0;
      totalClicks += m.clicks || 0;
    });
    const avgEngagement = publishedPosts.length > 0 && totalReach > 0
      ? (((totalLikes + totalComments + totalShares) / totalReach) * 100).toFixed(1)
      : '0';
    return { totalLikes, totalComments, totalShares, totalReach, totalImpressions, totalClicks, avgEngagement };
  }, [publishedPosts]);

  // Per-platform stats
  const platformStats = useMemo(() => {
    const stats: Record<string, { followers: number; posts: number; reach: number; impressions: number; engagement: number }> = {};
    accounts.forEach(a => {
      if (!stats[a.platform]) stats[a.platform] = { followers: 0, posts: 0, reach: 0, impressions: 0, engagement: 0 };
      stats[a.platform].followers += a.followers_count || 0;
    });
    posts.forEach(p => {
      p.platforms.forEach(platform => {
        if (!stats[platform]) stats[platform] = { followers: 0, posts: 0, reach: 0, impressions: 0, engagement: 0 };
        stats[platform].posts += 1;
        const m = p.metrics as Record<string, number> | null;
        if (m) {
          stats[platform].reach += (m.reach || 0) / p.platforms.length;
          stats[platform].impressions += (m.impressions || 0) / p.platforms.length;
        }
      });
    });
    return stats;
  }, [accounts, posts]);

  return (
    <div className="space-y-6">
      {/* Refresh button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Métricas em tempo real</h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => syncAccounts.mutate()}
          disabled={syncAccounts.isPending}
        >
          <RefreshCw className={cn("h-4 w-4", syncAccounts.isPending && "animate-spin")} />
          Atualizar métricas
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Seguidores</span>
            </div>
            <p className="text-xl font-bold">{totalFollowers.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-[hsl(var(--info))]" />
              <span className="text-xs text-muted-foreground">Impressões</span>
            </div>
            <p className="text-xl font-bold">{aggregatedMetrics.totalImpressions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Engajamento</span>
            </div>
            <p className="text-xl font-bold">{aggregatedMetrics.avgEngagement}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />
              <span className="text-xs text-muted-foreground">Alcance</span>
            </div>
            <p className="text-xl font-bold">{aggregatedMetrics.totalReach.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="h-4 w-4 text-[hsl(var(--warning))]" />
              <span className="text-xs text-muted-foreground">Cliques</span>
            </div>
            <p className="text-xl font-bold">{aggregatedMetrics.totalClicks.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Posts</span>
            </div>
            <p className="text-xl font-bold">{totalPosts}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-platform table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Desempenho por Rede Social</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2.5 font-medium">Rede</th>
                  <th className="text-right py-2.5 font-medium">Seguidores</th>
                  <th className="text-right py-2.5 font-medium">Posts</th>
                  <th className="text-right py-2.5 font-medium">Alcance</th>
                  <th className="text-right py-2.5 font-medium">Impressões</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(platformStats).map(([platform, stats]) => (
                  <tr key={platform} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={platform as SocialPlatform} size="sm" />
                        <span className="font-medium">{PLATFORM_CONFIG[platform as SocialPlatform]?.label || platform}</span>
                      </div>
                    </td>
                    <td className="text-right py-2.5">{stats.followers.toLocaleString()}</td>
                    <td className="text-right py-2.5">{stats.posts}</td>
                    <td className="text-right py-2.5">{Math.round(stats.reach).toLocaleString()}</td>
                    <td className="text-right py-2.5">{Math.round(stats.impressions).toLocaleString()}</td>
                  </tr>
                ))}
                {Object.keys(platformStats).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum dado disponível</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
