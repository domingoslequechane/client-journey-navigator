import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Stages that count towards client limits (operational stages)
const OPERATIONAL_STAGES = ['producao', 'trafego', 'retencao', 'fidelizacao'] as const;

export type PlanType = 'free' | 'starter' | 'pro' | 'agency';

interface PlanLimits {
  maxClients: number | null;
  maxContractsPerMonth: number | null;
  maxAIMessagesPerMonth: number | null;
  maxTeamMembers: number | null;
  maxContractTemplates: number | null;
  maxStudioGenerations: number | null;
  dailyStudioLimit: number;
  maxSocialAccounts: number | null;
  maxSocialPostsPerMonth: number | null;
  maxLinkPages: number | null;
  can_export_data: boolean;
  has_finance_module: boolean;
  has_studio_module: boolean;
  has_linktree_module: boolean;
  has_editorial_module: boolean;
  has_social_module: boolean;
  has_social_inbox: boolean;
}

interface Usage {
  clientsCount: number;
  contractsThisMonth: number;
  aiMessagesThisMonth: number;
  teamMembersCount: number;
  contractTemplatesCount: number;
  studioGenerationsThisMonth: number;
  socialAccountsCount: number;
  socialPostsThisMonth: number;
  linkPagesCount: number;
}

const DEFAULT_LIMITS: PlanLimits = {
  maxClients: 5,
  maxContractsPerMonth: 15,
  maxAIMessagesPerMonth: 500,
  maxTeamMembers: 5,
  maxContractTemplates: 3,
  maxStudioGenerations: 150,
  dailyStudioLimit: 5,
  maxSocialAccounts: 5,
  maxSocialPostsPerMonth: 100,
  maxLinkPages: 5,
  can_export_data: true,
  has_finance_module: true,
  has_studio_module: true,
  has_linktree_module: true,
  has_editorial_module: true,
  has_social_module: true,
  has_social_inbox: false,
};

const DEFAULT_USAGE: Usage = {
  clientsCount: 0,
  contractsThisMonth: 0,
  aiMessagesThisMonth: 0,
  teamMembersCount: 0,
  contractTemplatesCount: 0,
  studioGenerationsThisMonth: 0,
  socialAccountsCount: 0,
  socialPostsThisMonth: 0,
  linkPagesCount: 0,
};

