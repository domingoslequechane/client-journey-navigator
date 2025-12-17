import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Building2, User, Globe, DollarSign, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { SERVICE_LABELS, SOURCE_LABELS, ServiceType, SALES_FUNNEL_STAGES } from '@/types';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CURRENCIES } from '@/lib/currencies';

export default function NewClient() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  
  // Form state
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('');
  const [qualification, setQualification] = useState('cold');
  const [notes, setNotes] = useState('');
  const [bant, setBant] = useState({ budget: 0, authority: 0, need: 0, timeline: 0 });
  const [services, setServices] = useState<ServiceType[]>([]);
  const [budgetCurrency, setBudgetCurrency] = useState('MZN');
  const [trafficCurrency, setTrafficCurrency] = useState('USD');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [trafficBudget, setTrafficBudget] = useState('');

  useEffect(() => {
    loadOrganizationData();
  }, []);

  const loadOrganizationData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();
    
    if (profile?.organization_id) {
      setOrganizationId(profile.organization_id);
      
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

  const handleServiceToggle = (service: ServiceType) => {
    setServices(prev => prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName || !contactName || !phone) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('clients')
        .insert({
          company_name: companyName,
          contact_name: contactName,
          email: email || null,
          phone,
          website: website || null,
          address: address || null,
          source: source || null,
          notes: notes || null,
          qualification: qualification as 'cold' | 'warm' | 'hot' | 'qualified',
          services: services.length > 0 ? services : null,
          monthly_budget: monthlyBudget ? parseFloat(monthlyBudget) : null,
          paid_traffic_budget: trafficBudget ? parseFloat(trafficBudget) : null,
          bant_budget: bant.budget,
          bant_authority: bant.authority,
          bant_need: bant.need,
          bant_timeline: bant.timeline,
          user_id: user.id,
          organization_id: organizationId,
          current_stage: 'prospeccao',
        });

      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Cliente cadastrado com sucesso' });
      navigate('/app/clients');
    } catch (error) {
      console.error('Error creating client:', error);
      toast({ title: 'Erro', description: 'Não foi possível cadastrar o cliente', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <AnimatedContainer animation="fade-up" className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
        <Link to="/app/clients">
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl font-bold">Novo Cliente</h1>
          <p className="text-sm md:text-base text-muted-foreground">Cadastre um novo lead ou cliente</p>
        </div>
      </AnimatedContainer>

      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
        {/* Company Info */}
        <AnimatedContainer animation="fade-up" delay={0.1} className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Informações da Empresa</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome da Empresa *</Label>
              <Input 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)} 
                placeholder="Ex: Restaurante Sabor & Arte" 
                required 
              />
            </div>
            <div>
              <Label>Website</Label>
              <Input 
                value={website} 
                onChange={(e) => setWebsite(e.target.value)} 
                placeholder="www.empresa.com" 
              />
            </div>
            <div className="md:col-span-2">
              <Label>Endereço</Label>
              <Input 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                placeholder="Av. Eduardo Mondlane, 123 - Maputo" 
              />
            </div>
          </div>
        </AnimatedContainer>

        {/* Contact Info */}
        <AnimatedContainer animation="fade-up" delay={0.15} className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Contato Principal</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>Nome do Contato *</Label>
              <Input 
                value={contactName} 
                onChange={(e) => setContactName(e.target.value)} 
                placeholder="Ex: Maria Santos" 
                required 
              />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="+258 84 123 4567" 
                required 
              />
            </div>
            <div className="sm:col-span-2 md:col-span-1">
              <Label>E-mail</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="email@empresa.com" 
              />
            </div>
          </div>
        </AnimatedContainer>

        {/* Lead Qualification */}
        <AnimatedContainer animation="fade-up" delay={0.2} className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Qualificação do Lead</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Fonte de Origem</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue placeholder="Como conheceu?" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Qualificação</Label>
              <Select value={qualification} onValueChange={setQualification}>
                <SelectTrigger><SelectValue placeholder="Temperatura" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold">Frio</SelectItem>
                  <SelectItem value="warm">Morno</SelectItem>
                  <SelectItem value="hot">Quente</SelectItem>
                  <SelectItem value="qualified">Qualificado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm font-medium">Pontuação BANT (0-10)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[{ key: 'budget', label: 'Budget', desc: 'Tem orçamento disponível' },
                { key: 'authority', label: 'Authority', desc: 'Poder de decisão' },
                { key: 'need', label: 'Need', desc: 'Necessidade real' },
                { key: 'timeline', label: 'Timeline', desc: 'Prazo definido' }
              ].map(item => (
                <div key={item.key}>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{item.label}<span className="text-muted-foreground text-xs ml-2">{item.desc}</span></span>
                    <span className="font-medium">{bant[item.key as keyof typeof bant]}/10</span>
                  </div>
                  <Slider value={[bant[item.key as keyof typeof bant]]} max={10} step={1} onValueChange={([v]) => setBant(p => ({ ...p, [item.key]: v }))} />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <Label>Orçamento Mensal Estimado</Label>
              <div className="flex gap-2 mt-1">
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
            <div>
              <Label>Orçamento Tráfego Pago</Label>
              <div className="flex gap-2 mt-1">
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
          </div>
        </AnimatedContainer>

        {/* Services */}
        <AnimatedContainer animation="fade-up" delay={0.25} className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Serviços de Interesse</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(Object.entries(SERVICE_LABELS) as [ServiceType, string][]).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox id={key} checked={services.includes(key)} onCheckedChange={() => handleServiceToggle(key)} />
                <label htmlFor={key} className="text-sm cursor-pointer">{label}</label>
              </div>
            ))}
          </div>
        </AnimatedContainer>

        {/* Notes */}
        <AnimatedContainer animation="fade-up" delay={0.3} className="bg-card border border-border rounded-xl p-4 md:p-6">
          <Label>Observações</Label>
          <Textarea 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            placeholder="Anotações importantes sobre o cliente..." 
            className="mt-2" 
            rows={4} 
          />
        </AnimatedContainer>

        <AnimatedContainer animation="fade-up" delay={0.35} className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 justify-end">
          <Link to="/app/clients" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full">Cancelar</Button>
          </Link>
          <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : 'Cadastrar Cliente'}
          </Button>
        </AnimatedContainer>
      </form>
    </div>
  );
}
