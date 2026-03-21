import { useState } from 'react';
import {
  Save,
  RotateCcw,
  Building2,
  Clock,
  MapPin,
  MessageCircle,
  FileText,
  ChevronDown,
  Sparkles,
  Info,
  Timer,
  Eye,
  Keyboard,
  Users,
  UserRound,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AIAgent } from '@/types';

interface AgentConfigTabProps {
  agent: AIAgent;
  updateConfig: { mutateAsync: (updates: Partial<AIAgent>) => Promise<AIAgent>; isPending: boolean };
}

interface ConfigSection {
  id: string;
  title: string;
  description: string;
  icon: typeof Building2;
  iconColor: string;
  iconBg: string;
}

const SECTIONS: ConfigSection[] = [
  {
    id: 'welcome',
    title: 'Mensagem de Boas-vindas',
    description: 'Como o agente vai cumprimentar quem entrar em contacto',
    icon: MessageCircle,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-500/10',
  },
  {
    id: 'company',
    title: 'Informações da Empresa',
    description: 'Nome, ramo de actividade e descrição geral do negócio',
    icon: Building2,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
  },
  {
    id: 'hours',
    title: 'Horário de Funcionamento',
    description: 'Dias e horários em que a empresa está aberta',
    icon: Clock,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-500/10',
  },
  {
    id: 'address',
    title: 'Endereço e Localização',
    description: 'Onde a empresa se encontra e como chegar',
    icon: MapPin,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-500/10',
  },
  {
    id: 'instructions',
    title: 'Instruções de Atendimento',
    description: 'Como o agente deve se comportar e o que pode ou não fazer',
    icon: Sparkles,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-500/10',
  },
  {
    id: 'extra',
    title: 'Informações Extras',
    description: 'Produtos, serviços, preços ou qualquer outra informação útil',
    icon: FileText,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-500/10',
  },
  {
    id: 'human_intervention',
    title: 'Intervenção Humana',
    description: 'Pausa automática e transição para atendimento humano',
    icon: UserRound,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-500/10',
  },
  {
    id: 'chat_behavior',
    title: 'Comportamento no Chat',
    description: 'Atraso de resposta, tamanho das mensagens e marcação de leitura',
    icon: Clock,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-500/10',
  },
];

// Tamanho de resposta mapeado para labels leigos
const RESPONSE_SIZE_LABELS: Record<number, string> = {
  1: 'Curta',
  2: 'Média',
  3: 'Longa',
};

