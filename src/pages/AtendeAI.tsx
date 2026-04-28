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
  Smartphone,
  TrendingUp,
  History
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
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
  const { agents, isLoading, totalMessages, activeCount, inactiveCount, capacity, globalAnalytics } = useAtendeAI();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('all');

  // Process global analytics for the graph
  const graphData = React.useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const result = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        name: months[d.getMonth()],
        month: d.getMonth(),
        year: d.getFullYear(),
        value: 0
      });
    }

    if (globalAnalytics) {
      globalAnalytics.forEach((msg: any) => {
        const date = new Date(msg.created_at);
        const m = date.getMonth();
        const y = date.getFullYear();
        const found = result.find(r => r.month === m && r.year === y);
        if (found) found.value += 1;
      });
    }

    return result.map(({ name, value }) => ({ name, value }));
  }, [globalAnalytics]);

  const filteredAgents = React.useMemo(() => {
    return agents.filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           agent.clients?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && (agent.status === 'active' || agent.whatsapp_connected)) ||
                           (filterStatus === 'inactive' && agent.status === 'inactive' && !agent.whatsapp_connected);
      return matchesSearch && matchesStatus;
    });
  }, [agents, searchQuery, filterStatus]);

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
              value={totalMessages} 
              sublabel="Processadas pela IA" 
              icon={MessageSquare} 
            />
            <AtendeStatCard 
              label="Capacidade" 
              value={`${capacity}%`} 
              sublabel="SLA de Resposta" 
              icon={Activity} 
           />
        </div>

        {/* Global Analytics Graph */}
        <div className="bg-white dark:bg-[#121212] border border-zinc-100 dark:border-[#222] rounded-md p-6 hover:border-[#ff7a00]/20 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[#ff7a00]" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">Fluxo Global de Mensagens</h3>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#ff7a00]" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total processado</span>
               </div>
            </div>
          </div>
          
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graphData}>
                <defs>
                   <linearGradient id="colorGlobal" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#ff7a00" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#ff7a00" stopOpacity={0}/>
                   </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e4e4e7" strokeDasharray="3 3" className="dark:stroke-zinc-800" />
                <XAxis 
                   dataKey="name" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} 
                   dy={10}
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} 
                />
                <Tooltip 
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg shadow-xl min-w-[120px]">
                          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
                          <p className="text-[#ff7a00] font-black text-lg flex items-baseline gap-1">
                            {payload[0].value} <span className="text-xs text-zinc-400 font-medium normal-case">mensagens</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#ff7a00" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorGlobal)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
