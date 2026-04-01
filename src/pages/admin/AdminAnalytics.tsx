import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  Users, Image, MessageSquare, Link, Share2, FileText,
  Bot, BarChart2, TrendingUp, Cpu, Zap, Building2, PieChart as PieChartIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrgUsage {
  org_id: string;
  org_name: string;
  clients: number;
  link_pages: number;
  social_accounts: number;
  social_posts: number;
  studio_images: number;
  studio_flyers: number;
  ai_conversations: number;
  ai_messages: number;
  editorial_tasks: number;
  transactions: number;
  flyer_tokens: number;
  subscription_status?: string;
}

interface FeatureStat {
  feature: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  total: number;
  color: string;
  description: string;
}

const FEATURE_COLORS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ec4899', '#06b6d4', '#84cc16', '#ef4444',
];

export default function AdminAnalytics() {
  const [orgsUsage, setOrgsUsage] = useState<OrgUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<keyof OrgUsage>('ai_messages');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all organizations
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name');

      if (!orgs || orgs.length === 0) {
        setOrgsUsage([]);
        return;
      }

      // Fetch subscriptions for plan status
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('organization_id, status');

      const subMap = Object.fromEntries((subs || []).map(s => [s.organization_id, s.status]));

      // Fetch all counts in parallel per org
      const results: OrgUsage[] = await Promise.all(
        orgs.map(async (org) => {
          const oid = org.id;

          const [
            { count: clients },
            { count: link_pages },
            { count: social_accounts },
            { count: social_posts },
            { count: studio_images },
            { count: studio_flyers },
            { count: ai_conversations },
            { count: ai_messages },
            { count: editorial_tasks },
            { count: transactions },
            { data: flyerTokenData },
          ] = await Promise.all([
            supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', oid),
            supabase.from('link_pages').select('*', { count: 'exact', head: true }).eq('organization_id', oid),
            supabase.from('social_accounts').select('*', { count: 'exact', head: true }).eq('organization_id', oid),
            supabase.from('social_posts').select('*', { count: 'exact', head: true }).eq('organization_id', oid),
            supabase.from('studio_images').select('*', { count: 'exact', head: true }).eq('organization_id', oid),
            supabase.from('studio_flyers').select('*', { count: 'exact', head: true }).eq('organization_id', oid),
            supabase.from('ai_conversations').select('*', { count: 'exact', head: true }).eq('organization_id', oid),
            supabase.from('ai_messages').select('*', { count: 'exact', head: true })
              .in('conversation_id', (await supabase.from('ai_conversations').select('id').eq('organization_id', oid)).data?.map(c => c.id) || []),
            supabase.from('editorial_tasks').select('*', { count: 'exact', head: true }).eq('organization_id', oid),
            supabase.from('financial_transactions').select('*', { count: 'exact', head: true }).eq('organization_id', oid),
            // Use usage_tracking for token counts
            supabase.from('usage_tracking').select('usage_count').eq('organization_id', oid).eq('feature_type', 'ai_messages'),
          ]);

          const flyer_tokens = (flyerTokenData || []).reduce(
            (acc: number, f: Record<string, number | null>) => acc + (f.usage_prompt || 0) + (f.usage_candidates || 0),
            0
          );

          return {
            org_id: oid,
            org_name: org.name,
            clients: clients || 0,
            link_pages: link_pages || 0,
            social_accounts: social_accounts || 0,
            social_posts: social_posts || 0,
            studio_images: studio_images || 0,
            studio_flyers: studio_flyers || 0,
            ai_conversations: ai_conversations || 0,
            ai_messages: ai_messages || 0,
            editorial_tasks: editorial_tasks || 0,
            transactions: transactions || 0,
            flyer_tokens,
            subscription_status: subMap[oid] || 'none',
          };
        })
      );

      setOrgsUsage(results);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Global feature totals across all orgs
  const totals = orgsUsage.reduce(
    (acc, o) => ({
      clients: acc.clients + o.clients,
      link_pages: acc.link_pages + o.link_pages,
      social_accounts: acc.social_accounts + o.social_accounts,
      social_posts: acc.social_posts + o.social_posts,
      studio_images: acc.studio_images + o.studio_images,
      studio_flyers: acc.studio_flyers + o.studio_flyers,
      ai_conversations: acc.ai_conversations + o.ai_conversations,
      ai_messages: acc.ai_messages + o.ai_messages,
      editorial_tasks: acc.editorial_tasks + o.editorial_tasks,
      transactions: acc.transactions + o.transactions,
      flyer_tokens: acc.flyer_tokens + o.flyer_tokens,
    }),
    {
      clients: 0, link_pages: 0, social_accounts: 0, social_posts: 0,
      studio_images: 0, studio_flyers: 0, ai_conversations: 0, ai_messages: 0,
      editorial_tasks: 0, transactions: 0, flyer_tokens: 0,
    }
  );

  const featureStats: FeatureStat[] = [
    { feature: 'social_posts', label: 'Publicações Sociais', icon: Share2, total: totals.social_posts, color: '#3b82f6', description: 'Posts agendados e publicados' },
    { feature: 'studio_flyers', label: 'Flyers Gerados', icon: Image, total: totals.studio_flyers, color: '#8b5cf6', description: 'Flyers criados no Studio' },
    { feature: 'studio_images', label: 'Imagens IA', icon: Zap, total: totals.studio_images, color: '#f97316', description: 'Imagens geradas por IA' },
    { feature: 'editorial_tasks', label: 'Tarefas Editoriais', icon: FileText, total: totals.editorial_tasks, color: '#10b981', description: 'Tarefas do calendário editorial' },
    { feature: 'ai_messages', label: 'Mensagens de IA', icon: Bot, total: totals.ai_messages, color: '#f59e0b', description: 'Conversas com assistente IA' },
    { feature: 'clients', label: 'Clientes', icon: Users, total: totals.clients, color: '#ec4899', description: 'Clientes cadastrados' },
    { feature: 'link_pages', label: 'Link 23', icon: Link, total: totals.link_pages, color: '#06b6d4', description: 'Páginas de link criadas' },
    { feature: 'transactions', label: 'Transações', icon: BarChart2, total: totals.transactions, color: '#84cc16', description: 'Lançamentos financeiros' },
    { feature: 'social_accounts', label: 'Redes Sociais', icon: MessageSquare, total: totals.social_accounts, color: '#ef4444', description: 'Contas de redes sociais conectadas' },
  ];

  const maxFeatureVal = Math.max(...featureStats.map(f => f.total), 1);

  const sortedOrgs = [...orgsUsage].sort((a, b) => (Number(b[sortBy]) || 0) - (Number(a[sortBy]) || 0));
  const activeOrgs = orgsUsage.filter(o =>
    o.clients > 0 || o.social_posts > 0 || o.studio_flyers > 0 || o.ai_messages > 0
  ).length;

  // Bar chart data — top 8 orgs by selected metric
  const barData = sortedOrgs.slice(0, 8).map(o => ({
    name: o.org_name.length > 12 ? o.org_name.slice(0, 12) + '…' : o.org_name,
    value: Number(o[sortBy]) || 0,
  }));

  // Pie chart data for feature distribution
  const pieData = featureStats.filter(f => f.total > 0).map(f => ({
    name: f.label,
    value: f.total,
    color: f.color,
  }));

  const getSubBadge = (status?: string) => {
    const map: Record<string, { label: string; className: string }> = {
      active: { label: 'Activa', className: 'bg-emerald-500/10 text-emerald-500' },
      trialing: { label: 'Teste', className: 'bg-yellow-500/10 text-yellow-500' },
      none: { label: 'Sem plano', className: 'bg-muted text-muted-foreground' },
      expired: { label: 'Expirada', className: 'bg-red-500/10 text-red-500' },
    };
    const entry = map[status || 'none'] || map.none;
    return <Badge className={`border-0 text-[10px] ${entry.className}`}>{entry.label}</Badge>;
  };

  const sortOptions: { key: keyof OrgUsage; label: string }[] = [
    { key: 'ai_messages', label: 'Msgs IA' },
    { key: 'social_posts', label: 'Posts' },
    { key: 'studio_flyers', label: 'Flyers' },
    { key: 'studio_images', label: 'Imagens' },
    { key: 'clients', label: 'Clientes' },
    { key: 'flyer_tokens', label: 'Tokens' },
    { key: 'editorial_tasks', label: 'Editorial' },
  ];

  return (
    <div className="p-6 space-y-8">

      {/* Header */}
      <AnimatedContainer animation="fade-up">
        <div>
          <h1 className="text-3xl font-bold">Analytics de Uso</h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} • Consumo e actividade por agência
          </p>
        </div>
      </AnimatedContainer>

      {/* Global KPIs */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Agências Activas', value: activeOrgs, total: orgsUsage.length, icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Posts Publicados', value: totals.social_posts, total: null, icon: Share2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Imagens + Flyers IA', value: totals.studio_images + totals.studio_flyers, total: null, icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Msgs IA (Chat)', value: totals.ai_messages, total: null, icon: Bot, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Tokens Consumidos', value: totals.flyer_tokens.toLocaleString('pt-BR'), total: null, icon: Cpu, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        ].map((kpi, i) => (
          <AnimatedContainer key={kpi.label} animation="fade-up" delay={0.05 * (i + 1)}>
            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${kpi.bg} shrink-0 mt-0.5`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div className="min-w-0">
                  {loading ? <Skeleton className="h-7 w-14 mb-1" /> : (
                    <p className="text-2xl font-bold">{kpi.value}</p>
                  )}
                  <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
                  {kpi.total != null && (
                    <p className="text-[10px] text-muted-foreground">de {kpi.total} total</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </AnimatedContainer>
        ))}
      </div>

      {/* Feature Usage Ranking */}
      <AnimatedContainer animation="fade-up" delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Funcionalidades Mais Usadas
            </CardTitle>
            <CardDescription>Ranking global de actividade por módulo — base de todas as agências</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              [...Array(9)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : (
              featureStats
                .sort((a, b) => b.total - a.total)
                .map((feat, i) => (
                  <div key={feat.feature} className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground font-mono w-4 shrink-0">{i + 1}</span>
                    <div className={`p-1.5 rounded-lg shrink-0 bg-muted`}>
                      <feat.icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{feat.label}</span>
                        <span className="text-sm font-bold tabular-nums">{feat.total.toLocaleString('pt-BR')}</span>
                      </div>
                      <Progress
                        value={(feat.total / maxFeatureVal) * 100}
                        className="h-1.5"
                        style={{ '--tw-bg-opacity': '1' } as React.CSSProperties}
                      />
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </AnimatedContainer>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Bar Chart — per org */}
        <AnimatedContainer animation="fade-up" delay={0.25}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">Top Agências por Métrica</CardTitle>
                <div className="flex flex-wrap gap-1">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setSortBy(opt.key)}
                      className={`text-[11px] px-2 py-1 rounded-md font-medium transition-colors ${
                        sortBy === opt.key
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {barData.map((_, idx) => (
                        <Cell key={idx} fill={FEATURE_COLORS[idx % FEATURE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="mt-4 p-3 bg-muted/40 rounded-lg border border-border/50 text-xs text-muted-foreground flex gap-2">
                <BarChart2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <p>
                  Este gráfico ajuda a entender <strong>quem são os "Heavy Users"</strong> das suas ferramentas. Mostra as 8 agências com o maior uso da métrica activada (no topo à direita). Use-o para saber quais clientes rentabilizam melhor a subscrição, ou precisam de um upsell em pacotes maiores (por exemplo "Tokens Flyer").
                </p>
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>

        {/* Pie Chart — feature distribution */}
        <AnimatedContainer animation="fade-up" delay={0.3}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição de Actividade</CardTitle>
              <CardDescription>Proporção de uso por módulo</CardDescription>
            </CardHeader>
            <CardContent>
              {loading || pieData.length === 0 ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                    />
                    <Legend
                      iconSize={8}
                      iconType="circle"
                      formatter={(value) => <span className="text-[11px]">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="mt-4 p-3 bg-muted/40 rounded-lg border border-border/50 text-xs text-muted-foreground flex gap-2">
                <PieChartIcon className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <p>
                  O gráfico de pizza apresenta a <strong>relação e peso das funcionalidades</strong> utilizadas na totalidade do sistema. Serve para a gestão avaliar qual área exige mais manutenção e foco (ex: "Se IA responde por 60%, devemos melhorar IA").
                </p>
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>
      </div>

      {/* Per-Agency Detail Table */}
      <AnimatedContainer animation="fade-up" delay={0.35}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Detalhes por Agência
            </CardTitle>
            <CardDescription>Métricas completas de consumo de cada organização registada</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium text-xs">Agência</th>
                      <th className="text-left py-2 pr-3 text-muted-foreground font-medium text-xs">Plano</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs">Clientes</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs">Link23</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs">Redes</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs">Posts</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs">Imagens</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs">Flyers</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs">Msgs IA</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs">Editorial</th>
                      <th className="text-right py-2 pl-2 text-muted-foreground font-medium text-xs">Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOrgs.map((org) => {
                      const isActive = org.clients > 0 || org.social_posts > 0 || org.studio_flyers > 0 || org.ai_messages > 0;
                      return (
                        <tr
                          key={org.org_id}
                          className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${!isActive ? 'opacity-50' : ''}`}
                        >
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary">
                                  {org.org_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-xs truncate max-w-[120px]">{org.org_name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-3">{getSubBadge(org.subscription_status)}</td>
                          <td className="text-center py-2.5 px-2 font-mono text-xs">{org.clients}</td>
                          <td className="text-center py-2.5 px-2 font-mono text-xs">{org.link_pages}</td>
                          <td className="text-center py-2.5 px-2 font-mono text-xs">{org.social_accounts}</td>
                          <td className="text-center py-2.5 px-2">
                            <span className={`font-mono text-xs font-medium ${org.social_posts > 100 ? 'text-blue-500' : ''}`}>
                              {org.social_posts}
                            </span>
                          </td>
                          <td className="text-center py-2.5 px-2">
                            <span className={`font-mono text-xs font-medium ${org.studio_images > 50 ? 'text-purple-500' : ''}`}>
                              {org.studio_images}
                            </span>
                          </td>
                          <td className="text-center py-2.5 px-2">
                            <span className={`font-mono text-xs font-medium ${org.studio_flyers > 50 ? 'text-orange-500' : ''}`}>
                              {org.studio_flyers}
                            </span>
                          </td>
                          <td className="text-center py-2.5 px-2">
                            <span className={`font-mono text-xs font-medium ${org.ai_messages > 30 ? 'text-amber-600' : ''}`}>
                              {org.ai_messages}
                            </span>
                          </td>
                          <td className="text-center py-2.5 px-2 font-mono text-xs">{org.editorial_tasks}</td>
                          <td className="text-right py-2.5 pl-2">
                            <span className={`font-mono text-xs font-bold ${org.flyer_tokens > 10000 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                              {org.flyer_tokens > 0 ? org.flyer_tokens.toLocaleString('pt-BR') : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </AnimatedContainer>
    </div>
  );
}
