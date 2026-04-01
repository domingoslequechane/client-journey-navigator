import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';

export type PrivilegeKey =
    | 'sales'
    | 'designer'
    | 'finance'
    | 'link23'
    | 'editorial'
    | 'social_media'
    | 'qia'
    | 'studio'
    | 'academy'
    | 'clients'
    | 'team'
    | 'support'
    | 'notifications'
    | 'settings'
    | 'plans';

export const UNIVERSAL_PRIVILEGES: PrivilegeKey[] = [
    'qia',
    'academy',
    'support',
    'notifications',
    'settings'
];

export function usePermissions() {
    const { user } = useAuth();
    const { organizationId: orgId } = useOrganization();
    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile-permissions', user?.id, orgId],
        queryFn: async () => {
            if (!user) return null;

            // Get profile and user roles in parallel
            const [{ data: profileData }, { data: roleData }] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('role, privileges, current_organization_id, account_type, last_notified_role, last_notified_privileges')
                    .eq('id', user.id)
                    .single(),
                supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id)
                    .in('role', ['proprietor', 'Owner', 'qfy-admin', 'qfy_admin', 'admin', 'administrator'] as any)
                    .maybeSingle()
            ]);

            if (!profileData) {
                console.error('usePermissions: No profile data found for user', user.id);
                return null;
            }

            console.log('usePermissions: Raw data fetched', { 
                profileRole: profileData.role, 
                globalRole: roleData?.role, 
                accountId: user.id 
            });

            // If we have an organization ID, fetch org-specific permissions
            if (orgId) {
                const [{ data: memberData }, { data: isOrgOwnerResult }] = await Promise.all([
                    supabase
                        .from('organization_members')
                        .select('role, privileges')
                        .eq('user_id', user.id)
                        .eq('organization_id', orgId)
                        .maybeSingle(),
                    // Use SECURITY DEFINER function to check ownership, bypassing RLS
                    (supabase as any).rpc('is_org_owner', {
                        user_uuid: user.id,
                        org_uuid: orgId
                    })
                ]);

                // isOrgOwner is reliably determined via the server-side function
                const isOrgOwner = isOrgOwnerResult === true;

                const result = memberData ? {
                    ...profileData,
                    is_proprietor: !!roleData,
                    global_role: roleData?.role,
                    is_org_owner: isOrgOwner,
                    role: memberData.role,
                    privileges: memberData.privileges
                } : {
                    ...profileData,
                    is_proprietor: !!roleData,
                    global_role: roleData?.role,
                    is_org_owner: isOrgOwner,
                };

                return result;
            }

            return {
                ...profileData,
                is_proprietor: !!roleData,
                global_role: roleData?.role,
                is_org_owner: false,
            };
        },
        initialData: () => {
          // Pre-populate with cached data if available for instant UI
          const cached = sessionStorage.getItem('cached_permissions');
          return cached ? JSON.parse(cached) : undefined;
        }
    });

    // Update permission cache when fetch succeeds
    const permissionsData = profile;
    if (permissionsData && !isLoading) {
      sessionStorage.setItem('cached_permissions', JSON.stringify(permissionsData));
    }

    const permissions = useMemo(() => {
        const rawRole = profile?.role?.toLowerCase() || 'user';
        const privileges = (profile?.privileges as string[]) || [];
        const isProprietor = (profile as any)?.is_proprietor || false;
        const isOrgOwner = (profile as any)?.is_org_owner || false;

        // Normalize roles and email for comparison
        const globalRole = ((profile as any)?.global_role as string || '').toLowerCase();
        const emailLower = user?.email?.toLowerCase() || '';
        
        const isInternalAdmin = 
            rawRole.includes('qfy') || 
            globalRole.includes('qfy') || 
            rawRole.includes('qualify') ||
            emailLower.includes('qfy') ||
            emailLower.includes('qualify') ||
            rawRole === 'admin' || 
            rawRole === 'administrator' || 
            globalRole === 'admin' || 
            globalRole === 'administrator';

        const isAdmin = isOrgOwner || isProprietor || rawRole === 'owner' || rawRole === 'Owner' || isInternalAdmin;
        const isOwner = isOrgOwner || isProprietor || rawRole === 'owner' || rawRole === 'Owner' || isAdmin;

        console.log('usePermissions: Final calculation', {
            email: emailLower,
            profileRole: rawRole,
            globalRole: globalRole,
            isInternalAdmin,
            isAdmin,
            isOwner,
            orgId
        });

        const hasPrivilege = (key: PrivilegeKey): boolean => {
            if (isAdmin) return true;
            if (UNIVERSAL_PRIVILEGES.includes(key)) return true;
            return privileges.includes(key);
        };

        const canAccessModule = (module: string): boolean => {
            if (isAdmin) return true;

            switch (module.toLowerCase()) {
                case 'pipeline':
                    return privileges.includes('sales') || privileges.includes('designer');
                case 'finances':
                    return privileges.includes('finance');
                case 'social':
                    return privileges.includes('social_media');
                case 'link23':
                    return privileges.includes('link23');
                case 'editorial':
                    return privileges.includes('editorial');
                case 'studio':
                    return privileges.includes('studio');
                case 'clients':
                    return privileges.includes('clients');
                case 'team':
                    return privileges.includes('team');
                case 'qia':
                case 'academy':
                case 'support':
                case 'notifications':
                case 'settings':
                    return hasPrivilege(module.toLowerCase() as PrivilegeKey);
                case 'plans':
                    return isAdmin;
                default:
                    return false;
            }
        };

        return {
            role: rawRole,
            privileges,
            isAdmin,
            isOwner,
            organizationId: orgId,
            hasPrivilege,
            canAccessModule,
            lastNotifiedRole: profile?.last_notified_role,
            lastNotifiedPrivileges: profile?.last_notified_privileges || [],
            isInternalAdmin
        };
    }, [profile, orgId]);


    return {
        ...permissions,
        isLoading,
    };
}
