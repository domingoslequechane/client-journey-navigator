import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, format } from 'date-fns';

export interface EditorialTask {
  id: string;
  organization_id: string;
  client_id: string;
  plan_id: string | null;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  content_type: string | null;
  platform: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  clients?: { id: string; company_name: string } | null;
}

export type PeriodFilter = 'today' | 'week' | 'month' | 'all';

interface UseEditorialTasksOptions {
  periodFilter?: PeriodFilter;
  clientFilter?: string | null;
  statusFilter?: string | null;
}

export function useEditorialTasks(options: UseEditorialTasksOptions = {}) {
  const { periodFilter = 'week', clientFilter = null, statusFilter = null } = options;
  const [tasks, setTasks] = useState<EditorialTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useOrganizationCurrency();
  const { user } = useAuth();

  const fetchTasks = useCallback(async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      let query = (supabase as any)
        .from('editorial_tasks')
        .select(`
          *,
          clients (id, company_name)
        `)
        .eq('organization_id', organizationId)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true, nullsFirst: false });

      // Period filter
      const now = new Date();
      if (periodFilter === 'today') {
        const todayStr = format(now, 'yyyy-MM-dd');
        query = query.eq('scheduled_date', todayStr);
      } else if (periodFilter === 'week') {
        const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        query = query.gte('scheduled_date', weekStart).lte('scheduled_date', weekEnd);
      } else if (periodFilter === 'month') {
        const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
        const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
        query = query.gte('scheduled_date', monthStart).lte('scheduled_date', monthEnd);
      }

      // Client filter
      if (clientFilter) {
        query = query.eq('client_id', clientFilter);
      }

      // Status filter
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTasks((data as EditorialTask[]) || []);
    } catch (error: any) {
      console.error('Error fetching editorial tasks:', error);
      toast({
        title: 'Erro ao carregar tarefas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId, periodFilter, clientFilter, statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (taskData: {
    title: string;
    description?: string;
    scheduled_date: string;
    scheduled_time?: string;
    client_id: string;
    content_type?: string;
    platform?: string;
    status?: string;
  }) => {
    if (!organizationId || !user) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('editorial_tasks')
        .insert({
          ...taskData,
          organization_id: organizationId,
          created_by: user.id,
          status: taskData.status || 'pending',
        })
        .select('*, clients (id, company_name)')
        .single();

      if (error) throw error;

      toast({ title: 'Tarefa criada com sucesso!' });
      await fetchTasks();
      return data as EditorialTask;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar tarefa',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<EditorialTask>) => {
    try {
      const { error } = await (supabase as any)
        .from('editorial_tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      toast({ title: 'Tarefa atualizada!' });
      await fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar tarefa',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('editorial_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({ title: 'Tarefa removida!' });
      await fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover tarefa',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    refetch: fetchTasks,
  };
}
