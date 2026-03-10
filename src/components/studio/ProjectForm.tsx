import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Users, Info, Sparkles, Palette, FileText, LayoutTemplate, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ColorPickerInput } from './ColorPickerInput';
import { ImageUploader } from './ImageUploader';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { StudioProject } from '@/types/studio';
import {
  NICHE_OPTIONS,
  FONT_OPTIONS,
  INSPIRATION_TEMPLATES,
  InspirationTemplate
} from '@/types/studio';
import { TemplateSelector } from './TemplateSelector';
import { VisualInspirationGrid } from './VisualInspirationGrid';

interface ProjectFormProps {
  project?: StudioProject | null;
  onSubmit: (data: Partial<StudioProject>) => Promise<void>;
  isSubmitting: boolean;
}

interface ClientOption {
  id: string;
  company_name: string;
  contact_name: string;
  services: string[] | null;
  notes: string | null;
}

// Map client services to suggested niche
function suggestNiche(services: string[] | null, notes: string | null): string {
  const text = [...(services || []), notes || ''].join(' ').toLowerCase();
  const nicheMap: Record<string, string[]> = {
    'Restaurante': ['restaurante', 'comida', 'food', 'gastronomia', 'culinária', 'pizzaria', 'bar'],
    'Beleza': ['beleza', 'beauty', 'salão', 'estética', 'cabelo', 'maquiagem', 'nail'],
    'Saúde': ['saúde', 'health', 'clínica', 'médico', 'hospital', 'fisioterapia', 'dental'],
    'Tecnologia': ['tecnologia', 'tech', 'software', 'app', 'digital', 'ti', 'informática'],
    'Moda': ['moda', 'fashion', 'roupa', 'vestuário', 'loja', 'boutique'],
    'Fitness': ['fitness', 'academia', 'gym', 'treino', 'exercício', 'personal'],
    'Educação': ['educação', 'escola', 'curso', 'treinamento', 'ensino'],
    'Imobiliário': ['imobiliário', 'imóvel', 'apartamento', 'casa', 'real estate'],
    'Automóvel': ['automóvel', 'carro', 'veículo', 'auto', 'oficina', 'mecânica'],
    'Construção': ['construção', 'obra', 'arquitetura', 'engenharia', 'reforma'],
    'Pet Shop': ['pet', 'animal', 'veterinário', 'vet'],
    'Mobiliário': ['mobiliário', 'móvel', 'decoração', 'design interior'],
    'Agricultura': ['agricultura', 'agro', 'fazenda', 'rural'],
    'Ótica': ['ótica', 'óculos', 'lente'],
    'Farmácia': ['farmácia', 'medicamento', 'saúde'],
    'Joalharia': ['joalharia', 'joia', 'ouro', 'prata', 'bijuteria'],
    'Eventos': ['evento', 'festa', 'casamento', 'DJ', 'buffet'],
  };

  for (const [niche, keywords] of Object.entries(nicheMap)) {
    if (keywords.some(kw => text.includes(kw))) return niche;
  }
  return '';
}

