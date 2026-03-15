import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, GripVertical, ImageIcon, Check, Copy, Pencil } from 'lucide-react';
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

const truncateText = (text: string, limit: number = 25) => {
  if (!text) return text;
  return text.length > limit ? text.substring(0, limit) + '...' : text;
};

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
  const [uploadProgress, setUploadProgress] = useState('');

  // Handler para upload em massa
  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: CarouselImage[] = [];
    const totalFiles = Array.from(files).filter(f => f.type.startsWith('image/')).length;
    let uploaded = 0;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;

      try {
        setUploadProgress(`Enviando ${++uploaded}/${totalFiles}...`);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `carousel/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('linktree-assets')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('linktree-assets')
          .getPublicUrl(filePath);

        newImages.push({ url: publicUrl, alt: '' });
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
      toast({
        title: `${newImages.length} ${newImages.length === 1 ? 'imagem adicionada' : 'imagens adicionadas'}!`,
        description: 'Preencha os campos alt e link de cada uma',
      });
    }

    setUploading(false);
    setUploadProgress('');
    // Reset input
    e.target.value = '';
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
    <Card className={`p-2 sm:p-3 ${isEditing ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-4">
              <Label>Imagens do Carrossel</Label>
              
              <ScrollArea className="max-h-64">
                <div className="space-y-2 pr-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg flex-wrap sm:flex-nowrap">
                      <img src={img.url} alt="" className="w-12 h-12 object-cover rounded flex-shrink-0" />
                      <div className="flex-1 space-y-1 min-w-0">
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
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => handleRemoveImage(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleAddImages}
                    disabled={uploading}
                  />
                  <Button variant="outline" className="w-full gap-2" asChild disabled={uploading}>
                    <span>
                      <Plus className="h-4 w-4" />
                      {uploading ? uploadProgress || 'Enviando...' : 'Adicionar Imagens'}
                    </span>
                  </Button>
                </label>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={handleSave}>
                  <Check className="h-4 w-4 mr-1" /> Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm truncate flex-1">
                {truncateText(`Carrossel (${images.length} ${images.length === 1 ? 'imagem' : 'imagens'})`)}
              </span>
            </div>
          )}
        </div>
        {!isEditing && (
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <Switch checked={block.is_enabled} onCheckedChange={onToggleEnabled} className="scale-75 sm:scale-90" />
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onDuplicate(block.id)} title="Duplicar">
              <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onDelete(block.id)}>
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
