import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Share2, Plus, Search, CalendarPlus, LayoutDashboard, CalendarDays, BarChart3, ListFilter, RefreshCw, MessageCircle, Lock, FileText, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SocialCalendar } from '@/components/social-media/SocialCalendar';
import { SocialDashboard } from '@/components/social-media/SocialDashboard';
import { PostCard } from '@/components/social-media/PostCard';
import { MetricsDashboard } from '@/components/social-media/MetricsDashboard';
import { SocialInbox } from '@/components/social-media/SocialInbox';
import { ClientFilterSelect } from '@/components/social-media/ClientFilterSelect';
import { ConnectAccountsGuardModal } from '@/components/social-media/ConnectAccountsGuardModal';
import { ConnectPlatformModal } from '@/components/social-media/ConnectPlatformModal';
import { type SocialPlatform, type PostStatus, PLATFORM_CONFIG, STATUS_CONFIG } from '@/lib/social-media-mock';
import { useSocialPosts, type SocialPostRow } from '@/hooks/useSocialPosts';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import { useSocialMessages } from '@/hooks/useSocialMessages';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type TabValue = 'dashboard' | 'schedule' | 'calendar' | 'posts' | 'inbox' | 'reports';

const TABS: { value: TabValue; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { value: 'calendar', label: 'Calendário', icon: CalendarDays },
  { value: 'posts', label: 'Posts', icon: ListFilter },
  { value: 'inbox', label: 'Inbox', icon: MessageCircle },
  { value: 'reports', label: 'Relatórios', icon: BarChart3 },
];

