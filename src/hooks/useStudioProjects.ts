"use client";

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import type { StudioProject, StudioFlyer } from '@/types/studio';

export function useStudioProjects() {
  const { organizationId: orgId } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ['studio-projects', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('studio_projects')
        .select('*')
        .eq('organization_id', orgId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as StudioProject[];
    },
    enabled: !!orgId,
  });

  const createProject = useMutation({
    mutationFn: async (project: Partial<StudioProject>) => {
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
          client_id: (project as any).client_id || null,
          organization_id: orgId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as StudioProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-projects', orgId] });
      toast.success('Projeto criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar projeto: ' + error.message);
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StudioProject> & { id: string }) => {
      const { data, error } = await supabase
        .from('studio_projects')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (error) throw error;
      return data as StudioProject;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['studio-projects'] });
      queryClient.invalidateQueries({ queryKey: ['studio-project', data.id] });
      toast.success('Projeto atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('studio_projects')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);

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
  };
}

export function useStudioProject(projectId: string | undefined) {
  const { organizationId: orgId } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['studio-project', orgId, projectId],
    queryFn: async () => {
      if (!projectId || !orgId) return null;

      const { data, error } = await supabase
        .from('studio_projects')
        .select('*')
        .eq('id', projectId)
        .eq('organization_id', orgId)
        .single();

      if (error) throw error;
      return data as StudioProject;
    },
    enabled: !!projectId && !!orgId && !!user,
  });

  const { data: flyers, isLoading: flyersLoading, refetch: refetchFlyers } = useQuery({
    queryKey: ['studio-flyers', orgId, projectId],
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

  // Fetch daily generation count for the user in this organization
  const { data: dailyCount = 0, refetch: refetchDailyCount } = useQuery({
    queryKey: ['studio-daily-count', orgId, user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const today = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('studio_flyers')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .gte('created_at', today);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  // Fetch ratings for flyers
  const { data: ratingsData } = useQuery({
    queryKey: ['studio-flyer-ratings', orgId, projectId, user?.id],
    queryFn: async () => {
      if (!projectId || !user) return {};

      const { data, error } = await supabase
        .from('studio_flyer_ratings')
        .select('flyer_id, rating, feedback')
        .eq('user_id', user.id)
        .eq('organization_id', orgId); // Added organization_id filter

      if (error) throw error;

      const ratingsMap: Record<string, { rating: number; feedback: string | null }> = {};
      for (const r of data || []) {
        ratingsMap[r.flyer_id] = { rating: r.rating, feedback: r.feedback };
      }
      return ratingsMap;
    },
    enabled: !!projectId && !!user,
  });

  const generateFlyer = useMutation({
    mutationFn: async (settings: {
      prompt: string;
      size: string;
      style: string;
      mode: string;
      model: string;
      [key: string]: any;
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
      queryClient.invalidateQueries({ queryKey: ['studio-flyers', orgId, projectId] });
      queryClient.invalidateQueries({ queryKey: ['studio-daily-count', orgId, user?.id] });
    },
    onError: (error) => {
      toast.error('Erro na geração: ' + error.message);
    },
  });

  const deleteFlyer = useMutation({
    mutationFn: async (flyerId: string) => {
      const { error } = await supabase
        .from('studio_flyers')
        .delete()
        .eq('id', flyerId)
        .eq('organization_id', orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-flyers', projectId] });
      queryClient.invalidateQueries({ queryKey: ['studio-daily-count', user?.id] });
      toast.success('Flyer eliminado!');
    },
    onError: (error) => {
      toast.error('Erro ao eliminar flyer: ' + error.message);
    },
  });

  const rateFlyer = useMutation({
    mutationFn: async ({ flyerId, rating, feedback }: { flyerId: string; rating: number; feedback?: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Upsert: update if exists, insert if not
      const { data: existing } = await supabase
        .from('studio_flyer_ratings')
        .select('id')
        .eq('flyer_id', flyerId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('studio_flyer_ratings')
          .update({ rating, feedback: feedback || null })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('studio_flyer_ratings')
          .insert({
            flyer_id: flyerId,
            user_id: user.id,
            rating,
            feedback: feedback || null,
          });
        if (error) throw error;
      }

      // Store as AI learning for future improvements
      if (feedback && project) {
        await supabase
          .from('studio_ai_learnings')
          .insert({
            project_id: projectId!,
            user_id: user.id,
            learning_type: 'feedback',
            content: `Rating: ${rating}/5. ${feedback}`,
            context: JSON.stringify({ flyerId, rating }),
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-flyer-ratings', projectId] });
      toast.success('Avaliação salva! A IA vai aprender com seu feedback.');
    },
    onError: (error) => {
      toast.error('Erro ao avaliar: ' + error.message);
    },
  });

  return {
    project,
    projectLoading,
    flyers: flyers || [],
    flyersLoading,
    refetchFlyers,
    generateFlyer,
    deleteFlyer,
    rateFlyer,
    ratings: ratingsData || {},
    dailyCount,
    refetchDailyCount,
  };
}