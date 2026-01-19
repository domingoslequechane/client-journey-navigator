import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageUpload } from './ImageUpload';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Pencil, 
  Link2, 
  Type, 
  Image as ImageIcon,
  Video,
  Share2,
  Minus,
  Check
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LinkPage, LinkBlock } from '@/types/linktree';

interface LinksTabProps {
  linkPage: LinkPage;
  addBlock: (block: Omit<LinkBlock, 'id' | 'link_page_id' | 'created_at' | 'updated_at' | 'clicks'>) => Promise<unknown>;
  updateBlock: (block: Partial<LinkBlock> & { id: string }) => Promise<unknown>;
  deleteBlock: (blockId: string) => Promise<void>;
  reorderBlocks: (orderedBlockIds: string[]) => Promise<void>;
  updateLinkPage: (updates: Partial<LinkPage>) => Promise<unknown>;
  onImageChange?: () => void;
}

const BLOCK_TYPES = [
  { type: 'button', icon: Link2, label: 'Link' },
  { type: 'text', icon: Type, label: 'Texto' },
  { type: 'social', icon: Share2, label: 'Ícones Sociais' },
  { type: 'divider', icon: Minus, label: 'Divisor' },
  { type: 'image', icon: ImageIcon, label: 'Imagem' },
  { type: 'video', icon: Video, label: 'Vídeo' },
] as const;

