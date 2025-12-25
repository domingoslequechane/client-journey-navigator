import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlanLimits, PlanType } from '@/hooks/usePlanLimits';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, Save, Edit2, X, FileText, Star, Lock, ArrowUpRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { DocumentType, DOCUMENT_TYPE_LABELS } from '@/types';

const PLAN_NAMES: Record<PlanType, string> = {
  free: 'Bússola',
  starter: 'Lança',
  pro: 'Arco',
  agency: 'Catapulta',
};

interface ContractTemplate {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
  document_type: DocumentType;
}

const DEFAULT_TEMPLATE = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARKETING DIGITAL

CONTRATANTE:
Nome/Razão Social: {{empresa_cliente}}
Representante: {{nome_contato}}
Email: {{email_cliente}}
Telefone: {{telefone_cliente}}
Endereço: {{endereco_cliente}}

CONTRATADA:
{{nome_agencia}}
Sede: {{sede_agencia}}
NUIT: {{nuit_agencia}}
Representante: {{representante_agencia}}
Cargo: {{cargo_representante}}

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação de serviços de marketing digital pela CONTRATADA à CONTRATANTE, conforme descrito abaixo:

Serviços Contratados:
{{servicos_contratados}}

CLÁUSULA 2ª - DO PRAZO
O presente contrato terá duração de 12 (doze) meses, com início em {{data_inicio}} e término previsto para {{data_termino}}, podendo ser renovado mediante acordo entre as partes.

CLÁUSULA 3ª - DO VALOR E FORMA DE PAGAMENTO
Pelo serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor mensal de {{valor_mensal}} ({{valor_mensal_extenso}}), a ser pago até o dia {{dia_vencimento}} de cada mês.

{{#if valor_trafego}}
Adicionalmente, a CONTRATANTE investirá em tráfego pago o valor mensal de {{valor_trafego}} ({{valor_trafego_extenso}}).
{{/if}}

CLÁUSULA 4ª - DAS OBRIGAÇÕES DA CONTRATADA
a) Executar os serviços com qualidade e profissionalismo;
b) Manter sigilo sobre informações confidenciais;
c) Apresentar relatórios mensais de resultados;
d) Cumprir os prazos estabelecidos.

CLÁUSULA 5ª - DAS OBRIGAÇÕES DA CONTRATANTE
a) Fornecer acessos e materiais necessários;
b) Efetuar os pagamentos nas datas acordadas;
c) Aprovar conteúdos em tempo hábil;
d) Comunicar alterações relevantes ao negócio.

CLÁUSULA 6ª - DA RESCISÃO
O presente contrato poderá ser rescindido por qualquer das partes, mediante aviso prévio de 30 (trinta) dias.

CLÁUSULA 7ª - DO FORO
Fica eleito o foro da cidade de {{cidade_foro}} para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato.

E por estarem assim justas e contratadas, assinam o presente instrumento em duas vias de igual teor.

{{cidade_foro}}, {{data_assinatura}}


_________________________________
{{nome_agencia}}
CONTRATADA


