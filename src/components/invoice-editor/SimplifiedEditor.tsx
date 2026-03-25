import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { FileText, Loader2, Maximize2, Minimize2, GripVertical, Settings2, Eye, EyeOff, RotateCcw, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Draggable } from '@hello-pangea/dnd';
import { SectionSettings } from './SectionSettings';
import { InvoicePreview } from './InvoicePreview';
import { cn } from '@/lib/utils';
import {
  InvoiceSection,
  DEFAULT_SECTIONS,
  SectionSettings as SectionSettingsType,
  PaperSize,
  TemplateStyle,
  LayoutModel,
} from './section-types';
import { generateInvoicePDF } from '@/lib/invoice-pdf-service';

interface SimplifiedEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  primaryColor: string;
  showWatermark: boolean;
  templateStyle: TemplateStyle;
  layoutModel: LayoutModel;
  settingsId?: string;
  agency?: {
    name: string | null;
    logo_url: string | null;
    nuit: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  fontFamily?: string;
}

export function SimplifiedEditor({
  open,
  onOpenChange,
  organizationId,
  primaryColor,
  showWatermark,
  templateStyle,
  layoutModel,
  settingsId,
  agency,
  fontFamily = 'Inter',
}: SimplifiedEditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sections, setSections] = useState<InvoiceSection[]>(DEFAULT_SECTIONS);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [editingSection, setEditingSection] = useState<InvoiceSection | null>(null);
  const [maximized, setMaximized] = useState(false);
  const [previewMaximized, setPreviewMaximized] = useState(false);

  // AI capture listener
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.layout) applyAILayout(e.detail.layout);
    };
    window.addEventListener('invoice-ai-capture', handler);
    return () => window.removeEventListener('invoice-ai-capture', handler);
  }, [sections]);

  const applyAILayout = (layout: any) => {
    setSections(prev => prev.map(s => {
      const type = s.type as string;
      return layout[type] ? { ...s, visible: true, settings: { ...s.settings, ...layout[type] } } : s;
    }));
    toast({ title: 'Layout Aplicado', description: 'Layout capturado pela IA foi aplicado.' });
  };

  useEffect(() => {
    if (open && organizationId) loadLayout();
  }, [open, organizationId]);

  // Keep editingSection in sync when sections change
  useEffect(() => {
    if (editingSection) {
      const updated = sections.find(s => s.id === editingSection.id);
      if (updated) setEditingSection(updated);
    }
  }, [sections]);

  const loadLayout = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('invoice_template_settings')
        .select('custom_layout, paper_size')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (data?.custom_layout) {
        const layout = data.custom_layout as { sections?: InvoiceSection[] };
        if (layout.sections?.length) setSections(layout.sections);
      }
      if (data?.paper_size) setPaperSize(data.paper_size as PaperSize);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = [...sortedSections];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setSections(items.map((item, i) => ({ ...item, order: i })));
  };

  const handleToggleVisibility = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  };

  const handleUpdateSettings = (sectionId: string, settings: Partial<SectionSettingsType>) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, settings: { ...s.settings, ...settings } } : s
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('invoice_template_settings').upsert({
        organization_id: organizationId,
        custom_layout: { sections } as any,
        paper_size: paperSize,
        template_style: templateStyle,
        layout_model: layoutModel,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id' });

      toast({ title: 'Guardado!', description: 'Configuração de secções guardada com sucesso.' });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving layout:', error);
      toast({ title: 'Erro ao guardar', description: 'Não foi possível persistir as alterações.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSections(DEFAULT_SECTIONS);
    setPaperSize('A4');
    setEditingSection(null);
    toast({ title: 'Reposto', description: 'Layout reposto para os valores padrão.' });
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await generateInvoicePDF('invoice-preview-container', `factura-modelo.pdf`, paperSize);
      toast({ title: 'Download concluído' });
    } catch {
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  /* ── Preview maximized overlay ── */
  if (previewMaximized) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-none w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden bg-muted/50">
          <div className="flex items-center justify-between px-5 py-3 border-b bg-background">
            <span className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Pré-visualização — {paperSize}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading} className="gap-1.5 h-8">
                {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPreviewMaximized(false)} className="gap-1.5 h-8">
                <Minimize2 className="h-3.5 w-3.5" />
                Reduzir
              </Button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            <div id="invoice-preview-container" className="h-full max-h-full" style={{ aspectRatio: '210/297' }}>
              <InvoicePreview
                key={`${layoutModel}-${templateStyle}-${fontFamily}`}
                sections={sections}
                paperSize={paperSize}
                primaryColor={primaryColor}
                showWatermark={showWatermark}
                templateStyle={templateStyle}
                layoutModel={layoutModel}
                agency={agency}
                fontFamily={fontFamily}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col p-0 overflow-hidden transition-all duration-300',
          maximized
            ? 'max-w-none w-[96vw] h-[92vh]'
            : 'max-w-5xl w-[90vw] h-[78vh]'
        )}
      >
        {/* Header */}
        <DialogHeader className="px-5 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-primary" />
              <DialogTitle className="text-base">Editor de Secções</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select value={paperSize} onValueChange={v => setPaperSize(v as PaperSize)}>
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="A5">A5</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMaximized(m => !m)}
                title={maximized ? 'Reduzir' : 'Maximizar'}
              >
                {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden min-h-0">

            {/* LEFT: sections list or settings panel */}
            <div className="w-[280px] flex-shrink-0 border-r flex flex-col overflow-hidden">
              {editingSection ? (
                <SectionSettings
                  section={editingSection}
                  onClose={() => setEditingSection(null)}
                  onUpdateSettings={handleUpdateSettings}
                />
              ) : (
                <>
                  <div className="px-4 py-2.5 border-b bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                      Arraste para reordenar · Clique em ⚙ para configurar
                    </p>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-1.5">
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="sections">
                          {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1.5">
                              {sortedSections.map((section, index) => (
                                <Draggable key={section.id} draggableId={section.id} index={index}>
                                  {(drag, snapshot) => (
                                    <div
                                      ref={drag.innerRef}
                                      {...drag.draggableProps}
                                      className={cn(
                                        'flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all',
                                        snapshot.isDragging
                                          ? 'border-primary/50 shadow-lg bg-card scale-[1.02]'
                                          : section.visible
                                          ? 'border-border bg-card hover:border-primary/30'
                                          : 'border-dashed border-muted-foreground/20 bg-muted/20 opacity-60'
                                      )}
                                    >
                                      {/* Drag handle */}
                                      <div {...drag.dragHandleProps} className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground">
                                        <GripVertical className="h-4 w-4" />
                                      </div>
                                      {/* Label */}
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{section.label}</div>
                                      </div>
                                      {/* Toggle visibility */}
                                      <button
                                        onClick={() => handleToggleVisibility(section.id)}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                        title={section.visible ? 'Ocultar' : 'Mostrar'}
                                      >
                                        {section.visible
                                          ? <Eye className="h-3.5 w-3.5" />
                                          : <EyeOff className="h-3.5 w-3.5" />
                                        }
                                      </button>
                                      {/* Settings */}
                                      <button
                                        onClick={() => setEditingSection(section)}
                                        className="text-muted-foreground hover:text-primary transition-colors"
                                        title="Configurar"
                                      >
                                        <Settings2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>

            {/* RIGHT: preview */}
            <div className="flex-1 bg-muted/30 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/10">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Pré-visualização
                </span>
                <button
                  onClick={() => setPreviewMaximized(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-sm"
                  title="Maximizar preview"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Maximizar
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <div
                  id="invoice-preview-container"
                  className="h-full max-h-full shadow-2xl"
                  style={{ aspectRatio: '210/297' }}
                >
                  <InvoicePreview
                    key={`${layoutModel}-${templateStyle}-${fontFamily}`}
                    sections={sections}
                    paperSize={paperSize}
                    primaryColor={primaryColor}
                    showWatermark={showWatermark}
                    templateStyle={templateStyle}
                    layoutModel={layoutModel}
                    agency={agency}
                    fontFamily={fontFamily}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between flex-shrink-0 bg-background">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 h-8 text-sm text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
            Repor Padrão
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
