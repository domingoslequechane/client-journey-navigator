import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { LinkPage, LinkBlock, LinkPageTheme } from '@/types/linktree';

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function useLinkPage(clientId: string | null, organizationId: string | null) {
  const queryClient = useQueryClient();

  // Fetch link page for client
  const {
    data: linkPage,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['link-page', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from('link_pages')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Fetch blocks
        const { data: blocks, error: blocksError } = await supabase
          .from('link_blocks')
          .select('*')
          .eq('link_page_id', data.id)
          .order('sort_order', { ascending: true });

        if (blocksError) throw blocksError;

        // Parse theme safely
        const theme = (typeof data.theme === 'object' && data.theme !== null && !Array.isArray(data.theme))
          ? data.theme as unknown as LinkPageTheme
          : {
              backgroundColor: '#1a1a2e',
              primaryColor: '#a3e635',
              textColor: '#ffffff',
              fontFamily: 'Inter',
              buttonStyle: 'outline' as const,
              buttonRadius: 'pill' as const,
            };

        return {
          ...data,
          theme,
          blocks: blocks as LinkBlock[],
        } as LinkPage;
      }

      return null;
    },
    enabled: !!clientId,
  });

  // Create link page
  const createLinkPage = useMutation({
    mutationFn: async ({ name, clientName }: { name: string; clientName: string }) => {
      if (!clientId || !organizationId) throw new Error('Missing client or organization ID');

      const slug = generateSlug(clientName);

      const { data, error } = await supabase
        .from('link_pages')
        .insert({
          client_id: clientId,
          organization_id: organizationId,
          name,
          slug,
          theme: {
            backgroundColor: '#1a1a2e',
            primaryColor: '#a3e635',
            textColor: '#ffffff',
            fontFamily: 'Inter',
            buttonStyle: 'outline',
            buttonRadius: 'pill',
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-page', clientId] });
      toast({ title: 'Página criada!', description: 'Configure seus links.' });
    },
    onError: (error: Error) => {
      console.error('Error creating link page:', error);
      toast({ title: 'Erro', description: 'Não foi possível criar a página', variant: 'destructive' });
    },
  });

  // Update link page
  const updateLinkPage = useMutation({
    mutationFn: async (updates: Partial<LinkPage>) => {
      if (!linkPage?.id) throw new Error('No link page found');

      const { data, error } = await supabase
        .from('link_pages')
        .update({
          name: updates.name,
          slug: updates.slug,
          logo_url: updates.logo_url,
          bio: updates.bio,
          theme: updates.theme ? JSON.parse(JSON.stringify(updates.theme)) : undefined,
          is_published: updates.is_published,
          custom_domain: updates.custom_domain,
        })
        .eq('id', linkPage.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-page', clientId] });
    },
    onError: (error: Error) => {
      console.error('Error updating link page:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar a página', variant: 'destructive' });
    },
  });

  // Add block
  const addBlock = useMutation({
    mutationFn: async (block: Omit<LinkBlock, 'id' | 'link_page_id' | 'created_at' | 'updated_at' | 'clicks'>) => {
      if (!linkPage?.id) throw new Error('No link page found');

      const { data, error } = await supabase
        .from('link_blocks')
        .insert({
          link_page_id: linkPage.id,
          type: block.type,
          content: JSON.parse(JSON.stringify(block.content)),
          style: block.style ? JSON.parse(JSON.stringify(block.style)) : undefined,
          is_enabled: block.is_enabled,
          sort_order: block.sort_order,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-page', clientId] });
    },
    onError: (error: Error) => {
      console.error('Error adding block:', error);
      toast({ title: 'Erro', description: 'Não foi possível adicionar o bloco', variant: 'destructive' });
    },
  });

  // Update block
  const updateBlock = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LinkBlock> & { id: string }) => {
      const { data, error } = await supabase
        .from('link_blocks')
        .update({
          type: updates.type,
          content: updates.content ? JSON.parse(JSON.stringify(updates.content)) : undefined,
          style: updates.style ? JSON.parse(JSON.stringify(updates.style)) : undefined,
          is_enabled: updates.is_enabled,
          sort_order: updates.sort_order,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-page', clientId] });
    },
    onError: (error: Error) => {
      console.error('Error updating block:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o bloco', variant: 'destructive' });
    },
  });

  // Delete block
  const deleteBlock = useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await supabase
        .from('link_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-page', clientId] });
    },
    onError: (error: Error) => {
      console.error('Error deleting block:', error);
      toast({ title: 'Erro', description: 'Não foi possível remover o bloco', variant: 'destructive' });
    },
  });

  // Reorder blocks
  const reorderBlocks = useMutation({
    mutationFn: async (orderedBlockIds: string[]) => {
      const updates = orderedBlockIds.map((id, index) => ({
        id,
        sort_order: index,
      }));

      // Update each block's sort order
      for (const update of updates) {
        const { error } = await supabase
          .from('link_blocks')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['link-page', clientId] });
    },
    onError: (error: Error) => {
      console.error('Error reordering blocks:', error);
      toast({ title: 'Erro', description: 'Não foi possível reordenar os blocos', variant: 'destructive' });
    },
  });

  // Toggle publish status
  const togglePublish = useCallback(async () => {
    if (!linkPage) return;

    await updateLinkPage.mutateAsync({
      is_published: !linkPage.is_published,
    });

    toast({
      title: linkPage.is_published ? 'Página despublicada' : 'Página publicada!',
      description: linkPage.is_published
        ? 'A página não está mais acessível publicamente'
        : 'Sua página agora está online',
    });
  }, [linkPage, updateLinkPage]);

  return {
    linkPage,
    isLoading,
    error,
    refetch,
    createLinkPage: createLinkPage.mutateAsync,
    updateLinkPage: updateLinkPage.mutateAsync,
    addBlock: addBlock.mutateAsync,
    updateBlock: updateBlock.mutateAsync,
    deleteBlock: deleteBlock.mutateAsync,
    reorderBlocks: reorderBlocks.mutateAsync,
    togglePublish,
    isCreating: createLinkPage.isPending,
    isUpdating: updateLinkPage.isPending,
  };
}

