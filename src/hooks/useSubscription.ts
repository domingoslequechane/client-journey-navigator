import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PlanType = 'free' | 'starter' | 'pro' | 'agency';

interface SubscriptionData {
  id: string;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
  currentPeriodEnd: string | null;
  currentPeriodStart: string | null;
  cancelAtPeriodEnd: boolean;
  lemonsqueezySubscriptionId: string | null;
}

interface OrganizationData {
  id: string;
  name: string;
  trialEndsAt: string;
  planType: PlanType;
}

interface UseSubscriptionReturn {
  loading: boolean;
  subscription: SubscriptionData | null;
  organization: OrganizationData | null;
  planType: PlanType;
  isActive: boolean;
  isTrialing: boolean;
  isPaidPlan: boolean;
  isPastDue: boolean;
  isCancelled: boolean;
  cancelAtPeriodEnd: boolean;
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
      // Get user's profile to find organization (prefer current_organization_id)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, current_organization_id')
        .eq('id', user.id)
        .single();

      const orgId = profile?.current_organization_id || profile?.organization_id;

      if (profileError || !orgId) {
        console.log('No organization found for user');
        setLoading(false);
        return;
      }

      // Get organization data
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, trial_ends_at, plan_type')
        .eq('id', orgId)
        .single();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
      } else if (orgData) {
        setOrganization({
          id: orgData.id,
          name: orgData.name,
          trialEndsAt: orgData.trial_ends_at,
          planType: (orgData.plan_type as PlanType) || 'free',
        });
      }

      // Get subscription data
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('id, status, current_period_end, current_period_start, cancel_at_period_end, lemonsqueezy_subscription_id')
        .eq('organization_id', orgId)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subError);
      } else if (subData) {
        setSubscription({
          id: subData.id,
          status: subData.status,
          currentPeriodEnd: subData.current_period_end,
          currentPeriodStart: subData.current_period_start,
          cancelAtPeriodEnd: subData.cancel_at_period_end || false,
          lemonsqueezySubscriptionId: subData.lemonsqueezy_subscription_id,
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

  // Calculate trial days left based on organization's trial_ends_at
  const trialDaysLeft = organization?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(organization.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const planType = organization?.planType || 'free';
  
  // Determine subscription status
  // isTrialing = has trial days left AND no active paid subscription
  const isActive = subscription?.status === 'active' || subscription?.status === 'past_due';
  const isTrialing = trialDaysLeft > 0 && !isActive;
  const isPaidPlan = ['starter', 'pro', 'agency'].includes(planType);
  const isPastDue = subscription?.status === 'past_due';
  const isCancelled = subscription?.status === 'cancelled' || subscription?.status === 'expired';
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd || false;
  
  // Freemium model: everyone has access, limitations are per-feature via usePlanLimits
  const hasAccess = true;

  return {
    loading,
    subscription,
    organization,
    planType,
    isActive,
    isTrialing,
    isPaidPlan,
    isPastDue,
    isCancelled,
    cancelAtPeriodEnd,
    trialDaysLeft,
    hasAccess,
    refetch: fetchSubscriptionData,
  };
}
