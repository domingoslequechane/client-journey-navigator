import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Favorite {
  id: string;
  message_id: string;
  user_id: string;
  organization_id: string;
  created_at: string;
}

export function useMessageFavorites(organizationId: string | null) {
  const queryClient = useQueryClient();

  // Fetch all favorites for the organization
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['message-favorites', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('ai_message_favorites')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) throw error;
      return data as Favorite[];
    },
    enabled: !!organizationId
  });

  // Add favorite mutation
  const addFavoriteMutation = useMutation({
    mutationFn: async ({ messageId, userId }: { messageId: string; userId: string }) => {
      if (!organizationId) throw new Error('Organization ID required');

      const { data, error } = await supabase
        .from('ai_message_favorites')
        .insert({
          message_id: messageId,
          user_id: userId,
          organization_id: organizationId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-favorites', organizationId] });
      toast({ title: 'Favorito adicionado', description: 'Mensagem marcada como favorita para toda a equipe' });
    },
    onError: (error: any) => {
      if (error?.code === '23505') {
        toast({ title: 'Já favoritado', description: 'Esta mensagem já está nos favoritos', variant: 'destructive' });
      } else {
        toast({ title: 'Erro', description: 'Não foi possível adicionar aos favoritos', variant: 'destructive' });
      }
    }
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!organizationId) throw new Error('Organization ID required');

      const { error } = await supabase
        .from('ai_message_favorites')
        .delete()
        .eq('message_id', messageId)
        .eq('organization_id', organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-favorites', organizationId] });
      toast({ title: 'Favorito removido', description: 'Mensagem removida dos favoritos' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível remover dos favoritos', variant: 'destructive' });
    }
  });

  // Check if a message is favorited
  const isFavorited = useCallback((messageId: string) => {
    return favorites.some(f => f.message_id === messageId);
  }, [favorites]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (messageId: string, userId: string) => {
    if (isFavorited(messageId)) {
      await removeFavoriteMutation.mutateAsync(messageId);
    } else {
      await addFavoriteMutation.mutateAsync({ messageId, userId });
    }
  }, [isFavorited, removeFavoriteMutation, addFavoriteMutation]);

  return {
    favorites,
    isLoading,
    isFavorited,
    toggleFavorite,
    isToggling: addFavoriteMutation.isPending || removeFavoriteMutation.isPending
  };
}
