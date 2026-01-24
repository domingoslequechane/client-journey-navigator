import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageUpload } from './ImageUpload';
import { CarouselBlockEditor } from './blocks/CarouselBlockEditor';
import { ContactFormBlockEditor } from './blocks/ContactFormBlockEditor';
import { SocialBlockEditor } from './blocks/SocialBlockEditor';
import { ImageBlockEditor } from './blocks/ImageBlockEditor';
import { VideoBlockEditor } from './blocks/VideoBlockEditor';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
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
  Check,
  Images,
  MessageSquare,
  Copy
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
  duplicateBlock: (blockId: string) => Promise<unknown>;
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
  { type: 'carousel', icon: Images, label: 'Carrossel de Imagens' },
  { type: 'contact-form', icon: MessageSquare, label: 'Formulário de Contato' },
] as const;

export function LinksTab({
  linkPage,
  addBlock,
  updateBlock,
  deleteBlock,
  duplicateBlock,
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
    const getDefaultContent = () => {
      switch (type) {
        case 'button':
          return { title: 'Novo Link', url: 'https://' };
        case 'text':
          return { text: 'Texto aqui' };
        case 'social':
          return { socials: [] };
        case 'carousel':
          return { images: [] };
        case 'contact-form':
          return {
            formConfig: {
              title: 'Entre em contato',
              description: 'Preencha o formulário abaixo',
              submitButtonText: 'Enviar',
              successMessage: 'Mensagem enviada com sucesso!',
              fields: { name: true, email: true, phone: false, message: true },
            },
          };
        default:
          return {};
      }
    };

    const newBlock: Omit<LinkBlock, 'id' | 'link_page_id' | 'created_at' | 'updated_at' | 'clicks'> = {
      type,
      content: getDefaultContent(),
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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const items = Array.from(blocks);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    reorderBlocks(items.map(b => b.id));
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-w-2xl mx-auto">
        {/* Profile Section - Responsive */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <ImageUpload
              currentImageUrl={linkPage.logo_url}
              onImageChange={handleLogoChange}
              name={linkPage.name}
              size="lg"
            />
            <div className="flex-1 w-full text-center sm:text-left">
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
                  <div className="flex gap-2 justify-center sm:justify-start">
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
                  <h3 className="font-semibold truncate">{linkPage.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
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

        {/* Blocks List with Drag and Drop */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="blocks">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2"
              >
                {blocks.map((block, index) => {
                  const commonProps = {
                    block,
                    isEditing: editingBlockId === block.id,
                    onEdit: () => setEditingBlockId(block.id),
                    onCancelEdit: () => setEditingBlockId(null),
                    onUpdate: updateBlock,
                    onDelete: deleteBlock,
                    onDuplicate: duplicateBlock,
                    onToggleEnabled: async () => {
                      await updateBlock({ id: block.id, is_enabled: !block.is_enabled });
                    },
                  };

                  return (
                    <Draggable key={block.id} draggableId={block.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={snapshot.isDragging ? 'opacity-80' : ''}
                        >
                          {block.type === 'carousel' && <CarouselBlockEditor {...commonProps} />}
                          {block.type === 'contact-form' && <ContactFormBlockEditor {...commonProps} />}
                          {block.type === 'social' && <SocialBlockEditor {...commonProps} />}
                          {block.type === 'image' && <ImageBlockEditor {...commonProps} />}
                          {block.type === 'video' && <VideoBlockEditor {...commonProps} />}
                          {!['carousel', 'contact-form', 'social', 'image', 'video'].includes(block.type) && (
                            <BlockCard
                              block={block}
                              isEditing={editingBlockId === block.id}
                              onEdit={() => setEditingBlockId(block.id)}
                              onCancelEdit={() => setEditingBlockId(null)}
                              onUpdate={updateBlock}
                              onDelete={deleteBlock}
                              onDuplicate={duplicateBlock}
                            />
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

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
  onDuplicate: (blockId: string) => Promise<unknown>;
}

function BlockCard({ block, isEditing, onEdit, onCancelEdit, onUpdate, onDelete, onDuplicate }: BlockCardProps) {
  const [form, setForm] = useState({
    title: block.content.title || '',
    url: block.content.url || '',
    text: block.content.text || '',
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
      <Card className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
        <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground min-w-0">
          <Minus className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Divisor</span>
        </div>
        <Switch checked={block.is_enabled} onCheckedChange={handleToggleEnabled} />
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 hidden sm:inline-flex" onClick={() => onDuplicate(block.id)} title="Duplicar">
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => onDelete(block.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </Card>
    );
  }

  if (block.type === 'text') {
    return (
      <Card className={`p-2 sm:p-3 ${isEditing ? 'ring-2 ring-primary' : ''}`}>
        <div className="flex items-start gap-2 sm:gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
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
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">{block.content.text || 'Texto'}</span>
              </div>
            )}
          </div>
          {!isEditing && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Switch checked={block.is_enabled} onCheckedChange={handleToggleEnabled} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex" onClick={() => onDuplicate(block.id)} title="Duplicar">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(block.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Button/Link type - SEM cores individuais, apenas Título e URL
  return (
    <Card className={`p-2 sm:p-3 ${isEditing ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-start gap-2 sm:gap-3">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab mt-2 sm:mt-3 flex-shrink-0" />
        <div className="flex-1 min-w-0">
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
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate">{block.content.title || 'Link'}</span>
              </div>
              {block.content.url && (
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {block.content.url}
                </p>
              )}
            </div>
          )}
        </div>
        {!isEditing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Switch checked={block.is_enabled} onCheckedChange={handleToggleEnabled} />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex" onClick={() => onDuplicate(block.id)} title="Duplicar">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(block.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
