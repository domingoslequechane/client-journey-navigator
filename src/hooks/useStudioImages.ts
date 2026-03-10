"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import type { StudioImage, ToolGenerationSettings } from '@/types/studio';

export function useStudioImages(toolId: string | undefined) {
    const { organizationId: orgId } = useOrganization();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: images, isLoading, refetch } = useQuery({
        queryKey: ['studio-images', orgId, toolId],
        queryFn: async () => {
            if (!orgId || !toolId) return [];

            const { data, error } = await (supabase as any)
                .from('studio_images')
                .select('*')
                .eq('organization_id', orgId)
                .eq('tool_id', toolId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as StudioImage[];
        },
        enabled: !!orgId && !!toolId && !!user,
    });

    // Daily count (shared across all tools)
    const { data: dailyCount = 0 } = useQuery({
        queryKey: ['studio-images-daily-count', user?.id],
        queryFn: async () => {
            if (!user) return 0;
            const today = new Date().toISOString().split('T')[0];
            const { count, error } = await supabase
                .from('studio_images')
                .select('*', { count: 'exact', head: true })
                .eq('created_by', user.id)
                .gte('created_at', today);
            if (error) throw error;
            return count || 0;
        },
        enabled: !!user,
    });

    const generateImage = useMutation({
        mutationFn: async (settings: ToolGenerationSettings) => {
            if (!orgId || !user) throw new Error('Not authenticated');

            const { data, error } = await supabase.functions.invoke('generate-studio-image', {
                body: {
                    organizationId: orgId,
                    ...settings,
                },
            });

            if (error) throw error;
            return data as { imageUrl: string; imageId: string; error?: string };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studio-images', orgId, toolId] });
            queryClient.invalidateQueries({ queryKey: ['studio-images-daily-count', user?.id] });
        },
        onError: (error) => {
            toast.error('Erro na geração: ' + error.message);
        },
    });

    const deleteImage = useMutation({
        mutationFn: async (imageId: string) => {
            const { error } = await supabase
                .from('studio_images')
                .delete()
                .eq('id', imageId)
                .eq('organization_id', orgId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studio-images', orgId, toolId] });
            queryClient.invalidateQueries({ queryKey: ['studio-images-daily-count', user?.id] });
            toast.success('Imagem eliminada!');
        },
        onError: (error) => {
            toast.error('Erro ao eliminar: ' + error.message);
        },
    });

    return {
        images: images || [],
        isLoading,
        refetch,
        generateImage,
        deleteImage,
        dailyCount,
    };
}
