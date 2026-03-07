import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import type { MonthlyData, CategoryData } from '@/types/finance';
import { format, startOfYear, endOfYear } from 'date-fns';

export function useFinanceReports(year?: number) {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [incomeByCategory, setIncomeByCategory] = useState<CategoryData[]>([]);
  const [expenseByCategory, setExpenseByCategory] = useState<CategoryData[]>([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0, profit: 0 });
  const [loading, setLoading] = useState(true);
  const { organizationId, currencySymbol } = useOrganization();

  const currentYear = year || new Date().getFullYear();

  const fetchReportData = useCallback(async () => {
    if (!organizationId) return;

    try {
      const yearStart = startOfYear(new Date(currentYear, 0, 1));
      const yearEnd = endOfYear(new Date(currentYear, 0, 1));

      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('type, amount, date, category_id, financial_categories(name, color)')
        .eq('organization_id', organizationId)
        .gte('date', format(yearStart, 'yyyy-MM-dd'))
        .lte('date', format(yearEnd, 'yyyy-MM-dd'));

      // Calculate monthly data
      const monthlyMap = new Map<string, { income: number; expense: number }>();
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      months.forEach(month => monthlyMap.set(month, { income: 0, expense: 0 }));

      let totalIncome = 0;
      let totalExpense = 0;

      transactions?.forEach(t => {
        const monthIndex = new Date(t.date).getMonth();
        const monthName = months[monthIndex];
        const current = monthlyMap.get(monthName) || { income: 0, expense: 0 };
        const amount = Number(t.amount);
        
        if (t.type === 'income') {
          current.income += amount;
          totalIncome += amount;
        } else {
          current.expense += amount;
          totalExpense += amount;
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

      setTotals({
        income: totalIncome,
        expense: totalExpense,
        profit: totalIncome - totalExpense,
      });

      // Calculate category data
      const incomeCategoryMap = new Map<string, { value: number; color: string }>();
      const expenseCategoryMap = new Map<string, { value: number; color: string }>();

      transactions?.forEach(t => {
        const categoryName = t.financial_categories?.name || 'Sem categoria';
        const categoryColor = t.financial_categories?.color || '#6b7280';
        const amount = Number(t.amount);
        
        if (t.type === 'income') {
          const current = incomeCategoryMap.get(categoryName) || { value: 0, color: categoryColor };
          current.value += amount;
          incomeCategoryMap.set(categoryName, current);
        } else {
          const current = expenseCategoryMap.get(categoryName) || { value: 0, color: categoryColor };
          current.value += amount;
          expenseCategoryMap.set(categoryName, current);
        }
      });

      setIncomeByCategory(Array.from(incomeCategoryMap.entries()).map(([name, data]) => ({
        name,
        value: data.value,
        color: data.color,
      })));

      setExpenseByCategory(Array.from(expenseCategoryMap.entries()).map(([name, data]) => ({
        name,
        value: data.value,
        color: data.color,
      })));

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, currentYear]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const exportToCSV = useCallback(async () => {
    if (!organizationId) return;

    try {
      const yearStart = startOfYear(new Date(currentYear, 0, 1));
      const yearEnd = endOfYear(new Date(currentYear, 0, 1));

      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('type, amount, description, date, payment_method, notes, financial_categories(name), clients(company_name)')
        .eq('organization_id', organizationId)
        .gte('date', format(yearStart, 'yyyy-MM-dd'))
        .lte('date', format(yearEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (!transactions || transactions.length === 0) {
        return;
      }

      const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Cliente', 'Método', 'Valor', 'Notas'];
      const rows = transactions.map(t => [
        format(new Date(t.date), 'dd/MM/yyyy'),
        t.type === 'income' ? 'Receita' : 'Despesa',
        t.description,
        t.financial_categories?.name || '',
        t.clients?.company_name || '',
        t.payment_method,
        `${currencySymbol} ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        t.notes || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-financeiro-${currentYear}.csv`;
      link.click();
    } catch (error) {
      console.error('Error exporting to CSV:', error);
    }
  }, [organizationId, currentYear, currencySymbol]);

  return {
    monthlyData,
    incomeByCategory,
    expenseByCategory,
    totals,
    loading,
    exportToCSV,
    refetch: fetchReportData,
  };
}

