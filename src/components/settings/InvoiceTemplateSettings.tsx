import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent
} from '@/components/ui/dialog';
import {
  Loader2, Save, Check, Sparkles, ChevronRight,
  ChevronLeft, Palette, FileText, LayoutTemplate,
  Eye, Droplets, AlignLeft, Maximize2, Minimize2,
  Upload, ImageIcon, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SimplifiedEditor } from '@/components/invoice-editor/SimplifiedEditor';
import { InvoicePreview } from '@/components/invoice-editor/InvoicePreview';
import { DEFAULT_SECTIONS, TemplateStyle, LayoutModel } from '../invoice-editor/section-types';
import { GoogleFontPicker } from '@/components/studio/GoogleFontPicker';

/* ─────────────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────────────── */

interface TemplateSettings {
  id?: string;
  template_style: TemplateStyle;
  layout_model: LayoutModel;
  show_watermark: boolean;
  primary_color: string;
  footer_text: string | null;
  agency_logo_url: string | null;
  agency_name: string | null;
  agency_nuit: string | null;
  agency_address: string | null;
  agency_phone: string | null;
  agency_email: string | null;
  font_family: string | null;
}

const DEFAULT_SETTINGS: TemplateSettings = {
  template_style: 'onix',
  layout_model: 'classic',
  show_watermark: false,
  primary_color: '#f97316',
  footer_text: null,
  agency_logo_url: null,
  agency_name: null,
  agency_nuit: null,
  agency_address: null,
  agency_phone: null,
  agency_email: null,
  font_family: 'Inter',
};

// Layout models with their image paths
const LAYOUTS: {
  value: LayoutModel;
  label: string;
  description: string;
  imagePath: string;
}[] = [
  {
    value: 'classic',
    label: 'Clássico',
    description: 'Logo à esquerda, info à direita',
    imagePath: 'https://cgpnyuefthhghonrqitp.supabase.co/storage/v1/object/public/placeholders/layout-classic.png',
  },
  {
    value: 'centered',
    label: 'Centrado',
    description: 'Cabeçalho centralizado no topo',
    imagePath: 'https://cgpnyuefthhghonrqitp.supabase.co/storage/v1/object/public/placeholders/layout-centered.png',
  },
  {
    value: 'sidebar',
    label: 'Sidebar',
    description: 'Coluna lateral com dados da agência',
    imagePath: 'https://cgpnyuefthhghonrqitp.supabase.co/storage/v1/object/public/placeholders/layout-sidebar.png',
  },
  {
    value: 'compact',
    label: 'Compacto',
    description: 'Mais itens por página',
    imagePath: 'https://cgpnyuefthhghonrqitp.supabase.co/storage/v1/object/public/placeholders/layout-compact.png',
  },
  {
    value: 'modern_split',
    label: 'Split Moderno',
    description: 'Boxes lado a lado no cabeçalho',
    imagePath: 'https://cgpnyuefthhghonrqitp.supabase.co/storage/v1/object/public/placeholders/layout-split.png',
  },
  {
    value: 'letterhead',
    label: 'Papel Timbrado',
    description: 'Banda decorativa no topo',
    imagePath: 'https://cgpnyuefthhghonrqitp.supabase.co/storage/v1/object/public/placeholders/layout-letterhead.png',
  },
  {
    value: 'logo_hero',
    label: 'Logo Minimalista',
    description: 'Destaque para o logo à esquerda sem o título da agência',
    imagePath: 'https://cgpnyuefthhghonrqitp.supabase.co/storage/v1/object/public/placeholders/layout-logo-hero.png',
  },
  {
    value: 'logo_centered',
    label: 'Logo Central Grande',
    description: 'Logo de grandes dimensões centralizado sem texto redundante',
    imagePath: 'https://cgpnyuefthhghonrqitp.supabase.co/storage/v1/object/public/placeholders/layout-logo-centered.png',
  },
  {
    value: 'sidebar_vertical',
    label: 'Lateral Vertical',
    description: 'ID do documento na vertical à esquerda (Estilo Europeu)',
    imagePath: 'https://cgpnyuefthhghonrqitp.supabase.co/storage/v1/object/public/placeholders/layout-sidebar-vertical.png',
  },
  {
    value: 'onix_hero',
    label: 'Onix Hero',
    description: 'Header vibrante e moderno com grandes títulos (Onix Style)',
    imagePath: 'https://cgpnyuefthhghonrqitp.supabase.co/storage/v1/object/public/placeholders/layout-onix-hero.png',
  },
  {
    value: 'borcelle_navy',
    label: 'Borcelle Navy',
    description: 'Design orgânico com curvas sofisticadas e logo centralizado',
    imagePath: 'https://cgpnyuefthhghonrqitp.supabase.co/storage/v1/object/public/placeholders/layout-borcelle-navy.png',
  },
  {
    value: 'orange_geometric',
    label: 'Geométrico Laranja',
    description: 'Recortes angulares modernos com alto contraste e design técnico',
    imagePath: 'https://cgpnyuefthhghonrqitp.supabase.co/storage/v1/object/public/placeholders/layout-orange-geometric.png',
  },
  {
    value: 'purple_angular',
    label: 'Púrpura Angular',
    description: 'Estilo tecnológico com suporte integrado e foco visual no total',
    imagePath: 'https://cgpnyuefthhghonrqitp.supabase.co/storage/v1/object/public/placeholders/layout-purple-angular.png',
  },
];

