import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ColorPickerInput } from './ColorPickerInput';
import { ImageUploader } from './ImageUploader';
import type { StudioProject } from '@/types/studio';

interface ProjectFormProps {
  project?: StudioProject | null;
  onSubmit: (data: Partial<StudioProject>) => Promise<void>;
  isSubmitting: boolean;
}

const NICHE_OPTIONS = [
  'Restaurante',
  'Loja de Roupas',
  'Salão de Beleza',
  'Academia',
  'Imobiliária',
  'Clínica',
  'E-commerce',
  'Agência',
  'Educação',
  'Tecnologia',
  'Outro',
];

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Poppins',
  'Montserrat',
  'Open Sans',
  'Playfair Display',
  'Bebas Neue',
  'Oswald',
];

export function ProjectForm({ project, onSubmit, isSubmitting }: ProjectFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    niche: '',
    primary_color: '#3b82f6',
    secondary_color: '#10b981',
    font_family: 'Inter',
    ai_instructions: '',
    ai_restrictions: '',
    logo_images: [] as string[],
    reference_images: [] as string[],
    template_image: '',
  });

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
        logo_images: project.logo_images || [],
        reference_images: project.reference_images || [],
        template_image: project.template_image || '',
      });
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
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
        <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {project ? 'Guardar' : 'Criar Projeto'}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>Nome e descrição do projeto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Projeto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Ex: Campanha Black Friday"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Descreva o objetivo deste projeto..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Nicho</Label>
              <Select
                value={formData.niche}
                onValueChange={(v) => updateField('niche', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nicho" />
                </SelectTrigger>
                <SelectContent>
                  {NICHE_OPTIONS.map((niche) => (
                    <SelectItem key={niche} value={niche}>
                      {niche}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Brand Colors */}
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

            <div className="space-y-2">
              <Label>Fonte</Label>
              <Select
                value={formData.font_family}
                onValueChange={(v) => updateField('font_family', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: font }}>{font}</span>
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
                style={{ fontFamily: formData.font_family }}
              >
                Preview
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
            <CardDescription>Exemplos de estilo visual desejado</CardDescription>
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

        {/* AI Instructions */}
        <Card className="md:col-span-2">
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
                placeholder="Ex: Sempre incluir o slogan 'Qualidade que você merece'. Usar estilo minimalista. Preferir fotos ao invés de ilustrações..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai_restrictions">Restrições</Label>
              <Textarea
                id="ai_restrictions"
                value={formData.ai_restrictions}
                onChange={(e) => updateField('ai_restrictions', e.target.value)}
                placeholder="Ex: Não usar cor vermelha. Evitar textos em inglês. Nunca mencionar concorrentes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
