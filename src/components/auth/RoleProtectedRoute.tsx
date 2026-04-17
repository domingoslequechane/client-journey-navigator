import { ReactNode, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { PrivilegeKey } from '@/hooks/usePermissions';
import { ShieldX, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'sales' | 'operations' | 'campaign_management' | 'owner' | 'Owner' | 'qfy-admin' | 'User')[];
  privilege?: PrivilegeKey;
  requireClients?: boolean;
  requireTeam?: boolean;
  requireSettings?: boolean;
  requireSubscription?: boolean;
}

export function RoleProtectedRoute({
  children,
  allowedRoles,
  privilege,
  requireClients,
  requireTeam,
  requireSettings,
  requireSubscription,
}: RoleProtectedRouteProps) {
  const {
    role,
    isLoading,
    hasPrivilege,
    isAdmin,
    isOwner,
    privileges
  } = usePermissions();

  const [showDelayedLoader, setShowDelayedLoader] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => setShowDelayedLoader(true), 350);
    } else {
      setShowDelayedLoader(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading) {
    if (!showDelayedLoader) return null;
    
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check specific permission requirements
  let hasAccess = true;

  // System admins and owners have access to everything
  if (isAdmin || isOwner) {
    hasAccess = true;
  } else {
    if (allowedRoles && role) {
      hasAccess = allowedRoles.includes(role as any);
    }

    if (privilege && !hasPrivilege(privilege)) hasAccess = false;
    if (requireClients && !hasPrivilege('clients')) hasAccess = false;
    if (requireTeam && !hasPrivilege('team')) hasAccess = false;
    if (requireSettings && !hasPrivilege('settings')) hasAccess = false;
    if (requireSubscription && !isAdmin) hasAccess = false;
  }

  // Debug log for troubleshooting access denied errors
  if (!hasAccess) {
    console.warn('[RoleProtectedRoute] Access Denied:', {
      path: window.location.pathname,
      userRole: role,
      userPrivileges: privileges,
      isAdmin,
      isOwner,
      requirements: {
        allowedRoles,
        privilege,
        requireClients,
        requireTeam,
        requireSettings
      }
    });
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="bg-destructive/10 p-6 rounded-full mb-6">
          <ShieldX className="h-16 w-16 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          Você não tem permissão para acessar esta página. Entre em contato com o administrador da sua organização se acredita que isso é um erro.
        </p>
        <Link to="/app">
          <Button className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
