import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PlanType = 'free' | 'starter' | 'pro' | 'agency';

interface PlanLimits {
  maxClients: number | null;
  maxContractsPerMonth: number | null;
  maxAIMessagesPerMonth: number | null;
  maxTeamMembers: number | null;
  maxContractTemplates: number | null;
  canExportData: boolean;
}

interface Usage {
  clientsCount: number;
  contractsThisMonth: number;
  aiMessagesThisMonth: number;
  teamMembersCount: number;
  contractTemplatesCount: number;
}

interface UsePlanLimitsReturn {
  loading: boolean;
  planType: PlanType;
  limits: PlanLimits;
  usage: Usage;
  canAddClient: boolean;
  canGenerateContract: boolean;
  canAccessAI: boolean;
  canInviteTeamMember: boolean;
  canExportData: boolean;
  canAddContractTemplate: boolean;
  remainingClients: number | null;
  remainingContracts: number | null;
  remainingAIMessages: number | null;
  remainingTeamMembers: number | null;
  remainingContractTemplates: number | null;
  incrementUsage: (featureType: 'contracts' | 'ai_messages') => Promise<void>;
  refetch: () => Promise<void>;
}

// Default limits for the Bússola plan ($2/month with 50% discount)
const DEFAULT_LIMITS: PlanLimits = {
  maxClients: 6,
  maxContractsPerMonth: 6,
  maxAIMessagesPerMonth: 150,
  maxTeamMembers: 2,
  maxContractTemplates: 1,
  canExportData: false,
};

export function usePlanLimits(): UsePlanLimitsReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState<PlanType>('free');
  const [limits, setLimits] = useState<PlanLimits>(DEFAULT_LIMITS);
  const [usage, setUsage] = useState<Usage>({
    clientsCount: 0,
    contractsThisMonth: 0,
    aiMessagesThisMonth: 0,
    teamMembersCount: 0,
    contractTemplatesCount: 0,
  });
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get user's organization and plan type (prefer current_organization_id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, current_organization_id')
        .eq('id', user.id)
        .single();

      const orgId = profile?.current_organization_id || profile?.organization_id;

      if (!orgId) {
        setLoading(false);
        return;
      }

      setOrganizationId(orgId);

      // Get organization with plan_type
      const { data: organization } = await supabase
        .from('organizations')
        .select('plan_type')
        .eq('id', orgId)
        .single();

      const currentPlanType = (organization?.plan_type as PlanType) || 'free';
      setPlanType(currentPlanType);

      // Get plan limits
      const { data: planLimitsData } = await supabase
        .from('plan_limits')
        .select('*')
        .eq('plan_type', currentPlanType)
        .single();

      if (planLimitsData) {
        setLimits({
          maxClients: planLimitsData.max_clients,
          maxContractsPerMonth: planLimitsData.max_contracts_per_month,
          maxAIMessagesPerMonth: planLimitsData.max_ai_messages_per_month,
          maxTeamMembers: planLimitsData.max_team_members,
          maxContractTemplates: (planLimitsData as any).max_contract_templates ?? 1,
          canExportData: (planLimitsData as any).can_export_data ?? false,
        });
      }

      // Get current usage counts
      const [clientsResult, teamResult, contractsUsage, aiUsage, templatesResult] = await Promise.all([
        // Count clients
        supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId),
        // Count active team members from organization_members
        supabase
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('is_active', true),
        // Get contracts usage this month
        supabase
          .from('usage_tracking')
          .select('usage_count')
          .eq('organization_id', orgId)
          .eq('feature_type', 'contracts')
          .gte('period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
          .maybeSingle(),
        // Get AI messages usage this month
        supabase
          .from('usage_tracking')
          .select('usage_count')
          .eq('organization_id', orgId)
          .eq('feature_type', 'ai_messages')
          .gte('period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
          .maybeSingle(),
        // Count contract templates
        supabase
          .from('contract_templates')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId),
      ]);

      setUsage({
        clientsCount: clientsResult.count || 0,
        teamMembersCount: teamResult.count || 0,
        contractsThisMonth: contractsUsage.data?.usage_count || 0,
        aiMessagesThisMonth: aiUsage.data?.usage_count || 0,
        contractTemplatesCount: templatesResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching plan limits:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const incrementUsage = useCallback(async (featureType: 'contracts' | 'ai_messages') => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase.rpc('increment_usage', {
        p_organization_id: organizationId,
        p_feature_type: featureType,
      });

      if (error) throw error;

      // Update local state
      setUsage(prev => ({
        ...prev,
        [featureType === 'contracts' ? 'contractsThisMonth' : 'aiMessagesThisMonth']: data,
      }));
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }, [organizationId]);

  // Calculate remaining limits
  const remainingClients = limits.maxClients !== null 
    ? Math.max(0, limits.maxClients - usage.clientsCount)
    : null;
    
  const remainingContracts = limits.maxContractsPerMonth !== null
    ? Math.max(0, limits.maxContractsPerMonth - usage.contractsThisMonth)
    : null;
    
  const remainingAIMessages = limits.maxAIMessagesPerMonth !== null
    ? Math.max(0, limits.maxAIMessagesPerMonth - usage.aiMessagesThisMonth)
    : null;
    
  const remainingTeamMembers = limits.maxTeamMembers !== null
    ? Math.max(0, limits.maxTeamMembers - usage.teamMembersCount)
    : null;

  const remainingContractTemplates = limits.maxContractTemplates !== null
    ? Math.max(0, limits.maxContractTemplates - usage.contractTemplatesCount)
    : null;

  // Calculate permissions
  const canAddClient = limits.maxClients === null || usage.clientsCount < limits.maxClients;
  
  const canGenerateContract = limits.maxContractsPerMonth === null || 
    usage.contractsThisMonth < limits.maxContractsPerMonth;
    
  const canAccessAI = limits.maxAIMessagesPerMonth === null || 
    (limits.maxAIMessagesPerMonth > 0 && usage.aiMessagesThisMonth < limits.maxAIMessagesPerMonth);
    
  const canInviteTeamMember = limits.maxTeamMembers === null || 
    usage.teamMembersCount < limits.maxTeamMembers;

  const canAddContractTemplate = limits.maxContractTemplates === null ||
    usage.contractTemplatesCount < limits.maxContractTemplates;

  return {
    loading,
    planType,
    limits,
    usage,
    canAddClient,
    canGenerateContract,
    canAccessAI,
    canInviteTeamMember,
    canExportData: limits.canExportData,
    canAddContractTemplate,
    remainingClients,
    remainingContracts,
    remainingAIMessages,
    remainingTeamMembers,
    remainingContractTemplates,
    incrementUsage,
    refetch: fetchData,
  };
}
