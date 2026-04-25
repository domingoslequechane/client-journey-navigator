import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  Cell
} from 'recharts';
import { 
  BarChart3, 
  LayoutDashboard, 
  MessageSquare, 
  Clock, 
  Zap, 
  User, 
  Smartphone, 
  TrendingUp, 
  Calendar,
  History
} from 'lucide-react';
import { AtendeStatCard, AtendeInstanceInfoCard } from './AtendeAIParts';

const CustomTooltip = ({ active, payload, label, suffix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] dark:shadow-none min-w-[120px]">
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
        <p className="text-[#ff7a00] font-black text-lg flex items-baseline gap-1">
          {payload[0].value} <span className="text-xs text-zinc-400 font-medium normal-case">{suffix}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function DashboardTab({ agent }: { agent: any }) {
  const { organizationId: orgId } = useOrganization();
  const createdDate = agent?.created_at ? new Date(agent.created_at) : new Date();
  const diffTime = Math.abs(new Date().getTime() - createdDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const isConnected = agent?.whatsapp_connected || agent?.status === 'active';
  const connectionLabel = isConnected ? 'Conectado' : 'Desconectado';
  const connectionSublabel = isConnected ? 'WhatsApp conectado' : 'Aguardando conexão';

  const totalConversations = agent?.total_conversations || 0;
  const totalMessages = agent?.total_messages || 0;

  // Fetch real analytics data
  const { data: analytics } = useQuery({
    queryKey: ['atende-ai-analytics', agent?.id],
    queryFn: async () => {
      if (!agent?.id || !orgId) return null;
      
      const { data, error } = await supabase
        .from('atende_ai_conversations')
        .select(`
          created_at,
          atende_ai_messages (
            created_at
          )
        `)
        .eq('instance_id', agent.id)
        .eq('organization_id', orgId);
        
      if (error) {
        console.error("Error fetching analytics:", error);
        return null;
      }
      return data;
    },
    enabled: !!agent?.id && !!orgId
  });

  // Calculate message history (last 6 months)
  const lineData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const result = [];
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    
    // Create the last 6 months template
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m < 0) {
        m += 12;
        y -= 1;
      }
      result.push({
        name: months[m],
        monthIndex: m,
        year: y,
        value: 0
      });
    }

    if (analytics) {
      analytics.forEach((conv: any) => {
        if (conv.atende_ai_messages) {
          conv.atende_ai_messages.forEach((msg: any) => {
            const date = new Date(msg.created_at);
            const msgMonth = date.getMonth();
            const msgYear = date.getFullYear();
            
            const monthData = result.find(r => r.monthIndex === msgMonth && r.year === msgYear);
            if (monthData) {
              monthData.value += 1;
            }
          });
        }
      });
    }

    return result.map(({ name, value }) => ({ name, value }));
  }, [analytics]);

  // Calculate conversation distribution by day of week
  const barData = useMemo(() => {
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const result = weekDays.map((d, i) => ({ name: d, index: i, value: 0 }));
    
    if (analytics) {
      analytics.forEach((conv: any) => {
        const date = new Date(conv.created_at);
        const dayOfWeek = date.getDay(); // 0 is Sunday
        result[dayOfWeek].value += 1;
      });
    }

    return result.map(({ name, value }) => ({ name, value }));
  }, [analytics]);

  // To properly color the biggest bar
  const peakBarValue = Math.max(...barData.map(d => d.value));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-4">Resumo rápido (Geral)</h2>
      
      {/* 4 Multi-Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AtendeStatCard 
          label="Estado" 
          value={connectionLabel} 
          sublabel={connectionSublabel} 
          icon={LayoutDashboard} 
        />
        <AtendeStatCard 
          label="Dias ativo" 
          value={diffDays.toString()} 
          sublabel="Desde a criação" 
          icon={TrendingUp} 
        />
        <AtendeStatCard 
          label="Conversas (Geral)" 
          value={totalConversations.toString()} 
          sublabel="Total de conversas" 
          icon={MessageSquare} 
        />
        <AtendeStatCard 
          label="Total mensagens" 
          value={totalMessages.toString()} 
          sublabel="Enviadas e recebidas" 
          icon={Clock} 
        />
      </div>

      {/* Instance Specific Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AtendeInstanceInfoCard 
          label="Nome do perfil" 
          value={agent?.name || '-'} 
          icon={User} 
        />
        <AtendeInstanceInfoCard 
          label="Número" 
          value={agent?.connected_number ? `+${agent.connected_number}` : (agent?.phone ? `+${agent.phone}` : '-')} 
          icon={Smartphone} 
        />
        <AtendeInstanceInfoCard 
          label="Canais conectados" 
          value={isConnected ? 'WhatsApp' : 'Nenhum'} 
          icon={Zap} 
        />
        <AtendeInstanceInfoCard 
          label="Criado em" 
          value={agent?.created_at ? new Date(agent.created_at).toLocaleDateString() : '3/26/2026'} 
          icon={Calendar} 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 pb-10">
        <div className="bg-white dark:bg-[#121212] border border-zinc-100 dark:border-[#222] rounded-md p-6 hover:border-[#ff7a00]/20 transition-all shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <History className="h-4 w-4 text-[#ff7a00]" />
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-white tracking-tight pt-0.5">Histórico de fluxo de mensagens</h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData}>
                <defs>
                   <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
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
                  content={<CustomTooltip suffix="mensagens" />}
                  cursor={{ fill: 'rgba(255,122,0,0.05)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#ff7a00" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-zinc-500 font-medium mt-4 tracking-tight">Atividade mensal de interações deste atendente</p>
        </div>

        <div className="bg-white dark:bg-[#121212] border border-zinc-100 dark:border-[#222] rounded-md p-6 hover:border-[#ff7a00]/20 transition-all shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <BarChart3 className="h-4 w-4 text-[#ff7a00]" />
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-white tracking-tight pt-0.5">Conversas por dia da semana</h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
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
                   content={<CustomTooltip suffix="conversas" />}
                   cursor={{ fill: 'rgba(255,122,0,0.05)' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#ff7a00" 
                  radius={[6, 6, 0, 0]}
                  barSize={40}
                >
                  {barData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.value === peakBarValue && peakBarValue > 0 ? '#ff7a00' : '#ea580c'} 
                      className="transition-all duration-500 hover:opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-zinc-500 font-medium mt-4 tracking-tight">Pico de maiores interações com o atendente</p>
        </div>
      </div>
    </div>
  );
}
