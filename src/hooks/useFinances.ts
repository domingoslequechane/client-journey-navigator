import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import type { FinanceTransaction, FinanceCategory } from '@/types/finance';

export function useFinances() {
  const { organizationId: orgId } = useOrganization();
  const queryClient = useQueryClient();

  // Helper: invalidate all finance-related caches after any mutation settles
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['finances-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['finances-transactions-yearly'] });
    queryClient.invalidateQueries({ queryKey: ['finances-debts'] });
    queryClient.invalidateQueries({ queryKey: ['finances-total-balance'] });
  };

  // ── Categories ──────────────────────────────────────────────────────────────
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
    staleTime: 5 * 60 * 1000,
  });

  // ── Transactions (filterable) ────────────────────────────────────────────────
  const useTransactionsQuery = (startDate?: string, endDate?: string) =>
    useQuery({
      queryKey: ['finances-transactions', orgId, startDate, endDate],
      queryFn: async () => {
        if (!orgId) return [];
        let query = supabase
          .from('finances_transactions' as any)
          .select('*, category:finances_categories(*)')
          .eq('organization_id', orgId);

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);

        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        return (data as unknown) as FinanceTransaction[];
      },
      enabled: !!orgId,
      staleTime: 30 * 1000,
    });

  // ── Create Category ─────────────────────────────────────────────────────────
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
    },
  });

  // ── Create Transaction — OPTIMISTIC ─────────────────────────────────────────
  const createTransaction = useMutation({
    mutationFn: async (
      transaction: Omit<FinanceTransaction, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const { data, error } = await supabase
        .from('finances_transactions' as any)
        .insert(transaction)
        .select('*, category:finances_categories(*)')
        .single();
      if (error) throw error;
      return data as FinanceTransaction;
    },
    onMutate: async (newTransaction) => {
      await queryClient.cancelQueries({ queryKey: ['finances-transactions'] });
      const previousData = queryClient.getQueriesData<FinanceTransaction[]>({
        queryKey: ['finances-transactions'],
      });

      const optimisticItem: FinanceTransaction = {
        ...(newTransaction as any),
        id: `optimistic-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueriesData<FinanceTransaction[]>(
        { queryKey: ['finances-transactions', orgId] },
        (old) => (old ? [optimisticItem, ...old] : [optimisticItem])
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      context?.previousData?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error('Falha ao criar lançamento. Tente novamente.');
    },
    onSuccess: (created) => {
      queryClient.setQueriesData<FinanceTransaction[]>(
        { queryKey: ['finances-transactions', orgId] },
        (old) =>
          old ? old.map((t) => (t.id.startsWith('optimistic-') ? created : t)) : [created]
      );
      toast.success('Lançamento registrado!');
    },
    onSettled: () => invalidateAll(),
  });

  // ── Update Transaction — OPTIMISTIC ─────────────────────────────────────────
  const updateTransaction = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FinanceTransaction> }) => {
      const { data, error } = await supabase
        .from('finances_transactions' as any)
        .update(updates)
        .eq('id', id)
        .select('*, category:finances_categories(*)')
        .single();
      if (error) throw error;
      return data as FinanceTransaction;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['finances-transactions'] });
      const previousData = queryClient.getQueriesData<FinanceTransaction[]>({
        queryKey: ['finances-transactions'],
      });

      queryClient.setQueriesData<FinanceTransaction[]>(
        { queryKey: ['finances-transactions', orgId] },
        (old) => (old ? old.map((t) => (t.id === id ? { ...t, ...updates } : t)) : old)
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      context?.previousData?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error('Falha ao atualizar lançamento. Tente novamente.');
    },
    onSuccess: () => {
      toast.success('Lançamento atualizado!');
    },
    onSettled: () => invalidateAll(),
  });

  // ── Delete Transaction — OPTIMISTIC ─────────────────────────────────────────
  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('finances_transactions' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['finances-transactions'] });
      const previousData = queryClient.getQueriesData<FinanceTransaction[]>({
        queryKey: ['finances-transactions'],
      });

      // Remove instantly from UI
      queryClient.setQueriesData<FinanceTransaction[]>(
        { queryKey: ['finances-transactions', orgId] },
        (old) => (old ? old.filter((t) => t.id !== id) : old)
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback
      context?.previousData?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error('Falha ao remover lançamento. Tente novamente.');
    },
    onSuccess: () => {
      toast.success('Lançamento removido.');
    },
    onSettled: () => invalidateAll(),
  });

  // ── Total Balance ────────────────────────────────────────────────────────────
  const useTotalBalanceQuery = () =>
    useQuery({
      queryKey: ['finances-total-balance', orgId],
      queryFn: async () => {
        if (!orgId) return 0;
        const { data, error } = await supabase
          .from('finances_transactions' as any)
          .select('type, amount, is_paid')
          .eq('organization_id', orgId);
        if (error) throw error;

        return (data as any[]).reduce((acc, curr) => {
          if (curr.is_paid === false) return acc;
          if (curr.type === 'RECEITA' || curr.type === 'SALDO INICIAL')
            return acc + Number(curr.amount);
          if (curr.type === 'DESPESA') return acc - Number(curr.amount);
          return acc;
        }, 0);
      },
      enabled: !!orgId,
    });

  // ── Yearly Transactions ──────────────────────────────────────────────────────
  const useYearlyTransactionsQuery = (year: number) =>
    useQuery({
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

  // ── Debts (unpaid) ───────────────────────────────────────────────────────────
  const useDebtsQuery = () =>
    useQuery({
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

  // ── Delete Category ──────────────────────────────────────────────────────────
  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { count, error: countError } = await supabase
        .from('finances_transactions' as any)
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id);

      if (countError) throw countError;
      if (count && count > 0) {
        throw new Error(
          `Não é possível excluir: existem ${count} lançamentos vinculados a esta categoria.`
        );
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
    },
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
    deleteTransaction,
  };
}
