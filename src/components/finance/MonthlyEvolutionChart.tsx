import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import type { MonthlyData } from '@/types/finance';

interface MonthlyEvolutionChartProps {
  data: MonthlyData[];
  title?: string;
}

export function MonthlyEvolutionChart({ data, title = 'Evolução Mensal' }: MonthlyEvolutionChartProps) {
  const { currencySymbol } = useOrganizationCurrency();

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${currencySymbol} ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${currencySymbol} ${(value / 1000).toFixed(0)}K`;
    return `${currencySymbol} ${value.toFixed(0)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
