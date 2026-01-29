import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { StudioProject, StudioFlyer } from '@/types/studio';

export function useStudioProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get current organization ID
  const getOrganizationId = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    
    const { data } = await supabase
      .from('profiles')
      .select('current_organization_id, organization_id')
      .eq('id', user.id)
      .single();
    
    return data?.current_organization_id || data?.organization_id || null;
  }, [user]);

  // Fetch all projects
  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ['studio-projects', user?.id],
    queryFn: async () => {
      const orgId = await getOrganizationId();
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('studio_projects')
        .select('*')
        .eq('organization_id', orgId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as StudioProject[];
    },
    enabled: !!user,
  });

  // Create project
  const createProject = useMutation({
    mutationFn: async (project: Partial<StudioProject>) => {
      const orgId = await getOrganizationId();
      if (!orgId || !user) throw new Error('No organization');

      const { data, error } = await supabase
        .from('studio_projects')
        .insert({
          name: project.name || '',
          description: project.description,
          niche: project.niche,
          primary_color: project.primary_color,
          secondary_color: project.secondary_color,
          font_family: project.font_family,
          ai_instructions: project.ai_instructions,
          ai_restrictions: project.ai_restrictions,
          logo_images: project.logo_images,
          reference_images: project.reference_images,
          template_image: project.template_image,
          organization_id: orgId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as StudioProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] });
      toast.success('Projeto criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar projeto: ' + error.message);
    },
  });

  // Update project
  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StudioProject> & { id: string }) => {
      const { data, error } = await supabase
        .from('studio_projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as StudioProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] });
      toast.success('Projeto atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Delete project
  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('studio_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] });
      toast.success('Projeto eliminado!');
    },
    onError: (error) => {
      toast.error('Erro ao eliminar: ' + error.message);
    },
  });

  return {
    projects: projects || [],
    projectsLoading,
    refetchProjects,
    createProject,
    updateProject,
    deleteProject,
    getOrganizationId,
  };
}

export function useStudioProject(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch single project
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['studio-project', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('studio_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as StudioProject;
    },
    enabled: !!projectId && !!user,
  });

  // Fetch flyers for project
  const { data: flyers, isLoading: flyersLoading, refetch: refetchFlyers } = useQuery({
    queryKey: ['studio-flyers', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('studio_flyers')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StudioFlyer[];
    },
    enabled: !!projectId && !!user,
  });

  // Generate flyer
  const generateFlyer = useMutation({
    mutationFn: async (settings: {
      prompt: string;
      size: string;
      style: string;
      mode: string;
      model: string;
    }) => {
      if (!projectId || !project) throw new Error('No project');

      const { data, error } = await supabase.functions.invoke('generate-studio-flyer', {
        body: {
          projectId,
          ...settings,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-flyers', projectId] });
    },
    onError: (error) => {
      toast.error('Erro na geração: ' + error.message);
    },
  });

  return {
    project,
    projectLoading,
    flyers: flyers || [],
    flyersLoading,
    refetchFlyers,
    generateFlyer,
  };
}
