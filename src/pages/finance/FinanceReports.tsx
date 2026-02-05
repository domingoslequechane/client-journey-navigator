import { useState } from 'react';
import { Download, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import { useFinanceReports } from '@/hooks/finance';
import {
  FinanceSidebar,
  FinanceStatsCard,
  MonthlyEvolutionChart,
  ExpensesPieChart,
} from '@/components/finance';

export default function FinanceReports() {
  const { currencySymbol } = useOrganizationCurrency();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { 
    monthlyData, 
    incomeByCategory, 
    expenseByCategory, 
    totals, 
    loading,
    exportToCSV 
  } = useFinanceReports(year);

  const formatCurrency = (value: number) => {
    return `${currencySymbol} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${currencySymbol} ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${currencySymbol} ${(value / 1000).toFixed(0)}K`;
    return `${currencySymbol} ${value.toFixed(0)}`;
  };

  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  if (loading) {
    return (
    <AnimatedContainer animation="fade-in">
        <div className="space-y-6">
          <FinanceSidebar />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-[350px]" />
        </div>
      </AnimatedContainer>
    );
  }

  return (
    <AnimatedContainer animation="fade-in">
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">Análises financeiras detalhadas</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <FinanceSidebar />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <FinanceStatsCard
            title={`Receitas de ${year}`}
            value={formatCurrency(totals.income)}
            icon={TrendingUp}
            variant="income"
          />
          <FinanceStatsCard
            title={`Despesas de ${year}`}
            value={formatCurrency(totals.expense)}
            icon={TrendingDown}
            variant="expense"
          />
          <FinanceStatsCard
            title="Lucro Líquido"
            value={formatCurrency(totals.profit)}
            icon={Wallet}
            variant="balance"
          />
        </div>

        {/* Evolution Chart */}
        <MonthlyEvolutionChart data={monthlyData} title="Evolução Receitas vs Despesas" />

        {/* Profit Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lucro Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                    formatter={(value: number) => [
                      `${currencySymbol} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      'Lucro'
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="profit" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <ExpensesPieChart data={expenseByCategory} title="Despesas por Categoria" />
          <ExpensesPieChart data={incomeByCategory} title="Receitas por Categoria" />
        </div>
      </div>
    </AnimatedContainer>
  );
}
