import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Building2, User, Globe, DollarSign, Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { SERVICE_LABELS, SOURCE_LABELS, ServiceType } from '@/types';
import { CURRENCIES } from '@/lib/currencies';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface ClientFormData {
  companyName: string;
  website: string;
  address: string;
  contactName: string;
  phone: string;
  email: string;
  source: string;
  qualification: string;
  notes: string;
  bant: { budget: number; authority: number; need: number; timeline: number };
  services: ServiceType[];
  budgetCurrency: string;
  trafficCurrency: string;
  monthlyBudget: string;
  trafficBudget: string;
}

export const initialFormData: ClientFormData = {
  companyName: '',
  website: '',
  address: '',
  contactName: '',
  phone: '',
  email: '',
  source: '',
  qualification: 'cold',
  notes: '',
  bant: { budget: 0, authority: 0, need: 0, timeline: 0 },
  services: [],
  budgetCurrency: 'MZN',
  trafficCurrency: 'USD',
  monthlyBudget: '',
  trafficBudget: '',
};

interface ClientFormViewProps {
  formData: ClientFormData;
  updateField: <K extends keyof ClientFormData>(field: K, value: ClientFormData[K]) => void;
  updateBant: (key: keyof ClientFormData['bant'], value: number) => void;
  handleServiceToggle: (service: ServiceType) => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  isEditMode: boolean;
  backLink: string;
  hasRestoredDraft?: boolean;
  onDiscardDraft?: () => void;
}

export function ClientFormView({
  formData,
  updateField,
  updateBant,
  handleServiceToggle,
  onSubmit,
  saving,
  isEditMode,
  backLink,
  hasRestoredDraft,
  onDiscardDraft,
}: ClientFormViewProps) {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <AnimatedContainer animation="fade-up" className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
        <Link to={backLink}>
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl font-bold">{isEditMode ? 'Editar Cliente' : 'Novo Cliente'}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {isEditMode ? 'Atualize as informações do cliente' : 'Cadastre um novo lead ou cliente'}
          </p>
        </div>
      </AnimatedContainer>

      {/* Draft restored notification */}
      {hasRestoredDraft && !isEditMode && onDiscardDraft && (
        <Alert className="mb-6 border-primary/50 bg-primary/5">
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">Rascunho restaurado automaticamente</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDiscardDraft}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Descartar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-6 md:space-y-8">
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
                value={formData.companyName} 
                onChange={(e) => updateField('companyName', e.target.value)} 
                placeholder="Ex: Restaurante Sabor & Arte" 
                required 
              />
            </div>
            <div>
              <Label>Website</Label>
              <Input 
                value={formData.website} 
                onChange={(e) => updateField('website', e.target.value)} 
                placeholder="www.empresa.com" 
              />
            </div>
            <div className="md:col-span-2">
              <Label>Endereço</Label>
              <Input 
                value={formData.address} 
                onChange={(e) => updateField('address', e.target.value)} 
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
                value={formData.contactName} 
                onChange={(e) => updateField('contactName', e.target.value)} 
                placeholder="Ex: Maria Santos" 
                required 
              />
            </div>
            <div>
              <Label>Telefone *</Label>
              <PhoneInput 
                value={formData.phone} 
                onChange={(value) => updateField('phone', value || '')} 
                placeholder="+258 84 123 4567" 
                required 
              />
            </div>
            <div className="sm:col-span-2 md:col-span-1">
              <Label>E-mail</Label>
              <Input 
                type="email" 
                value={formData.email} 
                onChange={(e) => updateField('email', e.target.value)} 
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
              <Select value={formData.source} onValueChange={(value) => updateField('source', value)}>
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
              <Select value={formData.qualification} onValueChange={(value) => updateField('qualification', value)}>
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
                    <span className="font-medium">{formData.bant[item.key as keyof typeof formData.bant]}/10</span>
                  </div>
                  <Slider 
                    value={[formData.bant[item.key as keyof typeof formData.bant]]} 
                    max={10} 
                    step={1} 
                    onValueChange={([v]) => updateBant(item.key as keyof ClientFormData['bant'], v)} 
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <Label>Orçamento Mensal Estimado</Label>
              <div className="flex gap-2 mt-1">
                <Select value={formData.budgetCurrency} onValueChange={(value) => updateField('budgetCurrency', value)}>
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
                  value={formData.monthlyBudget} 
                  onChange={(e) => updateField('monthlyBudget', e.target.value)} 
                  placeholder="10000" 
                  className="flex-1" 
                />
              </div>
            </div>
            <div>
              <Label>Orçamento Tráfego Pago</Label>
              <div className="flex gap-2 mt-1">
                <Select value={formData.trafficCurrency} onValueChange={(value) => updateField('trafficCurrency', value)}>
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
                  value={formData.trafficBudget} 
                  onChange={(e) => updateField('trafficBudget', e.target.value)} 
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
                <Checkbox 
                  id={key} 
                  checked={formData.services.includes(key)} 
                  onCheckedChange={() => handleServiceToggle(key)} 
                />
                <label htmlFor={key} className="text-sm cursor-pointer">{label}</label>
              </div>
            ))}
          </div>
        </AnimatedContainer>

        {/* Notes */}
        <AnimatedContainer animation="fade-up" delay={0.3} className="bg-card border border-border rounded-xl p-4 md:p-6">
          <Label>Observações</Label>
          <Textarea 
            value={formData.notes} 
            onChange={(e) => updateField('notes', e.target.value)} 
            placeholder="Anotações importantes sobre o cliente..." 
            className="mt-2" 
            rows={4} 
          />
        </AnimatedContainer>

        <AnimatedContainer animation="fade-up" delay={0.35} className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 justify-end">
          <Link to={backLink} className="w-full sm:w-auto">
            <Button variant="outline" className="w-full">Cancelar</Button>
          </Link>
          <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : isEditMode ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </Button>
        </AnimatedContainer>
      </form>
    </div>
  );
}
