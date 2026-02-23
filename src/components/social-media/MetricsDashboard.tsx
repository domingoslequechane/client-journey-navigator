import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, Eye, Heart } from 'lucide-react';
import { type SocialMetrics, type SocialPlatform, PLATFORM_CONFIG, MOCK_METRICS } from '@/lib/social-media-mock';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MetricsDashboard() {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | 'all'>('all');

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

  // Merge weekly data for chart
  const chartData = selectedPlatform === 'all'
    ? MOCK_METRICS[0]?.weeklyData.map((_, i) => ({
        date: MOCK_METRICS[0].weeklyData[i].date,
        reach: MOCK_METRICS.reduce((sum, m) => sum + (m.weeklyData[i]?.reach || 0), 0),
        engagement: parseFloat((MOCK_METRICS.reduce((sum, m) => sum + (m.weeklyData[i]?.engagement || 0), 0) / MOCK_METRICS.length).toFixed(1)),
      })) || []
    : filteredMetrics[0]?.weeklyData.map(d => ({ date: d.date, reach: d.reach, engagement: d.engagement })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Métricas</h2>
        <Select value={selectedPlatform} onValueChange={v => setSelectedPlatform(v as SocialPlatform | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as redes</SelectItem>
            {(Object.keys(PLATFORM_CONFIG) as SocialPlatform[]).map(p => (
              <SelectItem key={p} value={p}>{PLATFORM_CONFIG[p].icon} {PLATFORM_CONFIG[p].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xl font-bold">{totalFollowers.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Seguidores</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="text-xl font-bold">+{avgGrowth}%</p>
              <p className="text-xs text-muted-foreground">Crescimento</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Eye className="h-5 w-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-xl font-bold">{totalPosts}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Heart className="h-5 w-5 text-pink-500 shrink-0" />
            <div>
              <p className="text-xl font-bold">{avgEngagement}%</p>
              <p className="text-xs text-muted-foreground">Engajamento</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alcance Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tickFormatter={v => { try { return format(parseISO(v), 'dd/MM', { locale: ptBR }); } catch { return v; } }} className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: number) => v.toLocaleString()} labelFormatter={v => { try { return format(parseISO(v), "dd 'de' MMM", { locale: ptBR }); } catch { return v; } }} />
                <Bar dataKey="reach" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Engajamento Semanal (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tickFormatter={v => { try { return format(parseISO(v), 'dd/MM', { locale: ptBR }); } catch { return v; } }} className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: number) => `${v}%`} labelFormatter={v => { try { return format(parseISO(v), "dd 'de' MMM", { locale: ptBR }); } catch { return v; } }} />
                <Line type="monotone" dataKey="engagement" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Per-platform table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Por Rede Social</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 font-medium">Rede</th>
                  <th className="text-right py-2 font-medium">Seguidores</th>
                  <th className="text-right py-2 font-medium">Crescimento</th>
                  <th className="text-right py-2 font-medium">Posts</th>
                  <th className="text-right py-2 font-medium">Alcance Médio</th>
                  <th className="text-right py-2 font-medium">Engajamento</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_METRICS.map(m => (
                  <tr key={m.platform} className="border-b border-border/50">
                    <td className="py-2 flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", PLATFORM_CONFIG[m.platform].color)} />
                      {PLATFORM_CONFIG[m.platform].label}
                    </td>
                    <td className="text-right py-2">{m.followers.toLocaleString()}</td>
                    <td className="text-right py-2 text-green-500">+{m.followersGrowth}%</td>
                    <td className="text-right py-2">{m.postsCount}</td>
                    <td className="text-right py-2">{m.avgReach.toLocaleString()}</td>
                    <td className="text-right py-2">{m.avgEngagement}%</td>
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
