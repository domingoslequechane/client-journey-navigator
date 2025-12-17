import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrencySymbol } from '@/lib/currencies';

export function useOrganizationCurrency() {
  const [currency, setCurrency] = useState('MZN');
  const [currencySymbol, setCurrencySymbol] = useState('MT');
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
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('currency')
            .eq('id', profile.organization_id)
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

  return { currency, currencySymbol, loading };
}