// Template styles with descriptive colors for fallback preview
const STYLES: {
  value: TemplateStyle;
  label: string;
  accent: string;
  bg: string;
  dark?: boolean;
}[] = [
  { value: 'onix',            label: 'Onix',            accent: '#c5e86c', bg: '#1a1a1a', dark: true },
  { value: 'modern',          label: 'Moderno',         accent: '#f97316', bg: '#ffffff' },
  { value: 'classic',         label: 'Clássico',        accent: '#1e3a5f', bg: '#ffffff' },
  { value: 'minimal',         label: 'Minimalista',     accent: '#111111', bg: '#ffffff' },
  { value: 'cyber_neo',       label: 'Cyber Neo',       accent: '#00f2ff', bg: '#0a0a0f', dark: true },
  { value: 'corporate_pro',   label: 'Corporate Pro',   accent: '#002a5c', bg: '#f5f7fa' },
  { value: 'eco_friendly',    label: 'Eco Friendly',    accent: '#4a6741', bg: '#fdfaf5' },
  { value: 'luxury_gold',     label: 'Luxury Gold',     accent: '#d4af37', bg: '#121212', dark: true },
  { value: 'blueprint',       label: 'Blueprint',       accent: '#ffffff', bg: '#004e92', dark: true },
  { value: 'kawaii',          label: 'Kawaii',          accent: '#ff8fab', bg: '#fff5f8' },
  { value: 'minimalist_luxe', label: 'Minimalist Luxe', accent: '#000000', bg: '#ffffff' },
  { value: 'retro_80s',       label: 'Retro 80s',       accent: '#ff2d78', bg: '#240b36', dark: true },
  { value: 'space_odyssey',   label: 'Space Odyssey',   accent: '#a78bfa', bg: '#1a1c2c', dark: true },
  { value: 'artistic_brush',  label: 'Artistic Brush',  accent: '#f57c00', bg: '#fffdf9' },
  { value: 'spanish_vibe',    label: 'Estilo Espanhol', accent: '#cb2b2b', bg: '#ffffff' },
];

/* ─────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────────── */

