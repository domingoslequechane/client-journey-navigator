import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ALL_STAGES } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { ClientListSkeleton } from '@/components/ui/loading-skeleton';
import { 
  Search, 
  Plus, 
  Building2, 
  Loader2,
  Phone,
  Mail,
  Filter
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;

const QUALIFICATION_LABELS: Record<string, string> = {
  cold: 'Frio',
  warm: 'Morno',
  hot: 'Quente',
  qualified: 'Qualificado',
};

const QUALIFICATION_COLORS: Record<string, string> = {
  cold: 'bg-blue-100 text-blue-800',
  warm: 'bg-orange-100 text-orange-800',
  hot: 'bg-red-100 text-red-800',
  qualified: 'bg-green-100 text-green-800',
};

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // New client form state
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [bant, setBant] = useState({ budget: 0, authority: 0, need: 0, timeline: 0 });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os clientes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!companyName || !contactName || !phone) {
      toast({ title: 'Erro', description: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
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
          bant_budget: bant.budget,
          bant_authority: bant.authority,
          bant_need: bant.need,
          bant_timeline: bant.timeline,
        });

      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Cliente cadastrado com sucesso' });
      setNewClientOpen(false);
      resetForm();
      fetchClients();
    } catch (error) {
      console.error('Error creating client:', error);
      toast({ title: 'Erro', description: 'Não foi possível cadastrar o cliente', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setCompanyName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setWebsite('');
    setAddress('');
    setSource('');
    setNotes('');
    setBant({ budget: 0, authority: 0, need: 0, timeline: 0 });
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.contact_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = !filterStage || client.current_stage === filterStage;
    return matchesSearch && matchesStage;
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

  if (loading) {
    return <ClientListSkeleton />;
  }

  return (
    <div className="p-4 md:p-8">
      <AnimatedContainer animation="fade-up" delay={0} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Clientes</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Gerencie todos os seus clientes</p>
        </div>
        <Sheet open={newClientOpen} onOpenChange={setNewClientOpen}>
          <SheetTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Novo Cliente</SheetTitle>
              <SheetDescription>
                Cadastre um novo lead ou cliente no sistema.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-180px)] pr-4">
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Empresa *</Label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: Restaurante Sabor" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Contato *</Label>
                    <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Ex: Maria Silva" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone *</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+258 84 123 4567" />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.empresa.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fonte</Label>
                    <Select value={source} onValueChange={setSource}>
                      <SelectTrigger><SelectValue placeholder="Como conheceu?" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google_maps">Google Maps</SelectItem>
                        <SelectItem value="social_media">Redes Sociais</SelectItem>
                        <SelectItem value="referral">Indicação</SelectItem>
                        <SelectItem value="visit">Visita Presencial</SelectItem>
                        <SelectItem value="inbound">Inbound</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Endereço completo" />
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
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas sobre o cliente..." />
                </div>
              </div>
            </ScrollArea>
            <SheetFooter className="pt-4">
              <Button variant="outline" onClick={() => setNewClientOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateClient} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : 'Cadastrar Cliente'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </AnimatedContainer>

      {/* Filters */}
      <AnimatedContainer animation="fade-up" delay={0.1} className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 md:max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa ou contato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full md:w-56">
          <Select value={filterStage || 'all'} onValueChange={(v) => setFilterStage(v === 'all' ? null : v)}>
            <SelectTrigger className="w-full">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filtrar por fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fases</SelectItem>
              {ALL_STAGES.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AnimatedContainer>

      {/* Clients - Mobile Cards / Desktop Table */}
      <AnimatedContainer animation="fade-up" delay={0.2} className="bg-card border border-border rounded-xl overflow-hidden">
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
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Phone className="h-3 w-3" />{client.phone}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge className={`${stage?.color || 'bg-muted'} text-xs`}>
                        {stage?.name || client.current_stage}
                      </Badge>
                      <Badge variant="secondary" className={`${QUALIFICATION_COLORS[client.qualification]} text-xs`}>
                        {QUALIFICATION_LABELS[client.qualification]}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">BANT: {bantScore}/40</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(client.created_at).toLocaleDateString('pt-BR')}
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
                    <th className="px-6 py-4 text-left text-sm font-semibold">Empresa</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Contato</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Fase</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Qualificação</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">BANT Score</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Criado em</th>
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
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />{client.phone}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`${stage?.color || 'bg-muted'}`}>
                            {stage?.name || client.current_stage}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className={QUALIFICATION_COLORS[client.qualification]}>
                            {QUALIFICATION_LABELS[client.qualification]}
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
                          {new Date(client.created_at).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum cliente encontrado
          </div>
        )}
      </AnimatedContainer>
    </div>
  );
}
