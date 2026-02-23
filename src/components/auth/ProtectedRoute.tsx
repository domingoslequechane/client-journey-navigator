import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, user, loading: authLoading, isNewLogin, clearNewLoginFlag } = useAuth();
  const { loading: subLoading, hasAccess, organization } = useSubscription();
  const location = useLocation();
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean | null>(null);
  const [needsOrgSelection, setNeedsOrgSelection] = useState<boolean | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState<boolean | null>(null);

  // Check if user is a system admin (app owner)
  useEffect(() => {
    const checkSystemAdmin = async () => {
      if (!user) {
        setIsSystemAdmin(false);
        return;
      }
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'proprietor')
        .maybeSingle();
      
      setIsSystemAdmin(!!data);
    };

    checkSystemAdmin();
  }, [user]);

  // Check if user needs to select an organization
  useEffect(() => {
    const checkOrgSelection = async () => {
      if (!user || isSystemAdmin === null) {
        return;
      }

      // System admins don't need org selection
      if (isSystemAdmin) {
        setNeedsOrgSelection(false);
        return;
      }

      // Skip if we're already on the select-organization page
      if (location.pathname === '/app/select-organization') {
        setNeedsOrgSelection(false);
        return;
      }

      // Check how many organizations user belongs to
      const { data: orgs } = await supabase.rpc('get_user_organizations', {
        user_uuid: user.id
      });

      // Check if user has a current organization set
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id, organization_id')
        .eq('id', user.id)
        .single();

      if (!orgs || orgs.length === 0) {
        // Fallback: check profiles.organization_id for users not in organization_members
        if (profile?.organization_id) {
          // Auto-create organization_members entry
          await supabase.from('organization_members').upsert(
            {
              user_id: user.id,
              organization_id: profile.organization_id,
              role: 'admin',
              is_active: true,
            },
            { onConflict: 'user_id,organization_id' }
          );

          // Set current_organization_id if not set
          if (!profile.current_organization_id) {
            await supabase
              .from('profiles')
              .update({ current_organization_id: profile.organization_id })
              .eq('id', user.id);
          }

          setNeedsOrgSelection(false);
          setNeedsOnboarding(false);
          return;
        }

        // No organizations - needs onboarding
        setNeedsOrgSelection(false);
        setNeedsOnboarding(true);
        return;
      }

      if (orgs.length > 1 && (isNewLogin || !profile?.current_organization_id)) {
        // Multiple orgs - force selection on new login or if none selected
        setNeedsOrgSelection(true);
        return;
      }

      // If only one org and no current set, auto-set it
      if (orgs.length === 1 && !profile?.current_organization_id) {
        await supabase.rpc('set_current_organization', {
          user_uuid: user.id,
          org_uuid: orgs[0].organization_id
        });
      }

      setNeedsOrgSelection(false);
    };

    if (isSystemAdmin !== null) {
      checkOrgSelection();
    }
  }, [user, isSystemAdmin, location.pathname]);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (needsOnboarding === null && !subLoading && isSystemAdmin === false) {
        setNeedsOnboarding(false);
      }
      if (needsOrgSelection === null && !authLoading && isSystemAdmin === false) {
        setNeedsOrgSelection(false);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [needsOnboarding, needsOrgSelection, subLoading, authLoading, isSystemAdmin]);

  // Check for pending plan selection or onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user || !organization) {
        setNeedsOnboarding(null);
        setIsOrgAdmin(null);
        return;
      }

      try {
        const [{ data: membership }, { data: orgData }] = await Promise.all([
          supabase
            .from('organization_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('organization_id', organization.id)
            .eq('is_active', true)
            .maybeSingle(),
          supabase
            .from('organizations')
            .select(
              'onboarding_completed, name, headquarters, nuit, phone, representative_name, representative_position, owner_id'
            )
            .eq('id', organization.id)
            .single(),
        ]);

        const isAdminForOrg = orgData?.owner_id === user.id || membership?.role === 'admin';
        setIsOrgAdmin(isAdminForOrg);

        // Apenas admins/owners são obrigados a concluir a configuração da agência
        if (!isAdminForOrg) {
          setNeedsOnboarding(false);
          return;
        }

        // Apenas o nome da agência é obrigatório para o onboarding inicial
        const hasRequiredFields = Boolean(orgData?.name?.trim());

        const isComplete = orgData?.onboarding_completed === true && hasRequiredFields;
        setNeedsOnboarding(!isComplete);
      } catch (e) {
        console.error('Error checking onboarding completion:', e);
        setNeedsOnboarding(false);
      }
    };

    // Plan selection check removed — access is now gated by subscription status in the render logic below

    if (!subLoading && organization) {
      checkOnboarding();
    } else if (!subLoading && !organization && isSystemAdmin === false) {
      // Verificar se o usuário realmente não tem organização antes de definir needsOnboarding
      const checkIfTrulyNoOrg = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id, current_organization_id')
          .eq('id', user?.id)
          .maybeSingle();
        
        const orgId = profile?.current_organization_id || profile?.organization_id;
        
        if (!orgId) {
          // Realmente não tem organização - precisa de onboarding
          setNeedsOnboarding(true);
        }
        // Se tem orgId, aguardar o useSubscription carregar a organization
      };
      
      if (user) {
        checkIfTrulyNoOrg();
      }
    }
  }, [user, organization, subLoading, isSystemAdmin]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Show loading while checking subscription and admin status
  if (subLoading || isSystemAdmin === null || needsOrgSelection === null || (needsOnboarding === null && !isSystemAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando...</p>
        </div>
      </div>
    );
  }

  // System admins trying to access /app/* routes - redirect to admin panel
  if (isSystemAdmin && location.pathname.startsWith('/app')) {
    return <Navigate to="/admin" replace />;
  }

  // System admins have full access to admin area
  if (isSystemAdmin) {
    return <>{children}</>;
  }

  // Redirect to organization selection if needed
  if (needsOrgSelection) {
    return <Navigate to="/app/select-organization" replace />;
  }

  // Redirect to onboarding/configuração da agência se necessário
  if (needsOnboarding) {
    const target = organization ? '/app/settings?tab=agency' : '/app/onboarding';
    const current = `${location.pathname}${location.search}`;

    if (current !== target) {
      return <Navigate to={target} replace />;
    }
  }

  // Redirect to select-plan if user doesn't have active subscription
  // Allow access to settings (for agency config) and onboarding
  const allowedPathsWithoutSubscription = [
    '/app/settings',
    '/app/onboarding',
    '/app/select-organization',
  ];
  
  const isAllowedWithoutSubscription = allowedPathsWithoutSubscription.some(
    path => location.pathname === path || location.pathname.startsWith(path + '/')
  );

  if (!hasAccess && !isAllowedWithoutSubscription) {
    return <Navigate to="/select-plan" replace />;
  }

  // All checks passed - render children
  return <>{children}</>;
}