/** A beautiful CSS-rendered mini A4 preview for styles (fallback when image not available) */
function StyleMiniPreview({ accent, bg, dark }: { accent: string; bg: string; dark?: boolean }) {
  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      {/* Header band */}
      <div className="flex items-center justify-between px-2 py-1.5" style={{ backgroundColor: accent }}>
        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
        <div className="flex flex-col items-end gap-0.5">
          <div className="h-1 w-8 rounded" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)' }} />
          <div className="h-0.5 w-5 rounded" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }} />
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 p-1.5 flex flex-col gap-1">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-0.5">
            <div className="h-1 w-10 rounded" style={{ backgroundColor: accent, opacity: 0.8 }} />
            <div className="h-0.5 w-7 rounded bg-gray-300" />
          </div>
          <div className="flex flex-col gap-0.5 items-end">
            <div className="h-0.5 w-6 rounded bg-gray-200" />
            <div className="h-0.5 w-4 rounded bg-gray-200" />
          </div>
        </div>
        {/* Table rows */}
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-1 border-b border-gray-100 pb-0.5">
            <div className="flex-1 h-0.5 rounded bg-gray-200" />
            <div className="w-3 h-0.5 rounded bg-gray-200" />
            <div className="w-4 h-0.5 rounded bg-gray-200" />
          </div>
        ))}
        {/* Total */}
        <div className="mt-auto flex justify-end">
          <div className="h-1 w-8 rounded" style={{ backgroundColor: accent, opacity: 0.7 }} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */

interface InvoiceTemplateSettingsProps {
  organizationId: string | null;
}

type Step = 'layout' | 'style' | 'customize';

