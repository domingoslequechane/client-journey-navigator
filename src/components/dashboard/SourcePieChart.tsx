import { useMemo } from 'react';
import { Pie, PieChart, Cell, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;

interface SourcePieChartProps {
  clients: Client[];
}

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  google_maps: { label: 'Google Maps', color: 'hsl(var(--chart-1))' },
  social_media: { label: 'Redes Sociais', color: 'hsl(var(--chart-2))' },
  referral: { label: 'Indicação', color: 'hsl(var(--chart-3))' },
  visit: { label: 'Visita', color: 'hsl(var(--chart-4))' },
  inbound: { label: 'Inbound', color: 'hsl(var(--chart-5))' },
  other: { label: 'Outro', color: 'hsl(var(--muted-foreground))' },
};

const chartConfig = Object.entries(SOURCE_CONFIG).reduce((acc, [key, value]) => {
  acc[key] = { label: value.label, color: value.color };
  return acc;
}, {} as ChartConfig);

export function SourcePieChart({ clients }: SourcePieChartProps) {
  const chartData = useMemo(() => {
    const sourceCounts: Record<string, number> = {};
    
    clients.forEach((client) => {
      const source = client.source || 'other';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    return Object.entries(sourceCounts)
      .map(([source, count]) => ({
        source,
        name: SOURCE_CONFIG[source]?.label || source,
        count,
        fill: SOURCE_CONFIG[source]?.color || 'hsl(var(--muted-foreground))',
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [clients]);

  if (chartData.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Fontes de Leads</CardTitle>
          <CardDescription>De onde vêm seus clientes</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[180px]">
          <p className="text-muted-foreground text-sm">Sem dados disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Fontes de Leads</CardTitle>
        <CardDescription>De onde vêm seus clientes</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend 
              content={<ChartLegendContent nameKey="source" />}
              verticalAlign="bottom"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
