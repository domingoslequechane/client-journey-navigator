import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, X } from 'lucide-react';
import { VariablePanel } from './VariablePanel';
import { EditorCanvas } from './EditorCanvas';
import { PaperSize, EditorElement, TemplateLayout, InvoiceVariable } from './types';
import { Json } from '@/integrations/supabase/types';

interface InvoiceTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
  primaryColor: string;
  settingsId?: string;
}

export function InvoiceTemplateEditor({
  open,
  onOpenChange,
  organizationId,
  primaryColor,
  settingsId,
}: InvoiceTemplateEditorProps) {
  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [draggedItem, setDraggedItem] = useState<InvoiceVariable | { type: 'element'; elementType: string } | null>(null);

  useEffect(() => {
    if (open && organizationId) {
      loadLayout();
    }
  }, [open, organizationId]);

  const loadLayout = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('invoice_template_settings')
        .select('custom_layout, paper_size')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (data.paper_size) {
          setPaperSize(data.paper_size as PaperSize);
        }
        if (data.custom_layout) {
          const layout = data.custom_layout as unknown as TemplateLayout;
          if (layout.elements) {
            setElements(layout.elements);
          }
          if (layout.paperSize) {
            setPaperSize(layout.paperSize);
          }
        }
      }
    } catch (error) {
      console.error('Error loading layout:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId || !isAdmin) return;

    setSaving(true);
    try {
      const layout: TemplateLayout = {
        paperSize,
        elements,
      };

      // Check if settings exist
      const { data: existing } = await supabase
        .from('invoice_template_settings')
        .select('id')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('invoice_template_settings')
          .update({
            custom_layout: layout as unknown as Json,
            paper_size: paperSize,
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('invoice_template_settings')
          .insert({
            organization_id: organizationId,
            custom_layout: layout as unknown as Json,
            paper_size: paperSize,
          });

        if (error) throw error;
      }

      toast({ title: 'Sucesso', description: 'Template de factura salvo' });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving layout:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar o template', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (item: InvoiceVariable | { type: 'element'; elementType: string }) => {
    setDraggedItem(item);
  };

  const handleAddElement = (type: 'text' | 'line' | 'table') => {
    const id = `el_${Date.now()}`;
    const newElement: EditorElement = {
      id,
      type,
      x: 50,
      y: 50,
      width: type === 'table' ? 400 : 150,
      height: type === 'table' ? 100 : 24,
      content: type === 'text' ? 'Texto' : undefined,
    };
    setElements([...elements, newElement]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Editor de Template de Factura</DialogTitle>
              <DialogDescription>
                Arraste variáveis e elementos para o canvas. Suporta tamanho A4 e A5.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Left panel - Variables */}
              <div className="w-64 border-r border-border p-3 overflow-hidden">
                <VariablePanel
                  onDragStart={handleDragStart}
                  onAddElement={handleAddElement}
                />
              </div>

              {/* Main canvas area */}
              <div className="flex-1 p-4 overflow-hidden flex flex-col">
                <EditorCanvas
                  paperSize={paperSize}
                  onPaperSizeChange={setPaperSize}
                  elements={elements}
                  onElementsChange={setElements}
                  primaryColor={primaryColor}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {elements.length} elemento{elements.length !== 1 ? 's' : ''} no template
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !isAdmin}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Template
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
