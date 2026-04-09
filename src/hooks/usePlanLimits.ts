import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Stages that count towards client limits (operational stages)
const OPERATIONAL_STAGES = ['producao', 'trafego', 'retencao', 'fidelizacao'] as const;

export type PlanType = 'starter' | 'pro' | 'agency' | 'free' | 'trial' | null;

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
  has_atende_ai_module: boolean;
  maxStudioFlyer: number | null;
  maxStudioCarousel: number | null;
  maxStudioRecolor: number | null;
  maxStudioProductBeauty: number | null;
  maxStudioProductScene: number | null;
  maxEditorialClients: number | null;
  maxSocialClients: number | null;
  maxAiAgents: number | null;
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
  editorialClientsCount: number;
  socialClientsCount: number;
  studioFlyerCount: number;
  studioCarouselCount: number;
  studioRecolorCount: number;
  studioProductBeautyCount: number;
  studioProductSceneCount: number;
  aiAgentsCount: number;
  editorialClientIds: string[];
  socialClientIds: string[];
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
  has_finance_module: false,
  has_studio_module: false,
  has_linktree_module: false,
  has_editorial_module: false,
  has_social_module: false,
  has_social_inbox: false,
  has_atende_ai_module: true,
  maxStudioFlyer: 5,
  maxStudioCarousel: 5,
  maxStudioRecolor: 5,
  maxStudioProductBeauty: 5,
  maxStudioProductScene: 5,
  maxEditorialClients: 2,
  maxSocialClients: 2,
  maxAiAgents: 2,
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
  editorialClientsCount: 0,
  socialClientsCount: 0,
  studioFlyerCount: 0,
  studioCarouselCount: 0,
  studioRecolorCount: 0,
  studioProductBeautyCount: 0,
  studioProductSceneCount: 0,
  aiAgentsCount: 0,
  editorialClientIds: [],
  socialClientIds: [],
};

