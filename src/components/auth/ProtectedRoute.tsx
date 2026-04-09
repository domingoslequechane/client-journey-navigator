import { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { QualifySplashScreen } from '@/components/layout/QualifySplashScreen';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

type RouteDecision =
  | { type: 'loading' }
  | { type: 'redirect'; to: string }
  | { type: 'allow' };

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, user, loading: authLoading, isNewLogin } = useAuth();
  const location = useLocation();
  const [decision, setDecision] = useState<RouteDecision>({ type: 'loading' });
  // Track which user+area we resolved for, to avoid re-runs on every click
  const resolvedForRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    // Still waiting for auth
    if (authLoading) {
      setDecision({ type: 'loading' });
      return;
    }
    // Not logged in at all
    if (!session || !user) {
      setDecision({ type: 'redirect', to: '/auth' });
      return;
    }
 
    // Determine the major area (app or admin)
    const area = location.pathname.startsWith('/admin') ? 'admin' : 'app';
    const key = `${user.id}|${area}`;

    if (resolvedForRef.current === key && decision.type === 'allow') {
      // Already resolved and allowed for this area — don't re-run the async check
      return;
    }
 
    // Only show the splash screen on first load OR when switching major areas (e.g. app -> admin)
    // Avoids black screen between pages in the same area.
    if (isFirstLoadRef.current || (resolvedForRef.current && resolvedForRef.current.split('|')[1] !== area)) {
      setDecision({ type: 'loading' });
      isFirstLoadRef.current = false;
    }

    const resolve = async () => {
      try {
        // ── 1. System admin check ─────────────────────────────────────────
        const { data: roleRow } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['qfy-admin', 'qfy_admin', 'admin', 'administrator'] as any)
          .maybeSingle();

        const emailLower = user.email?.toLowerCase() || '';
        const isSystemAdmin =
          !!roleRow ||
          emailLower.includes('qfy-admin') ||
          emailLower.includes('qfy_admin') ||
          emailLower.includes('qualify-admin') ||
          (emailLower.startsWith('admin@') && emailLower.includes('onixagence.com'));

        // System admins: enforce /admin area
        if (isSystemAdmin) {
          if (location.pathname.startsWith('/app')) {
            resolvedForRef.current = key;
            setDecision({ type: 'redirect', to: '/admin' });
            return;
          }
          resolvedForRef.current = key;
          setDecision({ type: 'allow' });
          return;
        }

        // Normal users: block /admin area
        if (location.pathname.startsWith('/admin')) {
          resolvedForRef.current = key;
          setDecision({ type: 'redirect', to: '/app' });
          return;
        }

        // ── 2. Organisation check ─────────────────────────────────────────
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id, current_organization_id')
          .eq('id', user.id)
          .single();

        const orgId = profile?.current_organization_id || profile?.organization_id;

        // No org at all → send to select-organization
        if (!orgId) {
          if (
            location.pathname === '/app/select-organization' ||
            location.pathname === '/app/onboarding' 
          ) {
            resolvedForRef.current = key;
            setDecision({ type: 'allow' });
            return;
          }
          resolvedForRef.current = key;
          setDecision({ type: 'redirect', to: '/app/select-organization' });
          return;
        }

        // ── 2.5 New Login Check ──────────────────────────────────────────
        // If it's a new login, force them to the select-organization page,
        // UNLESS they are already on it or onboarding.
        if (isNewLogin) {
          if (
            location.pathname !== '/app/select-organization' &&
            location.pathname !== '/app/onboarding'
          ) {
            resolvedForRef.current = key;
            setDecision({ type: 'redirect', to: '/app/select-organization' });
            return;
          }
        }

        // ── 3. Subscription check ─────────────────────────────────────────
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('status, current_period_end')
          .eq('organization_id', orgId)
          .maybeSingle();

        const subStatus = subData?.status;
        const isActive = subStatus === 'active' || subStatus === 'trialing';
        const isPastDueButValid =
          (subStatus === 'cancelled' || subStatus === 'past_due') &&
          subData?.current_period_end &&
          new Date(subData.current_period_end).getTime() > Date.now();

        const hasSubscriptionAccess = isActive || !!isPastDueButValid;
        const hasSubscriptionRecord = !!subData;

        // Paths that are always allowed even without subscription
        const allowedWithoutSub = [
          '/app/settings',
          '/app/select-organization',
          '/app/subscription',
          '/app/onboarding',
        ];
        const isAllowedPath = allowedWithoutSub.some(
          (p) => location.pathname === p || location.pathname.startsWith(p + '/')
        );

        if (!hasSubscriptionAccess && !isAllowedPath) {
          // Check if user is owner/admin of the org (only owners must pay; members just see message)
          const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .maybeSingle();

          const { data: orgData } = await supabase
            .from('organizations')
            .select('owner_id')
            .eq('id', orgId)
            .single();

          const isOrgAdmin =
            orgData?.owner_id === user.id ||
            ['Owner', 'owner', 'admin', 'proprietor'].includes(membership?.role as string);

          if (isOrgAdmin) {
            resolvedForRef.current = key;
            setDecision({
              type: 'redirect',
              to: hasSubscriptionRecord ? '/app/subscription?reason=expired' : '/select-plan',
            });
            return;
          }

          // Non-admin member: allow through, pages will show subscription-required UI
        }

        // ── 4. Onboarding check (only for paths inside /app that aren't settings) ──
        if (hasSubscriptionAccess || isAllowedPath) {
          const { data: orgRow } = await supabase
            .from('organizations')
            .select('onboarding_completed, name, owner_id')
            .eq('id', orgId)
            .single();

          const needsOnboarding =
            orgRow?.owner_id === user.id &&
            (!orgRow?.onboarding_completed || !orgRow?.name?.trim() || orgRow?.name === 'Agency');

          if (needsOnboarding) {
            // Se precisar de onboarding inicial, o percurso base correctissimo é o /app/onboarding
            const onboardingTarget = '/app/onboarding';
            const cur = location.pathname;
            
            if (cur !== onboardingTarget && cur !== '/app/settings') {
              resolvedForRef.current = key;
              setDecision({ type: 'redirect', to: onboardingTarget });
              return;
            }
          }
        }

        resolvedForRef.current = key;
        setDecision({ type: 'allow' });
      } catch (err) {
        console.error('ProtectedRoute resolve error:', err);
        // On error, allow through rather than infinite loading
        resolvedForRef.current = key;
        setDecision({ type: 'allow' });
      }
    };

    resolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session, user?.id, location.pathname]);

  // Reset resolved cache when user logs out/changes
  useEffect(() => {
    if (!user) {
      resolvedForRef.current = null;
      setDecision({ type: 'loading' });
    }
  }, [user]);

  if (decision.type === 'loading') {
    return <QualifySplashScreen message="A carregar o seu ambiente..." />;
  }

  if (decision.type === 'redirect') {
    return <Navigate to={decision.to} replace />;
  }

  return <>{children}</>;
}
