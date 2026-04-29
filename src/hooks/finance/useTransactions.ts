import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Transaction, TransactionFormData, TransactionFilters, TransactionType, PaymentMethod } from '@/types/finance';

export function useTransactions(filters?: TransactionFilters) {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useOrganization();
  const { user } = useAuth();

  const fetchTransactions = useCallback(async () => {
    if (!organizationId) return;

    try {
      let query = supabase
        .from('financial_transactions')
        .select(`
          *,
          financial_categories (id, name, color),
          clients (id, company_name)
        `)
        .eq('organization_id', organizationId)
        .order('date', { ascending: false });

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAllTransactions(data?.map(t => ({
        id: t.id,
        organizationId: t.organization_id,
        type: t.type as TransactionType,
        amount: Number(t.amount),
        description: t.description,
        date: t.date,
        categoryId: t.category_id || undefined,
        categoryName: t.financial_categories?.name,
        categoryColor: t.financial_categories?.color || undefined,
        clientId: t.client_id || undefined,
        clientName: t.clients?.company_name,
        paymentMethod: t.payment_method as PaymentMethod,
        notes: t.notes || undefined,
        createdBy: t.created_by || undefined,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })) || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, filters?.type, filters?.categoryId, filters?.clientId, filters?.startDate, filters?.endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Filtro local para busca multi-campo
  const transactions = useMemo(() => {
    if (!filters?.search) return allTransactions;

    const searchLower = filters.search.toLowerCase();
    return allTransactions.filter(t => {
      if (t.description.toLowerCase().includes(searchLower)) return true;
      if (t.clientName?.toLowerCase().includes(searchLower)) return true;
      if (t.categoryName?.toLowerCase().includes(searchLower)) return true;
      if (t.type === 'income' && 'receita'.includes(searchLower)) return true;
      if (t.type === 'expense' && 'despesa'.includes(searchLower)) return true;
      return false;
    });
  }, [allTransactions, filters?.search]);

  const createTransaction = async (data: TransactionFormData): Promise<Transaction | null> => {
    if (!organizationId || !user) return null;

    if (typeof data.amount !== 'number' || isNaN(data.amount) || data.amount <= 0) {
      throw new Error('Valor inválido. O valor deve ser um número positivo.');
    }

    if (data.amount > 999999999) {
      throw new Error('Valor excede o limite permitido');
    }

    if (!data.type || !['income', 'expense'].includes(data.type)) {
      throw new Error('Tipo de transação inválido');
    }

    try {
      const { data: newTransaction, error } = await supabase
        .from('financial_transactions')
        .insert({
          organization_id: organizationId,
          type: data.type,
          amount: data.amount,
          description: data.description,
          date: data.date,
          category_id: data.categoryId || null,
          client_id: data.clientId || null,
          payment_method: data.paymentMethod,
          notes: data.notes || null,
          created_by: user.id,
        })
        .select(`
          *,
          financial_categories (id, name, color),
          clients (id, company_name)
        `)
        .single();

      if (error) throw error;

      const transaction: Transaction = {
        id: newTransaction.id,
        organizationId: newTransaction.organization_id,
        type: newTransaction.type as TransactionType,
        amount: Number(newTransaction.amount),
        description: newTransaction.description,
        date: newTransaction.date,
        categoryId: newTransaction.category_id || undefined,
        categoryName: newTransaction.financial_categories?.name,
        categoryColor: newTransaction.financial_categories?.color || undefined,
        clientId: newTransaction.client_id || undefined,
        clientName: newTransaction.clients?.company_name,
        paymentMethod: newTransaction.payment_method as PaymentMethod,
        notes: newTransaction.notes || undefined,
        createdBy: newTransaction.created_by || undefined,
        createdAt: newTransaction.created_at,
        updatedAt: newTransaction.updated_at,
      };

      setAllTransactions(prev => [transaction, ...prev]);
      toast({ title: 'Lançamento criado com sucesso' });
      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({ title: 'Erro ao criar lançamento', variant: 'destructive' });
      return null;
    }
  };

  const updateTransaction = async (id: string, data: Partial<TransactionFormData>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .update({
          type: data.type,
          amount: data.amount,
          description: data.description,
          date: data.date,
          category_id: data.categoryId || null,
          client_id: data.clientId || null,
          payment_method: data.paymentMethod,
          notes: data.notes || null,
        })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) throw error;

      await fetchTransactions();
      toast({ title: 'Lançamento atualizado' });
      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({ title: 'Erro ao atualizar lançamento', variant: 'destructive' });
      return false;
    }
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) throw error;

      setAllTransactions(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Lançamento excluído' });
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({ title: 'Erro ao excluir lançamento', variant: 'destructive' });
      return false;
    }
  };

  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === 'income') {
        acc.income += t.amount;
      } else {
        acc.expense += t.amount;
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  return {
    transactions,
    loading,
    totals: { ...totals, balance: totals.income - totals.expense },
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  };
}

