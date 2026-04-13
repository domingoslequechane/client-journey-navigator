import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Sparkles, 
  Eye, 
  Globe, 
  Type, 
  Link as LinkIcon, 
  Image as ImageIcon,
  Key,
  Layout,
  Loader2,
  Check,
  ChevronRight,
  Monitor,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Insight {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  status: 'draft' | 'published';
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
}

interface InsightEditorProps {
  insight?: Insight | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InsightEditor({ insight, open, onOpenChange, onSuccess }: InsightEditorProps) {
  const [formData, setFormData] = useState<Insight>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    cover_image: null,
    status: 'draft',
    seo_title: '',
    seo_description: '',
    seo_keywords: [],
  });

  const [aiTopic, setAiTopic] = useState('');
  const [aiSourceUrl, setAiSourceUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    if (insight) {
      setFormData(insight);
    } else {
      setFormData({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        cover_image: null,
        status: 'draft',
        seo_title: '',
        seo_description: '',
        seo_keywords: [],
      });
    }
  }, [insight, open]);

  const handleGenerateAI = async () => {
    if (!aiTopic && !aiSourceUrl) {
      toast.error('Informe um tema ou link para a IA');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-insight', {
        body: { 
          action: 'generate', 
          topic: aiTopic, 
          source_url: aiSourceUrl 
        }
      });

      if (error) throw error;

      setFormData(prev => ({
        ...prev,
        ...data,
        status: 'draft'
      }));
      toast.success('Conteúdo gerado com IA!');
    } catch (error: any) {
      console.error('Error generating insight:', error);
      toast.error('Erro ao gerar conteúdo com IA');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineAI = async () => {
    if (!formData.content) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-insight', {
        body: { 
          action: 'refine', 
          current_content: formData.content 
        }
      });

      if (error) throw error;

      setFormData(prev => ({
        ...prev,
        ...data
      }));
      toast.success('Conteúdo aprimorado com IA!');
    } catch (error: any) {
      toast.error('Erro ao aprimorar conteúdo');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug) {
      toast.error('Título e Slug são obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      if (insight?.id) {
        const { error } = await supabase
          .from('insights')
          .update(formData)
          .eq('id', insight.id);
        if (error) throw error;
        toast.success('Insight atualizado');
      } else {
        const { error } = await supabase
          .from('insights')
          .insert([formData]);
        if (error) throw error;
        toast.success('Insight criado');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao salvar insight');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 overflow-hidden flex flex-col gap-0 border-none shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 bg-card border-b flex flex-row items-center justify-between shrink-0">
          <div className="space-y-1">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Plus className="h-6 w-6 text-primary" />
              {insight ? 'Editar Insight' : 'Criar Novo Insight'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Preencha os campos abaixo ou use o assistente de IA.
            </p>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
               Cancelar
             </Button>
             <Button className="gap-2 shadow-lg shadow-primary/20" onClick={handleSave} disabled={isSaving}>
               {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
               Salvar Insight
             </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
          {/* Main Editor Section */}
          <div className="flex-1 border-r bg-muted/5 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8">
              
              {/* Content Generation UI */}
              <div className="bg-primary/[0.03] border border-primary/20 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2 text-primary">
                    <Sparkles className="h-5 w-5" />
                    Assistente de IA
                  </h3>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Gemini 2.0 Flash</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tema Principal</Label>
                    <Input 
                      placeholder="Ex: Como escalar o suporte com WhatsApp" 
                      value={aiTopic}
                      onChange={e => setAiTopic(e.target.value)}
                      className="bg-background focus:ring-primary/20 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL de Inspiração (Opcional)</Label>
                    <Input 
                      placeholder="https://..." 
                      value={aiSourceUrl}
                      onChange={e => setAiSourceUrl(e.target.value)}
                      className="bg-background focus:ring-primary/20 border-border/50"
                    />
                  </div>
                </div>
                <Button 
                  className="w-full gap-2 font-bold py-6 hover:translate-y-[-2px] transition-all bg-primary shadow-xl shadow-primary/20" 
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                >
                  {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  Gerar Rascunho Completo com IA
                </Button>
              </div>

              {/* Form Fields */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold">Título do Insight</Label>
                    <Input 
                      placeholder="Um título chamativo..." 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="text-lg font-bold py-6"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Slug (URL)</Label>
                    <div className="flex items-center gap-2">
                       <span className="text-muted-foreground text-sm font-medium">/insights/</span>
                       <Input 
                        placeholder="url-amigavel" 
                        value={formData.slug}
                        onChange={e => setFormData({...formData, slug: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Resumo (Excerpt)</Label>
                  <Textarea 
                    placeholder="Breve descrição para as redes sociais e listagem..." 
                    value={formData.excerpt}
                    onChange={e => setFormData({...formData, excerpt: e.target.value})}
                    className="h-24 resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-2 relative">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-bold">Conteúdo Principal (HTML)</Label>
                    <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 gap-2" onClick={handleRefineAI} disabled={isGenerating}>
                      <Sparkles className="h-4 w-4" /> Aprimorar Texto
                    </Button>
                  </div>
                  <Textarea 
                    placeholder="Conteúdo rico em HTML..." 
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    className="min-h-[400px] font-mono text-sm leading-relaxed p-6 focus-visible:ring-primary/10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Settings & Preview */}
          <div className="w-[450px] bg-card p-6 border-l overflow-y-auto space-y-8">
            <Tabs defaultValue="metadata" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1">
                <TabsTrigger value="metadata" className="gap-2">
                  <Layout className="h-4 w-4" /> Configurações
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" /> Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="metadata" className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Cover Image Section */}
                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Imagem de Capa</Label>
                  <div className="aspect-[16/9] rounded-2xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer border-primary/20">
                     {formData.cover_image ? (
                       <>
                         <img src={formData.cover_image} alt="" className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <Button variant="secondary" size="sm" className="gap-2">
                             <ImageIcon className="h-4 w-4" /> Alterar Imagem
                           </Button>
                         </div>
                       </>
                     ) : (
                       <div className="text-center p-6">
                         <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Plus className="h-6 w-6 text-primary" />
                         </div>
                         <p className="text-sm font-bold">Gerar com IA</p>
                         <p className="text-xs text-muted-foreground px-4">Uma capa cinematográfica alinhada ao tema.</p>
                       </div>
                     )}
                  </div>
                  <Button variant="outline" className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/5">
                    <Sparkles className="h-4 w-4" /> Gerar Capa Mágica (DALL-E)
                  </Button>
                </div>

                <div className="h-px bg-border" />

                {/* SEO Section */}
                <div className="space-y-4">
                  <h4 className="font-bold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Configurações de SEO
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">SEO Title</Label>
                      <Input 
                        placeholder="Título para o Google" 
                        value={formData.seo_title}
                        onChange={e => setFormData({...formData, seo_title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">SEO Description</Label>
                      <Textarea 
                        placeholder="Meta description..." 
                        value={formData.seo_description}
                        onChange={e => setFormData({...formData, seo_description: e.target.value})}
                        className="resize-none h-20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Palavras-chave (vírgula)</Label>
                      <Input 
                        placeholder="marketing, ia, escala..." 
                        value={formData.seo_keywords.join(', ')}
                        onChange={e => setFormData({...formData, seo_keywords: e.target.value.split(',').map(s => s.trim())})}
                      />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Status Toggle */}
                <div className="p-4 bg-muted/30 rounded-2xl space-y-3 border border-border/50">
                   <Label className="text-xs font-bold uppercase text-muted-foreground">Estado da Publicação</Label>
                   <div className="flex gap-2">
                     <Button 
                        variant={formData.status === 'draft' ? 'default' : 'outline'} 
                        className="flex-1 rounded-xl"
                        onClick={() => setFormData({...formData, status: 'draft'})}
                      >
                       Rascunho
                     </Button>
                     <Button 
                        variant={formData.status === 'published' ? 'default' : 'outline'} 
                        className={cn("flex-1 rounded-xl", formData.status === 'published' ? "bg-green-600 hover:bg-green-700" : "")}
                        onClick={() => setFormData({...formData, status: 'published'})}
                      >
                       Publicar
                     </Button>
                   </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="h-[calc(90vh-160px)] animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-center gap-2 mb-4">
                  <Button 
                    variant={previewMode === 'desktop' ? 'secondary' : 'ghost'} 
                    size="icon" 
                    onClick={() => setPreviewMode('desktop')}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant={previewMode === 'mobile' ? 'secondary' : 'ghost'} 
                    size="icon"
                    onClick={() => setPreviewMode('mobile')}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className={cn(
                  "mx-auto bg-background rounded-3xl overflow-hidden border-8 border-muted shadow-2xl transition-all duration-500",
                  previewMode === 'desktop' ? "w-full aspect-video" : "w-[300px] aspect-[9/16]"
                )}>
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      <div className="h-32 rounded-xl bg-muted overflow-hidden">
                        {formData.cover_image && <img src={formData.cover_image} className="w-full h-full object-cover" />}
                      </div>
                      <h1 className={cn("font-black leading-tight", previewMode === 'desktop' ? "text-2xl" : "text-xl")}>
                        {formData.title || 'Título do Post'}
                      </h1>
                      <div className="prose prose-sm dark:prose-invert max-w-full">
                         {formData.content ? (
                           <div dangerouslySetInnerHTML={{ __html: formData.content }} />
                         ) : (
                           <p className="text-muted-foreground italic text-xs">Aguardando conteúdo...</p>
                         )}
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

const Plus = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
