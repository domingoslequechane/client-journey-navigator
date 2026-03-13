import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Share2, Plus, Search, CalendarPlus, LayoutDashboard, CalendarDays, BarChart3, ListFilter, RefreshCw, MessageCircle, Lock, FileText, Pencil, ChevronLeft, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';
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
import { ConfirmActionModal } from '@/components/social-media/ConfirmActionModal';
import { type SocialPlatform, type PostStatus, PLATFORM_CONFIG, STATUS_CONFIG } from '@/lib/social-media-mock';
import { useSocialPosts, type SocialPostRow } from '@/hooks/useSocialPosts';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import { useSocialMessages } from '@/hooks/useSocialMessages';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useHeader } from '@/contexts/HeaderContext';
import { CheckCircle2 } from 'lucide-react';

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
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [draftToDelete, setDraftToDelete] = useState<SocialPostRow | null>(null);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const handleSelectPost = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedPostIds(prev => [...prev, id]);
    } else {
      setSelectedPostIds(prev => prev.filter(postId => postId !== id));
    }
  };

  const handleSelectAll = (ids: string[], selected: boolean) => {
    if (selected) {
      setSelectedPostIds(ids);
    } else {
      setSelectedPostIds([]);
    }
  };

  // Restore navigation state when returning from editor
  useEffect(() => {
    const saved = sessionStorage.getItem('social_nav_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.activeTab) setActiveTab(state.activeTab as TabValue);
        if (state.statusFilter) setStatusFilter(state.statusFilter);
        if (state.platformFilter) setPlatformFilter(state.platformFilter);
        if (state.searchQuery) setSearchQuery(state.searchQuery);
        if (state.currentPage) setCurrentPage(state.currentPage);
        if (state.currentMonth) setCurrentMonth(new Date(state.currentMonth));
        // Clear after restoring so it doesn't persist forever
        sessionStorage.removeItem('social_nav_state');
      } catch { }
    }
  }, []);
  const ITEMS_PER_PAGE = 10;

  const { posts, isLoading, deletePost, sendForApproval, publishPost, syncPosts, refetch: refetchPosts } = useSocialPosts();
  const { accounts, syncAccounts, connectPlatform, refetch: refetchAccounts } = useSocialAccounts(selectedClient !== 'all' ? selectedClient : undefined);
  const { unreadCount, refetch: refetchMessages } = useSocialMessages(selectedClient !== 'all' ? selectedClient : undefined);
  const { limits, usage, canAddSocialAccount } = usePlanLimits();

  const [connectGuardOpen, setConnectGuardOpen] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<SocialPlatform | null>(null);

  const connectedAccounts = accounts.filter(a => a.is_connected);
  const hasClientSelected = selectedClient !== 'all';

  const { setRightAction } = useHeader();

  // Sync posts on mount
  useEffect(() => {
    if (hasClientSelected) {
      syncPosts.mutate();
    }
  }, [selectedClient]);

  // Set header action on mobile
  useEffect(() => {
    if (hasClientSelected) {
      setRightAction(
        <Button
          onClick={() => handleCreatePost()}
          size="sm"
          className="h-9 px-3 gap-2 bg-[#F97316] hover:bg-[#F97316]/90 border-0 shadow-sm animate-in zoom-in duration-300"
        >
          <Plus className="h-4 w-4" />
          <span className="text-xs font-bold">Novo Post</span>
        </Button>
      );
    } else {
      setRightAction(null);
    }
    return () => setRightAction(null);
  }, [hasClientSelected]);

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
      // Hide sub-drafts of a batch
      if (post.status === 'draft' && post.notes?.includes('"isHidden":true')) return false;

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, platformFilter, statusFilter, selectedClient]);

  const totalPages = Math.ceil(filteredPosts.length / ITEMS_PER_PAGE);
  const paginatedPosts = useMemo(() => {
    return filteredPosts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredPosts, currentPage]);

  const saveNavState = () => {
    sessionStorage.setItem('social_nav_state', JSON.stringify({
      activeTab,
      statusFilter,
      platformFilter,
      searchQuery,
      currentPage,
      currentMonth: currentMonth.toISOString(),
    }));
  };

  const handleCreatePost = (date?: string) => {
    if (connectedAccounts.length === 0) {
      setConnectGuardOpen(true);
      return;
    }
    saveNavState();
    const params = new URLSearchParams();
    if (selectedClient !== 'all') params.set('clientId', selectedClient);
    if (date) params.set('date', date);
    navigate(`/app/social-media/new?${params.toString()}`);
  };

  const handleEditPost = (post: SocialPostRow) => {
    saveNavState();
    navigate(`/app/social-media/edit/${post.id}?clientId=${post.client_id}`);
  };

  const handleDelete = async (postId: string) => {
    const postToDelete = posts.find(p => p.id === postId);
    const metaNotes = postToDelete?.notes;
    let batchId: string | undefined;

    // Only use batch deletion for drafts (compact batches)
    // For scheduled posts, we usually want to delete them individually
    if (postToDelete?.status === 'draft' && metaNotes?.includes('BATCH_META:')) {
      try {
        const metaStr = metaNotes.substring(metaNotes.indexOf('BATCH_META:') + 11);
        const meta = JSON.parse(metaStr);
        batchId = meta.batchId;
      } catch (e) {
        console.error("Error parsing batch meta:", e);
      }
    }

    setDraftToDelete(null);
    deletePost.mutate({ id: postId, batchId }, {
      onSuccess: () => {
        setShowDeleteSuccess(true);
        setTimeout(() => {
          setShowDeleteSuccess(false);
          handleSync();
        }, 2000);
      }
    });
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
    saveNavState();
    const params = new URLSearchParams();
    params.set('clientId', post.client_id || '');
    params.set('cloneFrom', post.id);
    navigate(`/app/social-media/new?${params.toString()}`);
  };

  const handleBoostPost = (post: SocialPostRow) => {
    toast.info('Funcionalidade de impulsionamento em breve!');
  };

  const handleBulkDelete = () => {
    if (selectedPostIds.length === 0) return;

    setShowBulkDeleteConfirm(false);
    deletePost.mutate({ postIds: selectedPostIds }, {
      onSuccess: () => {
        setSelectedPostIds([]);
        setShowDeleteSuccess(true);
        setTimeout(() => {
          setShowDeleteSuccess(false);
          handleSync();
        }, 2000);
      }
    });
  };

  const handleSync = () => {
    const cId = selectedClient !== 'all' ? selectedClient : undefined;
    syncAccounts.mutate(cId);
    syncPosts.mutate();
  };

  // Stats from client-filtered posts
  const draftCount = clientPosts.filter(p => p.status === 'draft' && !p.notes?.includes('"isHidden":true')).length;
  const scheduledCount = clientPosts.filter(p => p.status === 'scheduled').length;
  const publishedCount = clientPosts.filter(p => p.status === 'published').length;
  const pendingCount = clientPosts.filter(p => p.status === 'pending_approval').length;

  const socialUsagePercent = limits.maxSocialAccounts ? (usage.socialAccountsCount / limits.maxSocialAccounts) * 100 : 0;

  return (
    <div className="space-y-6 p-4 md:p-6 pt-6 md:pt-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden md:block">
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <ClientFilterSelect value={selectedClient} onChange={handleClientChange} className="w-full sm:w-[240px]" />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none gap-2"
              onClick={handleSync}
              disabled={syncAccounts.isPending || syncPosts.isPending || !hasClientSelected}
            >
              <RefreshCw className={cn("h-4 w-4", (syncAccounts.isPending || syncPosts.isPending) && "animate-spin")} />
              <span>Sincronizar</span>
            </Button>
            <Button
              onClick={() => handleCreatePost()}
              className="flex-1 sm:flex-none gap-2 hidden sm:flex"
              disabled={!hasClientSelected}
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Post</span>
            </Button>
          </div>
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
                  .filter(p => p.status === 'draft' && !p.notes?.includes('"isHidden":true'))
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
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setDraftToDelete(draft)}
                          className="flex items-center gap-1.5 text-[11px] font-bold border border-destructive/40 text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleEditPost(draft)}
                          className="flex items-center gap-1.5 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </button>
                      </div>
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

          {/* Bulk Actions Bar */}
          {filteredPosts.length > 0 && (
            <div className={cn(
              "flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
              selectedPostIds.length > 0
                ? "bg-primary/10 border-primary/30 shadow-sm"
                : "bg-muted/30 border-border/50"
            )}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSelectAll(
                    paginatedPosts.map(p => p.id),
                    selectedPostIds.length < paginatedPosts.length
                  )}
                  className="flex items-center gap-2 text-xs font-semibold hover:text-primary transition-colors"
                >
                  <div className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                    selectedPostIds.length === paginatedPosts.length && paginatedPosts.length > 0
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-background border-slate-300"
                  )}>
                    {selectedPostIds.length === paginatedPosts.length && paginatedPosts.length > 0 && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                  {selectedPostIds.length === paginatedPosts.length && paginatedPosts.length > 0 ? 'Desmarcar todos' : 'Selecionar nesta página'}
                </button>
                {selectedPostIds.length > 0 && (
                  <>
                    <div className="h-4 w-px bg-border/50 mx-1" />
                    <span className="text-xs font-bold text-primary">
                      {selectedPostIds.length} {selectedPostIds.length === 1 ? 'post selecionado' : 'posts selecionados'}
                    </span>
                  </>
                )}
              </div>

              {selectedPostIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 gap-2 rounded-lg text-xs font-bold"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar Seleção
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-medium"
                    onClick={() => setSelectedPostIds([])}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Posts list in Grid Layout */}
          <div className="space-y-8">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum post encontrado</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {paginatedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onEdit={handleEditPost}
                      onDelete={handleDelete}
                      onSendForApproval={handleSendForApproval}
                      onRetry={handleRetryPost}
                      onPublish={handlePublishPost}
                      onClone={handleClonePost}
                      onBoost={handleBoostPost}
                      isSelected={selectedPostIds.includes(post.id)}
                      onSelect={handleSelectPost}
                    />
                  ))}
                </div>

                {/* Controles de Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-4 pb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentPage(prev => Math.max(1, prev - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === 1}
                      className="gap-2 rounded-xl"
                    >
                      <ChevronLeft className="h-4 w-4" /> Anterior
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground bg-muted/30 px-4 py-1.5 rounded-full border border-border/50">
                      Página <span className="text-foreground font-bold">{currentPage}</span> de <span className="text-foreground font-bold">{totalPages}</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentPage(prev => Math.min(totalPages, prev + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === totalPages}
                      className="gap-2 rounded-xl"
                    >
                      Próximo <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
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

      {/* Confirm delete draft modal */}
      <Dialog open={!!draftToDelete} onOpenChange={(v) => !v && setDraftToDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <DialogTitle className="text-center">
              {draftToDelete?.notes?.includes('BATCH_META:') ? 'Eliminar lote de posts?' : 'Eliminar postagem?'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {draftToDelete?.notes?.includes('BATCH_META:') ? (
                <>
                  Esta postagem faz parte de um agendamento em lote.
                  <span className="block mt-2 font-bold text-destructive">
                    Pelo menos 3 posts relacionados (Facebook, Instagram, etc) serão eliminados simultaneamente do servidor e da nossa aplicação.
                  </span>
                </>
              ) : (
                <>
                  {draftToDelete?.content
                    ? `"${draftToDelete.content.slice(0, 60)}${draftToDelete.content.length > 60 ? '...' : ''}"`
                    : 'Esta postagem'}
                  {' '}será eliminada definitivamente da nossa aplicação e das plataformas conectadas.
                </>
              )}
              <span className="block mt-2 text-xs opacity-70">Esta ação não pode ser desfeita.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDraftToDelete(null)} disabled={deletePost.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => draftToDelete && handleDelete(draftToDelete.id)}
              disabled={deletePost.isPending}
              className="gap-2"
            >
              {deletePost.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {draftToDelete?.notes?.includes('BATCH_META:') ? 'Eliminar lote completo' : 'Eliminar definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionModal
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        title="Eliminar posts selecionados?"
        description={`Tens a certeza que desejas eliminar os ${selectedPostIds.length} posts selecionados? Esta ação não pode ser desfeita e removerá os posts tanto da aplicação quanto dos servidores das redes sociais.`}
        confirmLabel="Eliminar Tudo"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleBulkDelete}
      />

      <Dialog open={deletePost.isPending} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <RefreshCw className="h-12 w-12 animate-spin text-primary" />
            </div>
            <DialogTitle className="text-center">A eliminar postagem...</DialogTitle>
            <DialogDescription className="text-center">
              Por favor aguarde enquanto processamos a remoção tanto na aplicação quanto nas redes sociais associadas.
              Isto pode levar alguns segundos.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteSuccess} onOpenChange={setShowDeleteSuccess}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-[hsl(var(--success)/0.2)] flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-[hsl(var(--success))]" />
              </div>
            </div>
            <DialogTitle className="text-center">Postagem eliminada</DialogTitle>
            <DialogDescription className="text-center">
              A postagem foi removida com sucesso de todas as plataformas.
              O calendário será atualizado em instantes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setShowDeleteSuccess(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}