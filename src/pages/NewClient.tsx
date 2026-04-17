import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { ServiceType } from '@/types';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useSubscription } from '@/hooks/useSubscription';
import { LimitReachedCard } from '@/components/subscription/LimitReachedCard';
import { SubscriptionRequired } from '@/components/subscription/SubscriptionRequired';
import { useDraft } from '@/hooks/useDraft';
import { useOrganization } from '@/hooks/useOrganization';
import { ClientFormView, ClientFormData, initialFormData } from '@/components/clients/ClientFormView';
import { useHeader } from '@/contexts/HeaderContext';
import { slugify } from '@/lib/utils';

export default function NewClient() {
  const navigate = useNavigate();
  const { setBackAction, setCustomTitle } = useHeader();

  const { loading: planLoading, canAddClient, planType, usage, limits } = usePlanLimits();
  const { hasActiveSubscription, loading: subLoading } = useSubscription();
  const [saving, setSaving] = useState(false);
  const { organizationId, currency: orgCurrency } = useOrganization();

  // Draft for new clients
  const {
    value: formData,
    setValue: setFormData,
    hasRestoredDraft,
    clearDraft,
    discardDraft,
  } = useDraft<ClientFormData>({
    key: 'new_client',
    initialValue: initialFormData,
    debounceMs: 300,
    storage: 'local',
  });

  // Update form data helpers - use functional updates to avoid stale state
  const updateField = useCallback(<K extends keyof ClientFormData>(field: K, value: ClientFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, [setFormData]);

  const updateBant = useCallback((key: keyof ClientFormData['bant'], value: number) => {
    setFormData((prev) => ({ ...prev, bant: { ...prev.bant, [key]: value } }));
  }, [setFormData]);

  const handleServiceToggle = useCallback((service: ServiceType) => {
    setFormData((prev) => {
      const newServices = prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service];
      return { ...prev, services: newServices };
    });
  }, [setFormData]);

  useEffect(() => {
    // Set default currency if no draft was restored
    if (orgCurrency && !hasRestoredDraft) {
      setFormData((prev) =>
        prev.budgetCurrency === 'MZN' ? { ...prev, budgetCurrency: orgCurrency } : prev
      );
    }
  }, [orgCurrency, hasRestoredDraft, setFormData]);

  useEffect(() => {
    if (!canAddClient && !planLoading && !subLoading && hasActiveSubscription) {
      setCustomTitle('Novo Cliente');
      setBackAction(() => () => navigate('/app/clients'));
    }
  }, [canAddClient, planLoading, subLoading, hasActiveSubscription, setCustomTitle, setBackAction, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName || !formData.contactName || !formData.phone) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const clientData = {
        company_name: formData.companyName,
        contact_name: formData.contactName,
        email: formData.email || null,
        phone: formData.phone,
        website: formData.website || null,
        address: formData.address || null,
        source: formData.source || null,
        notes: formData.notes || null,
        qualification: formData.qualification as 'cold' | 'warm' | 'hot' | 'qualified',
        services: formData.services.length > 0 ? formData.services : null,
        monthly_budget: formData.monthlyBudget ? parseFloat(formData.monthlyBudget) : null,
        paid_traffic_budget: formData.trafficBudget ? parseFloat(formData.trafficBudget) : null,
        bant_budget: formData.bant.budget,
        bant_authority: formData.bant.authority,
        bant_need: formData.bant.need,
        bant_timeline: formData.bant.timeline,
        user_id: user.id,
        organization_id: organizationId,
        current_stage: 'prospeccao' as const,
        slug: slugify(formData.companyName),
      };

      const { error } = await supabase
        .from('clients')
        .insert(clientData);

      if (error) throw error;

      clearDraft();
      toast({ title: 'Sucesso!', description: 'Cliente cadastrado com sucesso' });
      navigate('/app/clients');
    } catch (error) {
      console.error('Error saving client:', error);
      toast({ title: 'Erro', description: 'Não foi possível cadastrar o cliente', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (planLoading || subLoading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasActiveSubscription) {
    return <SubscriptionRequired feature="cadastrar novos clientes" />;
  }

  if (!canAddClient) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <AnimatedContainer animation="fade-up" className="hidden md:flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
          <Link to="/app/clients">
            <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-bold">Novo Cliente</h1>
            <p className="text-sm md:text-base text-muted-foreground">Cadastre um novo lead ou cliente</p>
          </div>
        </AnimatedContainer>
        <LimitReachedCard
          feature="clientes"
          current={usage.clientsCount}
          limit={limits.maxClients || 0}
          planType={planType}
        />
      </div>
    );
  }

  return (
    <ClientFormView
      formData={formData}
      updateField={updateField}
      updateBant={updateBant}
      handleServiceToggle={handleServiceToggle}
      onSubmit={handleSubmit}
      saving={saving}
      isEditMode={false}
      backLink="/app/clients"
      hasRestoredDraft={hasRestoredDraft}
      onDiscardDraft={discardDraft}
    />
  );
}
