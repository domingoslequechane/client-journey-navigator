import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Activity,
  BarChart3,
  Bot,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  Clock,
  Key,
  MessageCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  Settings,
  Smartphone,
  User,
  Zap
} from 'lucide-react';
import { AtendeAIInstance } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Custom Colors for Atende AI
export const ATENDE_COLORS = {
  primary: '#ff7a00',
  bg: '#0c0c0c',
  card: '#121212',
  text: '#ffffff',
  muted: '#888888',
  border: '#222222'
};

export function AtendeHeader({ 
  currentOrg, 
  onNewAtendente,
  onSync,
  connectedCount = 0,
  maxConnections = 10,
  isSyncing = false
}: { 
  currentOrg: string;
  onNewAtendente: () => void;
  onSync: () => void;
  connectedCount?: number;
  maxConnections?: number;
  isSyncing?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-[#ff7a00]" />
            Atende AI
            <Badge 
              variant="outline" 
              className="text-[10px] h-5 px-1.5 font-bold border-[#ff7a00] text-[#ff7a00] uppercase tracking-wider ml-1"
            >
              BETA
            </Badge>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os atendentes de atendimento automático dos seus clientes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={onSync} 
            disabled={isSyncing}
            className="bg-zinc-50 dark:bg-[#1a1a1a] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 h-9 px-4 rounded-md text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {isSyncing ? (
              <RotateCw className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
            )}
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
          
          <Button 
            onClick={onNewAtendente} 
            className="bg-[#ff7a00] hover:bg-[#e66d00] text-white h-9 px-4 rounded-md text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="h-3.5 w-3.5 mr-2" />
            Novo atendente
          </Button>

          <div className="flex items-center gap-3 pl-3 border-l border-zinc-100 dark:border-zinc-800 h-9">
             <div className="flex items-center gap-2">
                <div className={cn(
                  "h-2 w-2 rounded-full animate-pulse",
                  connectedCount > 0 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "bg-zinc-300 dark:bg-zinc-700"
                )} />
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-tight whitespace-nowrap">
                  {connectedCount} Contas conectadas
                </span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AtendeTabs({ 
  activeTab, 
  setActiveTab 
}: { 
  activeTab: string; 
  setActiveTab: (t: string) => void 
}) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'training', label: 'Treinamento', icon: BrainCircuit },
    { id: 'connection', label: 'Conexão', icon: Smartphone },
    { id: 'api', label: 'API', icon: Key },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-zinc-100 dark:border-zinc-800/50 mb-8 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2.5 px-8 py-5 text-sm font-bold transition-all relative whitespace-nowrap",
              isActive ? "text-[#ff7a00]" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Icon className={cn("h-4 w-4", isActive ? "text-[#ff7a00]" : "text-zinc-500")} />
            {tab.label}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff7a00] shadow-[0_-1px_6px_rgba(255,122,0,0.3)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function AtendeStatCard({ 
  label, 
  value, 
  sublabel,
  icon: Icon 
}: { 
  label: string; 
  value: string | number; 
  sublabel?: string;
  icon: any;
}) {
  return (
    <Card className="bg-white dark:bg-[#121212] border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden flex-1 group transition-all rounded-md">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-2 rounded-full bg-[#ff7a00]/10 shrink-0">
          <Icon className="h-5 w-5 text-[#ff7a00]" />
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AtendeInstanceInfoCard({ 
  label, 
  value, 
  icon: Icon 
}: { 
  label: string; 
  value: string; 
  icon: any 
}) {
  return (
    <div className="bg-white dark:bg-[#121212] border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:bg-zinc-50 dark:hover:bg-[#161616] hover:border-[#ff7a00]/20 transition-all group shadow-sm">
      <div className="bg-zinc-50 dark:bg-[#1a1a1a] p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 group-hover:bg-[#ff7a00]/5 group-hover:border-[#ff7a00]/20 transition-all">
        <Icon className="h-4 w-4 text-[#ff7a00]" />
      </div>
      <div className="flex flex-col min-w-0 gap-1.5">
        <span className="text-xs text-zinc-500 font-bold tracking-tight leading-none">{label}</span>
        <span className="text-zinc-900 dark:text-white font-bold text-sm truncate leading-none">{value}</span>
      </div>
    </div>
  );
}

export function AtendeInstanceCard({ agent, onClick }: { agent: AtendeAIInstance; onClick: () => void }) {
  const clientName = agent.clients?.company_name || agent.company_name || 'Agência principal';
  const isConnected = agent.whatsapp_connected || agent.status === 'active';

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "hover:shadow-lg transition-all rounded-md cursor-pointer group border shadow-sm relative overflow-hidden",
        "bg-white dark:bg-[#121212] border-zinc-100 dark:border-zinc-900",
        "hover:border-[#ff7a00]/30 dark:hover:border-[#ff7a00]/30 hover:-translate-y-1"
      )}
    >
      <CardContent className="p-5 flex flex-col items-center text-center">
        {/* Profile/Indicator */}
        <div className="relative mb-4">
          <div className={cn(
            "h-16 w-16 rounded-full flex items-center justify-center border-2 transition-all duration-300",
            isConnected 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
              : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 group-hover:border-[#ff7a00]/20"
          )}>
            {agent.profile_picture ? (
              <img src={agent.profile_picture} alt={agent.name} className="h-full w-full object-cover rounded-full" />
            ) : (
              <User className="h-7 w-7" />
            )}
          </div>
          
          {/* Active Status Dot */}
          <div className={cn(
            "absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#121212] shadow-sm",
            isConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-300 dark:bg-zinc-800"
          )} />
        </div>

        <div className="flex flex-col gap-1 w-full flex-1">
          <h3 className="font-bold text-sm text-[#ff7a00] line-clamp-1 transition-colors leading-tight">
            {agent.name}
          </h3>
          <p className="text-[12px] text-zinc-400 dark:text-zinc-500 font-medium truncate uppercase tracking-tight leading-tight">
            {clientName}
          </p>
          


          <div className="flex items-center justify-center gap-1.5 text-[12px] text-zinc-400 dark:text-zinc-500 mb-1.5">
             <Smartphone className="h-3 w-3" />
             <span className="font-medium truncate">
                {agent.connected_number ? `+${agent.connected_number}` : ((agent as any).phone ? `+${(agent as any).phone}` : 'Sem número')}
             </span>
          </div>
           
          <div className="flex items-center justify-center mt-auto pt-1">
             <Badge className={cn(
                "h-5 px-2 text-[9px] font-bold border rounded-full shadow-none",
                isConnected 
                  ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20" 
                    : "bg-rose-500/5 text-rose-500 border-rose-500/20"
             )}>
               {isConnected ? 'Conectado' : 'Desconectado'}
             </Badge>
          </div>
        </div>

        {/* Hover Arrow */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
           <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-800" />
        </div>
      </CardContent>
    </Card>
  );
}
