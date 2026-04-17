import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';

export type UserRole = 'admin' | 'sales' | 'operations' | 'campaign_management' | 'owner' | 'Owner' | 'qfy-admin' | 'User';

// Stages each role is responsible for
const SALES_STAGES = ['prospeccao', 'reuniao', 'contratacao'];
const OPERATIONS_STAGES = ['producao', 'trafego'];
const CAMPAIGN_STAGES = ['trafego', 'retencao', 'fidelizacao'];

export function useUserRole() {
  const { user } = useAuth();
  const { organizationId: effectiveOrgId } = useOrganization();
  const [role, setRole] = useState<UserRole | null>(null);
  const [privileges, setPrivileges] = useState<string[]>([]);
  const [accountType, setAccountType] = useState<string>('user');
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // First get the user's profile to know the default role
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, privileges, account_type')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        // Fetch privileges from organization_members for the active organization
        let memberPrivileges: string[] = (profileData?.privileges as string[]) || [];
        let memberRole: string = profileData?.role || 'user';

        if (effectiveOrgId) {
          const [{ data: memberData }] = await Promise.all([
            supabase
              .from('organization_members')
              .select('privileges, role')
              .eq('user_id', user.id)
              .eq('organization_id', effectiveOrgId)
              .maybeSingle()
          ]);

          if (memberData) {
            if (memberData.privileges && (memberData.privileges as string[]).length > 0) {
              memberPrivileges = memberData.privileges as string[];
            }
            if (memberData.role) {
              memberRole = memberData.role;
            }
          }
        }

        setRole(memberRole as UserRole);
        setPrivileges(memberPrivileges);
        setAccountType(memberRole.toLowerCase() === 'owner' ? 'owner' : 'collaborator');
        setIsOwner(memberRole.toLowerCase() === 'owner');
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setRole('sales');
        setPrivileges([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, effectiveOrgId]);


  const permissions = useMemo(() => {
    const isAdmin = role?.toLowerCase() === 'owner' || role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'qfy-admin';
    const hasPrivilege = (p: string) => isAdmin || privileges.includes(p);
    // Finance access is ALWAYS explicit — never inherited from admin role
    const hasFinanceAccess = privileges.includes('finance');

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
      canSeeFinance: hasFinanceAccess, // EXPLICIT only

      // Dashboard visibility
      canAddClient: hasPrivilege('sales'),

      // Client profile actions
      canEditClient: hasPrivilege('sales'),
      canSeeContracts: hasPrivilege('sales') || hasPrivilege('link23'),
      canSuspendClient: isAdmin,

      // Finance module actions — ALWAYS require explicit finance privilege
      canManageFinance: hasFinanceAccess,
      canViewFinance: hasFinanceAccess,
      canDeleteFinanceRecords: hasFinanceAccess && isAdmin,

      // Get stages visible to user for recent clients
      getVisibleStages: () => {
        if (isAdmin) return null; // null means all stages
        if (hasPrivilege('sales')) return SALES_STAGES;
        if (hasPrivilege('designer')) return OPERATIONS_STAGES;
        return [];
      },
    };
  }, [role, privileges, isOwner]);

  return {
    role,
    loading,
    isAdmin: role?.toLowerCase() === 'owner' || role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'qfy-admin',
    isOwner: role?.toLowerCase() === 'owner' || role?.toLowerCase() === 'qfy-admin',
    accountType,
    isSales: role === 'sales',
    isOperations: role === 'operations',
    isCampaigns: role === 'campaign_management',
    ...permissions,
  };
}