export default function SocialMedia() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<TabValue>('dashboard');

  // Global client filter — persisted for the duration of the browser session
  const [selectedClient, setSelectedClient] = useState<string>(
    () => sessionStorage.getItem('social_selected_client') || 'all'
  );

  const handleClientChange = (value: string) => {
    setSelectedClient(value);
    sessionStorage.setItem('social_selected_client', value);
  };

  // Filters for posts tab
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { posts, isLoading, deletePost, sendForApproval, publishPost, syncPosts, refetch: refetchPosts } = useSocialPosts();
  const { accounts, syncAccounts, connectPlatform, refetch: refetchAccounts } = useSocialAccounts(selectedClient !== 'all' ? selectedClient : undefined);
  const { unreadCount, refetch: refetchMessages } = useSocialMessages(selectedClient !== 'all' ? selectedClient : undefined);
  const { limits, usage, canAddSocialAccount } = usePlanLimits();

  const [connectGuardOpen, setConnectGuardOpen] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<SocialPlatform | null>(null);

  const connectedAccounts = accounts.filter(a => a.is_connected);
  const hasClientSelected = selectedClient !== 'all';

  // Sync posts on mount
  useEffect(() => {
    if (hasClientSelected) {
      syncPosts.mutate();
    }
  }, [selectedClient]);

  // Refresh data when tab changes
  useEffect(() => {
    if (hasClientSelected) {
      refetchPosts();
      refetchAccounts();
      refetchMessages();
    }
  }, [activeTab, selectedClient]);

  // Filter posts by selected client globally
  const clientPosts = useMemo(() => {
    if (!hasClientSelected) return posts;
    return posts.filter(p => p.client_id === selectedClient);
  }, [posts, selectedClient, hasClientSelected]);

  const filteredPosts = useMemo(() => {
    return clientPosts.filter(post => {
      if (searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (platformFilter !== 'all' && !post.platforms.includes(platformFilter as SocialPlatform)) return false;
      if (statusFilter !== 'all' && post.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => {
      const dateA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const dateB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [clientPosts, searchQuery, platformFilter, statusFilter]);

  const handleCreatePost = (date?: string) => {
    if (connectedAccounts.length === 0) {
      setConnectGuardOpen(true);
      return;
    }
    const params = new URLSearchParams();
    if (selectedClient !== 'all') params.set('clientId', selectedClient);
    if (date) params.set('date', date);
    navigate(`/app/social-media/new?${params.toString()}`);
  };

  const handleEditPost = (post: SocialPostRow) => {
    navigate(`/app/social-media/edit/${post.id}?clientId=${post.client_id}`);
  };

  const handleDelete = (id: string) => {
    deletePost.mutate(id);
  };

  const handleSendForApproval = (id: string) => {
    sendForApproval.mutate(id);
  };

  const handlePublishPost = (postId: string, publishNow: boolean) => {
    publishPost.mutate({ postId, publishNow });
  };

  const handleRetryPost = (postId: string) => {
    publishPost.mutate({ postId, publishNow: true });
  };

  const handleClonePost = (post: SocialPostRow) => {
    const params = new URLSearchParams();
    params.set('clientId', post.client_id || '');
    params.set('cloneFrom', post.id);
    navigate(`/app/social-media/new?${params.toString()}`);
  };

  const handleBoostPost = (post: SocialPostRow) => {
    toast.info('Funcionalidade de impulsionamento em breve!');
  };

  const handleSync = () => {
    const cId = selectedClient !== 'all' ? selectedClient : undefined;
    syncAccounts.mutate(cId);
    syncPosts.mutate();
  };

  // Stats from client-filtered posts
  const draftCount = clientPosts.filter(p => p.status === 'draft').length;
  const scheduledCount = clientPosts.filter(p => p.status === 'scheduled').length;
  const publishedCount = clientPosts.filter(p => p.status === 'published').length;
  const pendingCount = clientPosts.filter(p => p.status === 'pending_approval').length;

  const socialUsagePercent = limits.maxSocialAccounts ? (usage.socialAccountsCount / limits.maxSocialAccounts) * 100 : 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Share2 className="h-6 w-6 text-primary" />
                Social Media
              </div>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie e agende posts para suas redes sociais
            </p>
          </div>

          {/* Usage Indicator */}
          <div className="w-full sm:w-64 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Contas Conectadas</span>
              <span className={cn("font-bold", !canAddSocialAccount ? "text-destructive" : "text-primary")}>
                {usage.socialAccountsCount} / {limits.maxSocialAccounts}
              </span>
            </div>
            <Progress value={socialUsagePercent} className={cn("h-1.5", !canAddSocialAccount && "bg-destructive/20")} />
            {!canAddSocialAccount && (
              <p className="text-[10px] text-destructive flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" /> Limite do plano atingido
              </p>
            )}
          </div>
        </div>

        {/* Global controls bar */}
        <div className="flex items-center gap-3">
          <ClientFilterSelect value={selectedClient} onChange={handleClientChange} className="min-w-0 flex-1 sm:flex-none sm:w-[240px]" />
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={handleSync}
            disabled={syncAccounts.isPending || syncPosts.isPending || !hasClientSelected}
          >
            <RefreshCw className={cn("h-4 w-4", (syncAccounts.isPending || syncPosts.isPending) && "animate-spin")} />
            <span className="hidden sm:inline">Sincronizar</span>
          </Button>
          <Button
            onClick={() => handleCreatePost()}
            className="gap-2 shrink-0"
            disabled={!hasClientSelected}
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Post</span>
          </Button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.value === 'inbox' && unreadCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* No client selected message */}
      {!hasClientSelected && activeTab !== 'dashboard' && (
        <div className="rounded-lg border border-border bg-muted/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Selecione um cliente acima para visualizar e gerenciar seus posts.
          </p>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'dashboard' && <SocialDashboard selectedClient={selectedClient} />}

      {activeTab === 'calendar' && hasClientSelected && (
        <div className="space-y-4">
          {/* Drafts Quick Access - also shown in Calendar */}
          {draftCount > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Rascunhos por terminar</p>
                  <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-full">{draftCount}</span>
                </div>
                <button
                  onClick={() => setActiveTab('posts')}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  Ver todos
                </button>
              </div>
              <div className="space-y-2">
                {clientPosts
                  .filter(p => p.status === 'draft')
                  .slice(0, 3)
                  .map(draft => (
                    <div key={draft.id} className="flex items-center justify-between rounded-lg bg-background/80 border border-border/50 px-3 py-2.5 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {draft.media_urls?.[0] ? (
                          <img src={draft.media_urls[0]} className="h-8 w-8 rounded object-cover shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground truncate">
                          {draft.content ? draft.content.slice(0, 50) + (draft.content.length > 50 ? '...' : '') : 'Sem legenda'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEditPost(draft)}
                        className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                        Editar
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
          <SocialCalendar
            posts={clientPosts}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onCreatePost={handleCreatePost}
            onEditPost={handleEditPost}
            selectedClient={selectedClient}
          />
        </div>
      )}

      {activeTab === 'posts' && hasClientSelected && (
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              className={cn(
                "rounded-lg border bg-card p-4 text-center cursor-pointer transition-all hover:border-primary/50",
                statusFilter === 'draft' ? "border-primary bg-primary/5" : "border-border"
              )}
              onClick={() => setStatusFilter(statusFilter === 'draft' ? 'all' : 'draft')}
            >
              <p className="text-2xl font-bold">{draftCount}</p>
              <p className="text-xs text-muted-foreground">Rascunhos</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-[hsl(var(--warning))]">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Aguardando</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-[hsl(var(--info))]">{scheduledCount}</p>
              <p className="text-xs text-muted-foreground">Agendados</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-[hsl(var(--success))]">{publishedCount}</p>
              <p className="text-xs text-muted-foreground">Publicados</p>
            </div>
          </div>

          {/* Drafts Quick Access - shown at top of Posts tab always */}
          {draftCount > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Rascunhos por terminar</p>
                  <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-full">{draftCount}</span>
                </div>
                {statusFilter !== 'draft' && (
                  <button
                    onClick={() => setStatusFilter('draft')}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
                  >
                    Ver todos
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {clientPosts
                  .filter(p => p.status === 'draft')
                  .slice(0, 4)
                  .map(draft => (
                    <div key={draft.id} className="flex items-center justify-between rounded-lg bg-background/80 border border-border/50 px-3 py-2.5 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {draft.media_urls?.[0] ? (
                          <img src={draft.media_urls[0]} className="h-8 w-8 rounded object-cover shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground truncate">
                          {draft.content ? draft.content.slice(0, 60) + (draft.content.length > 60 ? '...' : '') : 'Sem legenda'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEditPost(draft)}
                        className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                        Editar
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar posts..."
                className="pl-9"
              />
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os canais</SelectItem>
                {(Object.keys(PLATFORM_CONFIG) as SocialPlatform[]).map(p => (
                  <SelectItem key={p} value={p}>{PLATFORM_CONFIG[p].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(Object.keys(STATUS_CONFIG) as PostStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Posts list */}
          <div className="space-y-6 relative before:absolute before:left-[47px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border/50">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum post encontrado</p>
              </div>
            ) : (
              filteredPosts.map((post, index) => (
                <div key={post.id} className="relative pl-16">
                  <div className="absolute left-0 top-4 w-12 text-right">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">
                      {post.scheduled_at ? format(parseISO(post.scheduled_at), "MMM", { locale: ptBR }) : '---'}
                    </div>
                    <div className="text-lg font-bold leading-none">
                      {post.scheduled_at ? format(parseISO(post.scheduled_at), "dd") : '--'}
                    </div>
                  </div>
                  <div className="absolute left-[43px] top-5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background z-10" />
                  <PostCard
                    post={post}
                    onEdit={handleEditPost}
                    onDelete={handleDelete}
                    onSendForApproval={handleSendForApproval}
                    onRetry={handleRetryPost}
                    onPublish={handlePublishPost}
                    onClone={handleClonePost}
                    onBoost={handleBoostPost}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'inbox' && hasClientSelected && <SocialInbox selectedClient={selectedClient} />}

      {activeTab === 'reports' && hasClientSelected && <MetricsDashboard posts={clientPosts} selectedClient={selectedClient} />}

      <ConnectAccountsGuardModal
        open={connectGuardOpen}
        onOpenChange={setConnectGuardOpen}
        onConnectPlatform={(platform) => {
          setConnectingPlatform(platform);
        }}
        onGoToDashboard={() => setActiveTab('dashboard')}
      />

      <ConnectPlatformModal
        open={!!connectingPlatform}
        onOpenChange={(v) => !v && setConnectingPlatform(null)}
        platform={connectingPlatform}
        onConnect={(platform) => {
          setConnectingPlatform(null);
          if (selectedClient !== 'all') {
            connectPlatform.mutate({ platform, clientId: selectedClient });
          }
        }}
        isConnecting={connectPlatform.isPending}
      />
    </div>
  );
}