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

            const { data } = await supabase
                .from('profiles')
                .select('role, privileges')
                .eq('id', user.id)
                .single();

            return data as any;
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
        };
    }, [profile]);

    return {
        ...permissions,
        isLoading,
    };
}