// Hook for public link page (no auth required)
export function usePublicLinkPage(slug: string | undefined, orgSlug: string | undefined) {
  return useQuery({
    queryKey: ['public-link-page', orgSlug, slug],
    queryFn: async () => {
      if (!slug || !orgSlug) return null;

      // First, get the organization by slug
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .maybeSingle();

      if (orgError) throw orgError;
      if (!org) return null;

      // Then get the link page for this organization
      const { data, error } = await supabase
        .from('link_pages')
        .select('*')
        .eq('slug', slug)
        .eq('organization_id', org.id)
        .eq('is_published', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch blocks
      const { data: blocks, error: blocksError } = await supabase
        .from('link_blocks')
        .select('*')
        .eq('link_page_id', data.id)
        .eq('is_enabled', true)
        .order('sort_order', { ascending: true });

      if (blocksError) throw blocksError;

      // Parse theme safely
      const theme = (typeof data.theme === 'object' && data.theme !== null && !Array.isArray(data.theme))
        ? data.theme as unknown as LinkPageTheme
        : {
            backgroundColor: '#1a1a2e',
            primaryColor: '#a3e635',
            textColor: '#ffffff',
            fontFamily: 'Inter',
            buttonStyle: 'outline' as const,
            buttonRadius: 'pill' as const,
          };

      return {
        ...data,
        theme,
        blocks: blocks as LinkBlock[],
      } as LinkPage;
    },
    enabled: !!slug && !!orgSlug,
  });
}

// Hook for link page analytics
export function useLinkPageAnalytics(linkPageId: string | undefined) {
  return useQuery({
    queryKey: ['link-page-analytics', linkPageId],
    queryFn: async () => {
      if (!linkPageId) return null;

      // Get views count
      const { count: viewsCount } = await supabase
        .from('link_analytics')
        .select('*', { count: 'exact', head: true })
        .eq('link_page_id', linkPageId)
        .eq('event_type', 'view');

      // Get clicks count
      const { count: clicksCount } = await supabase
        .from('link_analytics')
        .select('*', { count: 'exact', head: true })
        .eq('link_page_id', linkPageId)
        .eq('event_type', 'click');

      // Get last 7 days of views
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: dailyViews } = await supabase
        .from('link_analytics')
        .select('created_at')
        .eq('link_page_id', linkPageId)
        .eq('event_type', 'view')
        .gte('created_at', sevenDaysAgo.toISOString());

      // Group by day
      const viewsByDay: Record<string, number> = {};
      dailyViews?.forEach((view) => {
        const day = new Date(view.created_at).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
        viewsByDay[day] = (viewsByDay[day] || 0) + 1;
      });

      // Get clicks by block
      const { data: clicksByBlock } = await supabase
        .from('link_analytics')
        .select('link_block_id')
        .eq('link_page_id', linkPageId)
        .eq('event_type', 'click')
        .not('link_block_id', 'is', null);

      const blockClicks: Record<string, number> = {};
      clicksByBlock?.forEach((click) => {
        if (click.link_block_id) {
          blockClicks[click.link_block_id] = (blockClicks[click.link_block_id] || 0) + 1;
        }
      });

      return {
        totalViews: viewsCount || 0,
        totalClicks: clicksCount || 0,
        ctr: viewsCount ? ((clicksCount || 0) / viewsCount * 100).toFixed(1) : '0',
        viewsByDay,
        blockClicks,
      };
    },
    enabled: !!linkPageId,
  });
}

// Function to record analytics event
export async function recordAnalyticsEvent(
  linkPageId: string,
  eventType: 'view' | 'click',
  linkBlockId?: string
) {
  try {
    await supabase.from('link_analytics').insert({
      link_page_id: linkPageId,
      link_block_id: linkBlockId || null,
      event_type: eventType,
    });
  } catch (error) {
    console.error('Error recording analytics:', error);
  }
}
