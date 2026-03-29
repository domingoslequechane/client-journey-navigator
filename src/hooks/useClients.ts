import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export function useClients() {
  const { organizationId: orgId } = useOrganization();

  return useQuery({
    queryKey: ['clients', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', orgId)
        .order('company_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });
}
