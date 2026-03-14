import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import type { MonthlyData } from '@/types/finance';

interface MonthlyEvolutionChartProps {
  data: MonthlyData[];
  title?: string;
}

export function MonthlyEvolutionChart({ data, title = 'Evolução Mensal' }: MonthlyEvolutionChartProps) {
  const { currencySymbol } = useOrganization();

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${currencySymbol} ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${currencySymbol} ${(value / 1000).toFixed(0)}K`;
    return `${currencySymbol} ${value.toFixed(0)}`;
  };

  return (
    <Card className="overflow-hidden border-border transition-colors">
      <CardHeader className="px-4 py-4 sm:px-6">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6 sm:pb-6">
        <div className="h-[300px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
              />
              <YAxis 
                tickFormatter={formatValue}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${currencySymbol} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  name === 'income' ? 'Receitas' : 'Despesas'
                ]}
                labelFormatter={(label) => `Mês: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend 
                formatter={(value) => value === 'income' ? 'Receitas' : 'Despesas'}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="hsl(var(--chart-2))"
                fillOpacity={1}
                fill="url(#colorIncome)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="hsl(var(--destructive))"
                fillOpacity={1}
                fill="url(#colorExpense)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

