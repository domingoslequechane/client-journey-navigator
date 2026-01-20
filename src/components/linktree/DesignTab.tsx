import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Palette, Image as ImageIcon, Link2, Check, Upload, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LINK_TREE_TEMPLATES, COLOR_ONLY_TEMPLATES, GOOGLE_FONTS, type LinkPage, type LinkPageTheme, type LinkTreeTemplate } from '@/types/linktree';
import { useRef } from 'react';

interface DesignTabProps {
  linkPage: LinkPage;
  updateLinkPage: (updates: Partial<LinkPage>) => Promise<unknown>;
  onChange?: () => void;
}

const BUTTON_STYLES = [
  { id: 'solid', label: 'Sólido' },
  { id: 'glass', label: 'Glass' },
  { id: 'outline', label: 'Outline' },
  { id: 'soft', label: 'Soft' },
] as const;

const BUTTON_RADIUS = [
  { id: 'pill', label: 'Pill' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'soft', label: 'Soft' },
  { id: 'square', label: 'Square' },
] as const;

export function DesignTab({ linkPage, updateLinkPage, onChange }: DesignTabProps) {
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const theme = linkPage.theme;

  const handleThemeChange = async (updates: Partial<LinkPageTheme>) => {
    setSelectedTemplateId(null);
    await updateLinkPage({
      theme: { ...theme, ...updates },
    });
    onChange?.();
  };

  const handleApplyTemplate = async (template: LinkTreeTemplate) => {
    try {
      const newTheme: LinkPageTheme = {
        backgroundColor: template.theme.backgroundColor,
        primaryColor: template.theme.primaryColor,
        textColor: template.theme.textColor,
        fontFamily: template.theme.fontFamily,
        buttonStyle: template.theme.buttonStyle,
        buttonRadius: template.theme.buttonRadius,
        // Only apply background image for templates with thumbnails (not color-only)
        backgroundImage: template.isColorOnly ? undefined : template.thumbnail,
      };

      await updateLinkPage({ theme: newTheme });
      setSelectedTemplateId(template.id);
      onChange?.();
      toast({ 
        title: 'Template aplicado!', 
        description: `O template "${template.name}" foi aplicado com sucesso.` 
      });
    } catch (error) {
      console.error('Error applying template:', error);
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível aplicar o template', 
        variant: 'destructive' 
      });
    }
  };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Selecione uma imagem válida', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'A imagem deve ter no máximo 5MB', variant: 'destructive' });
      return;
    }

    setIsUploadingBg(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `backgrounds/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('linktree-assets')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('linktree-assets')
        .getPublicUrl(fileName);

      await handleThemeChange({ backgroundImage: publicUrl });
      toast({ title: 'Imagem de fundo atualizada!' });
    } catch (error) {
      console.error('Error uploading background:', error);
      toast({ title: 'Erro', description: 'Não foi possível fazer o upload', variant: 'destructive' });
    } finally {
      setIsUploadingBg(false);
      if (bgInputRef.current) bgInputRef.current.value = '';
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 max-w-2xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="personalizar">Personalizar</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4 space-y-6">
            {/* Image Templates */}
            <div>
              <h3 className="font-semibold mb-2">Templates com Imagem</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Templates com imagens de fundo e estilos predefinidos
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {LINK_TREE_TEMPLATES.map((template) => {
                  const isSelected = selectedTemplateId === template.id || 
                    (theme.backgroundImage === template.thumbnail);

                  return (
                    <button
                      key={template.id}
                      onClick={() => handleApplyTemplate(template)}
                      className={`relative aspect-[3/4] rounded-lg overflow-hidden group transition-all ${
                        isSelected 
                          ? 'ring-2 ring-primary ring-offset-2' 
                          : 'hover:ring-2 hover:ring-primary/50'
                      }`}
                    >
                      <img
                        src={template.thumbnail}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <span className="text-white text-xs font-medium">{template.name}</span>
                      </div>
                      
                      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white/50 shadow-lg"
                          style={{ backgroundColor: template.theme.primaryColor }}
                        />
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-3 w-3" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Badge variant="secondary" className="bg-white/90">
                          Aplicar
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color-Only Templates */}
            <div>
              <h3 className="font-semibold mb-2">Templates com Cores</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Templates com cores sólidas, perfeitos para um visual limpo
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {COLOR_ONLY_TEMPLATES.map((template) => {
                  const isSelected = selectedTemplateId === template.id;

                  return (
                    <button
                      key={template.id}
                      onClick={() => handleApplyTemplate(template)}
                      className={`relative aspect-square rounded-lg overflow-hidden group transition-all ${
                        isSelected 
                          ? 'ring-2 ring-primary ring-offset-2' 
                          : 'hover:ring-2 hover:ring-primary/50'
                      }`}
                      style={{ backgroundColor: template.theme.backgroundColor }}
                    >
                      {/* Preview button style */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-3 gap-2">
                        <div
                          className="w-full h-6 rounded-full"
                          style={{
                            backgroundColor: template.theme.buttonStyle === 'outline' ? 'transparent' : template.theme.primaryColor,
                            border: template.theme.buttonStyle === 'outline' ? `2px solid ${template.theme.primaryColor}` : 'none',
                            borderRadius: template.theme.buttonRadius === 'pill' ? '9999px' :
                                          template.theme.buttonRadius === 'rounded' ? '12px' :
                                          template.theme.buttonRadius === 'soft' ? '8px' : '4px',
                          }}
                        />
                        <div
                          className="w-3/4 h-4 rounded-full opacity-50"
                          style={{
                            backgroundColor: template.theme.buttonStyle === 'outline' ? 'transparent' : template.theme.primaryColor,
                            border: template.theme.buttonStyle === 'outline' ? `2px solid ${template.theme.primaryColor}` : 'none',
                          }}
                        />
                      </div>
                      
                      <div className="absolute bottom-0 left-0 right-0 p-2 text-center">
                        <span 
                          className="text-xs font-medium"
                          style={{ color: template.theme.textColor }}
                        >
                          {template.name}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-white text-black rounded-full p-1">
                          <Check className="h-3 w-3" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Badge variant="secondary" className="bg-white/90">
                          Aplicar
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="personalizar" className="mt-4 space-y-6">
            {/* Background Image Upload */}
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <h3 className="font-semibold">Imagem de Fundo</h3>
              </div>
              
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*"
                onChange={handleBgImageUpload}
                className="hidden"
              />

              {theme.backgroundImage ? (
                <div className="space-y-3">
                  <div 
                    className="h-32 w-full rounded-lg bg-cover bg-center border relative group"
                    style={{ backgroundImage: `url(${theme.backgroundImage})` }}
                  >
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => bgInputRef.current?.click()}
                        disabled={isUploadingBg}
                      >
                        {isUploadingBg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Alterar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleThemeChange({ backgroundImage: undefined })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full h-32 border-dashed"
                  onClick={() => bgInputRef.current?.click()}
                  disabled={isUploadingBg}
                >
                  {isUploadingBg ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-6 w-6" />
                      <span>Carregar imagem de fundo</span>
                    </div>
                  )}
                </Button>
              )}
            </Card>

            {/* Colors */}
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <h3 className="font-semibold">Cores</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Fundo</Label>
                  <div className="flex gap-2 items-center mt-1">
                    <input
                      type="color"
                      value={theme.backgroundColor}
                      onChange={(e) => handleThemeChange({ backgroundColor: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border"
                    />
                    <Input
                      value={theme.backgroundColor}
                      onChange={(e) => handleThemeChange({ backgroundColor: e.target.value })}
                      className="h-10 text-xs flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Botões</Label>
                  <div className="flex gap-2 items-center mt-1">
                    <input
                      type="color"
                      value={theme.primaryColor}
                      onChange={(e) => handleThemeChange({ primaryColor: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border"
                    />
                    <Input
                      value={theme.primaryColor}
                      onChange={(e) => handleThemeChange({ primaryColor: e.target.value })}
                      className="h-10 text-xs flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Texto</Label>
                  <div className="flex gap-2 items-center mt-1">
                    <input
                      type="color"
                      value={theme.textColor}
                      onChange={(e) => handleThemeChange({ textColor: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border"
                    />
                    <Input
                      value={theme.textColor}
                      onChange={(e) => handleThemeChange({ textColor: e.target.value })}
                      className="h-10 text-xs flex-1"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Button Style */}
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                <h3 className="font-semibold">Estilo dos Botões</h3>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Tipo</Label>
                <div className="grid grid-cols-4 gap-2">
                  {BUTTON_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => handleThemeChange({ buttonStyle: style.id })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        theme.buttonStyle === style.id
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <div
                        className="w-full h-6 rounded-full"
                        style={{
                          backgroundColor: style.id === 'solid' ? theme.primaryColor :
                                          style.id === 'glass' ? `${theme.primaryColor}40` :
                                          style.id === 'soft' ? `${theme.primaryColor}30` :
                                          'transparent',
                          border: style.id === 'outline' ? `2px solid ${theme.primaryColor}` : 'none',
                        }}
                      />
                      <span className="text-xs mt-2 block">{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Bordas</Label>
                <div className="grid grid-cols-4 gap-2">
                  {BUTTON_RADIUS.map((radius) => (
                    <button
                      key={radius.id}
                      onClick={() => handleThemeChange({ buttonRadius: radius.id })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        theme.buttonRadius === radius.id
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <div
                        className="w-full h-6"
                        style={{
                          backgroundColor: theme.primaryColor,
                          borderRadius: radius.id === 'pill' ? '9999px' :
                                        radius.id === 'rounded' ? '12px' :
                                        radius.id === 'soft' ? '8px' : '4px',
                        }}
                      />
                      <span className="text-xs mt-2 block">{radius.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Font */}
            <Card className="p-4 space-y-4">
              <Label>Fonte</Label>
              <Select
                value={theme.fontFamily}
                onValueChange={(value) => handleThemeChange({ fontFamily: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOOGLE_FONTS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
