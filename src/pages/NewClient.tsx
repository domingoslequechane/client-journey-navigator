import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Building2, User, Globe, DollarSign } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { SERVICE_LABELS, SOURCE_LABELS, ServiceType, LeadSource, LeadTemperature, SALES_FUNNEL_STAGES } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function NewClient() {
  const navigate = useNavigate();
  const [bant, setBant] = useState({ budget: 0, authority: 0, need: 0, timeline: 0 });
  const [services, setServices] = useState<ServiceType[]>([]);

  const handleServiceToggle = (service: ServiceType) => {
    setServices(prev => prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: 'Cliente cadastrado!', description: 'O novo cliente foi adicionado com sucesso.' });
    navigate('/app/clients');
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
            <div><Label>Nome da Empresa *</Label><Input placeholder="Ex: Restaurante Sabor & Arte" required /></div>
            <div><Label>Website</Label><Input placeholder="www.empresa.com" /></div>
            <div className="md:col-span-2"><Label>Endereço</Label><Input placeholder="Av. Eduardo Mondlane, 123 - Maputo" /></div>
          </div>
        </AnimatedContainer>

        {/* Contact Info */}
        <AnimatedContainer animation="fade-up" delay={0.15} className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Contato Principal</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div><Label>Nome do Contato *</Label><Input placeholder="Ex: Maria Santos" required /></div>
            <div><Label>Telefone *</Label><Input placeholder="+258 84 123 4567" required /></div>
            <div className="sm:col-span-2 md:col-span-1"><Label>E-mail</Label><Input type="email" placeholder="email@empresa.com" /></div>
          </div>
        </AnimatedContainer>

        {/* Lead Qualification */}
        <AnimatedContainer animation="fade-up" delay={0.2} className="bg-card border border-border rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Qualificação do Lead</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div><Label>Fonte de Origem</Label>
              <Select><SelectTrigger><SelectValue placeholder="Como conheceu?" /></SelectTrigger>
                <SelectContent>{Object.entries(SOURCE_LABELS).map(([key, label]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Fase Inicial</Label>
              <Select defaultValue="prospecting"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SALES_FUNNEL_STAGES.map(stage => (<SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 md:col-span-1"><Label>Qualificação</Label>
              <Select><SelectTrigger><SelectValue placeholder="Temperatura" /></SelectTrigger>
                <SelectContent><SelectItem value="cold">Frio</SelectItem><SelectItem value="warm">Morno</SelectItem><SelectItem value="hot">Quente</SelectItem></SelectContent>
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
            <div><Label>Orçamento Mensal Estimado (MT)</Label><Input type="number" placeholder="10000" /></div>
            <div><Label>Orçamento Tráfego Pago ($)</Label><Input type="number" placeholder="500" /></div>
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
          <Textarea placeholder="Anotações importantes sobre o cliente..." className="mt-2" rows={4} />
        </AnimatedContainer>

        <AnimatedContainer animation="fade-up" delay={0.35} className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 justify-end">
          <Link to="/app/clients" className="w-full sm:w-auto"><Button variant="outline" className="w-full">Cancelar</Button></Link>
          <Button type="submit" className="w-full sm:w-auto">Cadastrar Cliente</Button>
        </AnimatedContainer>
      </form>
    </div>
  );
}
