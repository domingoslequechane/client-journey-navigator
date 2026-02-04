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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setRole(data?.role as UserRole || 'sales');
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('sales');
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  const permissions = useMemo(() => {
    const isAdmin = role === 'admin';
    const isSales = role === 'sales';
    const isOperations = role === 'operations';
    const isCampaigns = role === 'campaign_management';

    return {
      // Menu visibility
      canSeeSalesFunnel: isAdmin || isSales,
      canSeeOperationalFlow: isAdmin || isOperations || isCampaigns,
      canSeeClients: isAdmin || isSales,
      canSeeTeam: isAdmin,
      canSeeSettings: true, // All users can see settings, but tabs are restricted
      canSeeSubscription: isAdmin,
      canSeeFinance: isAdmin || isSales, // Finance module access
      
      // Dashboard visibility
      canAddClient: isAdmin || isSales,
      
      // Client profile actions
      canEditClient: isAdmin || isSales,
      canSeeContracts: isAdmin || isSales,
      canSuspendClient: isAdmin,
      
      // Finance module actions
      canManageFinance: isAdmin || isSales, // Full CRUD
      canViewFinance: isAdmin || isSales || isOperations, // Read-only for operations
      canDeleteFinanceRecords: isAdmin, // Only admin can delete
      
      // Get stages visible to user for recent clients
      getVisibleStages: () => {
        if (isAdmin) return null; // null means all stages
        if (isSales) return SALES_STAGES;
        if (isOperations) return OPERATIONS_STAGES;
        if (isCampaigns) return CAMPAIGN_STAGES;
        return [];
      },
    };
  }, [role]);

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
