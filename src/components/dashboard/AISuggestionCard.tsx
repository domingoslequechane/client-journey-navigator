import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Phone, Mail, Calendar, ArrowRight, RefreshCw, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';
import { useAISuggestion } from '@/hooks/useAISuggestion';
import { Skeleton } from '@/components/ui/skeleton';

type Client = Tables<'clients'>;

interface AISuggestionCardProps {
  clients: Client[];
}

const SUGGESTION_ICONS = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  followup: ArrowRight,
};

export function AISuggestionCard({ clients }: AISuggestionCardProps) {
  const { suggestion, isLoading, error, refetch } = useAISuggestion(clients);

  if (isLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 bg-gradient-to-br from-primary/10 to-card/80">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <CardTitle className="text-base font-semibold">Analisando clientes...</CardTitle>
          </div>
          <CardDescription>IA processando dados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !suggestion) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border/50 bg-gradient-to-br from-primary/10 to-card/80">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Sugestão Inteligente</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={refetch} className="h-8 w-8">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>Powered by QIA</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[120px]">
          <p className="text-muted-foreground text-sm text-center">
            {error || 'Adicione mais clientes para receber sugestões personalizadas'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const Icon = SUGGESTION_ICONS[suggestion.type] || ArrowRight;

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 bg-gradient-to-br from-primary/10 to-card/80">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Sugestão Inteligente</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10">
              <span className="text-xs font-medium text-primary">
                {suggestion.conversionChance}% chance
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={refetch} className="h-8 w-8">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>Powered by QIA</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {suggestion.message}
        </p>
        
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              suggestion.priority === 'high' ? 'bg-destructive/10 text-destructive' :
              suggestion.priority === 'medium' ? 'bg-warning/10 text-warning' :
              'bg-muted text-muted-foreground'
            }`}>
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-xs text-muted-foreground capitalize">
              Prioridade {suggestion.priority === 'high' ? 'alta' : suggestion.priority === 'medium' ? 'média' : 'baixa'}
            </span>
          </div>
          <Link to={`/app/clients/${suggestion.clientId}`}>
            <Button size="sm" className="gap-1">
              {suggestion.action}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
