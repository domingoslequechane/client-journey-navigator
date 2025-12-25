import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Phone, Mail, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;

interface AISuggestionCardProps {
  clients: Client[];
}

interface Suggestion {
  type: 'call' | 'email' | 'meeting' | 'followup';
  message: string;
  client: Client;
  priority: 'high' | 'medium' | 'low';
  conversionChance: number;
  action: string;
}

const SUGGESTION_ICONS = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  followup: ArrowRight,
};

export function AISuggestionCard({ clients }: AISuggestionCardProps) {
  const suggestion = useMemo((): Suggestion | null => {
    // Find clients that need attention based on various signals
    const now = new Date();
    
    // Priority 1: Hot leads not contacted in 24h+
    const hotLeadsNeedingAttention = clients
      .filter((c) => 
        c.qualification === 'hot' && 
        ['prospeccao', 'reuniao', 'contratacao'].includes(c.current_stage)
      )
      .map((c) => ({
        client: c,
        hoursSinceUpdate: differenceInHours(now, new Date(c.updated_at)),
      }))
      .filter((item) => item.hoursSinceUpdate >= 24)
      .sort((a, b) => b.hoursSinceUpdate - a.hoursSinceUpdate);

    if (hotLeadsNeedingAttention.length > 0) {
      const item = hotLeadsNeedingAttention[0];
      const conversionChance = Math.max(50, Math.min(85, 90 - item.hoursSinceUpdate / 2));
      return {
        type: 'call',
        message: `${item.client.company_name} é um lead quente sem interação há ${item.hoursSinceUpdate}h. Uma ligação agora tem ${Math.round(conversionChance)}% de chance de conversão.`,
        client: item.client,
        priority: 'high',
        conversionChance: Math.round(conversionChance),
        action: 'Ligar agora',
      };
    }

    // Priority 2: Qualified leads in reuniao stage
    const qualifiedInMeeting = clients.filter(
      (c) => c.qualification === 'qualified' && c.current_stage === 'reuniao'
    );

    if (qualifiedInMeeting.length > 0) {
      const client = qualifiedInMeeting[0];
      return {
        type: 'meeting',
        message: `${client.company_name} está qualificado e aguardando reunião. Agende uma apresentação para avançar no funil.`,
        client,
        priority: 'medium',
        conversionChance: 72,
        action: 'Agendar reunião',
      };
    }

    // Priority 3: Warm leads that can be upgraded
    const warmLeads = clients
      .filter((c) => c.qualification === 'warm' && c.current_stage === 'prospeccao')
      .sort((a, b) => {
        const aScore = (a.bant_budget || 0) + (a.bant_authority || 0) + (a.bant_need || 0) + (a.bant_timeline || 0);
        const bScore = (b.bant_budget || 0) + (b.bant_authority || 0) + (b.bant_need || 0) + (b.bant_timeline || 0);
        return bScore - aScore;
      });

    if (warmLeads.length > 0) {
      const client = warmLeads[0];
      const bantScore = (client.bant_budget || 0) + (client.bant_authority || 0) + (client.bant_need || 0) + (client.bant_timeline || 0);
      return {
        type: 'email',
        message: `${client.company_name} tem BANT Score de ${bantScore}/40. Envie conteúdo de valor para aquecer este lead.`,
        client,
        priority: 'low',
        conversionChance: 45,
        action: 'Enviar e-mail',
      };
    }

    return null;
  }, [clients]);

  if (!suggestion) {
    return (
      <Card className="border-border bg-gradient-to-br from-primary/5 to-card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Sugestão Inteligente</CardTitle>
          </div>
          <CardDescription>Recomendações baseadas em dados</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[120px]">
          <p className="text-muted-foreground text-sm text-center">
            Adicione mais clientes para receber sugestões personalizadas
          </p>
        </CardContent>
      </Card>
    );
  }

  const Icon = SUGGESTION_ICONS[suggestion.type];

  return (
    <Card className="border-border bg-gradient-to-br from-primary/5 to-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Sugestão Inteligente</CardTitle>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10">
            <span className="text-xs font-medium text-primary">
              {suggestion.conversionChance}% chance
            </span>
          </div>
        </div>
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
          <Link to={`/app/clients/${suggestion.client.id}`}>
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