export function usePlanLimits(): UsePlanLimitsReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState<PlanType>('free');
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

      const currentPlanType = (organization?.plan_type as PlanType) || null;
      setPlanType(currentPlanType);

      // Force trial to be restricted if not already
      const isPaid = ['starter', 'pro', 'agency'].includes(currentPlanType as string);

      const socialAccountLimits: Record<string, number> = {
        'starter': 5,
        'pro': 15,
        'agency': 30
      };

      const clientLimits: Record<string, number> = {
        'starter': 5,
        'pro': 15,
        'agency': 30
      };

      const dailyStudioLimits: Record<string, number> = {
        'starter': 5,
        'pro': 15,
        'agency': 30
      };

      const getLimitValue = (map: Record<string, number>, type: PlanType) => 
        (type && isPaid) ? map[type as string] : 0;

      const { data: plan_limits, error: limitsError } = await supabase
        .from('plan_limits')
        .select(`
          max_clients, 
          max_social_accounts, 
          max_contracts_per_month, 
          max_ai_messages_per_month,
          max_team_members,
          max_contract_templates,
          max_studio_generations,
          max_social_posts_per_month,
          max_link_pages,
          can_export_data,
          has_finance_module,
          has_studio_module,
          has_linktree_module,
          has_editorial_module,
          has_social_module,
          has_social_inbox,
          max_editorial_clients,
          max_social_clients,
          max_ai_agents,
          max_studio_flyer,
          max_studio_carousel,
          max_studio_recolor,
          max_studio_product_beauty,
          max_studio_product_scene
        `)
        .eq('plan_type', currentPlanType)
        .maybeSingle();
      
      if (plan_limits) {
        const d = plan_limits as any;
        setLimits({
          // Use DB value if present, otherwise use restrictive fallback
          maxClients: d.max_clients ?? getLimitValue(clientLimits, currentPlanType),
          maxSocialAccounts: d.max_social_accounts ?? getLimitValue(socialAccountLimits, currentPlanType),
          maxContractsPerMonth: d.max_contracts_per_month,
          maxAIMessagesPerMonth: d.max_ai_messages_per_month,
          maxTeamMembers: d.max_team_members,
          maxContractTemplates: d.max_contract_templates,
          maxStudioGenerations: d.max_studio_generations,
          dailyStudioLimit: getLimitValue(dailyStudioLimits, currentPlanType),
          maxSocialPostsPerMonth: d.max_social_posts_per_month,
          maxLinkPages: d.max_link_pages,
          can_export_data: d.can_export_data ?? false,
          has_finance_module: d.has_finance_module ?? false,
          has_studio_module: d.has_studio_module ?? false,
          has_linktree_module: d.has_linktree_module ?? false,
          has_editorial_module: d.has_editorial_module ?? false,
          has_social_module: d.has_social_module ?? false,
          has_social_inbox: d.has_social_inbox ?? false,
          has_atende_ai_module: d.has_atende_ai_module ?? true,
          maxStudioFlyer: d.max_studio_flyer ?? (isPaid ? null : 5),
          maxStudioCarousel: d.max_studio_carousel ?? (isPaid ? null : 5),
          maxStudioRecolor: d.max_studio_recolor ?? (isPaid ? null : 5),
          maxStudioProductBeauty: d.max_studio_product_beauty ?? (isPaid ? null : 5),
          maxStudioProductScene: d.max_studio_product_scene ?? (isPaid ? null : 5),
          maxEditorialClients: d.max_editorial_clients ?? (isPaid ? null : 2),
          maxSocialClients: d.max_social_clients ?? (isPaid ? null : 2),
          maxAiAgents: d.max_ai_agents ?? (isPaid ? null : 2),
        });
      } else {
        // Fallback for NULL or undefined plan
        setLimits({
          ...DEFAULT_LIMITS,
          maxClients: getLimitValue(clientLimits, currentPlanType),
          maxSocialAccounts: getLimitValue(socialAccountLimits, currentPlanType),
          dailyStudioLimit: getLimitValue(dailyStudioLimits, currentPlanType),
          can_export_data: isPaid,
        });
      }

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const todayStart = new Date().toISOString().split('T')[0];

      const [
        clientsResult, teamResult, contractsUsage, aiUsage,
        templatesResult, studioUsage, socialAccountsResult,
        socialPostsUsage, linkPagesResult,
        editorialClientsResult, socialClientsResult,
        studioFlyerUsage, studioCarouselUsage, studioRecolorUsage,
        studioProductBeautyUsage, studioProductSceneUsage,
        aiAgentsResult,
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
        supabase.from('editorial_tasks').select('client_id').eq('organization_id', orgId).gte('scheduled_date', monthStart),
        supabase.from('social_posts').select('client_id').eq('organization_id', orgId).gte('scheduled_at', monthStart),
        supabase.from('usage_tracking').select('usage_count').eq('organization_id', orgId).eq('feature_type', 'studio_flyer').gte('period_start', monthStart).maybeSingle(),
        supabase.from('usage_tracking').select('usage_count').eq('organization_id', orgId).eq('feature_type', 'studio_carousel').gte('period_start', monthStart).maybeSingle(),
        supabase.from('usage_tracking').select('usage_count').eq('organization_id', orgId).eq('feature_type', 'studio_recolor').gte('period_start', monthStart).maybeSingle(),
        supabase.from('usage_tracking').select('usage_count').eq('organization_id', orgId).eq('feature_type', 'studio_product_beauty').gte('period_start', monthStart).maybeSingle(),
        supabase.from('usage_tracking').select('usage_count').eq('organization_id', orgId).eq('feature_type', 'studio_product_scene').gte('period_start', monthStart).maybeSingle(),
        supabase.from('ai_agents').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      ]);

      const editorialClients = new Set(editorialClientsResult.data?.map(t => t.client_id)).size;
      const socialClients = new Set(socialClientsResult.data?.map(p => p.client_id)).size;
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
        editorialClientsCount: editorialClients,
        socialClientsCount: socialClients,
        studioFlyerCount: studioFlyerUsage?.data?.usage_count || 0,
        studioCarouselCount: studioCarouselUsage?.data?.usage_count || 0,
        studioRecolorCount: studioRecolorUsage?.data?.usage_count || 0,
        studioProductBeautyCount: studioProductBeautyUsage?.data?.usage_count || 0,
        studioProductSceneCount: studioProductSceneUsage?.data?.usage_count || 0,
        aiAgentsCount: aiAgentsResult.count || 0,
        editorialClientIds: Array.from(new Set(editorialClientsResult.data?.map(t => t.client_id) || [])),
        socialClientIds: Array.from(new Set(socialClientsResult.data?.map(p => p.client_id) || [])),
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

  const incrementUsage = useCallback(async (featureType: 'contracts' | 'ai_messages' | 'studio_generations' | 'social_posts' | 'studio_flyer' | 'studio_carousel' | 'studio_recolor' | 'studio_product_beauty' | 'studio_product_scene') => {
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
        studio_flyer: 'studioFlyerCount',
        studio_carousel: 'studioCarouselCount',
        studio_recolor: 'studioRecolorCount',
        studio_product_beauty: 'studioProductBeautyCount',
        studio_product_scene: 'studioProductSceneCount',
      };
      setUsage(prev => ({ ...prev, [fieldMap[featureType]]: data }));
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }, [organizationId]);

  const remaining = (max: number | null, current: number) => max !== null ? Math.max(0, max - current) : null;

  const canUnlimited = (max: number | null, current: number) => max === null || current < max;
  
  const isPaid = planType && ['starter', 'pro', 'agency'].includes(planType as string);

  // Studio limits with explicit trial fallbacks to ensure UI consistency
  const studioLimits = {
    maxStudioFlyer: limits.maxStudioFlyer ?? (planType === 'trial' ? 5 : (isPaid ? null : 5)),
    maxStudioCarousel: limits.maxStudioCarousel ?? (planType === 'trial' ? 5 : (isPaid ? null : 5)),
    maxStudioRecolor: limits.maxStudioRecolor ?? (planType === 'trial' ? 5 : (isPaid ? null : 5)),
    maxStudioProductBeauty: limits.maxStudioProductBeauty ?? (planType === 'trial' ? 5 : (isPaid ? null : 5)),
    maxStudioProductScene: limits.maxStudioProductScene ?? (planType === 'trial' ? 5 : (isPaid ? null : 5)),
  };

  const result = {
    loading,
    planType,
    limits: {
      ...limits,
      ...studioLimits
    },
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
    canAccessAtendeAI: limits.has_atende_ai_module,
    canInviteTeamMember: canUnlimited(limits.maxTeamMembers, usage.teamMembersCount),
    canExportData: limits.can_export_data,
    canAddContractTemplate: canUnlimited(limits.maxContractTemplates, usage.contractTemplatesCount),
    canAddSocialAccount: canUnlimited(limits.maxSocialAccounts, usage.socialAccountsCount),
    canAddAiAgent: canUnlimited(limits.maxAiAgents, usage.aiAgentsCount),
    canPublishSocialPost: canUnlimited(limits.maxSocialPostsPerMonth, usage.socialPostsThisMonth),
    canAddLinkPage: canUnlimited(limits.maxLinkPages, usage.linkPagesCount),
    canAccessEditorialForNewClient: !['free', 'trial'].includes(planType as string) || usage.editorialClientsCount < (limits.maxEditorialClients ?? 2),
    canAccessSocialForNewClient: !['free', 'trial'].includes(planType as string) || usage.socialClientsCount < (limits.maxSocialClients ?? 2),
    canGenerateStudioFlyer: !isPaid || (studioLimits.maxStudioFlyer !== null && usage.studioFlyerCount < studioLimits.maxStudioFlyer),
    canGenerateStudioCarousel: !isPaid || (studioLimits.maxStudioCarousel !== null && usage.studioCarouselCount < studioLimits.maxStudioCarousel),
    canGenerateStudioRecolor: !isPaid || (studioLimits.maxStudioRecolor !== null && usage.studioRecolorCount < studioLimits.maxStudioRecolor),
    canGenerateStudioProductBeauty: !isPaid || (studioLimits.maxStudioProductBeauty !== null && usage.studioProductBeautyCount < studioLimits.maxStudioProductBeauty),
    canGenerateStudioProductScene: !isPaid || (studioLimits.maxStudioProductScene !== null && usage.studioProductSceneCount < studioLimits.maxStudioProductScene),
    editorialClientIds: usage.editorialClientIds,
    socialClientIds: usage.socialClientIds,
    remainingClients: remaining(limits.maxClients, usage.clientsCount),
    remainingContracts: remaining(limits.maxContractsPerMonth, usage.contractsThisMonth),
    remainingAIMessages: remaining(limits.maxAIMessagesPerMonth, usage.aiMessagesThisMonth),
    remainingTeamMembers: remaining(limits.maxTeamMembers, usage.teamMembersCount),
    remainingContractTemplates: remaining(limits.maxContractTemplates, usage.contractTemplatesCount),
    remainingSocialAccounts: remaining(limits.maxSocialAccounts, usage.socialAccountsCount),
    remainingSocialPosts: remaining(limits.maxSocialPostsPerMonth, usage.socialPostsThisMonth),
    remainingLinkPages: remaining(limits.maxLinkPages, usage.linkPagesCount),
    remainingStudioGenerations: remaining(limits.maxStudioGenerations, usage.studioGenerationsThisMonth),
    remainingStudioFlyer: remaining(limits.maxStudioFlyer, usage.studioFlyerCount),
    remainingStudioCarousel: remaining(limits.maxStudioCarousel, usage.studioCarouselCount),
    remainingStudioRecolor: remaining(limits.maxStudioRecolor, usage.studioRecolorCount),
    remainingStudioProductBeauty: remaining(limits.maxStudioProductBeauty, usage.studioProductBeautyCount),
    remainingStudioProductScene: remaining(limits.maxStudioProductScene, usage.studioProductSceneCount),
    incrementUsage,
    refetch: fetchData,
  };

  return result as UsePlanLimitsReturn;
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
  canAccessAtendeAI: boolean;
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
  remainingStudioFlyer: number | null;
  remainingStudioCarousel: number | null;
  remainingStudioRecolor: number | null;
  remainingStudioProductBeauty: number | null;
  remainingStudioProductScene: number | null;
  canAccessEditorialForNewClient: boolean;
  canAccessSocialForNewClient: boolean;
  canGenerateStudioFlyer: boolean;
  canGenerateStudioCarousel: boolean;
  canGenerateStudioRecolor: boolean;
  canGenerateStudioProductBeauty: boolean;
  canGenerateStudioProductScene: boolean;
  canAddAiAgent: boolean;
  editorialClientIds: string[];
  socialClientIds: string[];
  incrementUsage: (featureType: 'contracts' | 'ai_messages' | 'studio_generations' | 'social_posts' | 'studio_flyer' | 'studio_carousel' | 'studio_recolor' | 'studio_product_beauty' | 'studio_product_scene') => Promise<void>;
  refetch: () => Promise<void>;
}