import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PlanType = 'starter' | 'pro' | 'agency' | 'free' | 'trial' | null;

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

            // Invalidate stale cache: legacy entries had plan_type='agency' for trial users.
            const isStaleLegacyEntry = cachedOrg?.planType === 'agency' && cachedSub?.status === 'trialing';

            // Invalidate if subscription period has already ended (prevents expired users staying in)
            const now = Date.now();
            const cachedPeriodEnd = cachedSub?.currentPeriodEnd ? new Date(cachedSub.currentPeriodEnd).getTime() : null;
            const cachedTrialEnd  = cachedOrg?.trialEndsAt     ? new Date(cachedOrg.trialEndsAt).getTime()      : null;
            const isExpiredByDate = (cachedPeriodEnd && cachedPeriodEnd < now) || (cachedTrialEnd && cachedTrialEnd < now);

            if (!isStaleLegacyEntry && !isExpiredByDate) {
              setSubscription(cachedSub);
              setOrganization(cachedOrg);
              setLoading(false);
              return;
            }
            // Remove stale / expired cache entry — force a fresh fetch
            sessionStorage.removeItem(cacheKey);
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

  const planType = organization?.planType || null;

  // ── Date checks (must be computed FIRST, before status derivation) ──
  const now = Date.now();
  const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days grace period

  // Has the subscription billing period ended?
  const subscriptionHasEnded = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).getTime() + GRACE_PERIOD_MS < now
    : false;

  // Has the trial period ended? (from organization.trialEndsAt)
  const trialHasEnded = organization?.trialEndsAt
    ? new Date(organization.trialEndsAt).getTime() + GRACE_PERIOD_MS < now
    : false;

  // Combined: at least one of the expiry dates has passed
  const hasEnded = subscriptionHasEnded || trialHasEnded;

  // ── Status derivation (date-aware) ──
  // isActive: DB says active AND the billing period hasn't ended
  const isActive = subscription?.status === 'active' && !subscriptionHasEnded;
  // isTrialing: DB says trialing AND the trial period hasn't ended
  const isTrialing = subscription?.status === 'trialing' && !trialHasEnded;
  const isPaidPlan = ['starter', 'pro', 'agency'].includes(planType as string);
  const isPastDue = subscription?.status === 'past_due';
  const isCancelled = subscription?.status === 'cancelled';

  // A subscription is truly expired if the status is expired/cancelled AND the period has ended
  const isExpired = (subscription?.status === 'expired' || subscription?.status === 'cancelled') && hasEnded;
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd || false;

  // Trial days left from organization data (informational only)
  const trialDaysLeft = organization?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(organization.trialEndsAt).getTime() - now) / (1000 * 60 * 60 * 24)))
    : 0;

  // Active subscription: must have valid status AND not have expired by date
  const hasActiveSubscription = (isActive || isTrialing || ((isCancelled || subscription?.status === 'expired') && !hasEnded));
  const hasSubscriptionRecord = !!subscription;

  // Days until subscription expiration
  const daysRemaining = subscription?.currentPeriodEnd
    ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - now) / (1000 * 60 * 60 * 24)))
    : 0;

  // Final access gate: active subscription OR paid plan that hasn't expired
  // If we don't have organization data yet, default to having access to prevent false-positive modals
  const hasAccess = !organization || hasActiveSubscription || (isPaidPlan && !isExpired);

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
