import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  Link2,
  Eye,
  MousePointerClick,
  Search,
  Plus,
  Pencil,
  ExternalLink,
  BarChart3,
  Copy,
  CheckCircle2,
  FileEdit,
  PauseCircle,
  Building2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { usePlanLimits } from '@/hooks/usePlanLimits';

export default function LinkTreeDashboard() {
  const { t } = useTranslation('clients');
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectClientOpen, setSelectClientOpen] = useState(false);
  const { limits, usage } = usePlanLimits();
  // Fetch organization slug
  const { data: organization } = useQuery({
    queryKey: ['organization-slug', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch all link pages for the organization
  const { data: linkPages, isLoading } = useQuery({
    queryKey: ['link-pages-dashboard', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('link_pages')
        .select(`
          *,
          clients!inner(id, company_name, paused)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch clients without link pages
  const { data: clientsWithoutLinks } = useQuery({
    queryKey: ['clients-without-links', organizationId, linkPages],
    queryFn: async () => {
      if (!organizationId) return [];

      // Get all clients
      const { data: allClients, error: clientsError } = await supabase
        .from('clients')
        .select('id, company_name')
        .eq('organization_id', organizationId)
        .eq('paused', false)
        .order('company_name');

      if (clientsError) throw clientsError;

      // Get clients that already have link pages
      const clientsWithPages = new Set(linkPages?.map(p => p.client_id) || []);

      // Filter out clients that already have pages
      return allClients?.filter(c => !clientsWithPages.has(c.id)) || [];
    },
    enabled: !!organizationId,
  });

  // Fetch analytics for all pages
  const { data: analytics } = useQuery({
    queryKey: ['link-pages-analytics', organizationId],
    queryFn: async () => {
      if (!organizationId || !linkPages?.length) return { views: 0, clicks: 0, pageStats: {} };

      const pageIds = linkPages.map(p => p.id);
      
      const { data, error } = await supabase
        .from('link_analytics')
        .select('link_page_id, event_type')
        .in('link_page_id', pageIds);

      if (error) throw error;

      let totalViews = 0;
      let totalClicks = 0;
      const pageStats: Record<string, { views: number; clicks: number }> = {};

      data?.forEach(event => {
        if (!pageStats[event.link_page_id]) {
          pageStats[event.link_page_id] = { views: 0, clicks: 0 };
        }
        if (event.event_type === 'view') {
          totalViews++;
          pageStats[event.link_page_id].views++;
        } else if (event.event_type === 'click') {
          totalClicks++;
          pageStats[event.link_page_id].clicks++;
        }
      });

      return { views: totalViews, clicks: totalClicks, pageStats };
    },
    enabled: !!organizationId && !!linkPages?.length,
  });

  // Count blocks per page
  const { data: blockCounts } = useQuery({
    queryKey: ['link-blocks-count', organizationId],
    queryFn: async () => {
      if (!organizationId || !linkPages?.length) return {};

      const pageIds = linkPages.map(p => p.id);
      
      const { data, error } = await supabase
        .from('link_blocks')
        .select('link_page_id')
        .in('link_page_id', pageIds);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(block => {
        counts[block.link_page_id] = (counts[block.link_page_id] || 0) + 1;
      });

      return counts;
    },
    enabled: !!organizationId && !!linkPages?.length,
  });

  const filteredPages = linkPages?.filter(page => 
    (page.clients?.company_name || page.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.slug.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalLinks = Object.values(blockCounts || {}).reduce((a, b) => a + b, 0);
  const publishedCount = linkPages?.filter(p => p.is_published).length || 0;

  const getPublicUrl = (slug: string) => {
    const orgSlug = organization?.slug || 'agencia';
    return `/${orgSlug}/@${slug}`;
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}${getPublicUrl(slug)}`;
    navigator.clipboard.writeText(url);
    toast({ title: t('linkTree.messages.linkCopied') });
  };

  const getStatusBadge = (page: typeof filteredPages[0]) => {
    if (page.clients?.paused) {
      return (
        <Badge variant="secondary" className="gap-1">
          <PauseCircle className="h-3 w-3" />
          Pausado
        </Badge>
      );
    }
    if (page.is_published) {
      return (
        <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3" />
          Publicado
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <FileEdit className="h-3 w-3" />
        Rascunho
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <AnimatedContainer animation="fade-in" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Link2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              Link23
            </div>
            {limits.maxLinkPages !== null && (
              <Badge variant="outline" className="font-mono">
                Páginas: {usage.linkPagesCount}/{limits.maxLinkPages}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">
            Crie e gerencie páginas de links para seus clientes
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold">{linkPages?.length || 0}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Páginas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
              <Link2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold">{totalLinks}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Links</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
              <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold">{(analytics?.views || 0).toLocaleString()}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Views</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="p-2 bg-pink-500/10 rounded-lg shrink-0">
              <MousePointerClick className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold">{(analytics?.clicks || 0).toLocaleString()}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Cliques</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Seus Clientes</h2>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setSelectClientOpen(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('linkTree.newLink')}</span>
          </Button>
        </div>
      </div>

      {/* Select Client Dialog */}
      <Dialog open={selectClientOpen} onOpenChange={setSelectClientOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('linkTree.selectClient')}</DialogTitle>
            <DialogDescription>
              {t('linkTree.selectClientDescription')}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-2 py-2">
              {clientsWithoutLinks && clientsWithoutLinks.length > 0 ? (
                clientsWithoutLinks.map(client => (
                  <Button
                    key={client.id}
                    variant="ghost"
                    className="w-full justify-start gap-3 h-auto py-3"
                    onClick={() => {
                      navigate(`/app/clients/${client.id}/links`);
                      setSelectClientOpen(false);
                    }}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium">{client.company_name}</span>
                  </Button>
                ))
              ) : (
                <div className="text-center py-6">
                  <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {linkPages && linkPages.length > 0 
                      ? t('linkTree.allClientsHaveLinks')
                      : t('linkTree.noClientsAvailable')
                    }
                  </p>
                  {(!linkPages || linkPages.length === 0) && (
                    <Button 
                      variant="outline" 
                      className="mt-3"
                      onClick={() => {
                        setSelectClientOpen(false);
                        navigate('/app/clients/new');
                      }}
                    >
                      {t('newClient')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Link Pages Grid */}
      {filteredPages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPages.map((page) => {
            const stats = analytics?.pageStats?.[page.id] || { views: 0, clicks: 0 };
            const linkCount = blockCounts?.[page.id] || 0;
            const clientName = page.clients?.company_name || page.name;
            const publicPath = getPublicUrl(page.slug);

            return (
              <Card key={page.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-4 space-y-4">
                  {/* Header - Avatar on left */}
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={page.logo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {clientName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold truncate">{clientName}</h3>
                        {getStatusBadge(page)}
                      </div>
                      <button 
                        onClick={() => handleCopyLink(page.slug)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
                      >
                        <span className="truncate">{publicPath}</span>
                        <Copy className="h-3 w-3 shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y">
                    <div className="text-center">
                      <p className="font-semibold">{linkCount}</p>
                      <p className="text-xs text-muted-foreground">Links</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{stats.views.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Views</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{stats.clicks.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Cliques</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => navigate(`/app/clients/${page.client_id}/links`)}
                      className="flex-1 gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(publicPath, '_blank')}
                      disabled={!page.is_published}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigate(`/app/clients/${page.client_id}/links?tab=insights`)}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <Link2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhuma página de links criada'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? 'Tente ajustar sua busca' 
                : 'Crie páginas de links para seus clientes'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate('/app/clients')}>
                Ver Clientes
              </Button>
            )}
          </div>
        </Card>
      )}
    </AnimatedContainer>
  );
}
