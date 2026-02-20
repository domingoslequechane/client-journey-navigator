import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Users, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ColorPickerInput } from './ColorPickerInput';
import { ImageUploader } from './ImageUploader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { StudioProject } from '@/types/studio';
import { NICHE_OPTIONS, FONT_OPTIONS } from '@/types/studio';

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

    const description = [
      client.services?.join(', '),
      client.notes,
    ].filter(Boolean).join(' — ');

    const suggestedNiche = suggestNiche(client.services, client.notes);

    setFormData(prev => ({
      ...prev,
      name: client.company_name,
      description: description || prev.description,
      niche: suggestedNiche || prev.niche,
      client_id: clientId,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast.error('Selecione um cliente para o projeto');
      return;
    }
    await onSubmit({ ...formData, client_id: selectedClientId });
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Client Selection + Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Cliente & Informações
            </CardTitle>
            <CardDescription>Selecione o cliente para este projeto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Client Selector */}
            <div className="space-y-2">
              <Label>Cliente *</Label>
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

        {/* Brand Colors & Font */}
        <Card>
          <CardHeader>
            <CardTitle>Identidade Visual</CardTitle>
            <CardDescription>Cores e tipografia da marca</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            {/* Font Selector with Preview */}
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

            {/* Preview */}
            <div
              className="h-20 rounded-lg flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})`,
              }}
            >
              <span
                className="text-white font-bold text-lg drop-shadow-md"
                style={{ fontFamily: `"${formData.font_family}", sans-serif` }}
              >
                {formData.name || 'Preview'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Logo Images */}
        <Card>
          <CardHeader>
            <CardTitle>Logotipos</CardTitle>
            <CardDescription>Logotipos da marca para usar nos flyers</CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploader
              label=""
              images={formData.logo_images}
              onImagesChange={(v) => updateField('logo_images', v)}
              maxImages={5}
            />
          </CardContent>
        </Card>

        {/* Reference Images */}
        <Card>
          <CardHeader>
            <CardTitle>Imagens de Referência</CardTitle>
            <CardDescription>Flyers para inspirar as gerações da IA</CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploader
              label=""
              images={formData.reference_images}
              onImagesChange={(v) => updateField('reference_images', v)}
              maxImages={10}
            />
          </CardContent>
        </Card>

        {/* Template / Approved Layout */}
        <Card>
          <CardHeader>
            <CardTitle>Layout Aprovado pelo Cliente</CardTitle>
            <CardDescription>
              O layout deste flyer será replicado em todas as gerações no modo "Cópia". 
              Posição do logo, cores e tipografia são replicadas — apenas produto e texto mudam.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploader
              label=""
              images={formData.template_image ? [formData.template_image] : []}
              onImagesChange={(images) => updateField('template_image', images[0] || '')}
              maxImages={1}
            />
          </CardContent>
        </Card>

        {/* AI Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instruções para IA</CardTitle>
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
      </div>
    </form>
  );
}
