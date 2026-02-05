import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import { toast } from '@/hooks/use-toast';
import type { FinanceGoal, GoalFormData, GoalType } from '@/types/finance';

export function useFinanceGoals(year?: number) {
  const [goals, setGoals] = useState<FinanceGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useOrganizationCurrency();

  const currentYear = year || new Date().getFullYear();

  const fetchGoals = useCallback(async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('year', currentYear)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setGoals(data?.map(g => ({
        id: g.id,
        organizationId: g.organization_id,
        name: g.name,
        targetAmount: Number(g.target_amount),
        currentAmount: Number(g.current_amount),
        goalType: g.goal_type as GoalType,
        year: g.year,
        month: g.month || undefined,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
      })) || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, currentYear]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const createGoal = async (data: GoalFormData): Promise<FinanceGoal | null> => {
    if (!organizationId) return null;

    try {
      const { data: newGoal, error } = await supabase
        .from('financial_goals')
        .insert({
          organization_id: organizationId,
          name: data.name,
          target_amount: data.targetAmount,
          current_amount: 0,
          goal_type: data.goalType,
          year: data.year,
          month: data.month || null,
        })
        .select()
        .single();

      if (error) throw error;

      const goal: FinanceGoal = {
        id: newGoal.id,
        organizationId: newGoal.organization_id,
        name: newGoal.name,
        targetAmount: Number(newGoal.target_amount),
        currentAmount: Number(newGoal.current_amount),
        goalType: newGoal.goal_type as GoalType,
        year: newGoal.year,
        month: newGoal.month || undefined,
        createdAt: newGoal.created_at,
        updatedAt: newGoal.updated_at,
      };

      setGoals(prev => [goal, ...prev]);
      toast({ title: 'Meta criada com sucesso' });
      return goal;
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({ title: 'Erro ao criar meta', variant: 'destructive' });
      return null;
    }
  };

  const updateGoal = async (id: string, data: Partial<GoalFormData & { currentAmount?: number }>): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.targetAmount !== undefined) updateData.target_amount = data.targetAmount;
      if (data.currentAmount !== undefined) updateData.current_amount = data.currentAmount;
      if (data.goalType !== undefined) updateData.goal_type = data.goalType;
      if (data.year !== undefined) updateData.year = data.year;
      if (data.month !== undefined) updateData.month = data.month || null;

      const { error } = await supabase
        .from('financial_goals')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await fetchGoals();
      toast({ title: 'Meta atualizada' });
      return true;
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({ title: 'Erro ao atualizar meta', variant: 'destructive' });
      return false;
    }
  };

  const deleteGoal = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('financial_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGoals(prev => prev.filter(g => g.id !== id));
      toast({ title: 'Meta excluída' });
      return true;
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({ title: 'Erro ao excluir meta', variant: 'destructive' });
      return false;
    }
  };

  const stats = {
    total: goals.length,
    achieved: goals.filter(g => g.currentAmount >= g.targetAmount).length,
  };

  return {
    goals,
    loading,
    stats,
    createGoal,
    updateGoal,
    deleteGoal,
    refetch: fetchGoals,
  };
}
