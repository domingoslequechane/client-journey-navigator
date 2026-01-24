import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { GripVertical, MessageSquare, Trash2, Check, Pencil, Copy } from 'lucide-react';
import type { LinkBlock } from '@/types/linktree';

interface ContactFormBlockEditorProps {
  block: LinkBlock;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (block: Partial<LinkBlock> & { id: string }) => Promise<unknown>;
  onDelete: (blockId: string) => Promise<void>;
  onDuplicate: (blockId: string) => Promise<unknown>;
  onToggleEnabled: () => void;
}

interface ContactFormConfig {
  title?: string;
  description?: string;
  submitButtonText?: string;
  successMessage?: string;
  recipientEmail?: string;
  fields?: {
    name: boolean;
    email: boolean;
    phone: boolean;
    message: boolean;
  };
}

export function ContactFormBlockEditor({
  block,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleEnabled,
}: ContactFormBlockEditorProps) {
  const formConfig = (block.content.formConfig as ContactFormConfig) || {
    title: 'Entre em contato',
    description: 'Preencha o formulário abaixo',
    submitButtonText: 'Enviar',
    successMessage: 'Mensagem enviada com sucesso!',
    recipientEmail: '',
    fields: { name: true, email: true, phone: false, message: true },
  };

  const [form, setForm] = useState<ContactFormConfig>(formConfig);

  const handleSave = async () => {
    await onUpdate({
      id: block.id,
      content: {
        ...block.content,
        formConfig: form,
      },
    });
    onCancelEdit();
  };

  const updateField = (field: keyof ContactFormConfig['fields'], value: boolean) => {
    setForm(prev => ({
      ...prev,
      fields: { ...prev.fields!, [field]: value },
    }));
  };

  return (
    <Card className={`p-3 ${isEditing ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-start gap-3">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab mt-1" />
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={form.title || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Entre em contato"
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Input
                  value={form.description || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição curta"
                />
              </div>

              <div>
                <Label>Texto do Botão</Label>
                <Input
                  value={form.submitButtonText || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, submitButtonText: e.target.value }))}
                  placeholder="Enviar"
                />
              </div>

              <div>
                <Label>Mensagem de Sucesso</Label>
                <Input
                  value={form.successMessage || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, successMessage: e.target.value }))}
                  placeholder="Mensagem enviada com sucesso!"
                />
              </div>

              <div>
                <Label>Email para Receber (opcional)</Label>
                <Input
                  type="email"
                  value={form.recipientEmail || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, recipientEmail: e.target.value }))}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <Label className="text-xs uppercase text-muted-foreground">Campos do Formulário</Label>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Nome</span>
                  <Switch
                    checked={form.fields?.name ?? true}
                    onCheckedChange={(checked) => updateField('name', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email</span>
                  <Switch
                    checked={form.fields?.email ?? true}
                    onCheckedChange={(checked) => updateField('email', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Telefone</span>
                  <Switch
                    checked={form.fields?.phone ?? false}
                    onCheckedChange={(checked) => updateField('phone', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mensagem</span>
                  <Switch
                    checked={form.fields?.message ?? true}
                    onCheckedChange={(checked) => updateField('message', checked)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  <Check className="h-4 w-4 mr-1" /> Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{form.title || 'Formulário de Contato'}</span>
            </div>
          )}
        </div>
        {!isEditing && (
          <>
            <Switch checked={block.is_enabled} onCheckedChange={onToggleEnabled} />
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDuplicate(block.id)} title="Duplicar">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(block.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
