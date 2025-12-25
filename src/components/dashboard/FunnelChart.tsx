import { useMemo } from 'react';
import { Bar, BarChart, XAxis, YAxis, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PauseCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;

interface FunnelChartProps {
  clients: Client[];
}

const STAGE_CONFIG = [
  { id: 'prospeccao', name: 'Prospecção', color: 'hsl(var(--chart-1))' },
  { id: 'reuniao', name: 'Reunião', color: 'hsl(var(--chart-2))' },
  { id: 'contratacao', name: 'Contratação', color: 'hsl(var(--chart-3))' },
  { id: 'producao', name: 'Produção', color: 'hsl(var(--chart-4))' },
  { id: 'trafego', name: 'Campanhas', color: 'hsl(var(--chart-5))' },
  { id: 'retencao', name: 'Retenção', color: 'hsl(var(--success))' },
  { id: 'fidelizacao', name: 'Fidelização', color: 'hsl(var(--primary))' },
];

const chartConfig = STAGE_CONFIG.reduce((acc, stage) => {
  acc[stage.id] = { label: stage.name, color: stage.color };
  return acc;
}, {} as ChartConfig);

export function FunnelChart({ clients }: FunnelChartProps) {
  const { chartData, suspendedByStage, totalSuspended } = useMemo(() => {
    const activeClients = clients.filter(c => !c.paused);
    const suspended: Record<string, number> = {};
    
    // Count suspended clients per stage
    STAGE_CONFIG.forEach(stage => {
      suspended[stage.id] = clients.filter(c => c.paused && c.current_stage === stage.id).length;
    });
    
    const data = STAGE_CONFIG.map((stage) => ({
      stage: stage.name,
      count: activeClients.filter((c) => c.current_stage === stage.id).length,
      fill: stage.color,
    }));
    
    return {
      chartData: data,
      suspendedByStage: suspended,
      totalSuspended: clients.filter(c => c.paused).length,
    };
  }, [clients]);

  // Custom tooltip content
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    
    const data = payload[0];
    const stageName = data.payload.stage;
    const stageConfig = STAGE_CONFIG.find(s => s.name === stageName);
    const suspendedCount = stageConfig ? suspendedByStage[stageConfig.id] : 0;
    
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="font-medium">{stageName}</div>
        <div className="text-sm text-muted-foreground">
          Activos: {data.value}
        </div>
        {suspendedCount > 0 && (
          <div className="text-sm text-warning flex items-center gap-1">
            <PauseCircle className="h-3 w-3" />
            Suspensos: {suspendedCount}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Funil de Clientes</CardTitle>
            <CardDescription>Distribuição por etapa da jornada</CardDescription>
          </div>
          {totalSuspended > 0 && (
            <Badge variant="outline" className="text-warning border-warning/50 gap-1">
              <PauseCircle className="h-3 w-3" />
              {totalSuspended} suspenso{totalSuspended > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="stage" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              width={80}
              className="text-muted-foreground"
            />
            <ChartTooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="count" 
              radius={[0, 4, 4, 0]}
              barSize={16}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
