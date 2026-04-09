import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SALES_FUNNEL_STAGES, OPERATIONAL_FLOW_STAGES, Client } from '@/types';
import { mapDbClientToUiClient } from '@/lib/client-utils';
import { Button } from '@/components/ui/button';
import { Plus, Search, Target, FileCheck, Phone, Cog, Megaphone, Heart, GitBranch, Kanban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { SalesFunnelSkeleton } from '@/components/ui/loading-skeleton';
import { useOrganization } from '@/hooks/useOrganization';
import { useTranslatedLabels } from '@/hooks/useTranslatedLabels';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionRequired } from '@/components/subscription/SubscriptionRequired';
import { formatPhoneNumber } from '@/lib/phone-utils';
import { FreeLimitModal } from '@/components/subscription/FreeLimitModal';
import { useState } from 'react';


const salesStageIcons: Record<string, typeof Search> = { prospecting: Search, qualification: Target, closing: FileCheck };
const operationalStageIcons: Record<string, typeof Cog> = { production: Cog, campaigns: Megaphone, retention: Target, loyalty: Heart };

export default function Pipeline() {
  const { t } = useTranslation('pipeline');
  const { t: tCommon } = useTranslation('common');
  const { getTemperatureLabel, getSourceLabel, getStageLabel } = useTranslatedLabels();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currencySymbol, organizationId } = useOrganization();
  const { user } = useAuth();
  const { hasActiveSubscription, loading: subLoading } = useSubscription();
  const { hasPrivilege } = usePermissions();
  const { limits, usage, planType } = usePlanLimits();
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Determine available tabs based on role
  const availableTabs = useMemo(() => {
    const tabs: { id: string; label: string }[] = [];
    if (hasPrivilege('sales')) {
      tabs.push({ id: 'sales', label: t('title') });
    }
    if (hasPrivilege('designer')) {
      tabs.push({ id: 'operations', label: t('operationalFlow.title') });
    }
    return tabs;
  }, [hasPrivilege, t]);

  // Default tab based on role
  const defaultTab = hasPrivilege('sales') ? 'sales' : 'operations';
  const currentTab = searchParams.get('tab') || defaultTab;

  // Determine which stages to show
  const stages = currentTab === 'sales' ? SALES_FUNNEL_STAGES : OPERATIONAL_FLOW_STAGES;
  const stageDbValues = currentTab === 'sales'
    ? ['prospeccao', 'reuniao', 'contratacao'] as const
    : ['producao', 'trafego', 'retencao', 'fidelizacao'] as const;

  // Fetch clients from Supabase
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['pipeline-clients', user?.id, currentTab, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .in('current_stage', stageDbValues)
        .order('updated_at', { ascending: false });

      if (clientsError) throw clientsError;

      const clientIds = clientsData?.map(c => c.id) || [];
      const { data: checklistItems, error: checklistError } = await supabase
        .from('checklist_items')
        .select('*')
        .in('client_id', clientIds);

      if (checklistError) throw checklistError;

      return (clientsData || []).map(dbClient => {
        const clientChecklist = checklistItems?.filter(item => item.client_id === dbClient.id) || [];
        return mapDbClientToUiClient(dbClient, clientChecklist);
      });
    },
    enabled: !!user?.id && !!organizationId
  });

  const getClientsByStage = (stageId: string) => clients.filter(client => client.stage === stageId);

  const handleClientClick = (clientId: string) => {
    navigate(`/app/clients/${clientId}`);
  };

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  if (isLoading || subLoading) {
    return <SalesFunnelSkeleton />;
  }

  if (!hasActiveSubscription) {
    return <SubscriptionRequired feature={t('title')} />;
  }

  const stageIcons = currentTab === 'sales' ? salesStageIcons : operationalStageIcons;

  return (
    <div className="p-4 md:p-8 h-full flex flex-col">
      <AnimatedContainer animation="fade-up" delay={0} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="hidden md:block">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 flex-wrap">
            <Kanban className="h-7 w-7 md:h-8 md:w-8 text-primary" />
            {tCommon('navigation.pipeline')}
            {limits.maxClients !== null && (
              <Badge variant="outline" className="font-mono">
                {t('stats.activeClients')}: {usage.clientsCount}/{limits.maxClients}
              </Badge>
            )}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {currentTab === 'sales' ? t('subtitle') : t('operationalFlow.subtitle')}
          </p>
        </div>
        {hasPrivilege('sales') && (
          <div className="w-full sm:w-auto">
            {['free', 'trial'].includes(planType as string) && usage.clientsCount >= (limits.maxClients ?? 2) ? (
              <Button 
                className="gap-2 w-full sm:w-auto" 
                onClick={() => setShowLimitModal(true)}
              >
                <Plus className="h-4 w-4" />
                {t('actions.newClient')}
              </Button>
            ) : (
              <Link to="/app/new-client">
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  {t('actions.newClient')}
                </Button>
              </Link>
            )}
          </div>
        )}
      </AnimatedContainer>

      <FreeLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        limitDescription="2 clientes no Pipeline"
      />

      {/* Tabs - only show if user has access to both flows */}
      {availableTabs.length > 1 && (
        <AnimatedContainer animation="fade-up" delay={0.05} className="mb-6">
          <Tabs value={currentTab} onValueChange={handleTabChange}>
            <TabsList>
              {availableTabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </AnimatedContainer>
      )}

      <div className="flex-1 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-3 md:gap-4 pb-4 min-w-max">
          {stages.map((stage, stageIndex) => {
            const stageClients = getClientsByStage(stage.id);
            const StageIcon = stageIcons[stage.id as keyof typeof stageIcons];
            return (
              <AnimatedContainer
                key={stage.id}
                animation="fade-up"
                delay={0.1 + (stageIndex * 0.1)}
                className="w-72 md:w-80 flex flex-col"
              >
                <div className={cn('p-4 rounded-t-xl border-t-4', stage.color, stage.borderColor)}>
                  <div className="flex items-center gap-2 mb-1">
                    {StageIcon ? <StageIcon className="h-5 w-5" /> : null}
                    <h3 className="font-semibold">{getStageLabel(stage.id)}</h3>
                    <Badge variant="secondary" className="ml-auto">{stageClients.length}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{t(`stageDescriptions.${stage.id}`)}</p>
                </div>

                <div className="flex-1 bg-muted/20 backdrop-blur-sm rounded-b-xl p-3 space-y-3 min-h-[400px] border border-t-0 border-border/30">
                  {stageClients.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground mb-3">{t('emptyStage')}</p>
                      {currentTab === 'sales' && stage.id === 'prospecting' && (
                        <Link to="/app/new-client">
                          <Button variant="outline" size="sm" className="gap-1">
                            <Plus className="h-4 w-4" /> {tCommon('add')}
                          </Button>
                        </Link>
                      )}
                    </div>
                  ) : (
                    stageClients.map((client, clientIndex) => (
                      <AnimatedContainer
                        key={client.id}
                        animation="scale-in"
                        delay={0.2 + (stageIndex * 0.1) + (clientIndex * 0.05)}
                      >
                        <div
                          onClick={() => handleClientClick(client.id)}
                          className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 cursor-pointer shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/50"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-primary font-semibold">{client.companyName.charAt(0)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{client.companyName}</p>
                              <p className="text-sm text-muted-foreground">{client.contactName}</p>
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground font-mono">
                                <Phone className="h-3 w-3" />{formatPhoneNumber(client.phone)}
                              </div>
                            </div>
                          </div>
                          {currentTab === 'sales' && (
                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant={client.temperature === 'hot' ? 'default' : 'secondary'} className="text-xs">
                                {getTemperatureLabel(client.temperature)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{getSourceLabel(client.source)}</Badge>
                            </div>
                          )}
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>{t('progress')}</span>
                              <span>{client.progress}/9</span>
                            </div>
                            <Progress value={(client.progress / 9) * 100} className="h-1.5" />
                          </div>
                          <div className="flex justify-between mt-2 text-xs">
                            <span className="text-muted-foreground">{t('monthlyBudget')}</span>
                            <span className="font-medium text-primary">{currencySymbol} {client.monthlyBudget.toLocaleString()}</span>
                          </div>
                        </div>
                      </AnimatedContainer>
                    ))
                  )}
                </div>
              </AnimatedContainer>
            );
          })}
        </div>
      </div>
    </div>
  );
}
