import { useMemo } from 'react';
import { Bar, BarChart, XAxis, YAxis, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const chartData = useMemo(() => {
    // Exclui clientes pausados/suspensos da contagem
    const activeClients = clients.filter(c => !c.paused);
    return STAGE_CONFIG.map((stage) => ({
      stage: stage.name,
      count: activeClients.filter((c) => c.current_stage === stage.id).length,
      fill: stage.color,
    }));
  }, [clients]);

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Funil de Clientes</CardTitle>
        <CardDescription>Distribuição por etapa da jornada</CardDescription>
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
            <ChartTooltip 
              content={<ChartTooltipContent hideIndicator />} 
            />
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
