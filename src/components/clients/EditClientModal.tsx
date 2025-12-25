import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Client, SOURCE_LABELS } from '@/types';
import { CURRENCIES } from '@/lib/currencies';

interface EditClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  onClientUpdated: () => void;
}

interface FieldChange {
  field: string;
  label: string;
  oldValue: string | number | null;
  newValue: string | number | null;
}

const QUALIFICATION_OPTIONS = [
  { value: 'cold', label: 'Frio' },
  { value: 'warm', label: 'Morno' },
  { value: 'hot', label: 'Quente' },
  { value: 'qualified', label: 'Qualificado' },
];

const FIELD_LABELS: Record<string, string> = {
  company_name: 'Nome da Empresa',
  contact_name: 'Nome do Contato',
  email: 'Email',
  phone: 'Telefone',
  website: 'Website',
  address: 'Endereço',
  source: 'Fonte',
  qualification: 'Qualificação',
  notes: 'Observações',
  monthly_budget: 'Orçamento Mensal',
  paid_traffic_budget: 'Orçamento Tráfego',
  bant_budget: 'BANT Budget',
  bant_authority: 'BANT Authority',
  bant_need: 'BANT Need',
  bant_timeline: 'BANT Timeline',
};

export function EditClientModal({ open, onOpenChange, client, onClientUpdated }: EditClientModalProps) {
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState(client.companyName);
  const [contactName, setContactName] = useState(client.contactName);
  const [email, setEmail] = useState(client.email || '');
  const [phone, setPhone] = useState(client.phone || '');
  const [website, setWebsite] = useState(client.website || '');
  const [address, setAddress] = useState(client.address || '');
  const [source, setSource] = useState(client.source || '');
  const [qualification, setQualification] = useState<string>(client.temperature || 'cold');
  const [notes, setNotes] = useState(client.notes || '');
  const [monthlyBudget, setMonthlyBudget] = useState(client.monthlyBudget?.toString() || '');
  const [trafficBudget, setTrafficBudget] = useState(client.trafficBudget?.toString() || '');
  const [budgetCurrency, setBudgetCurrency] = useState('MZN');
  const [trafficCurrency, setTrafficCurrency] = useState('USD');
  const [bant, setBant] = useState({
    budget: client.bant.budget,
    authority: client.bant.authority,
    need: client.bant.need,
    timeline: client.bant.timeline,
  });

  useEffect(() => {
    if (open) {
      setCompanyName(client.companyName);
      setContactName(client.contactName);
      setEmail(client.email || '');
      setPhone(client.phone || '');
      setWebsite(client.website || '');
      setAddress(client.address || '');
      setSource(client.source || '');
      setQualification(client.temperature || 'cold');
      setNotes(client.notes || '');
      setMonthlyBudget(client.monthlyBudget?.toString() || '');
      setTrafficBudget(client.trafficBudget?.toString() || '');
      setBant({
        budget: client.bant.budget,
        authority: client.bant.authority,
        need: client.bant.need,
        timeline: client.bant.timeline,
      });
      
      // Load organization currency
      loadOrganizationCurrency();
    }
  }, [open, client]);

  const loadOrganizationCurrency = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (profile?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('currency')
        .eq('id', profile.organization_id)
        .single();
      
      if (org?.currency) {
        setBudgetCurrency(org.currency);
      }
    }
  };

  const detectChanges = (): FieldChange[] => {
    const changes: FieldChange[] = [];
    
    if (client.companyName !== companyName) {
      changes.push({ field: 'company_name', label: FIELD_LABELS.company_name, oldValue: client.companyName, newValue: companyName });
    }
    if (client.contactName !== contactName) {
      changes.push({ field: 'contact_name', label: FIELD_LABELS.contact_name, oldValue: client.contactName, newValue: contactName });
    }
    if ((client.email || '') !== email) {
      changes.push({ field: 'email', label: FIELD_LABELS.email, oldValue: client.email, newValue: email || null });
    }
    if ((client.phone || '') !== phone) {
      changes.push({ field: 'phone', label: FIELD_LABELS.phone, oldValue: client.phone, newValue: phone || null });
    }
    if ((client.website || '') !== website) {
      changes.push({ field: 'website', label: FIELD_LABELS.website, oldValue: client.website, newValue: website || null });
    }
    if ((client.address || '') !== address) {
      changes.push({ field: 'address', label: FIELD_LABELS.address, oldValue: client.address, newValue: address || null });
    }
    if ((client.source || '') !== source) {
      changes.push({ field: 'source', label: FIELD_LABELS.source, oldValue: client.source, newValue: source || null });
    }
    if ((client.temperature || 'cold') !== qualification) {
      changes.push({ field: 'qualification', label: FIELD_LABELS.qualification, oldValue: client.temperature, newValue: qualification });
    }
    if ((client.notes || '') !== notes) {
      changes.push({ field: 'notes', label: FIELD_LABELS.notes, oldValue: client.notes, newValue: notes || null });
    }
    
    const oldMonthly = client.monthlyBudget?.toString() || '';
    if (oldMonthly !== monthlyBudget) {
      changes.push({ field: 'monthly_budget', label: FIELD_LABELS.monthly_budget, oldValue: client.monthlyBudget, newValue: monthlyBudget ? parseFloat(monthlyBudget) : null });
    }
    
    const oldTraffic = client.trafficBudget?.toString() || '';
    if (oldTraffic !== trafficBudget) {
      changes.push({ field: 'paid_traffic_budget', label: FIELD_LABELS.paid_traffic_budget, oldValue: client.trafficBudget, newValue: trafficBudget ? parseFloat(trafficBudget) : null });
    }
    
    if (client.bant.budget !== bant.budget) {
      changes.push({ field: 'bant_budget', label: FIELD_LABELS.bant_budget, oldValue: client.bant.budget, newValue: bant.budget });
    }
    if (client.bant.authority !== bant.authority) {
      changes.push({ field: 'bant_authority', label: FIELD_LABELS.bant_authority, oldValue: client.bant.authority, newValue: bant.authority });
    }
    if (client.bant.need !== bant.need) {
      changes.push({ field: 'bant_need', label: FIELD_LABELS.bant_need, oldValue: client.bant.need, newValue: bant.need });
    }
    if (client.bant.timeline !== bant.timeline) {
      changes.push({ field: 'bant_timeline', label: FIELD_LABELS.bant_timeline, oldValue: client.bant.timeline, newValue: bant.timeline });
    }
    
    return changes;
  };

  const logChanges = async (changes: FieldChange[], userId: string, orgId: string | null) => {
    if (changes.length === 0) return;
    
    const activities = changes.map(change => ({
      client_id: client.id,
      type: 'field_change' as const,
      title: `Alterou ${change.label}`,
      description: `De "${change.oldValue ?? 'vazio'}" para "${change.newValue ?? 'vazio'}"`,
      organization_id: orgId,
      changed_by: userId,
      field_name: change.field,
      old_value: change.oldValue?.toString() || null,
      new_value: change.newValue?.toString() || null,
    }));
    
    await supabase.from('activities').insert(activities);
  };

  const handleSave = async () => {
    if (!companyName || !contactName || !phone) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Get user and org info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      // Detect changes before updating
      const changes = detectChanges();
      
      // Update client
      const { error } = await supabase
        .from('clients')
        .update({
          company_name: companyName,
          contact_name: contactName,
          email: email || null,
          phone,
          website: website || null,
          address: address || null,
          source: source || null,
          qualification: qualification as any,
          notes: notes || null,
          monthly_budget: monthlyBudget ? parseFloat(monthlyBudget) : null,
          paid_traffic_budget: trafficBudget ? parseFloat(trafficBudget) : null,
          bant_budget: bant.budget,
          bant_authority: bant.authority,
          bant_need: bant.need,
          bant_timeline: bant.timeline,
        })
        .eq('id', client.id);

      if (error) throw error;

      // Log changes to activities
      await logChanges(changes, user.id, profile?.organization_id || null);

      toast({ title: 'Sucesso!', description: 'Cliente atualizado com sucesso' });
      onOpenChange(false);
      onClientUpdated();
    } catch (error) {
      console.error('Error updating client:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o cliente', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getCurrencySymbol = (code: string) => {
    const currency = CURRENCIES.find(c => c.code === code);
    return currency?.symbol || code;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>Atualize as informações do cliente</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Empresa *</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: Restaurante Sabor" />
              </div>
              <div className="space-y-2">
                <Label>Nome do Contato *</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Ex: Maria Silva" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <PhoneInput value={phone} onChange={setPhone} placeholder="+258 84 123 4567" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.empresa.com" />
              </div>
              <div className="space-y-2">
                <Label>Fonte</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger><SelectValue placeholder="Como conheceu?" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Endereço completo" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qualificação</Label>
                <Select value={qualification} onValueChange={setQualification}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUALIFICATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Orçamento Mensal</Label>
                <div className="flex gap-2">
                  <Select value={budgetCurrency} onValueChange={setBudgetCurrency}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.symbol}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number" 
                    value={monthlyBudget} 
                    onChange={(e) => setMonthlyBudget(e.target.value)} 
                    placeholder="10000" 
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Orçamento Tráfego Pago</Label>
              <div className="flex gap-2">
                <Select value={trafficCurrency} onValueChange={setTrafficCurrency}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.symbol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input 
                  type="number" 
                  value={trafficBudget} 
                  onChange={(e) => setTrafficBudget(e.target.value)} 
                  placeholder="500" 
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <Label>Pontuação BANT (0-10)</Label>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { key: 'budget', label: 'Budget', desc: 'Tem orçamento?' },
                  { key: 'authority', label: 'Authority', desc: 'Poder de decisão' },
                  { key: 'need', label: 'Need', desc: 'Necessidade real' },
                  { key: 'timeline', label: 'Timeline', desc: 'Prazo definido' }
                ].map(item => (
                  <div key={item.key}>
                    <div className="flex justify-between text-sm mb-2">
                      <span>{item.label} <span className="text-muted-foreground text-xs">{item.desc}</span></span>
                      <span className="font-medium">{bant[item.key as keyof typeof bant]}/10</span>
                    </div>
                    <Slider 
                      value={[bant[item.key as keyof typeof bant]]} 
                      max={10} 
                      step={1} 
                      onValueChange={([v]) => setBant(p => ({ ...p, [item.key]: v }))} 
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas sobre o cliente..." rows={4} />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
