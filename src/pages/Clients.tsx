import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { ALL_STAGES } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { ClientListSkeleton } from '@/components/ui/loading-skeleton';
import {
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  Filter,
  Download,
  Lock
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { useClientExport } from '@/hooks/useClientExport';
import { formatPhoneNumber } from '@/lib/phone-utils';
import { usePermissions } from '@/hooks/usePermissions';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useSubscription } from '@/hooks/useSubscription';
import { LimitReachedCard } from '@/components/subscription/LimitReachedCard';
import { SubscriptionRequired } from '@/components/subscription/SubscriptionRequired';
import { useTranslatedLabels } from '@/hooks/useTranslatedLabels';
import { useOrganization } from '@/hooks/useOrganization';

type Client = Tables<'clients'>;

const QUALIFICATION_COLORS: Record<string, string> = {
  cold: 'bg-blue-100 text-blue-800',
  warm: 'bg-orange-100 text-orange-800',
  hot: 'bg-red-100 text-red-800',
  qualified: 'bg-green-100 text-green-800',
};

export default function Clients() {
  const { t } = useTranslation('clients');
  const { t: tCommon } = useTranslation('common');
  const { qualificationLabels, getQualificationLabel, getStageLabel } = useTranslatedLabels();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string | null>(null);
  const [filterQualification, setFilterQualification] = useState<string | null>(null);
  const { exportToCSV } = useClientExport();
  const { hasPrivilege } = usePermissions();
  const { canExportData, canAddClient, planType, usage, limits } = usePlanLimits();
  const { hasActiveSubscription, loading: subLoading } = useSubscription();
  const { organizationId, loading: orgLoading } = useOrganization();

  useEffect(() => {
    if (organizationId) {
      fetchClients();
    }
  }, [organizationId]);

  const fetchClients = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({ title: t('errors.title'), description: t('errors.loadClients'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesStage = !filterStage || client.current_stage === filterStage;
    const matchesQualification = !filterQualification || client.qualification === filterQualification;
    return matchesSearch && matchesStage && matchesQualification;
  });

  const getStageFromDb = (dbStage: string) => {
    const stageMap: Record<string, string> = {
      prospeccao: 'prospecting',
      reuniao: 'qualification',
      contratacao: 'closing',
      producao: 'production',
      trafego: 'campaigns',
      retencao: 'retention',
    };
    return stageMap[dbStage] || dbStage;
  };

  if (loading || subLoading || orgLoading) {
    return <ClientListSkeleton />;
  }

  // If no subscription, show read-only mode with export option
  const isReadOnly = !hasActiveSubscription;

  return (
    <div className="p-4 md:p-8 pt-0 md:pt-8">
      <AnimatedContainer animation="fade-up" delay={0} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="hidden md:block">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 flex-wrap">
            {t('title')}
            {limits.maxClients !== null && (
              <Badge variant="outline" className="font-mono">
                {usage.clientsCount}/{limits.maxClients}
              </Badge>
            )}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {t('subtitle', { count: filteredClients.length, total: clients.length })}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => exportToCSV(filteredClients)}
                    disabled={filteredClients.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('actions.export')}</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('actions.exportTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {hasPrivilege('sales') && !isReadOnly && (
            <Button
              className="gap-2 flex-1 sm:flex-none"
              onClick={() => navigate('/app/new-client')}
              disabled={!canAddClient}
            >
              {canAddClient ? (
                <Plus className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {canAddClient ? t('actions.newClient') : t('actions.limit')}
            </Button>
          )}
        </div>
      </AnimatedContainer>

      {/* Filters */}
      <AnimatedContainer animation="fade-up" delay={0.1} className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search.placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={filterStage || 'all'} onValueChange={(v) => setFilterStage(v === 'all' ? null : v)}>
            <SelectTrigger className="w-full md:w-44">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder={t('filters.stage')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allStages')}</SelectItem>
              {ALL_STAGES.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {getStageLabel(stage.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterQualification || 'all'} onValueChange={(v) => setFilterQualification(v === 'all' ? null : v)}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder={t('filters.qualification')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')}</SelectItem>
              <SelectItem value="cold">{qualificationLabels.cold}</SelectItem>
              <SelectItem value="warm">{qualificationLabels.warm}</SelectItem>
              <SelectItem value="hot">{qualificationLabels.hot}</SelectItem>
              <SelectItem value="qualified">{qualificationLabels.qualified}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AnimatedContainer>

      {/* Clients - Mobile Cards / Desktop Table */}
      <AnimatedContainer animation="fade-up" delay={0.2} className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-border">
          {filteredClients.map((client) => {
            const mappedStage = getStageFromDb(client.current_stage);
            const stage = ALL_STAGES.find(s => s.id === mappedStage);
            const bantScore = (client.bant_budget || 0) + (client.bant_authority || 0) + (client.bant_need || 0) + (client.bant_timeline || 0);

            return (
              <div
                key={client.id}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/app/clients/${client.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{client.company_name}</p>
                    <p className="text-sm text-muted-foreground">{client.contact_name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 font-mono">
                      <Phone className="h-3 w-3" />{formatPhoneNumber(client.phone)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge className={`${stage?.color || 'bg-muted'} text-xs`}>
                    {getStageLabel(client.current_stage)}
                  </Badge>
                  <Badge variant="secondary" className={`${QUALIFICATION_COLORS[client.qualification]} text-xs`}>
                    {getQualificationLabel(client.qualification)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">{t('table.bantScore')}: {bantScore}/40</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(client.created_at).toLocaleDateString(tCommon('locale', 'pt-BR'))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-4 text-left text-sm font-semibold">{t('table.company')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">{t('table.contact')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">{t('table.stage')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">{t('table.qualification')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">{t('table.bantScore')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">{t('table.createdAt')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const mappedStage = getStageFromDb(client.current_stage);
                const stage = ALL_STAGES.find(s => s.id === mappedStage);
                const bantScore = (client.bant_budget || 0) + (client.bant_authority || 0) + (client.bant_need || 0) + (client.bant_timeline || 0);

                return (
                  <tr
                    key={client.id}
                    className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/app/clients/${client.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{client.company_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {client.email && <><Mail className="h-3 w-3" />{client.email}</>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{client.contact_name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <Phone className="h-3 w-3" />{formatPhoneNumber(client.phone)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`${stage?.color || 'bg-muted'}`}>
                        {getStageLabel(client.current_stage)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className={QUALIFICATION_COLORS[client.qualification]}>
                        {getQualificationLabel(client.qualification)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(bantScore / 40) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{bantScore}/40</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(client.created_at).toLocaleDateString(tCommon('locale', 'pt-BR'))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {t('empty')}
          </div>
        )}
      </AnimatedContainer>
    </div>
  );
}