export function AgentConfigTab({ agent, updateConfig }: AgentConfigTabProps) {
  const [name, setName] = useState(agent.name);
  const [welcomeMessage, setWelcomeMessage] = useState(agent.welcome_message || '');
  const [companyName, setCompanyName] = useState(agent.company_name || '');
  const [companyDescription, setCompanyDescription] = useState(agent.company_description || '');
  const [companySector, setCompanySector] = useState(agent.company_sector || '');
  const [businessHours, setBusinessHours] = useState(agent.business_hours || '');
  const [address, setAddress] = useState(agent.address || '');
  const [addressReference, setAddressReference] = useState(agent.address_reference || '');
  const [instructions, setInstructions] = useState(agent.instructions || '');
  const [extraInfo, setExtraInfo] = useState(agent.extra_info || '');
  const [responseSize, setResponseSize] = useState(agent.response_size || 2);
  const [responseDelay, setResponseDelay] = useState(agent.response_delay_seconds ?? 3);
  const [showTyping, setShowTyping] = useState(agent.show_typing ?? true);
  const [markAsRead, setMarkAsRead] = useState(agent.mark_as_read ?? true);
  const [humanPauseDuration, setHumanPauseDuration] = useState(agent.human_pause_duration || 60);
  const [hasChanges, setHasChanges] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(['welcome']);

  const markChanged = () => {
    if (!hasChanges) setHasChanges(true);
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome do agente é obrigatório');
      return;
    }

    try {
      await updateConfig.mutateAsync({
        name,
        welcome_message: welcomeMessage || null,
        company_name: companyName || null,
        company_sector: companySector || null,
        company_description: companyDescription || null,
        business_hours: businessHours || null,
        address: address || null,
        address_reference: addressReference || null,
        instructions: instructions || null,
        extra_info: extraInfo || null,
        response_size: responseSize,
        response_delay_seconds: responseDelay,
        show_typing: showTyping,
        mark_as_read: markAsRead,
        human_pause_duration: humanPauseDuration,
      } as any);
      setHasChanges(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleReset = () => {
    setName(agent.name);
    setWelcomeMessage(agent.welcome_message || '');
    setCompanyName(agent.company_name || '');
    setCompanyDescription(agent.company_description || '');
    setCompanySector(agent.company_sector || '');
    setBusinessHours(agent.business_hours || '');
    setAddress(agent.address || '');
    setAddressReference(agent.address_reference || '');
    setInstructions(agent.instructions || '');
    setExtraInfo(agent.extra_info || '');
    setResponseSize(agent.response_size || 2);
    setResponseDelay(agent.response_delay_seconds ?? 3);
    setShowTyping(agent.show_typing ?? true);
    setMarkAsRead(agent.mark_as_read ?? true);
    setHumanPauseDuration(agent.human_pause_duration || 60);
    setHasChanges(false);
  };

  return (
    <div className="space-y-4">
      {/* Agent Name */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label htmlFor="agent-name">Nome do Agente</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => { setName(e.target.value); markChanged(); }}
              placeholder="Ex: Atendente Virtual"
            />
          </div>
        </CardContent>
      </Card>

      {/* Collapsible Sections */}
      {SECTIONS.map(section => {
        const Icon = section.icon;
        const isOpen = openSections.includes(section.id);

        return (
          <Collapsible
            key={section.id}
            open={isOpen}
            onOpenChange={() => toggleSection(section.id)}
          >
            <Card className={cn('transition-colors', isOpen && 'border-primary/20')}>
              <CollapsibleTrigger asChild>
                <button className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors rounded-lg">
                  <div className={cn('p-2 rounded-lg shrink-0', section.iconBg)}>
                    <Icon className={cn('h-5 w-5', section.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{section.title}</h4>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                  <ChevronDown className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform shrink-0',
                    isOpen && 'rotate-180'
                  )} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 pt-1 space-y-3">
                  {/* Welcome */}
                  {section.id === 'welcome' && (
                    <>
                      <Textarea
                        value={welcomeMessage}
                        onChange={(e) => { setWelcomeMessage(e.target.value); markChanged(); }}
                        placeholder="Ex: Olá! Bem-vindo à nossa empresa. Como posso ajudá-lo hoje?"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        Esta é a primeira mensagem que a pessoa recebe ao iniciar uma conversa
                      </p>
                    </>
                  )}

                  {/* Company Info */}
                  {section.id === 'company' && (
                    <>
                      <div>
                        <Label>Nome da Empresa</Label>
                        <Input
                          value={companyName}
                          onChange={(e) => { setCompanyName(e.target.value); markChanged(); }}
                          placeholder="Ex: Restaurante Sabores"
                        />
                      </div>
                      <div>
                        <Label>Ramo de Actividade</Label>
                        <Input
                          value={companySector}
                          onChange={(e) => { setCompanySector(e.target.value); markChanged(); }}
                          placeholder="Ex: Restauração, Tecnologia, Beleza..."
                        />
                      </div>
                      <div>
                        <Label>Descrição do Negócio</Label>
                        <Textarea
                          value={companyDescription}
                          onChange={(e) => { setCompanyDescription(e.target.value); markChanged(); }}
                          placeholder="Descreva brevemente o que a empresa faz, seus principais produtos ou serviços..."
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  {/* Business Hours */}
                  {section.id === 'hours' && (
                    <>
                      <Textarea
                        value={businessHours}
                        onChange={(e) => { setBusinessHours(e.target.value); markChanged(); }}
                        placeholder={`Ex:\nSegunda a Sexta: 08h - 18h\nSábado: 09h - 13h\nDomingo: Fechado`}
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        O agente usará essa informação para responder perguntas sobre horários
                      </p>
                    </>
                  )}

                  {/* Address */}
                  {section.id === 'address' && (
                    <>
                      <div>
                        <Label>Endereço Completo</Label>
                        <Input
                          value={address}
                          onChange={(e) => { setAddress(e.target.value); markChanged(); }}
                          placeholder="Ex: Av. Julius Nyerere, 1234 — Maputo"
                        />
                      </div>
                      <div>
                        <Label>Ponto de Referência</Label>
                        <Input
                          value={addressReference}
                          onChange={(e) => { setAddressReference(e.target.value); markChanged(); }}
                          placeholder="Ex: Ao lado do centro comercial, 2º andar"
                        />
                      </div>
                    </>
                  )}

                  {/* Instructions */}
                  {section.id === 'instructions' && (
                    <>
                      <Textarea
                        value={instructions}
                        onChange={(e) => { setInstructions(e.target.value); markChanged(); }}
                        placeholder={`Descreva como o agente deve se comportar. Ex:\n- Seja sempre educado e simpático\n- Responda sempre em português\n- Se não souber a resposta, peça que o cliente ligue para a empresa\n- Não invente informações`}
                        rows={6}
                      />
                      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        Essas regras definem a personalidade e os limites do agente
                      </p>
                    </>
                  )}

                  {/* Extra Info */}
                  {section.id === 'extra' && (
                    <>
                      <Textarea
                        value={extraInfo}
                        onChange={(e) => { setExtraInfo(e.target.value); markChanged(); }}
                        placeholder={`Adicione qualquer informação útil. Ex:\n- Menu de pratos e preços\n- Lista de serviços\n- Perguntas frequentes\n- Políticas de troca e devolução\n- Formas de pagamento aceitas`}
                        rows={6}
                      />
                      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        Quanto mais informação, melhor o agente vai conseguir ajudar os clientes
                      </p>
                    </>
                  )}

                  {/* Human Intervention */}
                  {section.id === 'human_intervention' && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-1">
                          <Label>Tempo de Pausa (minutos)</Label>
                          <span className="text-sm font-semibold text-primary">
                            {humanPauseDuration} min
                          </span>
                        </div>
                        <Slider
                          value={[humanPauseDuration]}
                          onValueChange={([v]) => { setHumanPauseDuration(v); markChanged(); }}
                          min={0}
                          max={1440}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Sem pausa</span>
                          <span>24 horas</span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                          <Info className="h-3 w-3 mt-0.5 shrink-0" />
                          O agente IA ficará em silêncio por este tempo após um atendente humano enviar uma mensagem. 
                          O agente voltará a responder automaticamente após esse período.
                        </p>
                      </div>

                      <div className="pt-4 border-t">
                        <Label className="text-sm font-medium block mb-2">Transição Automática</Label>
                        <p className="text-xs text-muted-foreground mb-4">
                          O bot chamará um colega humano se não souber responder ou se o cliente solicitar.
                        </p>
                        <div className="p-3 rounded-lg border bg-blue-50/50 flex items-start gap-3">
                          <Users className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-xs font-medium">Handoff Ativado</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              Quando o bot detecta necessidade de intervenção, ele marca a conversa para atendimento humano.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chat Behavior */}
                  {section.id === 'chat_behavior' && (
                    <div className="space-y-8">
                      {/* Response Size */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-1">
                          <Label>Tamanho das Respostas</Label>
                          <span className="text-sm font-semibold text-primary">
                            {RESPONSE_SIZE_LABELS[responseSize]}
                          </span>
                        </div>
                        <Slider
                          value={[responseSize]}
                          onValueChange={([v]) => { setResponseSize(v); markChanged(); }}
                          min={1}
                          max={3}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Curta</span>
                          <span>Média</span>
                          <span>Detalhada</span>
                        </div>
                      </div>

                      <div className="space-y-5 pt-4 border-t">
                        {/* Response Delay */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center mb-1">
                            <Label>Atraso de Resposta (Debounce)</Label>
                            <span className="text-sm font-semibold text-primary">
                              {responseDelay} seg
                            </span>
                          </div>
                          <Slider
                            value={[responseDelay]}
                            onValueChange={([v]) => { setResponseDelay(v); markChanged(); }}
                            min={0}
                            max={60}
                            step={1}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground italic">
                            Impede que o bot responda picado se o cliente mandar várias mensagens rápidas.
                          </p>
                        </div>

                        {/* Typing and Read status */}
                        <div className="space-y-4 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm">Mostrar Digitando</Label>
                              <p className="text-[10px] text-muted-foreground">Exibe "digitando..." para o cliente</p>
                            </div>
                            <Switch checked={showTyping} onCheckedChange={(v) => { setShowTyping(v); markChanged(); }} />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm">Marcar como Lida</Label>
                              <p className="text-[10px] text-muted-foreground">Marca mensagens como lidas automaticamente</p>
                            </div>
                            <Switch checked={markAsRead} onCheckedChange={(v) => { setMarkAsRead(v); markChanged(); }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* Actions */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-3 sticky bottom-4">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Descartar
          </Button>
          <Button onClick={handleSave} className="gap-2" disabled={updateConfig.isPending}>
            <Save className="h-4 w-4" />
            {updateConfig.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      )}
    </div>
  );
}
