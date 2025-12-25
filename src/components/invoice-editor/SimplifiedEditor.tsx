import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { FileText, Loader2 } from 'lucide-react';
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
import { SectionCard } from './SectionCard';
import { SectionSettings } from './SectionSettings';
import { InvoicePreview } from './InvoicePreview';
import {
  InvoiceSection,
  DEFAULT_SECTIONS,
  SectionSettings as SectionSettingsType,
  PaperSize,
} from './section-types';

interface SimplifiedEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  primaryColor: string;
  settingsId?: string;
}

export function SimplifiedEditor({
  open,
  onOpenChange,
  organizationId,
  primaryColor,
  settingsId,
}: SimplifiedEditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<InvoiceSection[]>(DEFAULT_SECTIONS);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [editingSection, setEditingSection] = useState<InvoiceSection | null>(null);

  useEffect(() => {
    if (open && organizationId) {
      loadLayout();
    }
  }, [open, organizationId]);

  const loadLayout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoice_template_settings')
        .select('custom_layout, paper_size')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;

      if (data?.custom_layout) {
        const layout = data.custom_layout as { sections?: InvoiceSection[] };
        if (layout.sections && Array.isArray(layout.sections)) {
          setSections(layout.sections);
        }
      }

      if (data?.paper_size) {
        setPaperSize(data.paper_size as PaperSize);
      }
    } catch (error) {
      console.error('Erro ao carregar layout:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order values
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index,
    }));

    setSections(updatedItems);
  };

  const handleToggleVisibility = (id: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, visible: !section.visible } : section
      )
    );
  };

  const handleUpdateSettings = (sectionId: string, settings: Partial<SectionSettingsType>) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, settings: { ...section.settings, ...settings } }
          : section
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const layoutData = {
        sections: sections,
      };

      const updateData = {
        organization_id: organizationId,
        custom_layout: layoutData as any,
        paper_size: paperSize,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('invoice_template_settings')
        .upsert(updateData, { onConflict: 'organization_id' });

      if (error) throw error;

      toast({
        title: 'Layout guardado',
        description: 'O layout da factura foi guardado com sucesso.',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao guardar:', error);
      toast({
        title: 'Erro ao guardar',
        description: 'Não foi possível guardar o layout.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSections(DEFAULT_SECTIONS);
    setPaperSize('A4');
    toast({
      title: 'Layout reposto',
      description: 'O layout foi reposto para os valores padrão.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <DialogTitle>Editor de Factura</DialogTitle>
            </div>
            <Select value={paperSize} onValueChange={(v) => setPaperSize(v as PaperSize)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4</SelectItem>
                <SelectItem value="A5">A5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Sections */}
            <div className="w-1/2 border-r relative">
              {editingSection ? (
                <SectionSettings
                  section={editingSection}
                  onClose={() => setEditingSection(null)}
                  onUpdateSettings={handleUpdateSettings}
                />
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Arraste para reorganizar • Clique no ícone ⚙️ para configurar
                    </p>
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="sections">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-2"
                          >
                            {sections
                              .sort((a, b) => a.order - b.order)
                              .map((section, index) => (
                                <SectionCard
                                  key={section.id}
                                  section={section}
                                  index={index}
                                  onToggleVisibility={handleToggleVisibility}
                                  onOpenSettings={setEditingSection}
                                />
                              ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Right Panel - Preview */}
            <div className="w-1/2 bg-muted/30 p-4 flex flex-col">
              <p className="text-sm text-muted-foreground mb-3 text-center">
                Pré-visualização
              </p>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-[280px]">
                  <InvoicePreview
                    sections={sections}
                    paperSize={paperSize}
                    primaryColor={primaryColor}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <Button variant="outline" onClick={handleReset}>
            Repor Padrão
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
