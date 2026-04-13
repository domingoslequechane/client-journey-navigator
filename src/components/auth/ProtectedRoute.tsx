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
    // 1. Still waiting for auth
    if (authLoading) {
      setDecision({ type: 'loading' });
      return;
    }
    
    // 2. Not logged in at all
    if (!session || !user) {
      setDecision({ type: 'redirect', to: '/auth' });
      return;
    }
 
    // 3. Determine area and check cache
    const area = location.pathname.startsWith('/admin') ? 'admin' : 'app';
    const key = `${user.id}|${area}`;

    // If already allowed for this area in this session/mount, stay allowed
    if (resolvedForRef.current === key && decision.type === 'allow') {
      return;
    }

    const resolve = async () => {
      try {
        // Parallelized fetch for ALL necessary data to decide the path
        const [
          { data: roleRow },
          { data: profile },
          { data: orgMemberships }
        ] = await Promise.all([
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'qfy-admin')
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('organization_id, current_organization_id')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('organization_members')
            .select('organization_id, role, is_active')
            .eq('user_id', user.id)
            .eq('is_active', true)
        ]);

        // ── A. System Admin Logic ──────────────────────────────────────────
        const emailLower = user.email?.toLowerCase() || '';
        const isSystemAdmin =
          !!roleRow ||
          emailLower.includes('qfy-admin') ||
          (emailLower.startsWith('admin@') && emailLower.includes('onixagence.com'));

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

        // B. Block normal users from admin
        if (location.pathname.startsWith('/admin')) {
          resolvedForRef.current = key;
          setDecision({ type: 'redirect', to: '/app' });
          return;
        }

        // ── C. Organisation & Subscription Logic ──────────────────────────
        const orgId = profile?.current_organization_id || profile?.organization_id;

        if (!orgId) {
          const isAllowedPath = ['/app/select-organization', '/app/onboarding'].includes(location.pathname);
          resolvedForRef.current = key;
          setDecision(isAllowedPath ? { type: 'allow' } : { type: 'redirect', to: '/app/select-organization' });
          return;
        }

        // New Login force redirection (only for standard users)
        if (isNewLogin && !['/app/select-organization', '/app/onboarding'].includes(location.pathname)) {
          resolvedForRef.current = key;
          setDecision({ type: 'redirect', to: '/app/select-organization' });
          return;
        }

        // Parallel fetch for Subscription and Org specific details
        const [
          { data: subData },
          { data: orgRow }
        ] = await Promise.all([
          supabase
            .from('subscriptions')
            .select('status, current_period_end')
            .eq('organization_id', orgId)
            .maybeSingle(),
          supabase
            .from('organizations')
            .select('onboarding_completed, name, owner_id')
            .eq('id', orgId)
            .maybeSingle()
        ]);

        const subStatus = subData?.status;
        const subActive = subStatus === 'active' || subStatus === 'trialing' || 
          ((subStatus === 'cancelled' || subStatus === 'past_due') && 
           subData?.current_period_end && new Date(subData.current_period_end).getTime() > Date.now());

        const allowedWithoutSub = ['/app/settings', '/app/select-organization', '/app/subscription', '/app/onboarding'];
        const isAllowedPath = allowedWithoutSub.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));

        if (!subActive && !isAllowedPath) {
          const membership = orgMemberships?.find(m => m.organization_id === orgId);
          const isOrgAdmin = orgRow?.owner_id === user.id || 
            ['Owner', 'owner', 'admin', 'proprietor'].includes(membership?.role as string);

          if (isOrgAdmin) {
            resolvedForRef.current = key;
            setDecision({ type: 'redirect', to: subData ? '/app/subscription?reason=expired' : '/select-plan' });
            return;
          }
        }

        // ── D. Onboarding Check ───────────────────────────────────────────
        if (orgRow?.owner_id === user.id && (!orgRow?.onboarding_completed || !orgRow?.name?.trim() || orgRow?.name === 'Agency')) {
           const onboardingTarget = '/app/onboarding';
           if (location.pathname !== onboardingTarget && location.pathname !== '/app/settings') {
             resolvedForRef.current = key;
             setDecision({ type: 'redirect', to: onboardingTarget });
             return;
           }
        }

        resolvedForRef.current = key;
        setDecision({ type: 'allow' });
      } catch (err) {
        console.error('ProtectedRoute resolve error:', err);
        resolvedForRef.current = key;
        setDecision({ type: 'allow' });
      }
    };

    // If it's a first load, we definitely show splash
    if (isFirstLoadRef.current) {
      setDecision({ type: 'loading' });
      isFirstLoadRef.current = false;
    }

    resolve();
  }, [authLoading, session, user?.id, location.pathname, isNewLogin]);

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
