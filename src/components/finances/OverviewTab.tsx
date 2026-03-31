import { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle, PieChart as PieIcon, LineChart as LineIcon } from 'lucide-react';
import { FinanceTransaction } from '@/types/finance';
import { useOrganization } from '@/hooks/useOrganization';
import { YearlyOverviewGrid } from './YearlyOverviewGrid';
import { useFinances } from '@/hooks/useFinances';
import { useClients } from '@/hooks/useClients';

interface OverviewTabProps {
  transactions: FinanceTransaction[];
  year: number;
}

export function OverviewTab({ transactions, year }: OverviewTabProps) {
  const { currencySymbol } = useOrganization();
  const { useYearlyTransactionsQuery, useTotalBalanceQuery, useDebtsQuery } = useFinances();
  const { data: clients = [] } = useClients();
  const { data: debts = [] } = useDebtsQuery();
  
  // Fetch full year data for the grid and trends
  const { data: yearlyTransactions = [] } = useYearlyTransactionsQuery(year);

  // Fetch total global balance (independent of time)
  const { data: totalBalance = 0 } = useTotalBalanceQuery();

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let initialBalance = 0;

    // Use current month transactions for the top cards to maintain context with the month selector
    transactions.forEach(t => {
      if (t.type === 'RECEITA') income += Number(t.amount);
      else if (t.type === 'DESPESA') expense += Number(t.amount);
      else if (t.type === 'SALDO INICIAL') initialBalance += Number(t.amount);
    });

    return {
      income,
      expense,
      initialBalance,
      currentBalance: initialBalance + income - expense
    };
  }, [transactions]);

  const chartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = months.map((name) => ({
      name,
      receita: 0,
      despesa: 0,
    }));

    // Use yearly transactions for the charts to show the full trend
    yearlyTransactions.forEach(t => {
      const date = new Date(t.date);
      const m = date.getMonth();
      if (t.type === 'RECEITA') data[m].receita += Number(t.amount);
      if (t.type === 'DESPESA') data[m].despesa += Number(t.amount);
    });

    return data;
  }, [yearlyTransactions]);

  // 1. Data Processing for Expense Composition (Pie Chart)
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    
    // Only use current month's expenses for composition
    transactions
      .filter(t => t.type === 'DESPESA')
      .forEach(t => {
        const name = t.category?.name || 'Sem Categoria';
        categories[name] = (categories[name] || 0) + Number(t.amount);
      });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  // 2. Data Processing for Future Forecast (Line Chart)
  const forecastData = useMemo(() => {
    // a. Estimated Monthly Revenue (from operational clients)
    // Stages that represent recurring billing
    const operationalStages = ['producao', 'trafego', 'retencao', 'fidelizacao'];
    const monthlyRevenue = clients
      .filter(c => operationalStages.includes(c.current_stage) && !c.paused)
      .reduce((sum, c) => sum + (Number(c.monthly_budget) || 0), 0);

    // b. Fixed Monthly Expenses
    const monthlyFixedExpenses = yearlyTransactions
      .filter(t => t.classification === 'FIXA')
      .reduce((sum, t) => sum + Number(t.amount), 0) / 12; // Approximation based on yearly average of fixed items

    // c. Project for next 6 months
    const forecast = [];
    let projectedBalance = totalBalance;
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthLabel = forecastDate.toLocaleDateString('pt-BR', { month: 'short' });
      
      // Update balance
      // (Simplified:Revenue - Fixed Expenses)
      // Debts are also subtracted when they fall into the specific month
      const currentMonthDebts = debts
        .filter(d => {
          const dueDate = new Date(d.due_date!);
          return dueDate.getMonth() === forecastDate.getMonth() && dueDate.getFullYear() === forecastDate.getFullYear();
        })
        .reduce((sum, d) => sum + Number(d.amount), 0);

      projectedBalance += (monthlyRevenue - monthlyFixedExpenses - currentMonthDebts);

      forecast.push({
        name: monthLabel,
        saldo: projectedBalance
      });
    }

    return forecast;
  }, [totalBalance, clients, yearlyTransactions, debts]);

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#f43f5e', '#8b5cf6', '#06b6d4'];

  const formatValue = (v: number) => {
    return `${currencySymbol} ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-10">
      {/* 1. Mês a Mês Grid (The specific request) */}
      <Card className="border-none bg-transparent shadow-none">
        <CardContent className="p-0">
          <YearlyOverviewGrid transactions={yearlyTransactions} year={year} />
        </CardContent>
      </Card>

      <div className="pt-6 border-t">
        <h2 className="text-xl font-bold tracking-tight mb-6">ESTATÍSTICAS DO MÊS SELECIONADO</h2>
        
        {/* Cards de Resumo Mensal */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-emerald-500/10 border-emerald-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Receitas</CardTitle>
              <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatValue(stats.income)}</div>
            </CardContent>
          </Card>

          <Card className="bg-rose-500/10 border-rose-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-rose-600 dark:text-rose-400">Total Despesas</CardTitle>
              <ArrowDownCircle className="w-4 h-4 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">{formatValue(stats.expense)}</div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Saldo Inicial</CardTitle>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatValue(stats.initialBalance)}</div>
            </CardContent>
          </Card>

          <Card className="bg-primary/10 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-primary uppercase tracking-wider">Saldo Geral (Caixa)</CardTitle>
              <Wallet className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatValue(totalBalance)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos de Tendência */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fluxo de Caixa Mensal (Tendência Anual)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => `${currencySymbol} ${v}`} />
                    <Tooltip 
                      formatter={(v: any) => formatValue(v)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} name="Receitas" />
                    <Bar dataKey="despesa" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Despesas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evolução de Saldo (Tendência Anual)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => `${currencySymbol} ${v}`} />
                    <Tooltip 
                      formatter={(v: any) => formatValue(v)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Line type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Receitas" />
                    <Line type="monotone" dataKey="despesa" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4 }} name="Despesas" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* New Analytics Row: Composition & Forecast */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Pie Chart: Composição */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Distribuição de Saídas</CardTitle>
              <PieIcon className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(v: any) => formatValue(v)}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground italic">
                    Nenhuma despesa lançada neste mês.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Chart: Previsão */}
          <Card className="bg-gradient-to-br from-card to-primary/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Projeção Próximos 6 Meses</CardTitle>
              <LineIcon className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(v) => `${currencySymbol}${v/1000}k`}
                    />
                    <Tooltip 
                      formatter={(v: any) => formatValue(v)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="saldo" 
                      stroke="#8b5cf6" 
                      strokeWidth={3} 
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }} 
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      name="Saldo Projetado"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-muted-foreground mt-4 italic bg-muted/30 p-2 rounded">
                * Projeção estimada com base em Recorrência (CRM) - Custos Fixos - Dívidas Pendentes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
