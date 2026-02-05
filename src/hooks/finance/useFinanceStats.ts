import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import type { FinanceStats, MonthlyData, CategoryData } from '@/types/finance';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export function useFinanceStats(year?: number) {
  const [stats, setStats] = useState<FinanceStats>({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    incomeGrowth: 0,
    expenseGrowth: 0,
    transactionCount: 0,
    clientCount: 0,
    projectCount: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useOrganizationCurrency();

  const currentYear = year || new Date().getFullYear();

  const fetchStats = useCallback(async () => {
    if (!organizationId) return;

    try {
      const yearStart = startOfYear(new Date(currentYear, 0, 1));
      const yearEnd = endOfYear(new Date(currentYear, 0, 1));
      const lastYearStart = startOfYear(subMonths(yearStart, 12));
      const lastYearEnd = endOfYear(subMonths(yearStart, 12));

      // Fetch current year transactions
      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('type, amount, date, category_id, financial_categories(name, color)')
        .eq('organization_id', organizationId)
        .gte('date', format(yearStart, 'yyyy-MM-dd'))
        .lte('date', format(yearEnd, 'yyyy-MM-dd'));

      // Fetch last year transactions for growth calculation
      const { data: lastYearTransactions } = await supabase
        .from('financial_transactions')
        .select('type, amount')
        .eq('organization_id', organizationId)
        .gte('date', format(lastYearStart, 'yyyy-MM-dd'))
        .lte('date', format(lastYearEnd, 'yyyy-MM-dd'));

      // Fetch counts
      const { count: clientCount } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      const { count: projectCount } = await supabase
        .from('financial_projects')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Calculate current year totals
      const currentIncome = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const currentExpenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Calculate last year totals for growth
      const lastIncome = lastYearTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const lastExpenses = lastYearTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Calculate growth percentages
      const incomeGrowth = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0;
      const expenseGrowth = lastExpenses > 0 ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 : 0;

      setStats({
        totalIncome: currentIncome,
        totalExpenses: currentExpenses,
        netBalance: currentIncome - currentExpenses,
        incomeGrowth,
        expenseGrowth,
        transactionCount: transactions?.length || 0,
        clientCount: clientCount || 0,
        projectCount: projectCount || 0,
      });

      // Calculate monthly data
      const monthlyMap = new Map<string, { income: number; expense: number }>();
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      months.forEach(month => monthlyMap.set(month, { income: 0, expense: 0 }));

      transactions?.forEach(t => {
        const monthIndex = new Date(t.date).getMonth();
        const monthName = months[monthIndex];
        const current = monthlyMap.get(monthName) || { income: 0, expense: 0 };
        if (t.type === 'income') {
          current.income += Number(t.amount);
        } else {
          current.expense += Number(t.amount);
        }
        monthlyMap.set(monthName, current);
      });

      setMonthlyData(months.map(month => {
        const data = monthlyMap.get(month) || { income: 0, expense: 0 };
        return {
          month,
          income: data.income,
          expense: data.expense,
          profit: data.income - data.expense,
        };
      }));

      // Calculate category data for expenses
      const categoryMap = new Map<string, { value: number; color: string }>();
      transactions?.filter(t => t.type === 'expense').forEach(t => {
        const categoryName = t.financial_categories?.name || 'Sem categoria';
        const categoryColor = t.financial_categories?.color || '#6b7280';
        const current = categoryMap.get(categoryName) || { value: 0, color: categoryColor };
        current.value += Number(t.amount);
        categoryMap.set(categoryName, current);
      });

      setCategoryData(Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        value: data.value,
        color: data.color,
      })));

    } catch (error) {
      console.error('Error fetching finance stats:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, currentYear]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    monthlyData,
    categoryData,
    loading,
    refetch: fetchStats,
  };
}
