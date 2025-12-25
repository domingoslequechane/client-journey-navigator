import { useMemo } from 'react';
import { Bar, BarChart, XAxis, YAxis, Cell, Legend } from 'recharts';
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

const chartConfig: ChartConfig = {
  active: { label: 'Activos', color: 'hsl(var(--primary))' },
  suspended: { label: 'Suspensos', color: 'hsl(var(--warning))' },
};

export function FunnelChart({ clients }: FunnelChartProps) {
  const { chartData, totalSuspended } = useMemo(() => {
    const data = STAGE_CONFIG.map((stage) => {
      const stageClients = clients.filter(c => c.current_stage === stage.id);
      const activeCount = stageClients.filter(c => !c.paused).length;
      const suspendedCount = stageClients.filter(c => c.paused).length;
      
      return {
        stage: stage.name,
        active: activeCount,
        suspended: suspendedCount,
        fill: stage.color,
      };
    });
    
    return {
      chartData: data,
      totalSuspended: clients.filter(c => c.paused).length,
    };
  }, [clients]);

  // Custom tooltip content
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    
    const data = payload[0]?.payload;
    if (!data) return null;
    
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="font-medium">{data.stage}</div>
        <div className="text-sm text-muted-foreground">
          Activos: {data.active}
        </div>
        {data.suspended > 0 && (
          <div className="text-sm text-warning flex items-center gap-1">
            <PauseCircle className="h-3 w-3" />
            Suspensos: {data.suspended}
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
              dataKey="active" 
              stackId="stack"
              radius={[0, 0, 0, 0]}
              barSize={16}
            >
              {chartData.map((entry, index) => (
                <Cell key={`active-${index}`} fill={entry.fill} />
              ))}
            </Bar>
            <Bar 
              dataKey="suspended" 
              stackId="stack"
              radius={[0, 4, 4, 0]}
              barSize={16}
              fill="hsl(var(--warning))"
              opacity={0.7}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
