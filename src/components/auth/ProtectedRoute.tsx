import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { PublicBackground } from '@/components/layout/PublicBackground';
import { SubscriptionRequired } from '@/components/subscription/SubscriptionRequired';
import { QualifySplashScreen } from '@/components/layout/QualifySplashScreen';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, user, loading: authLoading, isNewLogin, clearNewLoginFlag } = useAuth();
  const { loading: subLoading, hasAccess, organization, isExpired, hasSubscriptionRecord } = useSubscription();
  const location = useLocation();
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean | null>(null);
  const [needsOrgSelection, setNeedsOrgSelection] = useState<boolean | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState<boolean | null>(null);

  // Check if user is a system admin (internal team with qfy-admin in email)
  useEffect(() => {
    const checkSystemAdmin = async () => {
      if (!user || !user.email) {
        setIsSystemAdmin(false);
        return;
      }

      // Super-admin access is restricted to qfy-admin or legacy admin role in user_roles table
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['qfy-admin', 'qfy_admin', 'admin', 'administrator'] as any)
        .maybeSingle();
      
      const emailLower = user?.email?.toLowerCase() || '';
      const isInternalTeam = 
        emailLower.includes('qfy-admin') || 
        emailLower.includes('qfy_admin') || 
        emailLower.includes('qualify-admin') ||
        (emailLower.startsWith('admin@') && emailLower.includes('onixagence.com'));
        
      const isSystemAdminVal = !!data || isInternalTeam;
      
      console.log('ProtectedRoute: System Admin check result', { 
        email: user.email, 
        hasRole: !!data, 
        isInternalTeam,
        isSystemAdminVal 
      });
      
      setIsSystemAdmin(isSystemAdminVal);
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
              role: 'Owner',
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

          if (isNewLogin) {
            setNeedsOrgSelection(true);
          } else {
            setNeedsOrgSelection(false);
          }
          setNeedsOnboarding(false);
          return;
        }

        if (isNewLogin) {
          setNeedsOrgSelection(true);
        } else {
          setNeedsOnboarding(true);
          setNeedsOrgSelection(false);
        }
        return;
      }

      // If it's a new login, always show the selection screen (so they can pick or create a new agency)
      if (isNewLogin) {
        setNeedsOrgSelection(true);
        return;
      }

      if (orgs.length > 1 && !profile?.current_organization_id) {
        // Multiple orgs - force selection if none selected
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
      if (isSystemAdmin === null) {
        console.warn('ProtectedRoute: isSystemAdmin check timed out, defaulting to false');
        setIsSystemAdmin(false);
      }
      if (needsOrgSelection === null) {
        console.warn('ProtectedRoute: needsOrgSelection check timed out, defaulting to false');
        setNeedsOrgSelection(false);
      }
      if (needsOnboarding === null && !subLoading && isSystemAdmin === false) {
        setNeedsOnboarding(false);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isSystemAdmin, needsOrgSelection, needsOnboarding, subLoading]);

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
            .select('role, privileges')
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

        const isAdminForOrg =
          orgData?.owner_id === user.id ||
          (membership?.role as string) === 'admin' ||
          (membership?.role as string) === 'owner' ||
          (membership?.role as string) === 'Owner' ||     // Full support for exact "Owner" role
          (membership?.role as string) === 'qfy-admin' || // qfy-admin is also admin for the org they are in
          (membership?.role as string) === 'proprietor' || 
          membership?.privileges?.includes('admin');

        setIsOrgAdmin(Boolean(isAdminForOrg));

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

  // State to hold delayed loading to avoid flicker on focus/restoration
  const [showDelayedLoader, setShowDelayedLoader] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (authLoading || subLoading || isSystemAdmin === null || needsOrgSelection === null || (needsOnboarding === null && !isSystemAdmin)) {
      timer = setTimeout(() => setShowDelayedLoader(true), 300);
    } else {
      setShowDelayedLoader(false);
    }
    return () => clearTimeout(timer);
  }, [authLoading, subLoading, isSystemAdmin, needsOrgSelection, needsOnboarding]);

  // If loading is true but under delay threshold, render NOTHING to keep UI stable
  if ((authLoading || subLoading || isSystemAdmin === null || needsOrgSelection === null || (needsOnboarding === null && !isSystemAdmin)) && !showDelayedLoader) {
    return null;
  }

  // Show splash screen while verifying everything
  if (showDelayedLoader || authLoading || subLoading || isSystemAdmin === null || needsOrgSelection === null) {
    let message = "Processando...";
    if (authLoading) message = "Autenticando...";
    else if (subLoading) message = "Verificando plano...";
    else if (isSystemAdmin === null) message = "Identificando perfil...";
    else if (needsOrgSelection === null) message = "Carregando agência...";

    return <QualifySplashScreen message={message} />;
  }

  // Redirect to auth if not logged in
  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 1. Strict area separation: System admins trying to access /app/* - redirect to /admin
  if (isSystemAdmin && location.pathname.startsWith('/app')) {
    console.log('ProtectedRoute: System Admin attempted to access /app - redirecting to /admin');
    return <Navigate to="/admin" replace />;
  }

  // 2. Strict area separation: Normal users trying to access /admin/* - redirect to /app
  if (!isSystemAdmin && location.pathname.startsWith('/admin')) {
    console.log('ProtectedRoute: Normal user attempted to access /admin - redirecting to /app');
    return <Navigate to="/app" replace />;
  }

  // 3. System admins have full access to admin area
  if (isSystemAdmin) {
    return <>{children}</>;
  }

  // Redirect to organization selection if needed
  if (needsOrgSelection && location.pathname !== '/app/select-organization') {
    return <Navigate to="/app/select-organization" replace />;
  }

  // Redirect to onboarding/configuração da agência se necessário
  if (needsOnboarding) {
    const target = organization ? '/app/settings?tab=agency' : '/app/onboarding';
    const current = location.pathname;

    if (current !== target && !location.search.includes('reason=')) {
      return <Navigate to={`${target}${target.includes('?') ? '&' : '?'}reason=onboarding`} replace />;
    }
  }

  // Redirect to select-plan if user doesn't have active subscription
  // Allow access to settings (for agency config) and onboarding
  const allowedPathsWithoutSubscription = [
    '/app/settings',
    '/app/onboarding',
    '/app/select-organization',
    '/app/subscription',
  ];

  const isAllowedWithoutSubscription = allowedPathsWithoutSubscription.some(
    path => location.pathname === path || location.pathname.startsWith(path + '/')
  );

  if (!hasAccess && !isAllowedWithoutSubscription) {
    const isAdmin = 
      isOrgAdmin || 
      isSystemAdmin || 
      organization?.planType === 'agency'; // Per-org checks

    if (isAdmin) {
      if (hasSubscriptionRecord) {
        return <Navigate to="/app/subscription?reason=expired" replace />;
      }
      return <Navigate to="/select-plan?reason=no_plan" replace />;
    }

    // Para Colaboradores, mostra apenas o aviso amigável sem forçar redirecionamento de pagamento
    return (
      <PublicBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <SubscriptionRequired 
            feature="o sistema Qualify" 
            title="Assinatura da Agência Pendente"
            description="Esta agência não possui uma assinatura activa no momento. Por favor, contacte o proprietário da conta para regularizar o acesso remunerado."
          />
        </div>
      </PublicBackground>
    );
  }

  // All checks passed - render children
  return <>{children}</>;
}
