import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrencySymbol } from '@/lib/currencies';

export function useOrganizationCurrency() {
  const [currency, setCurrency] = useState('MZN');
  const [currencySymbol, setCurrencySymbol] = useState('MT');
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id, current_organization_id')
          .eq('id', user.id)
          .single();

        const orgId = profile?.current_organization_id || profile?.organization_id;
        
        if (orgId) {
          setOrganizationId(orgId);
          
          const { data: org } = await supabase
            .from('organizations')
            .select('currency')
            .eq('id', orgId)
            .single();

          if (org?.currency) {
            setCurrency(org.currency);
            setCurrencySymbol(getCurrencySymbol(org.currency));
          }
        }
      } catch (error) {
        console.error('Error fetching organization currency:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrency();
  }, []);

  return { currency, currencySymbol, organizationId, loading };
}
