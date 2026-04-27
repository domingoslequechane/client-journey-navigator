import { useState, useRef } from 'react';
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
  UserRound,
  Users,
  Upload,
  FileSpreadsheet,
  Trash2,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
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
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { AtendeAIInstance } from '@/types';

interface AtendeTrainingTabProps {
  instance: AtendeAIInstance;
  updateConfig: { mutateAsync: (updates: Partial<AtendeAIInstance>) => Promise<AtendeAIInstance>; isPending: boolean };
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
    title: 'Mensagem de boas-vindas',
    description: 'Como o atendente vai cumprimentar quem entrar em contacto',
    icon: MessageCircle,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-500/10',
  },
  {
    id: 'company',
    title: 'Informações da empresa',
    description: 'Nome, ramo de actividade e descrição geral do negócio',
    icon: Building2,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
  },
  {
    id: 'hours',
    title: 'Horário de funcionamento',
    description: 'Dias e horários em que a empresa está aberta',
    icon: Clock,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-500/10',
  },
  {
    id: 'address',
    title: 'Endereço e localização',
    description: 'Onde a empresa se encontra e como chegar',
    icon: MapPin,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-500/10',
  },
  {
    id: 'instructions',
    title: 'Instruções de atendimento',
    description: 'Como o atendente deve se comportar e o que pode ou não fazer',
    icon: Sparkles,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-500/10',
  },
  {
    id: 'extra',
    title: 'Informações extras',
    description: 'Produtos, serviços, preços ou qualquer outra informação útil',
    icon: FileText,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-500/10',
  },
  {
    id: 'spreadsheet',
    title: 'Catálogo / Planilha de dados',
    description: 'Envie uma planilha Excel ou CSV com produtos, serviços e preços',
    icon: FileSpreadsheet,
    iconColor: 'text-teal-600',
    iconBg: 'bg-teal-500/10',
  },
  {
    id: 'human_intervention',
    title: 'Intervenção humana',
    description: 'Pausa automática e transição para atendimento humano',
    icon: UserRound,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-500/10',
  },
  {
    id: 'chat_behavior',
    title: 'Comportamento no chat',
    description: 'Atraso de resposta, tamanho das mensagens e marcação de leitura',
    icon: Clock,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-500/10',
  },
];

const RESPONSE_SIZE_LABELS: Record<number, string> = {
  1: 'Curta',
  2: 'Média',
  3: 'Longa',
};

