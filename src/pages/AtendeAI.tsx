import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Zap,
  LayoutGrid,
  List as ListIcon,
  Filter,
  ChevronDown,
  Activity,
  MessageSquare,
  Bot,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useAtendeAI } from '@/hooks/useAtendeAI';
import { AtendeHeader, AtendeInstanceCard, AtendeStatCard } from '@/components/atende-ai/AtendeAIParts';
import { CreateAgentDialog } from '@/components/atende-ai/CreateAgentDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';

export default function AtendeAI() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { agents, isLoading } = useAtendeAI();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('all');

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || agent.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const activeCount = agents.filter(a => a.status === 'active').length;
  const inactiveCount = agents.filter(a => a.status !== 'active').length;
  const totalLeads = 0; 
  const totalConversations = 0;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0c0c0c] text-zinc-900 dark:text-white selection:bg-[#ff7a00]/30 pb-20 overflow-x-hidden transition-colors duration-300">
      <div className="space-y-6 p-4 md:p-6 pt-6 md:pt-6 pb-12 animate-in fade-in duration-700">
        
        {/* Module Header */}
        <AtendeHeader 
          currentOrg="Onix Agence" 
          onNewAtendente={() => setIsCreateDialogOpen(true)}
          connectedCount={activeCount}
        />

        {/* Global Stats List View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           <AtendeStatCard 
             label="Atendentes ativos" 
             value={activeCount} 
             sublabel="Online no momento" 
             icon={Zap} 
           />
           <AtendeStatCard 
             label="Atendentes inativos" 
             value={inactiveCount} 
             sublabel="Necessitam atenção" 
             icon={Bot} 
           />
            <AtendeStatCard 
              label="Mensagens processadas" 
              value={totalConversations} 
              sublabel="Processadas pela IA" 
              icon={MessageSquare} 
            />
            <AtendeStatCard 
              label="Capacidade" 
              value="100%" 
              sublabel="SLA de Resposta" 
              icon={Activity} 
            />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 group w-full">
               <Input 
                 placeholder="Buscar por nome ou cliente..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="bg-zinc-50 dark:bg-[#0c0c0c] border-zinc-200 dark:border-zinc-800 h-11 pl-11 rounded-lg focus-visible:ring-[#ff7a00]/40 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 font-medium text-xs transition-colors"
               />
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-600 group-focus-within:text-[#ff7a00] transition-colors" />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px] bg-zinc-50 dark:bg-[#0c0c0c] border-zinc-200 dark:border-zinc-800 h-11 rounded-lg text-xs font-bold tracking-tight text-zinc-900 dark:text-white transition-colors">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#0c0c0c] border-zinc-200 dark:border-zinc-800">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="paused">Em pausa</SelectItem>
              </SelectContent>
            </Select>
        </div>

        {/* Instâncias list - Vertical Grid (4 per line) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full bg-zinc-100 dark:bg-[#1a1a1a] rounded-md" />
            ))
          ) : filteredAgents.length === 0 ? (
            <div className="col-span-full py-24 flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-[#222] rounded-md bg-zinc-50 dark:bg-[#121212]/30 space-y-6">
               <div className="p-8 bg-[#ff7a00]/5 rounded-full shadow-[0_0_50px_rgba(255,122,0,0.05)]">
                 <Bot className="h-10 w-10 text-[#ff7a00]/40" />
               </div>
               <div className="text-center space-y-2">
                 <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Nenhum atendente</h3>
                 <p className="text-zinc-500 font-medium text-sm">Crie seu primeiro atendente para começar.</p>
               </div>
               <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-[#ff7a00] hover:bg-[#e66e00] text-white px-8 h-10 rounded-md shadow-sm text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar atendente
                </Button>
            </div>
          ) : (
            filteredAgents.map((agent) => (
              <AtendeInstanceCard 
                 key={agent.id} 
                 agent={agent} 
                 onClick={() => {
                   navigate(`/app/atende-ai/${agent.id}`);
                 }}
              />
            ))
          )}
        </div>

        <CreateAgentDialog 
          open={isCreateDialogOpen} 
          onOpenChange={setIsCreateDialogOpen} 
        />
      </div>
    </div>
  );
}
