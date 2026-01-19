import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, MousePointerClick, Percent, Link2 } from 'lucide-react';
import { useLinkPageAnalytics } from '@/hooks/useLinkPage';
import type { LinkPage } from '@/types/linktree';

interface InsightsTabProps {
  linkPage: LinkPage;
}

export function InsightsTab({ linkPage }: InsightsTabProps) {
  const { data: analytics, isLoading } = useLinkPageAnalytics(linkPage.id);

  const blocks = linkPage.blocks || [];
  const buttonBlocks = blocks.filter(b => b.type === 'button');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Overview Cards */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Visão Geral</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Eye className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{analytics?.totalViews.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">Visualizações</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <MousePointerClick className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{analytics?.totalClicks.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">Cliques</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Percent className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{analytics?.ctr || 0}%</p>
              <p className="text-xs text-muted-foreground">CTR</p>
            </div>
          </div>
        </Card>

        {/* Top Links */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Top Links</h3>
          {buttonBlocks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum link adicionado ainda
            </p>
          ) : (
            <div className="space-y-3">
              {buttonBlocks.map((block, index) => {
                const clicks = analytics?.blockClicks[block.id] || 0;
                return (
                  <div
                    key={block.id}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary text-xs font-semibold">
                      {index + 1}
                    </span>
                    <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm truncate">
                      {block.content.title || 'Link sem título'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {clicks} cliques
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Last 7 Days Chart */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Últimos 7 dias</h3>
          {analytics?.viewsByDay && Object.keys(analytics.viewsByDay).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(analytics.viewsByDay).map(([day, views]) => {
                const maxViews = Math.max(...Object.values(analytics.viewsByDay));
                const percentage = maxViews > 0 ? (views / maxViews) * 100 : 0;
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16">{day}</span>
                    <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-10 text-right">{views}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum dado disponível ainda
            </p>
          )}
        </Card>

        {!linkPage.is_published && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">
              Publique sua página para começar a coletar dados de analytics
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