export function LinksTab({
  linkPage,
  addBlock,
  updateBlock,
  deleteBlock,
  reorderBlocks,
  updateLinkPage,
  onImageChange,
}: LinksTabProps) {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: linkPage.name,
    bio: linkPage.bio || '',
  });

  const blocks = linkPage.blocks || [];

  const handleAddBlock = async (type: LinkBlock['type']) => {
    const newBlock: Omit<LinkBlock, 'id' | 'link_page_id' | 'created_at' | 'updated_at' | 'clicks'> = {
      type,
      content: type === 'button' ? { title: 'Novo Link', url: 'https://' } :
               type === 'text' ? { text: 'Texto aqui' } :
               type === 'social' ? { socials: [] } :
               {},
      is_enabled: true,
      sort_order: blocks.length,
    };
    await addBlock(newBlock);
  };

  const handleSaveProfile = async () => {
    await updateLinkPage({
      name: profileForm.name,
      bio: profileForm.bio,
    });
    setEditingProfile(false);
  };

  const handleLogoChange = async (url: string | undefined) => {
    await updateLinkPage({ logo_url: url });
    onImageChange?.();
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Profile Section - Simplified */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <ImageUpload
              currentImageUrl={linkPage.logo_url}
              onImageChange={handleLogoChange}
              name={linkPage.name}
              size="lg"
            />
            <div className="flex-1">
              {editingProfile ? (
                <div className="space-y-2">
                  <Input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome"
                  />
                  <Input
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Bio (opcional)"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveProfile}>
                      <Check className="h-4 w-4 mr-1" /> Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingProfile(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold">{linkPage.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {linkPage.bio || 'Clique para adicionar bio'}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setEditingProfile(true)}
                    className="mt-2"
                  >
                    <Pencil className="h-4 w-4 mr-2" /> Editar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Add Block Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full gap-2" size="lg">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            {BLOCK_TYPES.map(({ type, icon: Icon, label }) => (
              <DropdownMenuItem key={type} onClick={() => handleAddBlock(type)}>
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Blocks List */}
        <div className="space-y-2">
          {blocks.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              isEditing={editingBlockId === block.id}
              onEdit={() => setEditingBlockId(block.id)}
              onCancelEdit={() => setEditingBlockId(null)}
              onUpdate={updateBlock}
              onDelete={deleteBlock}
            />
          ))}
        </div>

        {blocks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum link adicionado ainda</p>
            <p className="text-sm">Clique em "Adicionar" para começar</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

interface BlockCardProps {
  block: LinkBlock;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (block: Partial<LinkBlock> & { id: string }) => Promise<unknown>;
  onDelete: (blockId: string) => Promise<void>;
}

function BlockCard({ block, isEditing, onEdit, onCancelEdit, onUpdate, onDelete }: BlockCardProps) {
  const [form, setForm] = useState({
    title: block.content.title || '',
    url: block.content.url || '',
    text: block.content.text || '',
    backgroundColor: block.style?.backgroundColor || '#8b5cf6',
    textColor: block.style?.textColor || '#ffffff',
    isTransparent: block.style?.isTransparent || false,
  });

  const handleSave = async () => {
    await onUpdate({
      id: block.id,
      content: {
        ...block.content,
        title: form.title,
        url: form.url,
        text: form.text,
      },
      style: {
        backgroundColor: form.backgroundColor,
        textColor: form.textColor,
        isTransparent: form.isTransparent,
      },
    });
    onCancelEdit();
  };

  const handleToggleEnabled = async () => {
    await onUpdate({
      id: block.id,
      is_enabled: !block.is_enabled,
    });
  };

  if (block.type === 'divider') {
    return (
      <Card className="p-3 flex items-center gap-3">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Minus className="h-4 w-4" />
          Divisor
        </div>
        <Switch checked={block.is_enabled} onCheckedChange={handleToggleEnabled} />
        <Button variant="ghost" size="icon" onClick={() => onDelete(block.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </Card>
    );
  }

  if (block.type === 'text') {
    return (
      <Card className={`p-3 ${isEditing ? 'ring-2 ring-primary' : ''}`}>
        <div className="flex items-start gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab mt-1" />
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <Label>Texto</Label>
                  <Input
                    value={form.text}
                    onChange={(e) => setForm(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Seu texto aqui"
                  />
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
                <Type className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{block.content.text || 'Texto'}</span>
              </div>
            )}
          </div>
          {!isEditing && (
            <>
              <Switch checked={block.is_enabled} onCheckedChange={handleToggleEnabled} />
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
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

  // Button/Link type
  return (
    <Card className={`p-3 ${isEditing ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-start gap-3">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab mt-3" />
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <Label>Título</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título do link"
                />
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  value={form.url}
                  onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                <Label className="text-xs uppercase text-muted-foreground">Estilo do Botão</Label>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Fundo transparente</span>
                  <Switch
                    checked={form.isTransparent}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, isTransparent: checked }))}
                  />
                </div>
                {!form.isTransparent && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Cor do fundo</Label>
                      <div className="flex gap-2 items-center mt-1">
                        <input
                          type="color"
                          value={form.backgroundColor}
                          onChange={(e) => setForm(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          className="w-8 h-8 rounded cursor-pointer"
                        />
                        <Input
                          value={form.backgroundColor}
                          onChange={(e) => setForm(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Cor do texto</Label>
                      <div className="flex gap-2 items-center mt-1">
                        <input
                          type="color"
                          value={form.textColor}
                          onChange={(e) => setForm(prev => ({ ...prev, textColor: e.target.value }))}
                          className="w-8 h-8 rounded cursor-pointer"
                        />
                        <Input
                          value={form.textColor}
                          onChange={(e) => setForm(prev => ({ ...prev, textColor: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {/* Preview */}
                <div>
                  <Label className="text-xs">Preview</Label>
                  <div
                    className="mt-2 py-3 px-4 rounded-full text-center text-sm font-medium"
                    style={{
                      backgroundColor: form.isTransparent ? 'transparent' : form.backgroundColor,
                      color: form.textColor,
                      border: form.isTransparent ? `2px solid ${form.backgroundColor}` : 'none',
                    }}
                  >
                    {form.title || 'Exemplo de botão'}
                  </div>
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
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: block.style?.backgroundColor || '#8b5cf6' }}
                />
                <span className="font-medium">{block.content.title || 'Link'}</span>
                {block.style?.isTransparent && (
                  <span className="text-xs text-muted-foreground">(Transparente)</span>
                )}
              </div>
              {block.content.url && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {block.content.url}
                </p>
              )}
            </div>
          )}
        </div>
        {!isEditing && (
          <>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{block.clicks || 0}</span>
            </div>
            <Switch checked={block.is_enabled} onCheckedChange={handleToggleEnabled} />
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
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
