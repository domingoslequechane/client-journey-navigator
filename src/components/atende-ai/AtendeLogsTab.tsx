import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AtendeAIInstance } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export function AtendeLogsTab({ agent }: { agent: AtendeAIInstance }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['atende-logs', agent.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atende_ai_logs' as any)
        .select('*')
        .eq('instance_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Auto refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full bg-zinc-100 dark:bg-[#1a1a1a] rounded-xl" />
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-[#121212]">
        <Activity className="h-8 w-8 text-zinc-400 mb-4 opacity-50" />
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Nenhum log encontrado</h3>
        <p className="text-xs text-zinc-500 mt-1">
          As atividades de conexão e requisições aparecerão aqui.
        </p>
      </div>
    );
  }

  const getEventIcon = (event: string) => {
    if (event.includes('error') || event.includes('fail')) return <XCircle className="h-4 w-4 text-red-500" />;
    if (event.includes('success') || event === 'connected') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    return <Activity className="h-4 w-4 text-blue-500" />;
  };

  const getEventColor = (event: string) => {
    if (event.includes('error') || event.includes('fail')) return 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400';
    if (event.includes('success') || event === 'connected') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400';
    return 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400';
  };

  return (
    <Card className="bg-white dark:bg-[#121212] border-zinc-200 dark:border-zinc-900 overflow-hidden">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#161616]/50">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Activity className="h-4 w-4 text-zinc-500" />
          Logs de Atividade (Últimos 100)
        </h3>
      </div>
      
      <ScrollArea className="h-[600px]">
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-[#1a1a1a] transition-colors flex gap-4">
              <div className="mt-1">
                {getEventIcon(log.event)}
              </div>
              
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getEventColor(log.event)}`}>
                    {log.event.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[11px] text-zinc-500 flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {format(new Date(log.created_at || new Date()), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </span>
                </div>
                
                <div className="text-xs text-zinc-600 dark:text-zinc-400 break-words font-mono bg-zinc-50 dark:bg-black/20 p-2 rounded border border-zinc-100 dark:border-zinc-800/50 max-h-32 overflow-y-auto mt-2">
                  {log.details || 'Sem detalhes.'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
