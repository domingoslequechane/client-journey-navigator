import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionData {
  id: string;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface OrganizationData {
  id: string;
  name: string;
  trialEndsAt: string;
}

interface UseSubscriptionReturn {
  loading: boolean;
  subscription: SubscriptionData | null;
  organization: OrganizationData | null;
  isActive: boolean;
  isTrialing: boolean;
  trialDaysLeft: number;
  hasAccess: boolean;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);

  const fetchSubscriptionData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get user's profile to find organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.organization_id) {
        console.log('No organization found for user');
        setLoading(false);
        return;
      }

      // Get organization data
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, trial_ends_at')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
      } else if (orgData) {
        setOrganization({
          id: orgData.id,
          name: orgData.name,
          trialEndsAt: orgData.trial_ends_at,
        });
      }

      // Get subscription data
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('id, status, current_period_end, cancel_at_period_end')
        .eq('organization_id', profile.organization_id)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subError);
      } else if (subData) {
        setSubscription({
          id: subData.id,
          status: subData.status,
          currentPeriodEnd: subData.current_period_end,
          cancelAtPeriodEnd: subData.cancel_at_period_end || false,
        });
      }
    } catch (error) {
      console.error('Error in useSubscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [user]);

  // Calculate trial days left
  const trialDaysLeft = organization?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(organization.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Determine subscription status
  const isTrialing = subscription?.status === 'trialing' && trialDaysLeft > 0;
  const isActive = subscription?.status === 'active' || subscription?.status === 'past_due';
  
  // User has access if they have an active subscription or are in valid trial
  const hasAccess = isActive || isTrialing;

  return {
    loading,
    subscription,
    organization,
    isActive,
    isTrialing,
    trialDaysLeft,
    hasAccess,
    refetch: fetchSubscriptionData,
  };
}
