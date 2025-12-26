import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, FileText, Palette, Check, PenSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SimplifiedEditor } from '@/components/invoice-editor/SimplifiedEditor';

interface InvoiceTemplateSettingsProps {
  organizationId: string | null;
}

type TemplateStyle = 'modern' | 'classic' | 'minimal' | 'onix';

interface TemplateSettings {
  id?: string;
  template_style: TemplateStyle;
  show_logo: boolean;
  show_watermark: boolean;
  primary_color: string;
  footer_text: string | null;
}

const TEMPLATE_STYLES: { value: TemplateStyle; label: string; description: string }[] = [
  { value: 'onix', label: 'Onix', description: 'Design premium com cabeçalho verde-lima' },
  { value: 'modern', label: 'Moderno', description: 'Design vibrante com cabeçalho colorido' },
  { value: 'classic', label: 'Clássico', description: 'Layout tradicional com bordas definidas' },
  { value: 'minimal', label: 'Minimalista', description: 'Estilo limpo e elegante' },
];

const DEFAULT_SETTINGS: TemplateSettings = {
  template_style: 'onix',
  show_logo: true,
  show_watermark: false,
  primary_color: '#C5E86C',
  footer_text: null,
};

export function InvoiceTemplateSettings({ organizationId }: InvoiceTemplateSettingsProps) {
  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TemplateSettings>(DEFAULT_SETTINGS);
  const [editorOpen, setEditorOpen] = useState(false);
  useEffect(() => {
    if (organizationId) {
      fetchSettings();
    }
  }, [organizationId]);

  const fetchSettings = async () => {
    if (!organizationId) return;

    try {
      const { data, error } = await supabase
        .from('invoice_template_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          template_style: data.template_style as TemplateStyle,
          show_logo: data.show_logo ?? true,
          show_watermark: data.show_watermark ?? false,
          primary_color: data.primary_color || '#2962FF',
          footer_text: data.footer_text,
        });
      }
    } catch (error) {
      console.error('Error fetching invoice settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId || !isAdmin) return;

    setSaving(true);
    try {
      if (settings.id) {
        // Update existing
        const { error } = await supabase
          .from('invoice_template_settings')
          .update({
            template_style: settings.template_style,
            show_logo: settings.show_logo,
            show_watermark: settings.show_watermark,
            primary_color: settings.primary_color,
            footer_text: settings.footer_text,
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('invoice_template_settings')
          .insert({
            organization_id: organizationId,
            template_style: settings.template_style,
            show_logo: settings.show_logo,
            show_watermark: settings.show_watermark,
            primary_color: settings.primary_color,
            footer_text: settings.footer_text,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setSettings(prev => ({ ...prev, id: data.id }));
        }
      }

      toast({ title: 'Sucesso', description: 'Estilo de factura salvo' });
    } catch (error) {
      console.error('Error saving invoice settings:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Estilo de Factura
          <Badge variant="outline" className="ml-2 text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
            Em desenvolvimento
          </Badge>
        </CardTitle>
        <CardDescription>
          Escolha o estilo visual das suas facturas de prestação de serviços
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Style Selection */}
        <div className="space-y-3">
          <Label>Estilo do Template</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TEMPLATE_STYLES.map((style) => (
              <button
                key={style.value}
                type="button"
                onClick={() => isAdmin && setSettings(prev => ({ ...prev, template_style: style.value }))}
                disabled={!isAdmin}
                className={cn(
                  "relative p-4 rounded-lg border-2 text-left transition-all",
                  settings.template_style === style.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                  !isAdmin && "opacity-50 cursor-not-allowed"
                )}
              >
                {settings.template_style === style.value && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className="font-medium text-sm">{style.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{style.description}</div>
                
                {/* Mini preview */}
                <div className="mt-3 h-16 rounded border border-border overflow-hidden bg-background">
                  {style.value === 'onix' && (
                    <div className="h-full">
                      <div className="h-4 w-full bg-[#d4ff6f]" />
                      <div className="h-3 w-full bg-[#1a1a1a]" />
                      <div className="p-1 space-y-1">
                        <div className="h-1 w-14 bg-muted-foreground/20 rounded" />
                        <div className="h-1 w-10 bg-muted-foreground/20 rounded" />
                      </div>
                    </div>
                  )}
                  {style.value === 'modern' && (
                    <div className="h-full">
                      <div className="h-4 w-full" style={{ backgroundColor: settings.primary_color }} />
                      <div className="p-1 space-y-1">
                        <div className="h-1.5 w-12 bg-muted rounded" />
                        <div className="h-1 w-16 bg-muted-foreground/20 rounded" />
                      </div>
                    </div>
                  )}
                  {style.value === 'classic' && (
                    <div className="h-full p-1">
                      <div className="h-4 border border-border rounded-sm flex items-center px-1">
                        <div className="h-1.5 w-10 bg-muted rounded" />
                      </div>
                      <div className="mt-1 space-y-0.5">
                        <div className="h-1 w-14 bg-muted-foreground/20 rounded" />
                      </div>
                    </div>
                  )}
                  {style.value === 'minimal' && (
                    <div className="h-full p-1 space-y-1">
                      <div className="h-1.5 w-10 bg-foreground/70 rounded" />
                      <div className="h-0.5 w-full" style={{ backgroundColor: settings.primary_color }} />
                      <div className="h-1 w-14 bg-muted-foreground/20 rounded" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Primary Color */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Cor Principal
          </Label>
          <div className="flex items-center gap-3">
            <Input
              type="color"
              value={settings.primary_color}
              onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
              disabled={!isAdmin}
              className="w-12 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={settings.primary_color}
              onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
              disabled={!isAdmin}
              className="w-28 font-mono text-sm"
              placeholder="#2962FF"
            />
            <span className="text-sm text-muted-foreground">
              Usada no cabeçalho e destaques
            </span>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Marca d'água "ORIGINAL"</Label>
              <p className="text-xs text-muted-foreground">Adiciona marca d'água diagonal na factura</p>
            </div>
            <Switch
              checked={settings.show_watermark}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, show_watermark: checked }))}
              disabled={!isAdmin}
            />
          </div>
        </div>

        {/* Footer Text */}
        <div className="space-y-2">
          <Label>Texto do Rodapé (opcional)</Label>
          <Input
            placeholder="Ex: Obrigado pela preferência!"
            value={settings.footer_text || ''}
            onChange={(e) => setSettings(prev => ({ ...prev, footer_text: e.target.value || null }))}
            disabled={!isAdmin}
          />
        </div>

        {/* Editor Button */}
        {isAdmin && (
          <div className="pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setEditorOpen(true)}
              className="w-full gap-2"
            >
              <PenSquare className="h-4 w-4" />
              Personalizar Layout da Factura
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Reorganize secções, mostre/oculte elementos e personalize cada parte
            </p>
          </div>
        )}

        {/* Save Button */}
        {isAdmin && (
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Estilo de Factura
              </>
            )}
          </Button>
        )}
      </CardContent>

      {/* Template Editor Modal */}
      {organizationId && (
        <SimplifiedEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          organizationId={organizationId}
          primaryColor={settings.primary_color}
          settingsId={settings.id}
        />
      )}
    </Card>
  );
}