_________________________________
{{empresa_cliente}}
CONTRATANTE`;

export function ContractTemplatesTab() {
  const { organization } = useSubscription();
  const { canAddContractTemplate, planType, limits } = usePlanLimits();
  const { isAdmin } = useUserRole();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ContractTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    content: '',
    is_default: false,
    document_type: 'contract' as DocumentType,
  });

  const maxTemplates = limits.maxContractTemplates;
  const isUnlimited = maxTemplates === null;
  const limitReached = !canAddContractTemplate && !editingId;

  useEffect(() => {
    if (organization?.id) {
      fetchTemplates();
    }
  }, [organization?.id]);

  const fetchTemplates = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('organization_id', organization.id)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      setTemplates((data || []).map(t => ({
        ...t,
        document_type: (t.document_type || 'contract') as DocumentType
      })));
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os templates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!organization?.id || !formData.name.trim() || !formData.content.trim()) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // If this is being set as default, remove default from others
      if (formData.is_default) {
        await supabase
          .from('contract_templates')
          .update({ is_default: false })
          .eq('organization_id', organization.id);
      }

      if (editingId) {
        const { error } = await supabase
          .from('contract_templates')
          .update({
            name: formData.name.trim(),
            content: formData.content.trim(),
            is_default: formData.is_default,
            document_type: formData.document_type,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Template atualizado' });
      } else {
        const { error } = await supabase
          .from('contract_templates')
          .insert({
            organization_id: organization.id,
            name: formData.name.trim(),
            content: formData.content.trim(),
            is_default: formData.is_default || templates.length === 0,
            document_type: formData.document_type,
          });

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Template criado' });
      }

      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', content: '', is_default: false, document_type: 'contract' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (template: ContractTemplate) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      content: template.content,
      is_default: template.is_default,
      document_type: template.document_type,
    });
    setShowForm(true);
  };

  const handleNewTemplate = () => {
    resetForm();
    setFormData(prev => ({ ...prev, content: DEFAULT_TEMPLATE }));
    setShowForm(true);
  };

  const openDeleteDialog = (template: ContractTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      const { error } = await supabase
        .from('contract_templates')
        .delete()
        .eq('id', templateToDelete.id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Template removido' });
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({ title: 'Erro', description: 'Não foi possível remover', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

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
          <CardHeader className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-lg md:text-xl">Templates de Contrato</CardTitle>
                <CardDescription className="text-sm">
                  Crie modelos de contrato que podem ser preenchidos automaticamente com dados do cliente.
                </CardDescription>
              </div>
              {!showForm && (
                <Button 
                  onClick={handleNewTemplate} 
                  className="gap-2 shrink-0 w-full sm:w-auto"
                  disabled={limitReached}
                >
                  {limitReached ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  Novo Template
                </Button>
              )}
            </div>
            
            {/* Usage counter */}
            {!isUnlimited && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {templates.length}/{maxTemplates} templates utilizados
                </span>
                {limitReached && (
                  <Badge variant="destructive" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Limite atingido
                  </Badge>
                )}
              </div>
            )}
            
            {/* Upgrade prompt when limit reached */}
            {limitReached && (
              <div className="bg-muted/50 border border-border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Limite de templates atingido</p>
                    <p className="text-sm text-muted-foreground">
                      O plano {PLAN_NAMES[planType]} permite até {maxTemplates} {maxTemplates === 1 ? 'template' : 'templates'}. Faça upgrade para criar mais.
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <Button asChild variant="default" size="sm" className="gap-2 shrink-0">
                    <Link to="/app/subscription">
                      Fazer Upgrade
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {showForm && (
              <div className="border border-border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">{editingId ? 'Editar Template' : 'Novo Template de Documento'}</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Documento *</Label>
                    <Select 
                      value={formData.document_type} 
                      onValueChange={value => setFormData(prev => ({ ...prev, document_type: value as DocumentType }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Template *</Label>
                    <Input
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Contrato Padrão de Marketing"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conteúdo do Documento *</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Use variáveis como {'{{empresa_cliente}}'}, {'{{nome_contato}}'}, {'{{email_cliente}}'}, etc.
                    </p>
                    <Textarea
                      value={formData.content}
                      onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Conteúdo do documento..."
                      rows={15}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_default}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, is_default: checked }))}
                    />
                    <Label>Definir como template padrão para este tipo</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveTemplate} disabled={saving} className="gap-2">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {editingId ? 'Salvar Alterações' : 'Criar Template'}
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Variables reference */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2 text-sm md:text-base">Variáveis Disponíveis</h4>
              <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                <code className="bg-background px-2 py-1 rounded break-all">{'{{empresa_cliente}}'}</code>
                <code className="bg-background px-2 py-1 rounded break-all">{'{{nome_contato}}'}</code>
                <code className="bg-background px-2 py-1 rounded break-all">{'{{email_cliente}}'}</code>
                <code className="bg-background px-2 py-1 rounded break-all">{'{{telefone_cliente}}'}</code>
                <code className="bg-background px-2 py-1 rounded break-all">{'{{endereco_cliente}}'}</code>
                <code className="bg-background px-2 py-1 rounded break-all">{'{{servicos_contratados}}'}</code>
                <code className="bg-background px-2 py-1 rounded break-all">{'{{valor_mensal}}'}</code>
                <code className="bg-background px-2 py-1 rounded break-all">{'{{valor_trafego}}'}</code>
                <code className="bg-background px-2 py-1 rounded break-all">{'{{nome_agencia}}'}</code>
                <code className="bg-background px-2 py-1 rounded break-all">{'{{sede_agencia}}'}</code>
                <code className="bg-background px-2 py-1 rounded break-all">{'{{nuit_agencia}}'}</code>
                <code className="bg-background px-2 py-1 rounded break-all">{'{{data_assinatura}}'}</code>
              </div>
            </div>

            {/* List of templates */}
            <div className="space-y-2">
              <h4 className="font-medium">
                Seus Templates ({templates.length}{!isUnlimited ? `/${maxTemplates}` : ''})
              </h4>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum template criado ainda
                </p>
              ) : (
                <div className="space-y-2">
                  {templates.map((template, index) => (
                    <AnimatedContainer key={template.id} animation="fade-up" delay={index * 0.05}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium truncate">{template.name}</p>
                              <Badge variant="outline" className="shrink-0">
                                {DOCUMENT_TYPE_LABELS[template.document_type]}
                              </Badge>
                              {template.is_default && (
                                <Badge variant="secondary" className="gap-1 shrink-0">
                                  <Star className="h-3 w-3" />
                                  Padrão
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {template.content.substring(0, 100)}...
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0 self-end sm:self-center">
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
            <AlertDialogTitle>Remover Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o template "{templateToDelete?.name}"? Esta ação não pode ser desfeita.
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
