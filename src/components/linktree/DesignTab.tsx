import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Image as ImageIcon, Link2 } from 'lucide-react';
import { LINK_TREE_TEMPLATES, GOOGLE_FONTS, type LinkPage, type LinkPageTheme } from '@/types/linktree';

interface DesignTabProps {
  linkPage: LinkPage;
  updateLinkPage: (updates: Partial<LinkPage>) => Promise<unknown>;
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

export function DesignTab({ linkPage, updateLinkPage }: DesignTabProps) {
  const [activeTab, setActiveTab] = useState('templates');
  const theme = linkPage.theme;

  const handleThemeChange = async (updates: Partial<LinkPageTheme>) => {
    await updateLinkPage({
      theme: { ...theme, ...updates },
    });
  };

  const handleApplyTemplate = async (template: typeof LINK_TREE_TEMPLATES[0]) => {
    await updateLinkPage({
      theme: template.theme,
    });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 max-w-2xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="personalizar">Personalizar</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4 space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Escolha um template</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Cada template inclui cores, fontes, estilo de botões e layout
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {LINK_TREE_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleApplyTemplate(template)}
                  className="relative aspect-[3/4] rounded-lg overflow-hidden group hover:ring-2 hover:ring-primary transition-all"
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
                  {/* Preview circle */}
                  <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white/50"
                      style={{ backgroundColor: template.theme.primaryColor }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="personalizar" className="mt-4 space-y-6">
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

            {/* Background Image */}
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <h3 className="font-semibold">Imagem de Fundo</h3>
              </div>
              <Tabs defaultValue="url">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="url">URL</TabsTrigger>
                  <TabsTrigger value="upload" disabled>Upload</TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="mt-3">
                  <Input
                    value={theme.backgroundImage || ''}
                    onChange={(e) => handleThemeChange({ backgroundImage: e.target.value })}
                    placeholder="Cole a URL da imagem de fundo"
                  />
                </TabsContent>
              </Tabs>
            </Card>

            {/* Button Style */}
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                <h3 className="font-semibold">Estilo dos Botões</h3>
              </div>
              
              {/* Style */}
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

              {/* Radius */}
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
                    <SelectItem key={font} value={font}>
                      {font}
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
