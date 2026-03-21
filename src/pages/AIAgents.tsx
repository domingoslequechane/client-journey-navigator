import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BrainCircuit, Search, MessageSquare, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useHeader } from '@/contexts/HeaderContext';
import { AgentCard } from '@/components/ai-agents/AgentCard';
import { CreateAgentDialog } from '@/components/ai-agents/CreateAgentDialog';
import { useAIAgents } from '@/hooks/useAIAgents';

export default function AIAgents() {
  const navigate = useNavigate();
  const { setCustomTitle, setRightAction } = useHeader();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { agents, isLoading: loading } = useAIAgents();

  useEffect(() => {
    setCustomTitle('Agentes de IA');
    setRightAction(
      <Button size="sm" className="h-9 px-3" onClick={() => setCreateDialogOpen(true)}>
        <Plus className="h-4 w-4" />
      </Button>
    );

    return () => {
      setCustomTitle(null);
      setRightAction(null);
    };
  }, [setCustomTitle, setRightAction]);

  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!agent.name.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (statusFilter !== 'all' && agent.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [agents, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = agents.length;
    const active = agents.filter(a => a.status === 'active').length;
    const totalConversations = agents.reduce((sum, a) => sum + (a.total_conversations || 0), 0);
    return { total, active, totalConversations };
  }, [agents]);

  return (
    <div className="space-y-6 p-4 md:p-6 pt-6 md:pt-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BrainCircuit className="h-6 w-6 text-primary" />
              Agentes de IA
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 font-bold border-primary text-primary uppercase tracking-wider ml-1"
              >
                BETA
              </Badge>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie os agentes de atendimento automático dos seus clientes
            </p>
          </div>
          <Button className="hidden md:flex gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Agente
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10 shrink-0">
              <BrainCircuit className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total de Agentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-500/10 shrink-0">
              <Zap className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-500/10 shrink-0">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalConversations}</p>
              <p className="text-xs text-muted-foreground">Conversas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="paused">Pausados</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agents List */}
      <div className="grid gap-3 grid-cols-1">
        {loading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-12">
            <BrainCircuit className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum agente encontrado</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro agente
            </Button>
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => navigate(`/app/ai-agents/${agent.id}`)}
            />
          ))
        )}
      </div>

      {/* Create Agent Dialog */}
      <CreateAgentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