export function usePlanLimits(): UsePlanLimitsReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState<PlanType>('starter');
  const [limits, setLimits] = useState<PlanLimits>(DEFAULT_LIMITS);
  const [usage, setUsage] = useState<Usage>(DEFAULT_USAGE);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

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

      const { data: organization } = await supabase
        .from('organizations')
        .select('plan_type')
        .eq('id', orgId)
        .single();

      const currentPlanType = (organization?.plan_type as PlanType) || 'starter';
      setPlanType(currentPlanType);

      // Hardcoded fallbacks for social accounts based on plan
      const socialAccountLimits: Record<string, number> = {
        'free': 3,
        'starter': 5,
        'pro': 15,
        'agency': 30
      };

      const clientLimits: Record<string, number> = {
        'free': 3,
        'starter': 5,
        'pro': 15,
        'agency': 30
      };

      const dailyStudioLimits: Record<string, number> = {
        'free': 5,
        'starter': 5,
        'pro': 15,
        'agency': 30
      };

      const { data: planLimitsData } = await supabase
        .from('plan_limits')
        .select('*')
        .eq('plan_type', currentPlanType)
        .single();

      if (planLimitsData) {
        const d = planLimitsData as any;
        setLimits({
          // Use DB value if present, otherwise use hardcoded fallback
          maxClients: d.max_clients ?? clientLimits[currentPlanType],
          maxSocialAccounts: d.max_social_accounts ?? socialAccountLimits[currentPlanType],
          maxContractsPerMonth: d.max_contracts_per_month,
          maxAIMessagesPerMonth: d.max_ai_messages_per_month,
          maxTeamMembers: d.max_team_members,
          maxContractTemplates: d.max_contract_templates,
          maxStudioGenerations: d.max_studio_generations,
          dailyStudioLimit: dailyStudioLimits[currentPlanType],
          maxSocialPostsPerMonth: d.max_social_posts_per_month,
          maxLinkPages: d.max_link_pages,
          can_export_data: d.can_export_data ?? false,
          has_finance_module: d.has_finance_module ?? false,
          has_studio_module: d.has_studio_module ?? false,
          has_linktree_module: d.has_linktree_module ?? false,
          has_editorial_module: d.has_editorial_module ?? false,
          has_social_module: d.has_social_module ?? false,
          has_social_inbox: d.has_social_inbox ?? false,
        });
      } else {
        // Fallback if no DB record
        setLimits({
          ...DEFAULT_LIMITS,
          maxClients: clientLimits[currentPlanType],
          maxSocialAccounts: socialAccountLimits[currentPlanType],
          dailyStudioLimit: dailyStudioLimits[currentPlanType],
        });
      }

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const todayStart = new Date().toISOString().split('T')[0];

      const [
        clientsResult, teamResult, contractsUsage, aiUsage,
        templatesResult, studioUsage, socialAccountsResult,
        socialPostsUsage, linkPagesResult,
      ] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).in('current_stage', OPERATIONAL_STAGES),
        supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
        supabase.from('usage_tracking').select('usage_count').eq('organization_id', orgId).eq('feature_type', 'contracts').gte('period_start', monthStart).maybeSingle(),
        supabase.from('usage_tracking').select('usage_count').eq('organization_id', orgId).eq('feature_type', 'ai_messages').gte('period_start', monthStart).maybeSingle(),
        supabase.from('contract_templates').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('usage_tracking').select('usage_count').eq('organization_id', orgId).eq('feature_type', 'studio_generations').gte('period_start', monthStart).maybeSingle(),
        supabase.from('social_accounts').select('client_id').eq('organization_id', orgId).eq('is_connected', true).not('client_id', 'is', null),
        supabase.from('usage_tracking').select('usage_count').eq('organization_id', orgId).eq('feature_type', 'social_posts').gte('period_start', monthStart).maybeSingle(),
        supabase.from('link_pages').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      ]);

      const uniqueSocialClientsCount = new Set(socialAccountsResult.data?.map(a => a.client_id)).size;

      setUsage({
        clientsCount: clientsResult.count || 0,
        teamMembersCount: teamResult.count || 0,
        contractsThisMonth: contractsUsage.data?.usage_count || 0,
        aiMessagesThisMonth: aiUsage.data?.usage_count || 0,
        contractTemplatesCount: templatesResult.count || 0,
        studioGenerationsThisMonth: studioUsage.data?.usage_count || 0,
        socialAccountsCount: uniqueSocialClientsCount,
        socialPostsThisMonth: socialPostsUsage.data?.usage_count || 0,
        linkPagesCount: linkPagesResult.count || 0,
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

  const incrementUsage = useCallback(async (featureType: 'contracts' | 'ai_messages' | 'studio_generations' | 'social_posts') => {
    if (!organizationId) return;
    try {
      const { data, error } = await supabase.rpc('increment_usage', {
        p_organization_id: organizationId,
        p_feature_type: featureType,
      });
      if (error) throw error;
      const fieldMap: Record<string, keyof Usage> = {
        contracts: 'contractsThisMonth',
        ai_messages: 'aiMessagesThisMonth',
        studio_generations: 'studioGenerationsThisMonth',
        social_posts: 'socialPostsThisMonth',
      };
      setUsage(prev => ({ ...prev, [fieldMap[featureType]]: data }));
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }, [organizationId]);

  const remaining = (max: number | null, current: number) => max !== null ? Math.max(0, max - current) : null;

  const canUnlimited = (max: number | null, current: number) => max === null || current < max;

  return {
    loading,
    planType,
    limits,
    usage,
    canAddClient: canUnlimited(limits.maxClients, usage.clientsCount),
    canGenerateContract: canUnlimited(limits.maxContractsPerMonth, usage.contractsThisMonth),
    canAccessAI: limits.maxAIMessagesPerMonth === null || usage.aiMessagesThisMonth < limits.maxAIMessagesPerMonth,
    canAccessFinance: limits.has_finance_module,
    canAccessStudio: limits.has_studio_module,
    canAccessLinkTree: limits.has_linktree_module,
    canAccessEditorial: limits.has_editorial_module,
    canAccessSocialMedia: limits.has_social_module,
    canAccessSocialInbox: limits.has_social_inbox,
    canInviteTeamMember: canUnlimited(limits.maxTeamMembers, usage.teamMembersCount),
    canExportData: limits.can_export_data,
    canAddContractTemplate: canUnlimited(limits.maxContractTemplates, usage.contractTemplatesCount),
    canAddSocialAccount: canUnlimited(limits.maxSocialAccounts, usage.socialAccountsCount),
    canPublishSocialPost: canUnlimited(limits.maxSocialPostsPerMonth, usage.socialPostsThisMonth),
    canAddLinkPage: canUnlimited(limits.maxLinkPages, usage.linkPagesCount),
    remainingClients: remaining(limits.maxClients, usage.clientsCount),
    remainingContracts: remaining(limits.maxContractsPerMonth, usage.contractsThisMonth),
    remainingAIMessages: remaining(limits.maxAIMessagesPerMonth, usage.aiMessagesThisMonth),
    remainingTeamMembers: remaining(limits.maxTeamMembers, usage.teamMembersCount),
    remainingContractTemplates: remaining(limits.maxContractTemplates, usage.contractTemplatesCount),
    remainingSocialAccounts: remaining(limits.maxSocialAccounts, usage.socialAccountsCount),
    remainingSocialPosts: remaining(limits.maxSocialPostsPerMonth, usage.socialPostsThisMonth),
    remainingLinkPages: remaining(limits.maxLinkPages, usage.linkPagesCount),
    remainingStudioGenerations: remaining(limits.maxStudioGenerations, usage.studioGenerationsThisMonth),
    incrementUsage,
    refetch: fetchData,
  };
}

export interface UsePlanLimitsReturn {
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
  canAccessFinance: boolean;
  canAccessStudio: boolean;
  canAccessLinkTree: boolean;
  canAccessEditorial: boolean;
  canAccessSocialMedia: boolean;
  canAccessSocialInbox: boolean;
  canAddSocialAccount: boolean;
  canPublishSocialPost: boolean;
  canAddLinkPage: boolean;
  remainingClients: number | null;
  remainingContracts: number | null;
  remainingAIMessages: number | null;
  remainingTeamMembers: number | null;
  remainingContractTemplates: number | null;
  remainingSocialAccounts: number | null;
  remainingSocialPosts: number | null;
  remainingLinkPages: number | null;
  remainingStudioGenerations: number | null;
  incrementUsage: (featureType: 'contracts' | 'ai_messages' | 'studio_generations' | 'social_posts') => Promise<void>;
  refetch: () => Promise<void>;
}