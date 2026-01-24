import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  GripVertical, 
  Trash2, 
  Pencil, 
  Check, 
  Copy,
  Plus,
  X,
  Share2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LinkBlock } from '@/types/linktree';
import { SOCIAL_PLATFORMS } from '@/types/linktree';

interface SocialBlockEditorProps {
  block: LinkBlock;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (block: Partial<LinkBlock> & { id: string }) => Promise<unknown>;
  onDelete: (blockId: string) => Promise<void>;
  onDuplicate: (blockId: string) => Promise<unknown>;
  onToggleEnabled: () => Promise<void>;
}

interface SocialItem {
  platform: string;
  url: string;
}

export function SocialBlockEditor({
  block,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleEnabled,
}: SocialBlockEditorProps) {
  const [socials, setSocials] = useState<SocialItem[]>(
    block.content.socials || []
  );

  const handleAddSocial = () => {
    setSocials([...socials, { platform: 'instagram', url: '' }]);
  };

  const handleRemoveSocial = (index: number) => {
    setSocials(socials.filter((_, i) => i !== index));
  };

  const handleUpdateSocial = (index: number, field: 'platform' | 'url', value: string) => {
    const updated = [...socials];
    updated[index] = { ...updated[index], [field]: value };
    setSocials(updated);
  };

  const handleSave = async () => {
    await onUpdate({
      id: block.id,
      content: {
        ...block.content,
        socials,
      },
    });
    onCancelEdit();
  };

  const socialCount = block.content.socials?.length || 0;

  return (
    <Card className={`p-3 ${isEditing ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-start gap-3">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab mt-1" />
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Redes Sociais</Label>
                <Button type="button" size="sm" variant="outline" onClick={handleAddSocial}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
              
              {socials.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Clique em "Adicionar" para incluir suas redes sociais
                </p>
              )}
              
              {/* ScrollArea para limitar altura vertical */}
              <ScrollArea className="max-h-48">
                <div className="space-y-2 pr-2">
                  {socials.map((social, index) => {
                    const platform = SOCIAL_PLATFORMS.find(p => p.id === social.platform);
                    const Icon = platform?.icon;
                    return (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <Select
                          value={social.platform}
                          onValueChange={(value) => handleUpdateSocial(index, 'platform', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue>
                              {Icon && (
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {platform?.name}
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {SOCIAL_PLATFORMS.map((p) => {
                              const PIcon = p.icon;
                              return (
                                <SelectItem key={p.id} value={p.id}>
                                  <div className="flex items-center gap-2">
                                    <PIcon className="h-4 w-4" />
                                    {p.name}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Input
                          value={social.url}
                          onChange={(e) => handleUpdateSocial(index, 'url', e.target.value)}
                          placeholder="https://..."
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveSocial(index)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              
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
              <Share2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Ícones Sociais ({socialCount} {socialCount === 1 ? 'rede' : 'redes'})
              </span>
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
