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
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Apenas imagens são permitidas', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('linktree-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('linktree-assets')
        .getPublicUrl(filePath);

      setForm(prev => ({ ...prev, imageUrl: publicUrl }));
      toast({ title: 'Imagem carregada!' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Erro ao fazer upload', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

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
              
              {/* Upload ou URL */}
              <div>
                <Label>Imagem</Label>
                <div className="flex gap-2 mt-1">
                  <label className="cursor-pointer flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <Button variant="outline" className="w-full gap-2" asChild disabled={uploading}>
                      <span>
                        <Upload className="h-4 w-4" />
                        {uploading ? 'Enviando...' : 'Upload'}
                      </span>
                    </Button>
                  </label>
                </div>
                <div className="mt-2">
                  <Input
                    value={form.imageUrl}
                    onChange={(e) => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="ou cole a URL da imagem..."
                  />
                </div>
              </div>

              {form.imageUrl && (
                <div className="mt-2">
                  <Label className="text-xs">Preview</Label>
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="w-full max-h-40 object-contain rounded-lg mt-1 bg-muted"
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
