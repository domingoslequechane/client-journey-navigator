import { useMemo } from 'react';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;

interface RevenueChartProps {
  clients: Client[];
  currencySymbol: string;
}

const chartConfig = {
  revenue: {
    label: 'Receita',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export function RevenueChart({ clients, currencySymbol }: RevenueChartProps) {
  const { chartData, monthlyData, currentMonthKey, previousMonthKey } = useMemo(() => {
    // Receita Fixa: apenas clientes operacionais (contratos fechados) não pausados
    const operationalStages = ['producao', 'trafego', 'retencao', 'fidelizacao'];
    const activeClients = clients.filter(c => !c.paused && operationalStages.includes(c.current_stage));
    const monthlyRevenue: Record<string, number> = {};
    
    activeClients.forEach((client) => {
      if (client.monthly_budget && client.created_at) {
        const date = new Date(client.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + Number(client.monthly_budget);
      }
    });

    // Get last 6 months
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // Build cumulative data
    let cumulative = 0;
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = months.map((month) => {
      cumulative += monthlyRevenue[month] || 0;
      const [, m] = month.split('-');
      return {
        month: monthNames[parseInt(m) - 1],
        revenue: cumulative,
        monthlyRevenue: monthlyRevenue[month] || 0,
      };
    });

    return {
      chartData: data,
      monthlyData: monthlyRevenue,
      currentMonthKey: months[months.length - 1],
      previousMonthKey: months[months.length - 2],
    };
  }, [clients]);

  const totalRevenue = chartData[chartData.length - 1]?.revenue || 0;
  
  // Calculate month-over-month growth (not cumulative)
  const currentMonthRevenue = monthlyData[currentMonthKey] || 0;
  const previousMonthRevenue = monthlyData[previousMonthKey] || 0;
  const growthPercent = previousMonthRevenue > 0 
    ? Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100) 
    : currentMonthRevenue > 0 ? 100 : 0;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Histórico de Receita</CardTitle>
            <CardDescription>Evolução mensal</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-success font-medium">+{growthPercent}%</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-primary">
          {currencySymbol} {totalRevenue.toLocaleString()}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              className="text-muted-foreground"
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value) => `${currencySymbol} ${Number(value).toLocaleString()}`}
                />
              } 
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