export function AtendeTrainingTab({ instance, updateConfig }: AtendeTrainingTabProps) {
  const [name, setName] = useState(instance.name);
  const [welcomeMessage, setWelcomeMessage] = useState(instance.welcome_message || '');
  const [companyName, setCompanyName] = useState(instance.company_name || '');
  const [companyDescription, setCompanyDescription] = useState(instance.company_description || '');
  const [companySector, setCompanySector] = useState(instance.company_sector || '');
  const [businessHours, setBusinessHours] = useState(instance.business_hours || '');
  const [address, setAddress] = useState(instance.address || '');
  const [addressReference, setAddressReference] = useState(instance.address_reference || '');
  const [instructions, setInstructions] = useState(instance.instructions || '');
  const [extraInfo, setExtraInfo] = useState(instance.extra_info || '');
  const [responseSize, setResponseSize] = useState(instance.response_size || 2);
  const [responseDelay, setResponseDelay] = useState(instance.response_delay_seconds ?? 3);
  const [showTyping, setShowTyping] = useState(instance.show_typing ?? true);
  const [typingDelay, setTypingDelay] = useState(instance.typing_delay_seconds ?? 2);
  const [markAsRead, setMarkAsRead] = useState(instance.mark_as_read ?? true);
  const [humanPauseDuration, setHumanPauseDuration] = useState(instance.human_pause_duration || 60);
  const [trainingDataText, setTrainingDataText] = useState(instance.training_data_text || '');
  const [trainingDataFilename, setTrainingDataFilename] = useState(instance.training_data_filename || '');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      toast.error('Nome do atendente é obrigatório');
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
        typing_delay_seconds: typingDelay,
        mark_as_read: markAsRead,
        human_pause_duration: humanPauseDuration,
        training_data_text: trainingDataText || null,
        training_data_filename: trainingDataFilename || null,
      } as any);
      setHasChanges(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleReset = () => {
    setName(instance.name);
    setWelcomeMessage(instance.welcome_message || '');
    setCompanyName(instance.company_name || '');
    setCompanyDescription(instance.company_description || '');
    setCompanySector(instance.company_sector || '');
    setBusinessHours(instance.business_hours || '');
    setAddress(instance.address || '');
    setAddressReference(instance.address_reference || '');
    setInstructions(instance.instructions || '');
    setExtraInfo(instance.extra_info || '');
    setResponseSize(instance.response_size || 2);
    setResponseDelay(instance.response_delay_seconds ?? 3);
    setShowTyping(instance.show_typing ?? true);
    setTypingDelay(instance.typing_delay_seconds ?? 2);
    setMarkAsRead(instance.mark_as_read ?? true);
    setHumanPauseDuration(instance.human_pause_duration || 60);
    setTrainingDataText(instance.training_data_text || '');
    setTrainingDataFilename(instance.training_data_filename || '');
    setHasChanges(false);
  };

  // ─── Excel/CSV file parsing ───
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Ficheiro muito grande. Máximo: ${maxSizeMB}MB`);
      return;
    }

    setIsParsingFile(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      const allText: string[] = [];
      
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
        
        if (jsonData.length === 0) continue;
        
        if (workbook.SheetNames.length > 1) {
          allText.push(`### ${sheetName}`);
        }
        
        const headers = Object.keys(jsonData[0]);
        
        // Format as structured text: each row as a clear block
        jsonData.forEach((row, idx) => {
          const lines = headers
            .filter(h => row[h] !== '' && row[h] !== null && row[h] !== undefined)
            .map(h => `${h}: ${row[h]}`);
          if (lines.length > 0) {
            allText.push(`--- REGISTO ${idx + 1} ---`);
            allText.push(lines.join('\n'));
          }
        });
        
        allText.push('');
      }
      
      const resultText = allText.join('\n').trim();
      
      if (!resultText) {
        toast.error('A planilha parece estar vazia. Verifique o conteúdo do ficheiro.');
        setIsParsingFile(false);
        return;
      }
      
      // Check if the text is too large (keep under ~30KB for prompt)
      if (resultText.length > 30000) {
        toast.warning(`Ficheiro muito extenso (${(resultText.length / 1000).toFixed(0)}KB). Limite: 30KB. Tente reduzir as linhas.`);
        setIsParsingFile(false);
        return;
      }
      
      setTrainingDataText(resultText);
      setTrainingDataFilename(file.name);
      markChanged();
      
      const rowCount = resultText.split('\n').filter(l => l.trim()).length;
      toast.success(`${file.name} processado com sucesso! ${rowCount} registos importados.`);
    } catch (err: any) {
      console.error('Error parsing file:', err);
      toast.error('Erro ao processar o ficheiro. Verifique se é um Excel (.xlsx/.xls) ou CSV válido.');
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveTrainingData = () => {
    setTrainingDataText('');
    setTrainingDataFilename('');
    markChanged();
  };

  // ─── AI Auto-fill ───
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const handleAIGenerate = async () => {
    if (!aiDescription.trim()) {
      toast.error('Descreva o seu negócio antes de gerar.');
      return;
    }

    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-agent-training', {
        body: {
          instance_id: instance.id,
          user_description: aiDescription,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const d = data?.data;
      if (!d) throw new Error('Resposta vazia da IA');

      // Fill all fields
      if (d.welcome_message) { setWelcomeMessage(d.welcome_message); }
      if (d.company_name) { setCompanyName(d.company_name); }
      if (d.company_sector) { setCompanySector(d.company_sector); }
      if (d.company_description) { setCompanyDescription(d.company_description); }
      if (d.business_hours) { setBusinessHours(d.business_hours); }
      if (d.address) { setAddress(d.address); }
      if (d.address_reference) { setAddressReference(d.address_reference); }
      if (d.instructions) { setInstructions(d.instructions); }
      if (d.extra_info) { setExtraInfo(d.extra_info); }

      setHasChanges(true);
      setAiModalOpen(false);
      setAiDescription('');

      // Open all sections so user can see what was filled
      setOpenSections(['welcome', 'company', 'hours', 'address', 'instructions', 'extra']);

      toast.success('Campos preenchidos com IA! Revise e ajuste antes de salvar.');
    } catch (err: any) {
      console.error('AI generate error:', err);
      toast.error(err.message || 'Erro ao gerar treinamento com IA.');
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Instance Name + AI Button */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <Label htmlFor="instance-name">Nome do atendente</Label>
              <Input
                id="instance-name"
                value={name}
                onChange={(e) => { setName(e.target.value); markChanged(); }}
                placeholder="Ex: Atendente Virtual"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setAiModalOpen(true)}
              className="h-10 gap-2 mt-5 shrink-0 border-[#ff7a00]/30 text-[#ff7a00] hover:bg-[#ff7a00]/10 hover:text-[#ff7a00] font-bold text-xs transition-all"
            >
              <Sparkles className="h-4 w-4" />
              Preencher com IA
            </Button>
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
                        <Label>Nome da empresa</Label>
                        <Input
                          value={companyName}
                          onChange={(e) => { setCompanyName(e.target.value); markChanged(); }}
                          placeholder="Ex: Restaurante Sabores"
                        />
                      </div>
                      <div>
                        <Label>Ramo de actividade</Label>
                        <Input
                          value={companySector}
                          onChange={(e) => { setCompanySector(e.target.value); markChanged(); }}
                          placeholder="Ex: Restauração, Tecnologia, Beleza..."
                        />
                      </div>
                      <div>
                        <Label>Descrição do negócio</Label>
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
                        O atendente usará essa informação para responder perguntas sobre horários
                      </p>
                    </>
                  )}

                  {/* Address */}
                  {section.id === 'address' && (
                    <>
                      <div>
                        <Label>Endereço completo</Label>
                        <Input
                          value={address}
                          onChange={(e) => { setAddress(e.target.value); markChanged(); }}
                          placeholder="Ex: Av. Julius Nyerere, 1234 — Maputo"
                        />
                      </div>
                      <div>
                        <Label>Ponto de referência</Label>
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
                        placeholder={`Descreva como o atendente deve se comportar. Ex:\n- Seja sempre educado e simpático\n- Responda sempre em português\n- Se não souber a resposta, peça que o cliente ligue para a empresa\n- Não invente informações`}
                        rows={6}
                      />
                      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        Essas regras definem a personalidade e os limites do atendente
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
                        Quanto mais informação, melhor o atendente vai conseguir ajudar os clientes
                      </p>
                    </>
                  )}

                  {/* Spreadsheet Upload */}
                  {section.id === 'spreadsheet' && (
                    <div className="space-y-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      
                      {trainingDataFilename ? (
                        <div className="space-y-3">
                          {/* Uploaded file card */}
                          <div className="flex items-center gap-3 p-3 rounded-xl border border-teal-500/20 bg-teal-500/5">
                            <div className="p-2 rounded-lg bg-teal-500/10">
                              <CheckCircle2 className="h-5 w-5 text-teal-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-teal-700 dark:text-teal-400 truncate">{trainingDataFilename}</p>
                              <p className="text-[10px] text-teal-600/60 dark:text-teal-400/50">
                                {(trainingDataText.length / 1000).toFixed(1)}KB · {trainingDataText.split('\n').filter(l => l.trim()).length} registos
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isParsingFile}
                                className="h-8 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-500/10"
                              >
                                <Upload className="h-3.5 w-3.5 mr-1" />
                                Substituir
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleRemoveTrainingData}
                                className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Preview */}
                          <div>
                            <Label className="text-xs mb-1.5 block">Pré-visualização dos dados importados</Label>
                            <div className="relative">
                              <Textarea
                                value={trainingDataText}
                                onChange={(e) => { setTrainingDataText(e.target.value); markChanged(); }}
                                rows={8}
                                className="text-xs font-mono bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                              />
                              <p className="text-[10px] text-muted-foreground mt-1.5 flex items-start gap-1.5">
                                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                                Pode editar o texto directamente. Estas informações serão usadas pelo agente para responder perguntas.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isParsingFile}
                          className={cn(
                            "w-full flex flex-col items-center justify-center gap-3 py-10 px-6 rounded-xl border-2 border-dashed transition-all",
                            "border-zinc-200 dark:border-zinc-800 hover:border-teal-500/40 hover:bg-teal-500/5",
                            "text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400",
                            isParsingFile && "opacity-60 cursor-wait"
                          )}
                        >
                          {isParsingFile ? (
                            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                          ) : (
                            <div className="p-3 rounded-xl bg-teal-500/10">
                              <Upload className="h-6 w-6 text-teal-500" />
                            </div>
                          )}
                          <div className="text-center">
                            <p className="text-sm font-semibold">
                              {isParsingFile ? 'A processar ficheiro...' : 'Enviar planilha de dados'}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Excel (.xlsx, .xls) ou CSV — Máximo 5MB
                            </p>
                          </div>
                        </button>
                      )}

                      <p className="text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                        <Info className="h-3 w-3 mt-0.5 shrink-0" />
                        Ideal para catálogos de produtos, tabelas de preços, listas de serviços e FAQs.
                        O agente usará estes dados para responder perguntas dos clientes com precisão.
                      </p>
                    </div>
                  )}

                  {/* Human Intervention */}
                  {section.id === 'human_intervention' && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-1">
                          <Label>Tempo de pausa (minutos)</Label>
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
                          O atendente IA ficará em silêncio por este tempo após um atendente humano enviar uma mensagem.
                          O atendente voltará a responder automaticamente após esse período.
                        </p>
                      </div>

                      <div className="pt-4 border-t">
                        <Label className="text-sm font-medium block mb-2">Transição automática</Label>
                        <p className="text-xs text-muted-foreground mb-4">
                          O bot chamará um colega humano se não souber responder ou se o cliente solicitar.
                        </p>
                        <div className="p-3 rounded-lg border bg-blue-50/50 flex items-start gap-3">
                          <Users className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-xs font-medium">Handoff ativado</p>
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
                          <Label>Tamanho das respostas</Label>
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
                            <Label>Atraso de resposta (debounce)</Label>
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
                              <Label className="text-sm">Mostrar digitando</Label>
                              <p className="text-[10px] text-muted-foreground">Exibe "digitando..." para o cliente</p>
                            </div>
                            <Switch checked={showTyping} onCheckedChange={(v) => { setShowTyping(v); markChanged(); }} />
                          </div>

                          {showTyping && (
                            <div className="space-y-4 pl-4 pt-2 border-l-2 border-primary/10 ml-2">
                              <div className="flex justify-between items-center mb-1">
                                <Label className="text-xs">Tempo de digitação</Label>
                                <span className="text-xs font-semibold text-primary">
                                  {typingDelay} seg
                                </span>
                              </div>
                              <Slider
                                value={[typingDelay]}
                                onValueChange={([v]) => { setTypingDelay(v); markChanged(); }}
                                min={1}
                                max={15}
                                step={1}
                                className="w-full"
                              />
                              <p className="text-[10px] text-muted-foreground italic">
                                Define por quanto tempo o status "digitando..." aparecerá antes da resposta ser enviada.
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm">Marcar como lida</Label>
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
            {updateConfig.isPending ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      )}

      {/* AI Auto-fill Modal */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0 shadow-2xl [&>button]:hidden">
          {/* Header */}
          <div className="relative px-6 pt-8 pb-6 text-white text-center bg-gradient-to-br from-[#ff7a00] via-amber-500 to-yellow-400">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
                {aiGenerating
                  ? <Loader2 className="h-7 w-7 text-white animate-spin" />
                  : <Sparkles className="h-7 w-7 text-white" />
                }
              </div>
              <h2 className="text-lg font-bold mb-1">Preencher com Inteligência Artificial</h2>
              <p className="text-white/80 text-xs leading-relaxed">
                Descreva o seu negócio com o máximo de detalhes.
                A IA gerará todos os campos de treinamento automaticamente.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4 bg-card">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Descreva o seu negócio</Label>
              <Textarea
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
                placeholder={`Exemplo:\n\nSomos a Padaria Estrela, localizada no centro de Maputo. Vendemos pão fresco, bolos de aniversário, salgados e cafés. Funcionamos de segunda a sábado das 6h às 20h. Fazemos entregas para encomendas acima de 500 MT. Nossos bolos custam entre 800 e 3000 MT dependendo do tamanho...`}
                rows={8}
                className="text-sm resize-none bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-[#ff7a00]/30 focus-visible:border-[#ff7a00]/50"
                disabled={aiGenerating}
              />
              <p className="text-[10px] text-muted-foreground mt-2 flex items-start gap-1.5">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Inclua: nome, ramo, produtos/serviços, preços, horário, endereço, regras especiais, etc.
                Quanto mais detalhes, melhor o resultado.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 bg-card">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => { setAiModalOpen(false); setAiDescription(''); }}
                disabled={aiGenerating}
              >
                Cancelar
              </Button>
              <Button
                className="flex-[1.5] h-11 gap-2 bg-gradient-to-r from-[#ff7a00] to-amber-500 hover:from-[#e66d00] hover:to-amber-600 border-0 text-white font-bold"
                onClick={handleAIGenerate}
                disabled={aiGenerating || !aiDescription.trim()}
              >
                {aiGenerating
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> A gerar...</>
                  : <><Sparkles className="h-4 w-4" /> Gerar Treinamento</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
