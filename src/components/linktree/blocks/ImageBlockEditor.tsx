import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { 
  GripVertical, 
  Trash2, 
  Pencil, 
  Check, 
  Copy,
  Image as ImageIcon
} from 'lucide-react';
import type { LinkBlock } from '@/types/linktree';

interface ImageBlockEditorProps {
  block: LinkBlock;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (block: Partial<LinkBlock> & { id: string }) => Promise<unknown>;
  onDelete: (blockId: string) => Promise<void>;
  onDuplicate: (blockId: string) => Promise<unknown>;
  onToggleEnabled: () => Promise<void>;
}

export function ImageBlockEditor({
  block,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleEnabled,
}: ImageBlockEditorProps) {
  const [form, setForm] = useState({
    title: block.content.title || '',
    imageUrl: block.content.imageUrl || '',
  });

  const handleSave = async () => {
    await onUpdate({
      id: block.id,
      content: {
        ...block.content,
        title: form.title,
        imageUrl: form.imageUrl,
      },
    });
    onCancelEdit();
  };

  return (
    <Card className={`p-3 ${isEditing ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-start gap-3">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab mt-1" />
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <Label>Título (opcional)</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Descrição da imagem"
                />
              </div>
              <div>
                <Label>URL da Imagem</Label>
                <Input
                  value={form.imageUrl}
                  onChange={(e) => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              {form.imageUrl && (
                <div className="mt-2">
                  <Label className="text-xs">Preview</Label>
                  <img
                    src={form.imageUrl}
                    alt={form.title || 'Preview'}
                    className="w-full max-h-40 object-cover rounded-lg mt-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
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
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {block.content.title || 'Imagem'}
              </span>
              {block.content.imageUrl && (
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                  ({block.content.imageUrl})
                </span>
              )}
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
