import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { FinanceProject, ProjectFormData, ProjectFilters, ProjectStatus } from '@/types/finance';

export function useFinanceProjects(filters?: ProjectFilters) {
  const [projects, setProjects] = useState<FinanceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useOrganization();
  const { user } = useAuth();

  const fetchProjects = useCallback(async () => {
    if (!organizationId) return;

    try {
      let query = supabase
        .from('financial_projects')
        .select(`
          *,
          clients (id, company_name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setProjects(data?.map(p => ({
        id: p.id,
        organizationId: p.organization_id,
        name: p.name,
        description: p.description || undefined,
        clientId: p.client_id || undefined,
        clientName: p.clients?.company_name,
        budget: Number(p.budget),
        status: p.status as ProjectStatus,
        startDate: p.start_date,
        endDate: p.end_date || undefined,
        createdBy: p.created_by || undefined,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })) || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, filters?.status, filters?.clientId, filters?.search]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async (data: ProjectFormData): Promise<FinanceProject | null> => {
    if (!organizationId || !user) return null;

    try {
      const { data: newProject, error } = await supabase
        .from('financial_projects')
        .insert({
          organization_id: organizationId,
          name: data.name,
          description: data.description || null,
          client_id: data.clientId || null,
          budget: data.budget,
          status: data.status,
          start_date: data.startDate,
          end_date: data.endDate || null,
          created_by: user.id,
        })
        .select(`
          *,
          clients (id, company_name)
        `)
        .single();

      if (error) throw error;

      const project: FinanceProject = {
        id: newProject.id,
        organizationId: newProject.organization_id,
        name: newProject.name,
        description: newProject.description || undefined,
        clientId: newProject.client_id || undefined,
        clientName: newProject.clients?.company_name,
        budget: Number(newProject.budget),
        status: newProject.status as ProjectStatus,
        startDate: newProject.start_date,
        endDate: newProject.end_date || undefined,
        createdBy: newProject.created_by || undefined,
        createdAt: newProject.created_at,
        updatedAt: newProject.updated_at,
      };

      setProjects(prev => [project, ...prev]);
      toast({ title: 'Projeto criado com sucesso' });
      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      toast({ title: 'Erro ao criar projeto', variant: 'destructive' });
      return null;
    }
  };

  const updateProject = async (id: string, data: Partial<ProjectFormData>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('financial_projects')
        .update({
          name: data.name,
          description: data.description || null,
          client_id: data.clientId || null,
          budget: data.budget,
          status: data.status,
          start_date: data.startDate,
          end_date: data.endDate || null,
        })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) throw error;

      await fetchProjects();
      toast({ title: 'Projeto atualizado' });
      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      toast({ title: 'Erro ao atualizar projeto', variant: 'destructive' });
      return false;
    }
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('financial_projects')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) throw error;

      setProjects(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Projeto excluído' });
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({ title: 'Erro ao excluir projeto', variant: 'destructive' });
      return false;
    }
  };

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'in_progress').length,
    totalBudget: projects.reduce((sum, p) => sum + p.budget, 0),
  };

  return {
    projects,
    loading,
    stats,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
}

