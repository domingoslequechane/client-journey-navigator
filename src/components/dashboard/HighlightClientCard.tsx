import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flame, Clock, ArrowRight, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;

interface HighlightClientCardProps {
  clients: Client[];
  currencySymbol: string;
  showBudget?: boolean;
}

const QUALIFICATION_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  hot: { label: 'Lead Quente', variant: 'destructive' },
  qualified: { label: 'Qualificado', variant: 'default' },
  warm: { label: 'Morno', variant: 'secondary' },
  cold: { label: 'Frio', variant: 'outline' },
};

export function HighlightClientCard({ clients, currencySymbol, showBudget = true }: HighlightClientCardProps) {
  const highlightClient = useMemo(() => {
    // Find the hottest lead that needs attention (prioritize by qualification and recency)
    const sortedClients = [...clients]
      .filter((c) => ['prospeccao', 'reuniao', 'contratacao'].includes(c.current_stage))
      .sort((a, b) => {
        const qualificationOrder = { hot: 0, qualified: 1, warm: 2, cold: 3 };
        const aOrder = qualificationOrder[a.qualification as keyof typeof qualificationOrder] ?? 4;
        const bOrder = qualificationOrder[b.qualification as keyof typeof qualificationOrder] ?? 4;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

    return sortedClients[0] || null;
  }, [clients]);

  if (!highlightClient) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 bg-gradient-to-br from-card/80 to-muted/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-destructive" />
            <CardTitle className="text-base font-semibold">Lead em Destaque</CardTitle>
          </div>
          <CardDescription>O lead mais importante agora</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[120px]">
          <p className="text-muted-foreground text-sm">Nenhum lead em prospecção</p>
        </CardContent>
      </Card>
    );
  }

  const qualConfig = QUALIFICATION_CONFIG[highlightClient.qualification] || QUALIFICATION_CONFIG.cold;
  const timeAgo = formatDistanceToNow(new Date(highlightClient.updated_at), {
    addSuffix: true,
    locale: ptBR
  });

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 bg-gradient-to-br from-card/80 to-muted/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-destructive" />
            <CardTitle className="text-base font-semibold">Lead em Destaque</CardTitle>
          </div>
          <Badge variant={qualConfig.variant}>{qualConfig.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold text-lg">
              {highlightClient.company_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{highlightClient.company_name}</h3>
            <p className="text-sm text-muted-foreground truncate">{highlightClient.contact_name}</p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Atualizado {timeAgo}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-4">
            {showBudget && highlightClient.monthly_budget && (
              <div>
                <p className="text-xs text-muted-foreground">Orçamento</p>
                <p className="text-sm font-semibold text-primary">
                  {currencySymbol} {Number(highlightClient.monthly_budget).toLocaleString()}
                </p>
              </div>
            )}
            {highlightClient.phone && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span className="text-xs font-mono">{highlightClient.phone}</span>
              </div>
            )}
          </div>
          <Link to={`/app/clients/${highlightClient.id}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              Ver
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
