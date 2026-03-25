import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PlanType = 'starter' | 'pro' | 'agency' | 'free' | null;

interface SubscriptionData {
  id: string;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
  currentPeriodEnd: string | null;
  currentPeriodStart: string | null;
  cancelAtPeriodEnd: boolean;
  lemonsqueezySubscriptionId: string | null;
  lemonsqueezyCustomerPortalUrl: string | null;
}

interface OrganizationData {
  id: string;
  name: string;
  trialEndsAt: string;
  planType: PlanType;
  onboardingCompleted: boolean;
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
  isExpired: boolean;
  cancelAtPeriodEnd: boolean;
  trialDaysLeft: number;
  daysRemaining: number;
  hasAccess: boolean;
  hasActiveSubscription: boolean;
  hasSubscriptionRecord: boolean;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);

  const fetchSubscriptionData = async (force = false) => {
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
        setLoading(false);
        return;
      }

      // Try to load from session cache first, now specific to the organization
      const cacheKey = `sub_cache_${user.id}_${orgId}`;
      if (!force) {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            const { subscription: cachedSub, organization: cachedOrg } = JSON.parse(cached);
            setSubscription(cachedSub);
            setOrganization(cachedOrg);
            setLoading(false);
            return;
          } catch (e) {
            console.error('Error parsing subscription cache:', e);
          }
        }
      }

      setLoading(true);

      // Get organization and subscription data in parallel for speed
      const [{ data: orgData, error: orgError }, { data: subData, error: subError }] = await Promise.all([
        supabase
          .from('organizations')
          .select('id, name, trial_ends_at, plan_type, onboarding_completed')
          .eq('id', orgId)
          .single(),
        supabase
          .from('subscriptions')
          .select('id, status, current_period_end, current_period_start, cancel_at_period_end, lemonsqueezy_subscription_id, lemonsqueezy_customer_portal_url')
          .eq('organization_id', orgId)
          .maybeSingle()
      ]);

      let finalOrg = null;
      let finalSub = null;

      if (orgData) {
        finalOrg = {
          id: orgData.id,
          name: orgData.name,
          trialEndsAt: orgData.trial_ends_at,
          planType: (orgData.plan_type as PlanType) || null,
          onboardingCompleted: orgData.onboarding_completed || false,
        };
        setOrganization(finalOrg);
      }

      if (subData) {
        finalSub = {
          id: subData.id,
          status: subData.status as any,
          currentPeriodEnd: subData.current_period_end,
          currentPeriodStart: subData.current_period_start,
          cancelAtPeriodEnd: subData.cancel_at_period_end || false,
          lemonsqueezySubscriptionId: subData.lemonsqueezy_subscription_id,
          lemonsqueezyCustomerPortalUrl: subData.lemonsqueezy_customer_portal_url,
        };
        setSubscription(finalSub);
      }

      // Update session cache
      sessionStorage.setItem(cacheKey, JSON.stringify({
        subscription: finalSub,
        organization: finalOrg,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error in useSubscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [user]);

  const planType = organization?.planType || null; // Changed fallback to null

  // Determine subscription status — access is gated by LemonSqueezy subscription only
  const isActive = subscription?.status === 'active';
  const isTrialing = subscription?.status === 'trialing';
  const isPaidPlan = ['starter', 'pro', 'agency'].includes(planType as string);
  const isPastDue = subscription?.status === 'past_due';
  const isCancelled = subscription?.status === 'cancelled';
  const hasEnded = subscription?.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd).getTime() < Date.now() 
    : false;
  
  // A subscription is considered truly expired only if it's officially ended OR its status is 'expired' and the date has passed
  const isExpired = (subscription?.status === 'expired' || subscription?.status === 'cancelled') && hasEnded;
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd || false;

  // Trial days left from organization data (informational only)
  const trialDaysLeft = organization?.trialEndsAt // Used trialEndsAt from OrganizationData
    ? Math.max(0, Math.ceil((new Date(organization.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Active status for access control: current status is active/trialing OR (cancelled/expired but still within paid period)
  const hasActiveSubscription = (isActive || isTrialing || ((isCancelled || subscription?.status === 'expired') && !hasEnded));
  const hasSubscriptionRecord = !!subscription;
  
  // Days until LemonSqueezy subscription expiration
  const daysRemaining = subscription?.currentPeriodEnd
    ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  // Access requires an active or trialing subscription record from LemonSqueezy.
  // Fallback: If planType is a paid plan (starter, pro, agency), grant access 
  // to avoid locking out legitimate users who might be out of sync.
  const hasAccess = hasActiveSubscription || (isPaidPlan && !isExpired);

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
    isExpired,
    cancelAtPeriodEnd,
    trialDaysLeft,
    daysRemaining,
    hasAccess,
    hasActiveSubscription,
    hasSubscriptionRecord,
    refetch: () => fetchSubscriptionData(true),
  };
}
