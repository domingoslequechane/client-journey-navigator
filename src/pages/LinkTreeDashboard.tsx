import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Skeleton } from '@/components/ui/skeleton';
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
  Loader2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function LinkTreeDashboard() {
  const { t } = useTranslation('clients');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId } = useOrganizationCurrency();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all link pages for the organization
  const { data: linkPages, isLoading } = useQuery({
    queryKey: ['link-pages-dashboard', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('link_pages')
        .select(`
          *,
          clients!inner(id, company_name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
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

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/l/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: t('linkTree.linkCopied') });
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
      <div>
        <h1 className="text-2xl font-bold">
          {t('linkTree.title')} 👋
        </h1>
        <p className="text-muted-foreground">
          {t('linkTree.subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{linkPages?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Clientes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Link2 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalLinks}</p>
              <p className="text-sm text-muted-foreground">Links</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Eye className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(analytics?.views || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Views</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-pink-500/10 rounded-lg">
              <MousePointerClick className="h-5 w-5 text-pink-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(analytics?.clicks || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Clicks</p>
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
          <Button onClick={() => navigate('/app/clients/new')} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Cliente</span>
          </Button>
        </div>
      </div>

      {/* Link Pages Grid */}
      {filteredPages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPages.map((page) => {
            const stats = analytics?.pageStats?.[page.id] || { views: 0, clicks: 0 };
            const linkCount = blockCounts?.[page.id] || 0;
            const clientName = page.clients?.company_name || page.name;

            return (
              <Card key={page.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-4 space-y-4">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={page.logo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {clientName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{clientName}</h3>
                      <button 
                        onClick={() => handleCopyLink(page.slug)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        /{page.slug}
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <Badge variant={page.is_published ? 'default' : 'secondary'}>
                      {page.is_published ? t('linkTree.status.published') : t('linkTree.status.draft')}
                    </Badge>
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
                      <p className="text-xs text-muted-foreground">Clicks</p>
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
                      onClick={() => window.open(`/l/${page.slug}`, '_blank')}
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
              {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhuma árvore de links criada'}
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
