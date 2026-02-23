import { useState, useMemo } from 'react';
import { Share2, Plus, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SocialCalendar } from '@/components/social-media/SocialCalendar';
import { PostCard } from '@/components/social-media/PostCard';
import { PostModal } from '@/components/social-media/PostModal';
import { MetricsDashboard } from '@/components/social-media/MetricsDashboard';
import { type SocialPost, type SocialPlatform, type PostStatus, MOCK_POSTS, PLATFORM_CONFIG, STATUS_CONFIG } from '@/lib/social-media-mock';
import { toast } from '@/hooks/use-toast';

export default function SocialMedia() {
  const [posts, setPosts] = useState<SocialPost[]>(MOCK_POSTS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      if (searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (platformFilter !== 'all' && !post.platforms.includes(platformFilter as SocialPlatform)) return false;
      if (statusFilter !== 'all' && post.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  }, [posts, searchQuery, platformFilter, statusFilter]);

  const handleCreatePost = (date?: string) => {
    setEditingPost(null);
    setDefaultDate(date);
    setModalOpen(true);
  };

  const handleEditPost = (post: SocialPost) => {
    setEditingPost(post);
    setModalOpen(true);
  };

  const handleSave = (data: Omit<SocialPost, 'id'>) => {
    if (editingPost) {
      setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, ...data } : p));
      toast({ title: 'Post atualizado!' });
    } else {
      const newPost: SocialPost = { ...data, id: crypto.randomUUID() };
      setPosts(prev => [newPost, ...prev]);
      toast({ title: 'Post criado!' });
    }
  };

  const handleDelete = (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    toast({ title: 'Post excluído!' });
  };

  // Stats
  const draftCount = posts.filter(p => p.status === 'draft').length;
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;
  const publishedCount = posts.filter(p => p.status === 'published').length;

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
        <Button onClick={() => handleCreatePost()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Post
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{draftCount}</p>
          <p className="text-xs text-muted-foreground">Rascunhos</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{scheduledCount}</p>
          <p className="text-xs text-muted-foreground">Agendados</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{publishedCount}</p>
          <p className="text-xs text-muted-foreground">Publicados</p>
        </div>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <SocialCalendar
            posts={posts}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onCreatePost={handleCreatePost}
            onEditPost={handleEditPost}
          />
        </TabsContent>

        <TabsContent value="posts">
          <div className="space-y-4">
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
                  <SelectValue placeholder="Rede social" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as redes</SelectItem>
                  {(Object.keys(PLATFORM_CONFIG) as SocialPlatform[]).map(p => (
                    <SelectItem key={p} value={p}>{PLATFORM_CONFIG[p].icon} {PLATFORM_CONFIG[p].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
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
              {filteredPosts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhum post encontrado</p>
                </div>
              ) : (
                filteredPosts.map(post => (
                  <PostCard key={post.id} post={post} onEdit={handleEditPost} onDelete={handleDelete} />
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          <MetricsDashboard />
        </TabsContent>
      </Tabs>

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
