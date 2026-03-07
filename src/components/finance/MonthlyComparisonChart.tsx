import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganization } from '@/hooks/useOrganization';
import type { MonthlyData } from '@/types/finance';

interface MonthlyComparisonChartProps {
  data: MonthlyData[];
  title?: string;
}

export function MonthlyComparisonChart({ data, title = 'Comparativo Mensal' }: MonthlyComparisonChartProps) {
  const { currencySymbol } = useOrganization();

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
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              <Bar 
                dataKey="income" 
                fill="hsl(var(--chart-2))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="expense" 
                fill="hsl(var(--destructive))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

