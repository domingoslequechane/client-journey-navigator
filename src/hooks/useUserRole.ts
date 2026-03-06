import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'sales' | 'operations' | 'campaign_management';

// Stages each role is responsible for
const SALES_STAGES = ['prospeccao', 'reuniao', 'contratacao'];
const OPERATIONS_STAGES = ['producao', 'trafego'];
const CAMPAIGN_STAGES = ['trafego', 'retencao', 'fidelizacao'];

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [privileges, setPrivileges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, privileges')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setRole(data?.role as UserRole || 'sales');
        setPrivileges((data?.privileges as string[]) || []);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setRole('sales');
        setPrivileges([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const permissions = useMemo(() => {
    const isAdmin = role === 'admin' || privileges.includes('admin');
    const hasPrivilege = (p: string) => isAdmin || privileges.includes(p);

    const isSales = hasPrivilege('sales');
    const isOperations = hasPrivilege('designer');
    const isCampaigns = hasPrivilege('social_media') || hasPrivilege('editorial');

    return {
      // Menu visibility
      canSeeSalesFunnel: hasPrivilege('sales') || hasPrivilege('designer'),
      canSeeOperationalFlow: hasPrivilege('designer'),
      canSeeClients: hasPrivilege('clients'),
      canSeeTeam: hasPrivilege('team'),
      canSeeSettings: hasPrivilege('settings'),
      canSeeSubscription: isAdmin,
      canSeeFinance: hasPrivilege('finance'),

      // Dashboard visibility
      canAddClient: hasPrivilege('sales'),

      // Client profile actions
      canEditClient: hasPrivilege('sales'),
      canSeeContracts: hasPrivilege('sales') || hasPrivilege('link23'),
      canSuspendClient: isAdmin,

      // Finance module actions
      canManageFinance: hasPrivilege('finance'),
      canViewFinance: hasPrivilege('finance'),
      canDeleteFinanceRecords: isAdmin,

      // Get stages visible to user for recent clients
      getVisibleStages: () => {
        if (isAdmin) return null; // null means all stages
        if (hasPrivilege('sales')) return SALES_STAGES;
        if (hasPrivilege('designer')) return OPERATIONS_STAGES;
        return [];
      },
    };
  }, [role, privileges]);

  return {
    role,
    loading,
    isAdmin: role === 'admin',
    isSales: role === 'sales',
    isOperations: role === 'operations',
    isCampaigns: role === 'campaign_management',
    ...permissions,
  };
}
