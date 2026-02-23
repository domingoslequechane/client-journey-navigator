import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, Eye, Heart, MousePointer, BarChart3 } from 'lucide-react';
import { type SocialPlatform, PLATFORM_CONFIG, MOCK_METRICS } from '@/lib/social-media-mock';
import { PlatformIcon } from './PlatformIcon';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MetricsDashboard() {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'followers' | 'posts'>('overview');

  const filteredMetrics = selectedPlatform === 'all'
    ? MOCK_METRICS
    : MOCK_METRICS.filter(m => m.platform === selectedPlatform);

  const totalFollowers = filteredMetrics.reduce((sum, m) => sum + m.followers, 0);
  const avgGrowth = filteredMetrics.length > 0
    ? (filteredMetrics.reduce((sum, m) => sum + m.followersGrowth, 0) / filteredMetrics.length).toFixed(1)
    : '0';
  const totalPosts = filteredMetrics.reduce((sum, m) => sum + m.postsCount, 0);
  const avgEngagement = filteredMetrics.length > 0
    ? (filteredMetrics.reduce((sum, m) => sum + m.avgEngagement, 0) / filteredMetrics.length).toFixed(1)
    : '0';
  const totalImpressions = filteredMetrics.reduce((sum, m) => sum + m.totalImpressions, 0);
  const totalClicks = filteredMetrics.reduce((sum, m) => sum + m.totalClicks, 0);

  const chartData = selectedPlatform === 'all'
    ? MOCK_METRICS[0]?.weeklyData.map((_, i) => ({
        date: MOCK_METRICS[0].weeklyData[i].date,
        reach: MOCK_METRICS.reduce((sum, m) => sum + (m.weeklyData[i]?.reach || 0), 0),
        engagement: parseFloat((MOCK_METRICS.reduce((sum, m) => sum + (m.weeklyData[i]?.engagement || 0), 0) / MOCK_METRICS.length).toFixed(1)),
        impressions: MOCK_METRICS.reduce((sum, m) => sum + (m.weeklyData[i]?.impressions || 0), 0),
        followers: MOCK_METRICS.reduce((sum, m) => sum + (m.weeklyData[i]?.followers || 0), 0),
      })) || []
    : filteredMetrics[0]?.weeklyData.map(d => ({ date: d.date, reach: d.reach, engagement: d.engagement, impressions: d.impressions, followers: d.followers })) || [];

  // Platform tabs for header
  const platformTabs: (SocialPlatform | 'all')[] = ['all', ...MOCK_METRICS.map(m => m.platform)];

  return (
    <div className="space-y-6">
      {/* Platform selector tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {platformTabs.map(p => (
          <button
            key={p}
            onClick={() => setSelectedPlatform(p)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              selectedPlatform === p
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {p === 'all' ? (
              <><BarChart3 className="h-4 w-4" /> Resumo Geral</>
            ) : (
              <><PlatformIcon platform={p} size="sm" className={selectedPlatform === p ? 'text-primary-foreground' : ''} /> {PLATFORM_CONFIG[p].label}</>
            )}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['overview', 'followers', 'posts'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                activeTab === tab ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {tab === 'overview' ? 'Acompanhamento' : tab === 'followers' ? 'Seguidores' : 'Posts'}
            </button>
          ))}
        </div>
        <Select defaultValue="7d">
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
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
            <p className="text-xs text-[hsl(var(--success))]">+{avgGrowth}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-[hsl(var(--info))]" />
              <span className="text-xs text-muted-foreground">Impressões</span>
            </div>
            <p className="text-xl font-bold">{totalImpressions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-[hsl(var(--destructive))]" />
              <span className="text-xs text-muted-foreground">Engajamento</span>
            </div>
            <p className="text-xl font-bold">{avgEngagement}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />
              <span className="text-xs text-muted-foreground">Alcance médio</span>
            </div>
            <p className="text-xl font-bold">
              {filteredMetrics.length > 0 ? Math.round(filteredMetrics.reduce((s, m) => s + m.avgReach, 0) / filteredMetrics.length).toLocaleString() : 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="h-4 w-4 text-[hsl(var(--warning))]" />
              <span className="text-xs text-muted-foreground">Cliques</span>
            </div>
            <p className="text-xl font-bold">{totalClicks.toLocaleString()}</p>
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

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Alcance e Impressões</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tickFormatter={v => { try { return format(parseISO(v), 'dd/MM'); } catch { return v; } }} className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: number) => v.toLocaleString()} labelFormatter={v => { try { return format(parseISO(v), "dd 'de' MMM", { locale: ptBR }); } catch { return v; } }} />
                <Area type="monotone" dataKey="reach" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
                <Area type="monotone" dataKey="impressions" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3) / 0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Taxa de Engajamento (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tickFormatter={v => { try { return format(parseISO(v), 'dd/MM'); } catch { return v; } }} className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: number) => `${v}%`} labelFormatter={v => { try { return format(parseISO(v), "dd 'de' MMM", { locale: ptBR }); } catch { return v; } }} />
                <Bar dataKey="engagement" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
                  <th className="text-right py-2.5 font-medium">Crescimento</th>
                  <th className="text-right py-2.5 font-medium">Posts</th>
                  <th className="text-right py-2.5 font-medium">Alcance</th>
                  <th className="text-right py-2.5 font-medium">Impressões</th>
                  <th className="text-right py-2.5 font-medium">Engajamento</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_METRICS.map(m => (
                  <tr key={m.platform} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={m.platform} size="sm" />
                        <span className="font-medium">{PLATFORM_CONFIG[m.platform].label}</span>
                      </div>
                    </td>
                    <td className="text-right py-2.5">{m.followers.toLocaleString()}</td>
                    <td className="text-right py-2.5 text-[hsl(var(--success))]">+{m.followersGrowth}%</td>
                    <td className="text-right py-2.5">{m.postsCount}</td>
                    <td className="text-right py-2.5">{m.avgReach.toLocaleString()}</td>
                    <td className="text-right py-2.5">{m.totalImpressions.toLocaleString()}</td>
                    <td className="text-right py-2.5">{m.avgEngagement}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
