import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import type { FinanceTransaction, FinanceCategory, TransactionType } from '@/types/finance';

export function useFinances() {
  const { organizationId: orgId } = useOrganization();
  const queryClient = useQueryClient();

  // Categories
  const categoriesQuery = useQuery({
    queryKey: ['finances-categories', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('finances_categories' as any)
        .select('*')
        .eq('organization_id', orgId)
        .order('name');
      
      if (error) throw error;
      return (data as unknown) as FinanceCategory[];
    },
    enabled: !!orgId,
  });

  // Transactions with optional filters
  const useTransactionsQuery = (startDate?: string, endDate?: string) => useQuery({
    queryKey: ['finances-transactions', orgId, startDate, endDate],
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase
        .from('finances_transactions' as any)
        .select('*, category:finances_categories(*)')
        .eq('organization_id', orgId);

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      return (data as unknown) as FinanceTransaction[];
    },
    enabled: !!orgId,
  });

  // Create Category
  const createCategory = useMutation({
    mutationFn: async (category: Omit<FinanceCategory, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('finances_categories' as any)
        .insert(category)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances-categories'] });
      toast.success('Categoria criada com sucesso!');
    }
  });

  // Create Transaction
  const createTransaction = useMutation({
    mutationFn: async (transaction: Omit<FinanceTransaction, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('finances_transactions' as any)
        .insert(transaction)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finances-transactions-yearly'] });
      queryClient.invalidateQueries({ queryKey: ['finances-debts'] });
      queryClient.invalidateQueries({ queryKey: ['finances-total-balance'] });
      toast.success('Lançamento registrado!');
    }
  });

  // Update Transaction
  const updateTransaction = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<FinanceTransaction> }) => {
      const { data, error } = await supabase
        .from('finances_transactions' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finances-transactions-yearly'] });
      queryClient.invalidateQueries({ queryKey: ['finances-debts'] });
      queryClient.invalidateQueries({ queryKey: ['finances-total-balance'] });
      toast.success('Lançamento atualizado!');
    }
  });

  // Delete Transaction
  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('finances_transactions' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finances-transactions-yearly'] });
      queryClient.invalidateQueries({ queryKey: ['finances-debts'] });
      queryClient.invalidateQueries({ queryKey: ['finances-total-balance'] });
      toast.success('Lançamento removido.');
    }
  });

  const useTotalBalanceQuery = () => useQuery({
    queryKey: ['finances-total-balance', orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const { data, error } = await supabase
        .from('finances_transactions' as any)
        .select('type, amount, is_paid')
        .eq('organization_id', orgId);

      if (error) throw error;

      return (data as any[]).reduce((acc, curr) => {
        if (curr.is_paid === false) return acc; // Only paid transactions affect cash balance

        if (curr.type === 'RECEITA' || curr.type === 'SALDO INICIAL') {
          return acc + Number(curr.amount);
        } else if (curr.type === 'DESPESA') {
          return acc - Number(curr.amount);
        }
        return acc;
      }, 0);
    },
    enabled: !!orgId,
  });

  const useYearlyTransactionsQuery = (year: number) => useQuery({
    queryKey: ['finances-transactions-yearly', orgId, year],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('finances_transactions' as any)
        .select('*, category:finances_categories(*)')
        .eq('organization_id', orgId)
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)
        .order('date', { ascending: true });

      if (error) throw error;
      return (data as any) as FinanceTransaction[];
    },
    enabled: !!orgId,
  });

  const useDebtsQuery = () => useQuery({
    queryKey: ['finances-debts', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('finances_transactions' as any)
        .select('*, category:finances_categories(*)')
        .eq('organization_id', orgId)
        .eq('is_paid', false)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return (data as any) as FinanceTransaction[];
    },
    enabled: !!orgId,
  });

  // Delete Category
  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      // First, check if there are transactions associated with this category
      const { count, error: countError } = await supabase
        .from('finances_transactions' as any)
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id);

      if (countError) throw countError;
      if (count && count > 0) {
        throw new Error(`Não é possível excluir: existem ${count} lançamentos vinculados a esta categoria.`);
      }

      const { error } = await supabase
        .from('finances_categories' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances-categories'] });
      toast.success('Categoria removida com sucesso.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Falha ao remover categoria.');
    }
  });

  return {
    categories: categoriesQuery.data || [],
    isLoadingCategories: categoriesQuery.isLoading,
    useTransactionsQuery,
    useYearlyTransactionsQuery,
    useTotalBalanceQuery,
    useDebtsQuery,
    createCategory,
    deleteCategory,
    createTransaction,
    updateTransaction,
    deleteTransaction
  };
}
