import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, MessageSquare, Plug, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useHeader } from '@/contexts/HeaderContext';
import { AgentConversationsTab } from '@/components/ai-agents/AgentConversationsTab';
import { AgentConnectionTab } from '@/components/ai-agents/AgentConnectionTab';
import { AgentConfigTab } from '@/components/ai-agents/AgentConfigTab';
import { useAIAgentDetail } from '@/hooks/useAIAgentDetail';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Ativo', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  paused: { label: 'Pausado', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  inactive: { label: 'Inativo', className: 'bg-muted text-muted-foreground border-border' },
};

const TABS = [
  { value: 'conversations', label: 'Conversas', icon: MessageSquare },
  { value: 'connection', label: 'Conexão', icon: Plug },
  { value: 'config', label: 'Configuração', icon: Settings2 },
] as const;

type TabValue = typeof TABS[number]['value'];

export default function AIAgentDetail() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { setBackAction, setCustomTitle } = useHeader();
  const [activeTab, setActiveTab] = useState<TabValue>('conversations');

  const {
    agent,
    isLoading: loading,
    conversations,
    conversationsLoading,
    updateConfig,
    instanceAction,
    refetchAgent,
  } = useAIAgentDetail(agentId);

  useEffect(() => {
    setBackAction(() => () => navigate('/app/ai-agents'));
    setCustomTitle(agent?.name || 'Agente IA');

    return () => {
      setBackAction(null);
      setCustomTitle(null);
    };
  }, [agent, navigate, setBackAction, setCustomTitle]);

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6 pt-6 md:pt-6 pb-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-20">
        <Bot className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground">Agente não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/app/ai-agents')}>
          Voltar
        </Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[agent.status];

  return (
    <div className="space-y-6 p-4 md:p-6 pt-6 md:pt-6 pb-12">
      {/* Header */}
      <div className="hidden md:flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/ai-agents')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              {agent.company_name && (
                <p className="text-sm text-primary font-medium">{agent.company_name}</p>
              )}
            </div>
            <Badge variant="outline" className={cn('ml-2', statusCfg.className)}>
              {statusCfg.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
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
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'conversations' && (
        <AgentConversationsTab
          agent={agent}
          conversations={conversations}
          isLoading={conversationsLoading}
        />
      )}
      {activeTab === 'connection' && (
        <AgentConnectionTab
          agent={agent}
          instanceAction={instanceAction}
          updateConfig={updateConfig}
          onRefresh={refetchAgent}
        />
      )}
      {activeTab === 'config' && (
        <AgentConfigTab
          agent={agent}
          updateConfig={updateConfig}
        />
      )}
    </div>
  );
}