export function ProjectForm({ project, onSubmit, isSubmitting }: ProjectFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isQIAModalOpen, setIsQIAModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    niche: '',
    primary_color: '#3b82f6',
    secondary_color: '#10b981',
    font_family: 'Inter',
    ai_instructions: '',
    ai_restrictions: '',
    footer_text: '',
    logo_images: [] as string[],
    reference_images: [] as string[],
    template_image: '',
    client_id: null as string | null,
  });

  // Fetch clients
  useEffect(() => {
    async function fetchClients() {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id, organization_id')
        .eq('id', user.id)
        .single();

      const orgId = profile?.current_organization_id || profile?.organization_id;
      if (!orgId) return;

      const { data } = await supabase
        .from('clients')
        .select('id, company_name, contact_name, services, notes')
        .eq('organization_id', orgId)
        .order('company_name', { ascending: true });

      setClients(data || []);
      setLoadingClients(false);
    }
    fetchClients();
  }, [user]);

  // Populate from existing project
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        niche: project.niche || '',
        primary_color: project.primary_color || '#3b82f6',
        secondary_color: project.secondary_color || '#10b981',
        font_family: project.font_family || 'Inter',
        ai_instructions: project.ai_instructions || '',
        ai_restrictions: project.ai_restrictions || '',
        footer_text: project.footer_text || '',
        logo_images: project.logo_images || [],
        reference_images: project.reference_images || [],
        template_image: project.template_image || '',
        client_id: project.client_id || null,
      });
      if (project.client_id) {
        setSelectedClientId(project.client_id);
      }
    }
  }, [project]);

  // Auto-fill when client is selected
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    setFormData(prev => ({
      ...prev,
      name: client.company_name,
      client_id: clientId,
    }));
  };

  const handleAutoFillWithQIA = () => {
    if (!selectedClientId) {
      toast.error('Selecione um cliente primeiro');
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    const hasServices = client.services && client.services.length > 0;
    const hasNotes = !!client.notes && client.notes.trim().length > 0;

    if (!hasServices && !hasNotes) {
      setIsQIAModalOpen(true);
      return;
    }

    const description = [
      client.services?.join(', '),
      client.notes,
    ].filter(Boolean).join(' — ');

    const suggestedNiche = suggestNiche(client.services, client.notes);

    const suggestedInstructions = `Focar em promover os principais serviços: ${client.services?.join(', ') || 'N/A'}.
${client.notes ? `Observações importantes do cliente: ${client.notes}` : ''}
Manter um tom profissional e atrativo para o público-alvo.`;

    const suggestedRestrictions = `Não utilizar textos longos.
Manter a identidade visual da marca (cores e logo).
Evitar imagens genéricas sem contexto com o nicho.`;

    const suggestedFooter = `${client.contact_name ? `${client.contact_name}, ` : ''}seunome@email.com, acompanhe nossas redes`;

    setFormData(prev => ({
      ...prev,
      description: description || prev.description,
      niche: suggestedNiche || prev.niche,
      ai_instructions: suggestedInstructions,
      ai_restrictions: suggestedRestrictions,
      footer_text: suggestedFooter
    }));

    toast.success('Informações preenchidas com sucesso pela QIA!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast.error('Selecione um cliente para o projeto');
      return;
    }
    await onSubmit({ ...formData, client_id: selectedClientId });
  };

  const handleTemplateSelect = (template: InspirationTemplate) => {
    setSelectedTemplateId(template.id);

    // Atualiza apenas as instruções de IA baseades no template
    setFormData(prev => {
      // Se já houver alguma instrução, podemos anexar ou sobrescrever.
      // Neste caso, vamos adicionar no topo se for diferente, ou substituir se a pessoa
      // quiser experimentar mudar rápido de template.
      // Para ser amigável: sempre substituímos a parte inicial e preservamos o que ela digitou manual se não foi um template passado?
      // Melhor: sobrescrever as instruções da AI que são do template anterior. 
      // Por simplicidade, vamos sobrescrever as instruções com as do template novo, 
      // mas mantendo qualquer instrução complementar anexando no final se houver.

      let newInstructions = template.ai_instructions;

      return {
        ...prev,
        ai_instructions: newInstructions
      };
    });

    toast.success(`Estilo visual definido: ${template.name}`);
  };

  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: typeof formData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          type="button"
          onClick={async () => {
            try {
              toast.info('Testando DB...');
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return toast.error('No auth');
              const { data, error } = await supabase.from('studio_projects').update({ footer_text: 'TEST 123' }).eq('id', project?.id).select('footer_text');
              if (error) throw error;
              toast.success('Sucesso DB: ' + JSON.stringify(data));
            } catch (e: any) {
              toast.error('Erro DB: ' + e.message);
            }
          }}
        >
          Teste de DB Footer
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/app/studio')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {project ? 'Editar Projeto' : 'Novo Projeto'}
          </h1>
          <p className="text-muted-foreground">
            Configure as definições de marca para geração de flyers
          </p>
        </div>
        <Button type="submit" disabled={isSubmitting || (!selectedClientId && !project)}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {project ? 'Guardar' : 'Criar Projeto'}
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Coluna 1 */}
          <div className="space-y-6">
            {/* Client Selection + Basic Info */}
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Cliente & Informações
                </CardTitle>
                <CardDescription>Selecione o cliente para este projeto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Client Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Cliente *</Label>
                    {selectedClientId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-primary bg-primary/10 hover:bg-primary/20 gap-1.5 font-medium"
                        onClick={handleAutoFillWithQIA}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Preencher com QIA
                      </Button>
                    )}
                  </div>
                  {loadingClients ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando clientes...
                    </div>
                  ) : clients.length === 0 ? (
                    <div className="p-3 rounded-lg border border-dashed text-center">
                      <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado</p>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => navigate('/app/new-client')}
                      >
                        Cadastrar cliente primeiro
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={selectedClientId}
                      onValueChange={handleClientSelect}
                      disabled={!!project}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <span className="flex items-center gap-2">
                              <span className="font-medium">{client.company_name}</span>
                              <span className="text-muted-foreground text-xs">— {client.contact_name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Name (auto-filled from client) */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Projeto *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Preenchido automaticamente pelo cliente"
                    required
                  />
                </div>

                {/* Description (auto-filled) */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Informações preenchidas automaticamente..."
                    rows={3}
                  />
                </div>

                {/* Niche (suggested) */}
                <div className="space-y-2">
                  <Label>Nicho</Label>
                  <Select
                    value={formData.niche}
                    onValueChange={(v) => updateField('niche', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sugerido com base no cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {NICHE_OPTIONS.map((niche) => (
                        <SelectItem key={niche} value={niche}>
                          {niche}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.niche && selectedClientId && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Sugerido com base nas informações do cliente
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div> {/* Fim Coluna 1 */}
          {/* Coluna 2 */}
          <div className="space-y-6">
            {/* Brand Colors & Font */}
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Identidade Visual & Logotipos
                </CardTitle>
                <CardDescription>Cores, tipografia e logotipos da marca</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ColorPickerInput
                    label="Cor Primária"
                    value={formData.primary_color}
                    onChange={(v) => updateField('primary_color', v)}
                  />

                  <ColorPickerInput
                    label="Cor Secundária"
                    value={formData.secondary_color}
                    onChange={(v) => updateField('secondary_color', v)}
                  />

                  {/* Font Selector */}
                  <div className="space-y-2">
                    <Label>Fonte</Label>
                    <Select
                      value={formData.font_family}
                      onValueChange={(v) => updateField('font_family', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {FONT_OPTIONS.map((font) => (
                          <SelectItem key={font} value={font}>
                            <span style={{ fontFamily: `"${font}", sans-serif` }} className="text-base">
                              {font} — Abc 123
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border">
                  <Label className="text-sm font-semibold mb-2 block">Logotipos Adicionais</Label>
                  <ImageUploader
                    label=""
                    images={formData.logo_images}
                    onImagesChange={(v) => updateField('logo_images', v)}
                    maxImages={5}
                  />
                </div>
              </CardContent>
            </Card>

          </div> {/* Fim Coluna 2 */}

          {/* Coluna 3 */}
          <div className="space-y-6">
            {/* AI Instructions */}

            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Instruções para IA
                </CardTitle>
                <CardDescription>
                  Orientações específicas para a geração de flyers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ai_instructions">Instruções Personalizadas</Label>
                  <Textarea
                    id="ai_instructions"
                    value={formData.ai_instructions}
                    onChange={(e) => updateField('ai_instructions', e.target.value)}
                    placeholder="Ex: Sempre incluir o slogan 'Qualidade que você merece'. Usar estilo minimalista..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_restrictions">Restrições</Label>
                  <Textarea
                    id="ai_restrictions"
                    value={formData.ai_restrictions}
                    onChange={(e) => updateField('ai_restrictions', e.target.value)}
                    placeholder="Ex: Não usar cor vermelha. Evitar textos em inglês..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footer_text">Rodapé Padrão</Label>
                  <Textarea
                    id="footer_text"
                    value={formData.footer_text}
                    onChange={(e) => updateField('footer_text', e.target.value)}
                    placeholder="Ex: 📞 +258 84 000 0000 | 📍 Av. Julius Nyerere, Maputo | @empresa.maputo"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Texto fixo que aparece no rodapé de todos os flyers gerados neste projeto.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div> {/* Fim Coluna 3 */}
        </div> {/* Fim Linha 1 */}

        {/* Linha 2 */}
        {/* Reference Images */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-primary" />
              Imagens de Referência & Inspiração Visual
            </CardTitle>
            <CardDescription>
              Selecione clássicos do design abaixo ou faça upload de Flyers que você gostou da internet.
              A IA vai cruzar essas referências com suas instruções.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VisualInspirationGrid
              selectedImages={formData.reference_images}
              onImagesChange={(v) => updateField('reference_images', v)}
              maxImages={3}
            />
          </CardContent>
        </Card>

        {/* Linha 3: Estilo Base + Layout Aprovado */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Templates de Inspiração */}
          <Card className="lg:col-span-3 border-primary/20 bg-gradient-to-br from-background to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Estilo Base e Inspiração
              </CardTitle>
              <CardDescription>
                Selecione um perfil de estilo para a IA seguir automaticamente na geração de imagens.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateSelector
                selectedTemplateId={selectedTemplateId}
                onSelectTemplate={handleTemplateSelect}
              />
            </CardContent>
          </Card>

          {/* Template / Approved Layout */}
          <Card className="lg:col-span-1 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MonitorPlay className="h-5 w-5 text-primary" />
                Layout Aprovado
              </CardTitle>
              <CardDescription>
                Referência fixa de estilo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full">
                <ImageUploader
                  label=""
                  images={formData.template_image ? [formData.template_image] : []}
                  onImagesChange={(images) => updateField('template_image', images[0] || '')}
                  maxImages={1}
                  gridClassName="grid-cols-1"
                  className="[&_div.relative.aspect-square]:aspect-[2/3] [&_div.relative.aspect-square]:h-auto [&_div.relative.aspect-square]:w-full [&_button:not(.absolute)]:aspect-[2/3] [&_button:not(.absolute)]:h-auto [&_button:not(.absolute)]:w-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>














      </div>

      <Dialog open={isQIAModalOpen} onOpenChange={setIsQIAModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-amber-500" />
              Informações Insuficientes
            </DialogTitle>
            <DialogDescription className="pt-2 text-base">
              A QIA não possui informações suficientes sobre este cliente para preencher o formulário adequadamente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Recomendamos que você continue a configurar as informações do funil deste cliente até que ele atinja a fase de <strong className="text-foreground border-b border-primary/50">Produção</strong>. Isso fornecerá contexto suficiente para a IA gerar dados mais precisos, como nicho, descrição e instruções customizadas.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsQIAModalOpen(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
