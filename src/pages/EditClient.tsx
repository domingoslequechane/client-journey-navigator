import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ServiceType } from '@/types';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ClientFormView, ClientFormData, initialFormData } from '@/components/clients/ClientFormView';
import { useOrganization } from '@/hooks/useOrganization';
import { slugify } from '@/lib/utils';

export default function EditClient() {
  const navigate = useNavigate();
  const { clientIdOrSlug } = useParams<{ clientIdOrSlug: string }>();

  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [loadingClient, setLoadingClient] = useState(true);
  const [actualClientId, setActualClientId] = useState<string | null>(null);
  const { organizationId } = useOrganization();

  // Update form data helpers - use functional updates to avoid stale state
  const updateField = useCallback(<K extends keyof ClientFormData>(field: K, value: ClientFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateBant = useCallback((key: keyof ClientFormData['bant'], value: number) => {
    setFormData((prev) => ({ ...prev, bant: { ...prev.bant, [key]: value } }));
  }, []);

  const handleServiceToggle = useCallback((service: ServiceType) => {
    setFormData((prev) => {
      const newServices = prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service];
      return { ...prev, services: newServices };
    });
  }, []);

  // Load client data on mount
  useEffect(() => {
    if (clientIdOrSlug && organizationId) {
      loadClientData(clientIdOrSlug);
    } else if (!clientIdOrSlug) {
      navigate('/app/clients');
    }
  }, [clientIdOrSlug, organizationId, navigate]);

  const loadClientData = async (identifier: string) => {
    setLoadingClient(true);
    try {
      // Check if identifier is a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

      let query = supabase.from('clients').select('*');
      
      if (isUUID) {
        query = query.eq('id', identifier);
      } else {
        query = query.eq('slug', identifier);
      }

      const { data: client, error } = await query
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;

      if (client) {
        setActualClientId(client.id);
        // Set form data directly from database - no draft interference
        setFormData({
          companyName: client.company_name || '',
          contactName: client.contact_name || '',
          email: client.email || '',
          phone: client.phone || '',
          website: client.website || '',
          address: client.address || '',
          source: client.source || '',
          qualification: client.qualification || 'cold',
          notes: client.notes || '',
          services: (client.services as ServiceType[]) || [],
          monthlyBudget: client.monthly_budget ? String(client.monthly_budget) : '',
          trafficBudget: client.paid_traffic_budget ? String(client.paid_traffic_budget) : '',
          bant: {
            budget: client.bant_budget || 0,
            authority: client.bant_authority || 0,
            need: client.bant_need || 0,
            timeline: client.bant_timeline || 0,
          },
          budgetCurrency: 'MZN',
          trafficCurrency: 'USD',
        });
      }
    } catch (error) {
      console.error('Error loading client:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os dados do cliente', variant: 'destructive' });
      navigate('/app/clients');
    } finally {
      setLoadingClient(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName || !formData.contactName || !formData.phone) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    
    if (!actualClientId) return;

    setSaving(true);
    try {
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
        slug: slugify(formData.companyName),
      };

      const { error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', actualClientId)
        .eq('organization_id', organizationId);

      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Cliente atualizado com sucesso' });
      navigate(`/app/clients/${clientIdOrSlug}`);
    } catch (error) {
      console.error('Error updating client:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o cliente', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loadingClient) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
      isEditMode={true}
      backLink={`/app/clients/${clientIdOrSlug}`}
    />
  );
}
