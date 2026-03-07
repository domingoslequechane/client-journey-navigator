import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import type { FinanceCategory, CategoryFormData, TransactionType } from '@/types/finance';

export function useFinanceCategories() {
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useOrganization();

  const fetchCategories = useCallback(async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;

      setCategories(data?.map(cat => ({
        id: cat.id,
        organizationId: cat.organization_id,
        name: cat.name,
        type: cat.type as TransactionType,
        color: cat.color || undefined,
        createdAt: cat.created_at,
      })) || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (data: CategoryFormData): Promise<FinanceCategory | null> => {
    if (!organizationId) return null;

    try {
      const { data: newCategory, error } = await supabase
        .from('financial_categories')
        .insert({
          organization_id: organizationId,
          name: data.name,
          type: data.type,
          color: data.color,
        })
        .select()
        .single();

      if (error) throw error;

      const category: FinanceCategory = {
        id: newCategory.id,
        organizationId: newCategory.organization_id,
        name: newCategory.name,
        type: newCategory.type as TransactionType,
        color: newCategory.color || undefined,
        createdAt: newCategory.created_at,
      };

      setCategories(prev => [...prev, category]);
      toast({ title: 'Categoria criada com sucesso' });
      return category;
    } catch (error) {
      console.error('Error creating category:', error);
      toast({ title: 'Erro ao criar categoria', variant: 'destructive' });
      return null;
    }
  };

  const updateCategory = async (id: string, data: Partial<CategoryFormData>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('financial_categories')
        .update({
          name: data.name,
          type: data.type,
          color: data.color,
        })
        .eq('id', id);

      if (error) throw error;

      setCategories(prev => prev.map(cat => 
        cat.id === id ? { ...cat, ...data } : cat
      ));
      toast({ title: 'Categoria atualizada' });
      return true;
    } catch (error) {
      console.error('Error updating category:', error);
      toast({ title: 'Erro ao atualizar categoria', variant: 'destructive' });
      return false;
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('financial_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(prev => prev.filter(cat => cat.id !== id));
      toast({ title: 'Categoria excluída' });
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({ title: 'Erro ao excluir categoria', variant: 'destructive' });
      return false;
    }
  };

  const getCategoriesByType = (type: TransactionType) => {
    return categories.filter(cat => cat.type === type);
  };

  return {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoriesByType,
    refetch: fetchCategories,
  };
}

