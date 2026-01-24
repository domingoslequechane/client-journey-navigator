import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, ImageIcon, Check, X, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { LinkBlock } from '@/types/linktree';

interface CarouselBlockEditorProps {
  block: LinkBlock;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (block: Partial<LinkBlock> & { id: string }) => Promise<unknown>;
  onDelete: (blockId: string) => Promise<void>;
  onDuplicate: (blockId: string) => Promise<unknown>;
  onToggleEnabled: () => void;
}

interface CarouselImage {
  url: string;
  alt?: string;
  link?: string;
}

export function CarouselBlockEditor({
  block,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleEnabled,
}: CarouselBlockEditorProps) {
  const [images, setImages] = useState<CarouselImage[]>(
    (block.content.images as CarouselImage[]) || []
  );
  const [uploading, setUploading] = useState(false);

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const filePath = `carousel/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('linktree-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('linktree-assets')
        .getPublicUrl(filePath);

      setImages(prev => [...prev, { url: publicUrl, alt: '' }]);
      toast({ title: 'Imagem adicionada!' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Erro ao fazer upload', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateImage = (index: number, updates: Partial<CarouselImage>) => {
    setImages(prev => prev.map((img, i) => i === index ? { ...img, ...updates } : img));
  };

  const handleSave = async () => {
    await onUpdate({
      id: block.id,
      content: {
        ...block.content,
        images,
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
            <div className="space-y-4">
              <Label>Imagens do Carrossel</Label>
              
              {/* Image List */}
              <div className="space-y-2">
                {images.map((img, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <img src={img.url} alt="" className="w-12 h-12 object-cover rounded" />
                    <div className="flex-1 space-y-1">
                      <Input
                        value={img.alt || ''}
                        onChange={(e) => handleUpdateImage(idx, { alt: e.target.value })}
                        placeholder="Texto alternativo"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={img.link || ''}
                        onChange={(e) => handleUpdateImage(idx, { link: e.target.value })}
                        placeholder="Link (opcional)"
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveImage(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add Image */}
              <div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAddImage}
                    disabled={uploading}
                  />
                  <Button variant="outline" className="w-full gap-2" asChild disabled={uploading}>
                    <span>
                      <Plus className="h-4 w-4" />
                      {uploading ? 'Enviando...' : 'Adicionar Imagem'}
                    </span>
                  </Button>
                </label>
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
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Carrossel ({images.length} {images.length === 1 ? 'imagem' : 'imagens'})
              </span>
            </div>
          )}
        </div>
        {!isEditing && (
          <>
            <Switch checked={block.is_enabled} onCheckedChange={onToggleEnabled} />
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <ImageIcon className="h-4 w-4" />
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
