import { useState, useMemo } from 'react';
import { Share2, Plus, Search, CalendarPlus, LayoutDashboard, CalendarDays, BarChart3, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SocialCalendar } from '@/components/social-media/SocialCalendar';
import { SocialDashboard } from '@/components/social-media/SocialDashboard';
import { PostCard } from '@/components/social-media/PostCard';
import { PostModal } from '@/components/social-media/PostModal';
import { MetricsDashboard } from '@/components/social-media/MetricsDashboard';
import { type SocialPlatform, type PostStatus, PLATFORM_CONFIG, STATUS_CONFIG } from '@/lib/social-media-mock';
import { useSocialPosts, type SocialPostRow } from '@/hooks/useSocialPosts';
import { cn } from '@/lib/utils';

type TabValue = 'dashboard' | 'schedule' | 'calendar' | 'posts' | 'reports';

const TABS: { value: TabValue; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { value: 'schedule', label: 'Agendar Post', icon: CalendarPlus },
  { value: 'calendar', label: 'Calendário', icon: CalendarDays },
  { value: 'posts', label: 'Posts', icon: ListFilter },
  { value: 'reports', label: 'Relatórios', icon: BarChart3 },
];

export default function SocialMedia() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPostRow | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<TabValue>('dashboard');

  // Filters for posts tab
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { posts, isLoading, createPost, updatePost, deletePost, sendForApproval } = useSocialPosts();

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      if (searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (platformFilter !== 'all' && !post.platforms.includes(platformFilter as SocialPlatform)) return false;
      if (statusFilter !== 'all' && post.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => {
      const dateA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const dateB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [posts, searchQuery, platformFilter, statusFilter]);

  const handleCreatePost = (date?: string) => {
    setEditingPost(null);
    setDefaultDate(date);
    setModalOpen(true);
  };

  const handleEditPost = (post: SocialPostRow) => {
    setEditingPost(post);
    setModalOpen(true);
  };

  const handleSave = (data: {
    content: string;
    media_urls: string[];
    platforms: SocialPlatform[];
    content_type: string;
    hashtags: string[];
    scheduled_at: string;
    status: string;
    client_id?: string | null;
    notes?: string;
  }) => {
    if (editingPost) {
      updatePost.mutate({ id: editingPost.id, ...data } as any);
    } else {
      createPost.mutate(data as any);
    }
  };

  const handleDelete = (id: string) => {
    deletePost.mutate(id);
  };

  const handleSendForApproval = (id: string) => {
    sendForApproval.mutate(id);
  };

  // Stats
  const draftCount = posts.filter(p => p.status === 'draft').length;
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;
  const publishedCount = posts.filter(p => p.status === 'published').length;
  const pendingCount = posts.filter(p => p.status === 'pending_approval').length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="h-6 w-6 text-primary" />
            Social Media
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie e agende posts para suas redes sociais
          </p>
        </div>
        <Button onClick={() => { setActiveTab('schedule'); handleCreatePost(); }} className="gap-2">
          <CalendarPlus className="h-4 w-4" />
          Agendar Post
        </Button>
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
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard' && <SocialDashboard />}

      {activeTab === 'schedule' && (
        <div className="text-center py-8">
          <CalendarPlus className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Agendar novo post</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Clique no botão abaixo para criar e agendar um novo post
          </p>
          <Button onClick={() => handleCreatePost()} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Post
          </Button>
        </div>
      )}

      {activeTab === 'calendar' && (
        <SocialCalendar
          posts={posts}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          onCreatePost={handleCreatePost}
          onEditPost={handleEditPost}
        />
      )}

      {activeTab === 'posts' && (
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
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
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum post encontrado</p>
              </div>
            ) : (
              filteredPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onEdit={handleEditPost}
                  onDelete={handleDelete}
                  onSendForApproval={handleSendForApproval}
                />
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'reports' && <MetricsDashboard posts={posts} />}

      <PostModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        post={editingPost}
        onSave={handleSave}
        defaultDate={defaultDate}
      />
    </div>
  );
}
