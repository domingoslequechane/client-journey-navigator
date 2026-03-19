import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bot, MessageSquare, Clock, ChevronRight, Smartphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AIAgent } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Ativo', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  paused: { label: 'Pausado', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  inactive: { label: 'Inativo', className: 'bg-muted text-muted-foreground border-border' },
};

interface AgentCardProps {
  agent: AIAgent;
  onClick: () => void;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const statusCfg = STATUS_CONFIG[agent.status];

  return (
    <Card
      className="hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Agent Icon */}
          <div className={cn(
            'p-2.5 rounded-xl shrink-0',
            agent.status === 'active' ? 'bg-primary/10' : 'bg-muted'
          )}>
            <Bot className={cn(
              'h-6 w-6',
              agent.status === 'active' ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate">{agent.name}</h3>
                {agent.company_name && (
                  <p className="text-sm text-primary font-medium truncate">{agent.company_name}</p>
                )}
              </div>
              <Badge variant="outline" className={cn('shrink-0 text-[10px]', statusCfg.className)}>
                {statusCfg.label}
              </Badge>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {agent.total_conversations || 0} conversas
              </span>
              {agent.whatsapp_connected && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Smartphone className="h-3 w-3 text-green-600" />
                    WhatsApp
                  </span>
                </>
              )}
              {agent.updated_at && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(agent.updated_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0 self-center group-hover:text-foreground transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}
