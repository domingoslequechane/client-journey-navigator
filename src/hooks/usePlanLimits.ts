import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Stages that count towards client limits (operational stages)
// Sales funnel stages (prospeccao, reuniao, contratacao) are unlimited
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
  canExportData: boolean;
  hasFinanceModule: boolean;
  hasStudioModule: boolean;
  hasLinktreeModule: boolean;
  hasEditorialModule: boolean;
  hasSocialModule: boolean;
  hasSocialInbox: boolean;
}

interface Usage {
  clientsCount: number;
  contractsThisMonth: number;
  aiMessagesThisMonth: number;
  teamMembersCount: number;
  contractTemplatesCount: number;
  studioGenerationsThisMonth: number;
  studioGenerationsToday: number;
  socialAccountsCount: number;
  socialPostsThisMonth: number;
  linkPagesCount: number;
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
  canAccessFinance: boolean;
  canAccessStudio: boolean;
  canAccessLinkTree: boolean;
  canAccessEditorial: boolean;
  canAccessSocialMedia: boolean;
  canAccessSocialInbox: boolean;
  canAddSocialAccount: boolean;
  canPublishSocialPost: boolean;
  canAddLinkPage: boolean;
  canGenerateFlyer: boolean;
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

// Default limits (fallback)
const DEFAULT_LIMITS: PlanLimits = {
  maxClients: 3,
  maxContractsPerMonth: 3,
  maxAIMessagesPerMonth: 90,
  maxTeamMembers: 1,
  maxContractTemplates: 1,
  maxStudioGenerations: 10,
  dailyStudioLimit: 5,
  maxSocialAccounts: 0,
  maxSocialPostsPerMonth: 0,
  maxLinkPages: 0,
  canExportData: false,
  hasFinanceModule: false,
  hasStudioModule: false,
  hasLinktreeModule: false,
  hasEditorialModule: false,
  hasSocialModule: false,
  hasSocialInbox: false,
};

const DEFAULT_USAGE: Usage = {
  clientsCount: 0,
  contractsThisMonth: 0,
  aiMessagesThisMonth: 0,
  teamMembersCount: 0,
  contractTemplatesCount: 0,
  studioGenerationsThisMonth: 0,
  studioGenerationsToday: 0,
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

      // Define daily limits based on plan (from edge function)
      const dailyLimits: Record<string, number> = {
        'free': 5,
        'starter': 15,
        'pro': 30,
        'agency': 60
      };
      const dailyStudioLimit = dailyLimits[currentPlanType] || 5;

      const { data: planLimitsData } = await supabase
        .from('plan_limits')
        .select('*')
        .eq('plan_type', currentPlanType)
        .single();

      if (planLimitsData) {
        const d = planLimitsData as any;
        setLimits({
          maxClients: d.max_clients,
          maxContractsPerMonth: d.max_contracts_per_month,
          maxAIMessagesPerMonth: d.max_ai_messages_per_month,
          maxTeamMembers: d.max_team_members,
          maxContractTemplates: d.max_contract_templates ?? 1,
          maxStudioGenerations: d.max_studio_generations ?? 10,
          dailyStudioLimit,
          maxSocialAccounts: d.max_social_accounts ?? 0,
          maxSocialPostsPerMonth: d.max_social_posts_per_month ?? 0,
          maxLinkPages: d.max_link_pages ?? 0,
          canExportData: d.can_export_data ?? false,
          hasFinanceModule: d.has_finance_module ?? false,
          hasStudioModule: d.has_studio_module ?? false,
          hasLinktreeModule: d.has_linktree_module ?? false,
          hasEditorialModule: d.has_editorial_module ?? false,
          hasSocialModule: d.has_social_module ?? false,
          hasSocialInbox: d.has_social_inbox ?? false,
        });
      }

      // Get current usage counts
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const todayStart = new Date().toISOString().split('T')[0];

      const [
        clientsResult, teamResult, contractsUsage, aiUsage,
        templatesResult, studioUsage, socialAccountsResult,
        socialPostsUsage, linkPagesResult, studioDailyUsageResult,
      ] = await Promise.all([
        supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .in('current_stage', OPERATIONAL_STAGES),
        supabase
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('is_active', true),
        supabase
          .from('usage_tracking')
          .select('usage_count')
          .eq('organization_id', orgId)
          .eq('feature_type', 'contracts')
          .gte('period_start', monthStart)
          .maybeSingle(),
        supabase
          .from('usage_tracking')
          .select('usage_count')
          .eq('organization_id', orgId)
          .eq('feature_type', 'ai_messages')
          .gte('period_start', monthStart)
          .maybeSingle(),
        supabase
          .from('contract_templates')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId),
        supabase
          .from('usage_tracking')
          .select('usage_count')
          .eq('organization_id', orgId)
          .eq('feature_type', 'studio_generations')
          .gte('period_start', monthStart)
          .maybeSingle(),
        supabase
          .from('social_accounts')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId),
        supabase
          .from('usage_tracking')
          .select('usage_count')
          .eq('organization_id', orgId)
          .eq('feature_type', 'social_posts')
          .gte('period_start', monthStart)
          .maybeSingle(),
        supabase
          .from('link_pages')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId),
        supabase
          .from('studio_flyers')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', user.id)
          .gte('created_at', todayStart),
      ]);

      setUsage({
        clientsCount: clientsResult.count || 0,
        teamMembersCount: teamResult.count || 0,
        contractsThisMonth: contractsUsage.data?.usage_count || 0,
        aiMessagesThisMonth: aiUsage.data?.usage_count || 0,
        contractTemplatesCount: templatesResult.count || 0,
        studioGenerationsThisMonth: studioUsage.data?.usage_count || 0,
        studioGenerationsToday: studioDailyUsageResult.count || 0,
        socialAccountsCount: socialAccountsResult.count || 0,
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

      setUsage(prev => ({
        ...prev,
        [fieldMap[featureType]]: data,
      }));
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }, [organizationId]);

  // Helper for remaining calculation
  const remaining = (max: number | null, current: number) =>
    max !== null ? Math.max(0, max - current) : null;

  const remainingClients = remaining(limits.maxClients, usage.clientsCount);
  const remainingContracts = remaining(limits.maxContractsPerMonth, usage.contractsThisMonth);
  const remainingAIMessages = remaining(limits.maxAIMessagesPerMonth, usage.aiMessagesThisMonth);
  const remainingTeamMembers = remaining(limits.maxTeamMembers, usage.teamMembersCount);
  const remainingContractTemplates = remaining(limits.maxContractTemplates, usage.contractTemplatesCount);
  const remainingSocialAccounts = remaining(limits.maxSocialAccounts, usage.socialAccountsCount);
  const remainingSocialPosts = remaining(limits.maxSocialPostsPerMonth, usage.socialPostsThisMonth);
  const remainingLinkPages = remaining(limits.maxLinkPages, usage.linkPagesCount);
  const remainingStudioGenerations = remaining(limits.maxStudioGenerations, usage.studioGenerationsThisMonth);

  // Permissions
  const canUnlimited = (max: number | null, current: number) =>
    max === null || current < max;

  const canAddClient = canUnlimited(limits.maxClients, usage.clientsCount);
  const canGenerateContract = canUnlimited(limits.maxContractsPerMonth, usage.contractsThisMonth);
  const canAccessAI = limits.maxAIMessagesPerMonth === null ||
    (limits.maxAIMessagesPerMonth > 0 && usage.aiMessagesThisMonth < limits.maxAIMessagesPerMonth);
  const canInviteTeamMember = canUnlimited(limits.maxTeamMembers, usage.teamMembersCount);
  const canAddContractTemplate = canUnlimited(limits.maxContractTemplates, usage.contractTemplatesCount);

  // Module access
  const canAccessFinance = limits.hasFinanceModule;
  const canAccessStudio = limits.hasStudioModule;
  const canAccessLinkTree = limits.hasLinktreeModule;
  const canAccessEditorial = limits.hasEditorialModule;
  const canAccessSocialMedia = limits.hasSocialModule;
  const canAccessSocialInbox = limits.hasSocialInbox;

  // Granular limits
  const canAddSocialAccount = limits.hasSocialModule && canUnlimited(limits.maxSocialAccounts, usage.socialAccountsCount);
  const canPublishSocialPost = limits.hasSocialModule && canUnlimited(limits.maxSocialPostsPerMonth, usage.socialPostsThisMonth);
  const canAddLinkPage = limits.hasLinktreeModule && canUnlimited(limits.maxLinkPages, usage.linkPagesCount);
  const canGenerateFlyer = limits.hasStudioModule && canUnlimited(limits.maxStudioGenerations, usage.studioGenerationsThisMonth);

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
    canAccessFinance,
    canAccessStudio,
    canAccessLinkTree,
    canAccessEditorial,
    canAccessSocialMedia,
    canAccessSocialInbox,
    canAddSocialAccount,
    canPublishSocialPost,
    canAddLinkPage,
    canGenerateFlyer,
    remainingClients,
    remainingContracts,
    remainingAIMessages,
    remainingTeamMembers,
    remainingContractTemplates,
    remainingSocialAccounts,
    remainingSocialPosts,
    remainingLinkPages,
    remainingStudioGenerations,
    incrementUsage,
    refetch: fetchData,
  };
}
