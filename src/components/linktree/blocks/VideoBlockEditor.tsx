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
  Video
} from 'lucide-react';
import type { LinkBlock } from '@/types/linktree';

interface VideoBlockEditorProps {
  block: LinkBlock;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (block: Partial<LinkBlock> & { id: string }) => Promise<unknown>;
  onDelete: (blockId: string) => Promise<void>;
  onDuplicate: (blockId: string) => Promise<unknown>;
  onToggleEnabled: () => Promise<void>;
}

export function VideoBlockEditor({
  block,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleEnabled,
}: VideoBlockEditorProps) {
  const [form, setForm] = useState({
    title: block.content.title || '',
    videoUrl: block.content.videoUrl || '',
  });

  const handleSave = async () => {
    await onUpdate({
      id: block.id,
      content: {
        ...block.content,
        title: form.title,
        videoUrl: form.videoUrl,
      },
    });
    onCancelEdit();
  };

  const getVideoEmbed = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)([^&\n?#]+)/)?.[1];
    const isYoutube = url.includes('youtube') || url.includes('youtu.be');
    if (videoId) {
      return isYoutube
        ? `https://www.youtube.com/embed/${videoId}`
        : `https://player.vimeo.com/video/${videoId}`;
    }
    return null;
  };

  const embedUrl = form.videoUrl ? getVideoEmbed(form.videoUrl) : null;

  return (
    <Card className={`p-2 sm:p-3 ${isEditing ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <Label>Título (opcional)</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Descrição do vídeo"
                />
              </div>
              <div>
                <Label>URL do Vídeo (YouTube ou Vimeo)</Label>
                <Input
                  value={form.videoUrl}
                  onChange={(e) => setForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              {embedUrl && (
                <div className="mt-2">
                  <Label className="text-xs">Preview</Label>
                  <div className="aspect-video rounded-lg overflow-hidden mt-1">
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                </div>
              )}
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
              <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm truncate">
                {block.content.title || 'Vídeo'}
              </span>
              {block.content.videoUrl && (
                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                  ({block.content.videoUrl})
                </span>
              )}
            </div>
          )}
        </div>
        {!isEditing && (
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <Switch checked={block.is_enabled} onCheckedChange={onToggleEnabled} className="scale-90 sm:scale-100" />
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
