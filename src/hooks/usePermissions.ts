import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export type PrivilegeKey =
    | 'admin'
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
    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile-permissions'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            // First get the user's profile to find their current organization
            const { data: profileData } = await supabase
                .from('profiles')
                .select('role, privileges, current_organization_id, last_notified_role, last_notified_privileges')
                .eq('id', user.id)
                .single();

            if (!profileData) return null;

            // If they have a current organization, fetch permissions from organization_members
            if (profileData.current_organization_id) {
                const { data: memberData } = await supabase
                    .from('organization_members')
                    .select('role, privileges')
                    .eq('user_id', user.id)
                    .eq('organization_id', profileData.current_organization_id)
                    .maybeSingle();

                if (memberData) {
                    // Organization-specific permissions take precedence
                    return {
                        ...profileData,
                        role: memberData.role,
                        privileges: memberData.privileges
                    };
                }
            }

            return profileData;
        },
    });

    const permissions = useMemo(() => {
        const role = profile?.role || 'user';
        const privileges = (profile?.privileges as string[]) || [];

        const isAdmin = role === 'admin' || privileges.includes('admin');

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
            role,
            privileges,
            isAdmin,
            hasPrivilege,
            canAccessModule,
            lastNotifiedRole: profile?.last_notified_role,
            lastNotifiedPrivileges: profile?.last_notified_privileges || [],
        };
    }, [profile]);

    return {
        ...permissions,
        isLoading,
    };
}
