"use client";

import { useState, useEffect } from 'react';
import { 
  User, 
  Palette, 
  Target, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Loader2,
  Upload,
  Info,
  Briefcase,
  Globe,
  MessageSquareText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StudioQuickMenu } from './StudioQuickMenu';
import { GoogleFontPicker } from './GoogleFontPicker';

interface FlyerProjectOnboardingProps {
  onComplete: (projectData: any) => void;
  onCancel: () => void;
  projectId?: string;
}

const STEPS = [
  { id: 'client', title: 'Cliente', icon: User, description: 'Selecione o cliente deste projeto' },
  { id: 'branding', title: 'Branding', icon: Palette, description: 'Cores e identidade visual' },
  { id: 'guidelines', title: 'Diretrizes AI', icon: Target, description: 'Tom de voz e qualidade' },
];

export function FlyerProjectOnboarding({ onComplete, onCancel, projectId }: FlyerProjectOnboardingProps) {
  const { organizationId: orgId } = useOrganization();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e3a8a',
    niche: '',
    description: '',
    aiInstructions: '',
    aiRestrictions: '',
    logoUrl: '',
    websiteUrl: '',
    captionInstructions: '',
    primaryFont: 'Montserrat',
    qualityStandards: '',
    extraGuidelines: '',
  });

  // Fetch Existing Project Data if editing
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('studio_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId
  });

  useEffect(() => {
    if (project) {
      const settings = (project.settings as any) || {};
      setFormData({
        name: project.name || '',
        clientId: project.client_id || '',
        primaryColor: project.primary_color || '#3b82f6',
        secondaryColor: project.secondary_color || '#1e3a8a',
        niche: project.niche || '',
        description: project.description || '',
        aiInstructions: project.ai_instructions || '',
        aiRestrictions: project.ai_restrictions || '',
        logoUrl: project.logo_images?.[0] || '',
        websiteUrl: settings.website_url || '',
        captionInstructions: settings.caption_instructions || '',
        primaryFont: settings.primary_font || project.font_family || 'Montserrat',
        qualityStandards: settings.quality_standards || '',
        extraGuidelines: settings.extra_guidelines || ''
      });
    }
  }, [project]);

  // Fetch Clients
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, notes')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId
  });

  const resizeImage = (base64Str: string, maxWidth: number = 800, maxHeight: number = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
  
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
  
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png', 0.85)); // Logo better in PNG
      };
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const optimized = await resizeImage(base64);
      setFormData({...formData, logoUrl: optimized});
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    if (currentStepIndex === 0 && (!formData.clientId || !formData.name)) {
      toast.error('Preencha o nome do projeto e selecione um cliente');
      return;
    }
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      saveProject();
    }
  };

  const saveProject = async () => {
    if (!orgId) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let query;
      
      if (projectId) {
        query = supabase
          .from('studio_projects')
          .update({
            name: formData.name,
            client_id: formData.clientId,
            primary_color: formData.primaryColor,
            secondary_color: formData.secondaryColor,
            niche: formData.niche,
            description: formData.description,
            ai_instructions: formData.aiInstructions,
            ai_restrictions: formData.aiRestrictions,
            logo_images: formData.logoUrl ? [formData.logoUrl] : [],
            settings: { 
              ...(project?.settings as any || {}),
              website_url: formData.websiteUrl,
              caption_instructions: formData.captionInstructions,
              primary_font: formData.primaryFont,
              quality_standards: formData.qualityStandards,
              extra_guidelines: formData.extraGuidelines
            }
          })
          .eq('id', projectId);
      } else {
        query = supabase
          .from('studio_projects')
          .insert({
            name: formData.name,
            client_id: formData.clientId,
            organization_id: orgId,
            created_by: user.id,
            primary_color: formData.primaryColor,
            secondary_color: formData.secondaryColor,
            niche: formData.niche,
            description: formData.description,
            ai_instructions: formData.aiInstructions,
            ai_restrictions: formData.aiRestrictions,
            logo_images: formData.logoUrl ? [formData.logoUrl] : [],
            settings: {
              website_url: formData.websiteUrl,
              caption_instructions: formData.captionInstructions,
              primary_font: formData.primaryFont,
              quality_standards: formData.qualityStandards,
              extra_guidelines: formData.extraGuidelines
            }
          });
      }

      const { data, error } = await query.select().single();

      if (error) throw error;
      
      toast.success(`${projectId ? 'Configurações atualizadas!' : 'Projeto criado!'} Fonte: ${formData.primaryFont || 'Nenhuma'}`);
      onComplete(data);
    } catch (error: any) {
      console.error('Save Project Error:', error);
      toast.error(`Erro ao criar projeto: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const currentStep = STEPS[currentStepIndex];

  return (
    <div className="flex h-full md:h-screen bg-background relative overflow-hidden w-full">
      <div className="hidden md:block shrink-0 h-full border-r">
        <StudioQuickMenu currentToolId="flyer" />
      </div>

      <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto">
        <div className="flex flex-col min-h-full w-full max-w-4xl mx-auto px-6 pt-12 pb-32">
      {/* Header */}
      <div className="space-y-4 mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
          <Sparkles className="h-3 w-3" />
          Configuração de Especialista
        </div>
        <h1 className="text-4xl font-black tracking-tighter">
          {projectId ? 'Editar Identidade de Marca (v2)' : 'Criar Nova Identidade de Flyer (v2)'}
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          {projectId 
            ? 'Atualize as diretrizes para que a IA se mantenha fiel à evolução da marca.' 
            : 'Configure as regras da marca para que nossos agentes produzam resultados consistentes sempre.'
          }
        </p>
      </div>

      {/* Progress Pills */}
      <div className="flex items-center justify-center gap-4 mb-12">
        {STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center gap-3">
             <div className={cn(
               "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 font-bold",
               idx < currentStepIndex ? "bg-green-500 text-white" :
               idx === currentStepIndex ? "bg-primary text-white shadow-lg shadow-primary/30" :
               "bg-muted text-muted-foreground"
             )}>
               {idx < currentStepIndex ? <Check className="h-5 w-5" /> : idx + 1}
             </div>
             <div className="hidden sm:block text-left">
               <p className={cn("text-xs font-bold capitalize", idx === currentStepIndex ? "text-primary" : "text-muted-foreground")}>{step.title}</p>
               <p className="text-[10px] text-muted-foreground line-clamp-1">{step.description}</p>
             </div>
             {idx < STEPS.length - 1 && <div className="h-px w-8 bg-muted mx-2" />}
          </div>
        ))}
      </div>

      {/* Step Content Card */}
      <Card className="p-8 shadow-2xl border-primary/5 rounded-[32px] bg-gradient-to-br from-background to-muted/20 flex flex-col">
        <div className="flex-1 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {currentStep.id === 'client' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold">Nome do Projeto</Label>
                <Input 
                  placeholder="Ex: Campanhas de Natal - Sushi Express" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">Cliente</Label>
                <Select value={formData.clientId} onValueChange={id => setFormData({...formData, clientId: id})}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingClients ? (
                      <div className="p-2 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>
                    ) : clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">Nicho de Atuação</Label>
                <Input 
                  placeholder="Ex: Gastronomia Japonesa, Moda Masculina..." 
                  value={formData.niche}
                  onChange={e => setFormData({...formData, niche: e.target.value})}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>
          )}

          {currentStep.id === 'branding' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Colors Column */}
                <div className="space-y-6">
                  <div className="space-y-3 pb-6 mb-6 border-b border-primary/5">
                    <Label className="text-sm font-bold flex items-center justify-between">
                      <span>Tipografia Principal (Google Fonts)</span>
                    </Label>
                    <GoogleFontPicker 
                      value={formData.primaryFont} 
                      onChange={(val) => setFormData({...formData, primaryFont: val})} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold">Cor Primária</Label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={formData.primaryColor}
                          onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                          className="h-10 w-10 shrink-0 rounded-lg cursor-pointer border border-primary/10 p-0 overflow-hidden"
                        />
                        <Input value={formData.primaryColor} onChange={e => setFormData({...formData, primaryColor: e.target.value})} className="h-10 text-xs font-mono rounded-lg bg-muted/20 border-transparent" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-bold">Cor Secundária</Label>
                       <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={formData.secondaryColor}
                          onChange={e => setFormData({...formData, secondaryColor: e.target.value})}
                          className="h-10 w-10 shrink-0 rounded-lg cursor-pointer border border-primary/10 p-0 overflow-hidden"
                        />
                        <Input value={formData.secondaryColor} onChange={e => setFormData({...formData, secondaryColor: e.target.value})} className="h-10 text-xs font-mono rounded-lg bg-muted/20 border-transparent" />
                      </div>
                    </div>
                  </div>
                  

                </div>

                {/* Logo Column */}
                <div className="space-y-4">
                  <Label className="text-sm font-bold">Logotipo da Marca</Label>
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-32 h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden bg-muted/5 group relative",
                      formData.logoUrl ? "border-primary/20" : "border-muted-foreground/20 hover:border-primary/40"
                    )}>
                      {formData.logoUrl ? (
                        <>
                          <img src={formData.logoUrl} className="w-full h-full object-contain p-4" alt="Logo preview" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button size="sm" variant="secondary" className="h-8 rounded-lg" onClick={() => setFormData({...formData, logoUrl: ''})}>Remover</Button>
                          </div>
                        </>
                      ) : (
                        <label className="flex flex-col items-center gap-2 cursor-pointer w-full h-full justify-center">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </label>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-bold text-muted-foreground">Recomendação:</p>
                      <ul className="text-[10px] text-muted-foreground/60 space-y-1">
                        <li>• Utilize fundo transparente (PNG/SVG)</li>
                        <li>• Versão colorida ou de alto contraste</li>
                        <li>• Tamanho ideal até 800x800px</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-primary/5">
                <div className="space-y-3">
                   <Label className="text-sm font-bold flex items-center gap-2">
                     <Globe className="h-4 w-4 text-primary" />
                     Link do Site / Canal de Venda
                   </Label>
                   <Input 
                     placeholder="https://exemplo.com.br"
                     className="h-12 rounded-xl bg-muted/20 border-transparent focus-visible:bg-background transition-all"
                     value={formData.websiteUrl}
                     onChange={e => setFormData({...formData, websiteUrl: e.target.value})}
                   />
                   <p className="text-[10px] text-muted-foreground pl-1 leading-relaxed">
                     A IA usará o link como referência adicional de estilo.
                   </p>
                </div>

                <div className="space-y-3">
                   <Label className="text-sm font-bold">Breve Descrição da Marca</Label>
                   <Textarea 
                    placeholder="Explique os valores e a essência da marca..."
                    className="min-h-[100px] rounded-xl"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                   />
                </div>
              </div>
            </div>
          )}

          {currentStep.id === 'guidelines' && (
            <div className="space-y-6">
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                  <Info className="h-4 w-4" />
                  Instruções para os Agentes
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Essas regras serão seguidas rigorosamente pelo Copywriter, Fotógrafo e Designer em cada geração.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">Diretrizes Positivas (O que fazer?)</Label>
                <Textarea 
                  placeholder="Ex: Use sempre tom amigável. Destaque o frescor dos ingredientes. Use fontes modernas..."
                  className="min-h-[100px] rounded-xl"
                  value={formData.aiInstructions}
                  onChange={e => setFormData({...formData, aiInstructions: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                  Padrão de Legendas (Instagram/Facebook)
                </Label>
                <Textarea 
                  placeholder="Defina as regras para as legendas dos posts. Ex: Use muitos emojis. Use tom inspiracional. Sempre termine com uma pergunta..."
                  className="min-h-[120px] rounded-xl"
                  value={formData.captionInstructions}
                  onChange={e => setFormData({...formData, captionInstructions: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">Restrições (O que NÃO fazer?)</Label>
                <Textarea 
                  placeholder="Ex: Não use cores néon. Evite gírias informais demais. Não mostre produtos concorrentes..."
                  className="min-h-[80px] rounded-xl border-destructive/20"
                  value={formData.aiRestrictions}
                  onChange={e => setFormData({...formData, aiRestrictions: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">Padrões de Qualidade (Crítico)</Label>
                <Textarea 
                  placeholder="Ex: Todas as imagens devem ter iluminação de estúdio profissional, alta resolução e texturas realistas..."
                  className="min-h-[80px] rounded-xl"
                  value={formData.qualityStandards}
                  onChange={e => setFormData({...formData, qualityStandards: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-primary">Extra (Recomendado)</Label>
                <Textarea 
                  placeholder="Referências adicionais de estilo, links para moodboards, ou pedidos especiais de IA..."
                  className="min-h-[80px] rounded-xl border-primary/20"
                  value={formData.extraGuidelines}
                  onChange={e => setFormData({...formData, extraGuidelines: e.target.value})}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-8 mt-auto border-t border-primary/5">
            <Button 
              variant="ghost" 
              onClick={() => {
                if (currentStepIndex === 0) {
                  onCancel();
                } else {
                  setCurrentStepIndex(currentStepIndex - 1);
                }
              }} 
              className="gap-2 rounded-xl"
            >
              <ChevronLeft className="h-4 w-4" />
              {currentStepIndex === 0 ? 'Cancelar' : 'Anterior'}
            </Button>
            <Button onClick={handleNext} disabled={isSaving} className="gap-2 px-8 rounded-xl shadow-xl shadow-primary/20">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : currentStepIndex === STEPS.length - 1 ? (
                <>
                  {projectId ? 'Salvar Alterações' : 'Finalizar e Começar'}
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Próximo Passo
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Footer Spacer for better UX */}
        <div className="h-32 shrink-0" />
        </div>
      </div>
    </div>
  );
}