export function InvoiceTemplateSettings({ organizationId }: InvoiceTemplateSettingsProps) {
  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingAI, setProcessingAI] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [step, setStep] = useState<Step>('layout');
  const aiInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<TemplateSettings>(() => {
    const cached = localStorage.getItem(`invoice_settings_v2_${organizationId}`);
    return cached ? { ...DEFAULT_SETTINGS, ...JSON.parse(cached) } : DEFAULT_SETTINGS;
  });

  // Persist to localStorage on every change
  useEffect(() => {
    if (organizationId) {
      localStorage.setItem(`invoice_settings_v2_${organizationId}`, JSON.stringify(settings));
    }
  }, [settings, organizationId]);

  // Load from DB — only runs when there's no local cache (first ever load).
  // If localStorage already has data, we trust it to avoid overwriting unsaved edits
  // when the user switches OS windows and the component re-mounts.
  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    const cached = localStorage.getItem(`invoice_settings_v2_${organizationId}`);
    if (cached) {
      // Already have local data — restore without hitting DB, preserving unsaved edits
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('invoice_template_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (!error && data) {
        const loaded: TemplateSettings = {
          id: data.id,
          template_style: data.template_style as TemplateStyle,
          layout_model: ((data as any).layout_model as LayoutModel) || 'classic',
          show_watermark: data.show_watermark ?? false,
          primary_color: data.primary_color || '#f97316',
          footer_text: data.footer_text,
          agency_logo_url: (data as any).agency_logo_url || null,
          agency_name: (data as any).agency_name || null,
          agency_nuit: (data as any).agency_nuit || null,
          agency_address: (data as any).agency_address || null,
          agency_phone: (data as any).agency_phone || null,
          agency_email: (data as any).agency_email || null,
          font_family: (data as any).font_family || 'Inter',
        };
        setSettings(loaded);
        localStorage.setItem(`invoice_settings_v2_${organizationId}`, JSON.stringify(loaded));
      }
      setLoading(false);
    })();
  }, [organizationId]);

  const handleSave = async () => {
    if (!organizationId || !isAdmin) return;
    setSaving(true);
    try {
      const payload = {
        organization_id: organizationId,
        template_style: settings.template_style,
        layout_model: settings.layout_model,
        show_watermark: settings.show_watermark,
        primary_color: settings.primary_color,
        footer_text: settings.footer_text,
        agency_logo_url: settings.agency_logo_url,
        agency_name: settings.agency_name,
        agency_nuit: settings.agency_nuit,
        agency_address: settings.agency_address,
        agency_phone: settings.agency_phone,
        agency_email: settings.agency_email,
        font_family: settings.font_family,
        show_logo: true,
      };
      const { error } = settings.id
        ? await supabase.from('invoice_template_settings').update(payload).eq('id', settings.id)
        : await supabase.from('invoice_template_settings').insert(payload).select().single();

      if (error) throw error;
      toast({ title: 'Guardado!', description: 'Configurações da factura salvas com sucesso.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAICapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingAI(true);
    try {
      toast({ title: 'A analisar imagem...', description: 'A IA está a recriar o layout.' });
      const reader = new FileReader();
      const base64 = await new Promise<string>((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke('process-invoice-image', {
        body: { image_data: base64 },
      });
      if (error) throw error;
      if (data?.primaryColor) {
        setSettings(prev => ({ ...prev, primary_color: data.primaryColor }));
      }
      window.dispatchEvent(new CustomEvent('invoice-ai-capture', { detail: data }));
      toast({ title: 'Concluído!', description: 'Layout detectado e aplicado.' });
    } catch {
      toast({ title: 'Erro', description: 'Falha ao processar a imagem.', variant: 'destructive' });
    } finally {
      setProcessingAI(false);
      if (aiInputRef.current) aiInputRef.current.value = '';
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organizationId) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${organizationId}/agency-logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setSettings(p => ({ ...p, agency_logo_url: publicUrl }));
      toast({ title: 'Logo carregado!', description: 'O logótipo foi aplicado ao modelo.' });
    } catch (err: any) {
      console.error('Logo upload error:', err);
      toast({ 
        title: 'Erro', 
        description: err.message || 'Não foi possível carregar o logo.', 
        variant: 'destructive' 
      });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  /* ── STEP LABELS ── */
  const STEPS: { id: Step; icon: React.ReactNode; label: string }[] = [
    { id: 'layout',    icon: <LayoutTemplate className="h-4 w-4" />, label: 'Estrutura' },
    { id: 'style',     icon: <Palette className="h-4 w-4" />,        label: 'Estilo' },
    { id: 'customize', icon: <Droplets className="h-4 w-4" />,       label: 'Personalizar' },
  ];
  const stepIndex = STEPS.findIndex(s => s.id === step);

  return (
    <div className="flex flex-col gap-0">
      {/* ── STICKY HEADER ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-0 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Configuração de Factura
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Defina a estrutura e visual dos seus documentos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2 h-9">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? 'A salvar...' : 'Salvar'}
            </Button>
          )}
        </div>
      </div>

      {/* ── BODY: 2 columns ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 pt-6">

        {/* LEFT: wizard */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* Step progress */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  step === s.id
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : idx < stepIndex
                    ? 'bg-primary/10 text-primary hover:bg-primary/15'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {idx < stepIndex ? <Check className="h-3.5 w-3.5" /> : s.icon}
                {s.label}
              </button>
            ))}
          </div>

          {/* ────── STEP 1: LAYOUT ────── */}
          {step === 'layout' && (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-base font-semibold mb-1 text-foreground">Estrutura do documento</h3>
                <p className="text-sm text-foreground/80">
                  Escolha como os elementos são organizados na página
                </p>
              </div>

              {/* ── AI Capture (above cards) ── */}
              <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground">Capturar Layout com IA</div>
                  <p className="text-[11px] text-foreground/70 leading-relaxed">
                    Envie uma factura existente e a IA recria o layout automaticamente
                  </p>
                </div>
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={processingAI}
                      onClick={() => aiInputRef.current?.click()}
                      className="shrink-0 gap-1.5 border-primary/30 hover:bg-primary/10 text-primary h-8 text-xs"
                    >
                      {processingAI
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> A analisar...</>
                        : <><Sparkles className="h-3.5 w-3.5" /> Enviar imagem</>
                      }
                    </Button>
                    <input ref={aiInputRef} type="file" accept="image/*" onChange={handleAICapture} className="hidden" />
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {LAYOUTS.map(layout => {
                  const selected = settings.layout_model === layout.value;
                  return (
                    <button
                      key={layout.value}
                      onClick={() => isAdmin && setSettings(p => ({ ...p, layout_model: layout.value }))}
                      disabled={!isAdmin}
                      className={cn(
                        'group relative flex flex-col rounded-xl border-2 overflow-hidden text-left transition-all duration-200',
                        selected
                          ? 'border-primary shadow-lg shadow-primary/15 scale-[1.02]'
                          : 'border-border hover:border-primary/40 hover:shadow-md',
                        !isAdmin && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {/* Image preview */}
                      <div className="aspect-[210/297] w-full relative overflow-hidden bg-muted/20">
                        <InvoicePreview
                          key={`${layout.value}-${settings.font_family}`}
                          sections={DEFAULT_SECTIONS}
                          paperSize="A4"
                          primaryColor={settings.primary_color}
                          showWatermark={false}
                          templateStyle="classic"
                          layoutModel={layout.value}
                        />
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                      </div>

                      {/* Selected checkmark */}
                      {selected && (
                        <div className="absolute top-2 right-2 z-10 h-6 w-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                          <Check className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      )}

                      {/* Label */}
                      <div className={cn(
                        'px-3 py-2.5 border-t transition-colors',
                        selected ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'
                      )}>
                        <div className={cn(
                          'font-semibold text-sm text-foreground',
                          selected && 'text-primary'
                        )}>
                          {layout.label}
                        </div>
                        <div className="text-xs text-foreground/70 mt-0.5 line-clamp-1">
                          {layout.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setStep('style')} className="gap-2">
                  Próximo: Estilo Visual
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

              {/* ────── STEP 2: STYLE ────── */}
          {step === 'style' && (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-base font-semibold mb-1 text-foreground">Estilo visual</h3>
                <p className="text-sm text-foreground/80">
                  Escolha a paleta de cores e personalidade do documento
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {STYLES.map(style => {
                  const selected = settings.template_style === style.value;
                  return (
                    <button
                      key={style.value}
                      onClick={() => isAdmin && setSettings(p => ({ ...p, template_style: style.value, primary_color: style.accent }))}
                      disabled={!isAdmin}
                      className={cn(
                        'group relative flex flex-col rounded-xl border-2 overflow-hidden text-left transition-all duration-200',
                        selected
                          ? 'border-primary shadow-lg shadow-primary/15 scale-[1.02]'
                          : 'border-border hover:border-primary/40 hover:shadow-md',
                        !isAdmin && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {/* CSS mini preview */}
                      <div className="aspect-[4/3] w-full relative overflow-hidden">
                        <StyleMiniPreview accent={style.accent} bg={style.bg} dark={style.dark} />
                      </div>

                      {/* Checkmark */}
                      {selected && (
                        <div className="absolute top-2 right-2 z-10 h-5 w-5 bg-primary rounded-full flex items-center justify-center shadow-md">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}

                      {/* Color dot + label */}
                      <div className={cn(
                        'px-2.5 py-2 border-t flex items-center gap-2 transition-colors',
                        selected ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'
                      )}>
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0 ring-1 ring-black/10"
                          style={{ backgroundColor: style.accent }}
                        />
                        <div className={cn(
                          'font-medium text-xs truncate text-foreground',
                          selected && 'text-primary'
                        )}>
                          {style.label}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setStep('layout')} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={() => setStep('customize')} className="gap-2">
                  Próximo: Personalizar
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

              {/* ────── STEP 3: CUSTOMIZE ────── */}
          {step === 'customize' && (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-base font-semibold mb-1 text-foreground">Personalização da Agência</h3>
                <p className="text-sm text-foreground/80">
                  Identidade visual e dados que aparecem nas facturas
                </p>
              </div>

              {/* Logo upload */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <Label className="font-semibold text-sm">Logótipo da Agência</Label>
                </div>
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border bg-muted/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {settings.agency_logo_url
                      ? <img src={settings.agency_logo_url} alt="Logo" className="h-full w-full object-contain p-1" />
                      : <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                    }
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <p className="text-xs text-muted-foreground">Formatos: PNG, JPG, SVG. Recomendado: fundo transparente</p>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={uploadingLogo}
                          className="gap-1.5 h-8 text-xs"
                        >
                          {uploadingLogo
                            ? <><Loader2 className="h-3 w-3 animate-spin" /> A carregar...</>
                            : <><Upload className="h-3 w-3" /> Carregar logo</>
                          }
                        </Button>
                        {settings.agency_logo_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSettings(p => ({ ...p, agency_logo_url: null }))}
                            className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive"
                          >
                            <X className="h-3 w-3" /> Remover
                          </Button>
                        )}
                      </div>
                    )}
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </div>
                </div>
              </div>

              {/* Font selection */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <AlignLeft className="h-4 w-4 text-primary" />
                  <Label className="font-semibold text-sm">Fonte do Documento</Label>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground mb-1">Escolha a tipografia que melhor representa sua marca</p>
                  <GoogleFontPicker 
                    value={settings.font_family || 'Inter'} 
                    onChange={(font) => setSettings(p => ({ ...p, font_family: font }))}
                    className={cn(!isAdmin && "opacity-60 pointer-events-none")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Agency name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome da Agência</Label>
                  <Input
                    value={settings.agency_name || ''}
                    onChange={e => setSettings(p => ({ ...p, agency_name: e.target.value || null }))}
                    disabled={!isAdmin}
                    placeholder="Ex: QUALIFY"
                    className="h-9"
                  />
                </div>
                {/* NUIT */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">NUIT</Label>
                  <Input
                    value={settings.agency_nuit || ''}
                    onChange={e => setSettings(p => ({ ...p, agency_nuit: e.target.value || null }))}
                    disabled={!isAdmin}
                    placeholder="Ex: 400123987"
                    className="h-9"
                  />
                </div>
                {/* Phone */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefone</Label>
                  <Input
                    value={settings.agency_phone || ''}
                    onChange={e => setSettings(p => ({ ...p, agency_phone: e.target.value || null }))}
                    disabled={!isAdmin}
                    placeholder="+258 84 000 0000"
                    className="h-9"
                  />
                </div>
                {/* Email */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
                  <Input
                    value={settings.agency_email || ''}
                    onChange={e => setSettings(p => ({ ...p, agency_email: e.target.value || null }))}
                    disabled={!isAdmin}
                    placeholder="info@agencia.mz"
                    className="h-9"
                  />
                </div>
                {/* Address */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Endereço</Label>
                  <Input
                    value={settings.agency_address || ''}
                    onChange={e => setSettings(p => ({ ...p, agency_address: e.target.value || null }))}
                    disabled={!isAdmin}
                    placeholder="Av. 25 de Setembro, 147 - Maputo"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Primary color */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    <Label className="font-semibold text-sm">Cor Principal</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={settings.primary_color}
                        onChange={e => setSettings(p => ({ ...p, primary_color: e.target.value }))}
                        disabled={!isAdmin}
                        className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <div className="absolute inset-0 rounded-lg pointer-events-none ring-2 ring-border" style={{ backgroundColor: settings.primary_color }} />
                    </div>
                    <Input
                      value={settings.primary_color}
                      onChange={e => setSettings(p => ({ ...p, primary_color: e.target.value }))}
                      disabled={!isAdmin}
                      className="w-28 font-mono text-sm h-10"
                      placeholder="#f97316"
                    />
                    <div className="flex-1 h-10 rounded-lg" style={{ background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.primary_color}88)` }} />
                  </div>
                </div>

                {/* Watermark */}
                <div className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-primary" />
                      <Label className="font-semibold text-sm">Marca d'água</Label>
                    </div>
                    <Switch
                      checked={settings.show_watermark}
                      onCheckedChange={v => isAdmin && setSettings(p => ({ ...p, show_watermark: v }))}
                      disabled={!isAdmin}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Adiciona "ORIGINAL" em diagonal sobre o documento</p>
                </div>

                {/* Footer text */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <AlignLeft className="h-4 w-4 text-primary" />
                    <Label className="font-semibold text-sm">Texto do Rodapé</Label>
                  </div>
                  <Input
                    value={settings.footer_text || ''}
                    onChange={e => setSettings(p => ({ ...p, footer_text: e.target.value || null }))}
                    disabled={!isAdmin}
                    placeholder="Ex: Obrigado pela preferência!"
                    className="h-10"
                  />
                </div>
              </div>

              {/* Editor de secções */}
              <div className="p-5 rounded-xl border border-border bg-card flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-sm mb-0.5">Secções do documento</div>
                  <p className="text-xs text-muted-foreground">
                    Reordene, mostre ou oculte secções como cabeçalho, cliente, serviços, totais e rodapé
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  onClick={() => setEditorOpen(true)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Editar secções
                </Button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setStep('style')} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </Button>
                {isAdmin && (
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> A salvar...</>
                      : <><Save className="h-3.5 w-3.5" /> Salvar tudo</>
                    }
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: sticky live preview */}
        <div className="hidden xl:flex flex-col gap-3 sticky top-[72px] self-start">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Pré-visualização
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
                A4 · Live
              </span>
              <button
                onClick={() => setPreviewMaximized(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Maximizar pré-visualização"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border overflow-hidden shadow-2xl bg-card">
            <div className="aspect-[210/297] relative overflow-hidden bg-white">
              <InvoicePreview
                key={`${settings.layout_model}-${settings.template_style}-${settings.font_family}`}
                sections={DEFAULT_SECTIONS}
                paperSize="A4"
                primaryColor={settings.primary_color}
                showWatermark={settings.show_watermark}
                templateStyle={settings.template_style}
                layoutModel={settings.layout_model}
                agency={{
                  name: settings.agency_name,
                  logo_url: settings.agency_logo_url,
                  nuit: settings.agency_nuit,
                  address: settings.agency_address,
                  phone: settings.agency_phone,
                  email: settings.agency_email,
                }}
              />
            </div>
            <div className="px-4 py-2.5 bg-muted/50 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-muted-foreground font-medium">Sincronizado</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {settings.layout_model} · {settings.template_style}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground text-center leading-relaxed px-2">
            Representação fiel de como a factura será gerada
          </div>
        </div>

        {/* ── PREVIEW MAXIMIZED DIALOG ── */}
        <Dialog open={previewMaximized} onOpenChange={setPreviewMaximized}>
          <DialogContent className="max-w-none w-[90vw] h-[92vh] flex flex-col p-0 overflow-hidden bg-muted/50">
            <div className="flex items-center justify-between px-5 py-3 border-b bg-background">
              <span className="font-semibold text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Pré-visualização em Escala Real
              </span>
              <Button variant="ghost" size="sm" onClick={() => setPreviewMaximized(false)} className="gap-1.5 h-8">
                <Minimize2 className="h-3.5 w-3.5" />
                Fechar
              </Button>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
              <div className="h-full max-h-full shadow-2xl" style={{ aspectRatio: '210/297' }}>
                <InvoicePreview
                  key={`maximized-${settings.layout_model}-${settings.template_style}-${settings.font_family}`}
                  sections={DEFAULT_SECTIONS}
                  paperSize="A4"
                  primaryColor={settings.primary_color}
                  showWatermark={settings.show_watermark}
                  templateStyle={settings.template_style}
                  layoutModel={settings.layout_model}
                  agency={{
                    name: settings.agency_name,
                    logo_url: settings.agency_logo_url,
                    nuit: settings.agency_nuit,
                    address: settings.agency_address,
                    phone: settings.agency_phone,
                    email: settings.agency_email,
                  }}
                  fontFamily={settings.font_family || 'Inter'}
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t bg-background text-[11px] text-muted-foreground text-center">
              {settings.layout_model} · {settings.template_style} · {settings.primary_color}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Template editor modal */}
      {organizationId && (
        <SimplifiedEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          organizationId={organizationId}
          primaryColor={settings.primary_color}
          templateStyle={settings.template_style}
          layoutModel={settings.layout_model}
          showWatermark={settings.show_watermark}
          settingsId={settings.id}
          agency={{
            name: settings.agency_name,
            logo_url: settings.agency_logo_url,
            nuit: settings.agency_nuit,
            address: settings.agency_address,
            phone: settings.agency_phone,
            email: settings.agency_email,
          }}
          fontFamily={settings.font_family || 'Inter'}
        />
      )}
    </div>
  );
}
