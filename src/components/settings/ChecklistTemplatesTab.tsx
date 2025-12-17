import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, GripVertical, Loader2, Save, Edit2, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AnimatedContainer } from '@/components/ui/animated-container';

interface ChecklistTemplate {
  id: string;
  stage: string;
  title: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
}

const STAGES = [
  { id: 'prospeccao', name: 'Prospecção de Leads' },
  { id: 'reuniao', name: 'Qualificação e Proposta' },
  { id: 'contratacao', name: 'Fechamento e Onboarding' },
  { id: 'producao', name: 'Configurações Iniciais' },
  { id: 'trafego', name: 'Produção Contínua' },
  { id: 'retencao', name: 'Gestão de Campanhas' },
  { id: 'fidelizacao', name: 'Fidelização e Sucesso' },
];

export function ChecklistTemplatesTab() {
  const { user } = useAuth();
  const { organization } = useSubscription();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>('prospeccao');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ChecklistTemplate | null>(null);

  // Form state for new/editing template
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_required: false,
  });

  useEffect(() => {
    if (organization?.id) {
      fetchTemplates();
    }
  }, [organization?.id]);

  const fetchTemplates = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('organization_id', organization.id)
        .order('stage')
        .order('sort_order');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os templates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!organization?.id || !formData.title.trim()) {
      toast({ title: 'Erro', description: 'Preencha o título do item', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('checklist_templates')
          .update({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            is_required: formData.is_required,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Item atualizado' });
      } else {
        // Create new
        const stageTemplates = templates.filter(t => t.stage === selectedStage);
        const maxOrder = stageTemplates.length > 0 ? Math.max(...stageTemplates.map(t => t.sort_order)) : 0;

        const { error } = await supabase
          .from('checklist_templates')
          .insert({
            organization_id: organization.id,
            stage: selectedStage,
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            is_required: formData.is_required,
            sort_order: maxOrder + 1,
          });

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Item adicionado' });
      }

      setFormData({ title: '', description: '', is_required: false });
      setEditingId(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (template: ChecklistTemplate) => {
    setEditingId(template.id);
    setSelectedStage(template.stage);
    setFormData({
      title: template.title,
      description: template.description || '',
      is_required: template.is_required,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', is_required: false });
  };

  const openDeleteDialog = (template: ChecklistTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      const { error } = await supabase
        .from('checklist_templates')
        .delete()
        .eq('id', templateToDelete.id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Item removido' });
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({ title: 'Erro', description: 'Não foi possível remover', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const filteredTemplates = templates.filter(t => t.stage === selectedStage);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatedContainer animation="fade-up">
        <Card>
          <CardHeader>
            <CardTitle>Checklists Personalizados</CardTitle>
            <CardDescription>
              Crie e gerencie itens de checklist personalizados para cada etapa da jornada do cliente.
              Estes itens serão aplicados a todos os novos clientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stage selector */}
            <div className="space-y-2">
              <Label>Selecione a Etapa</Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma etapa" />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Add/Edit form */}
            <div className="border border-border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">{editingId ? 'Editar Item' : 'Adicionar Novo Item'}</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Realizar ligação de qualificação"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição detalhada do item..."
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_required}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, is_required: checked }))}
                  />
                  <Label>Item obrigatório</Label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveTemplate} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {editingId ? 'Salvar Alterações' : 'Adicionar Item'}
                  </Button>
                  {editingId && (
                    <Button variant="outline" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* List of templates for selected stage */}
            <div className="space-y-2">
              <h4 className="font-medium">
                Itens da etapa "{STAGES.find(s => s.id === selectedStage)?.name}" ({filteredTemplates.length})
              </h4>
              {filteredTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum item personalizado para esta etapa
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map((template, index) => (
                    <AnimatedContainer key={template.id} animation="fade-up" delay={index * 0.05}>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {template.title}
                            {template.is_required && <span className="text-destructive ml-1">*</span>}
                          </p>
                          {template.description && (
                            <p className="text-sm text-muted-foreground truncate">{template.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(template)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </AnimatedContainer>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </AnimatedContainer>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o item "{templateToDelete?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
