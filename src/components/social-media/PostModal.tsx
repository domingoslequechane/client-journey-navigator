import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PostPreview } from './PostPreview';
import { type SocialPost, type SocialPlatform, type PostStatus, PLATFORM_CONFIG } from '@/lib/social-media-mock';
import { cn } from '@/lib/utils';

interface PostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: SocialPost | null;
  onSave: (data: Omit<SocialPost, 'id'>) => void;
  defaultDate?: string;
}

const ALL_PLATFORMS: SocialPlatform[] = ['instagram', 'facebook', 'linkedin', 'tiktok', 'twitter'];

export function PostModal({ open, onOpenChange, post, onSave, defaultDate }: PostModalProps) {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(['instagram']);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('10:00');
  const [status, setStatus] = useState<PostStatus>('draft');
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('instagram');

  useEffect(() => {
    if (post) {
      setContent(post.content);
      setMediaUrl(post.mediaUrl || '');
      setPlatforms(post.platforms);
      const dt = new Date(post.scheduledAt);
      setDate(format(dt, 'yyyy-MM-dd'));
      setTime(format(dt, 'HH:mm'));
      setStatus(post.status);
      setPreviewPlatform(post.platforms[0] || 'instagram');
    } else {
      setContent('');
      setMediaUrl('');
      setPlatforms(['instagram']);
      setDate(defaultDate || format(new Date(), 'yyyy-MM-dd'));
      setTime('10:00');
      setStatus('draft');
      setPreviewPlatform('instagram');
    }
  }, [post, open, defaultDate]);

  const togglePlatform = (p: SocialPlatform) => {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const handleSave = () => {
    if (!content.trim() || platforms.length === 0) return;
    onSave({
      content,
      mediaUrl: mediaUrl || undefined,
      platforms,
      scheduledAt: `${date}T${time}:00`,
      status,
    });
    onOpenChange(false);
  };

  // Determine strictest char limit
  const minCharLimit = Math.min(...platforms.map(p => PLATFORM_CONFIG[p].charLimit));
  const isOverLimit = content.length > minCharLimit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? 'Editar Post' : 'Novo Post'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <div>
              <Label>Conteúdo</Label>
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Escreva o conteúdo do seu post..."
                className="min-h-[120px] mt-1"
              />
              <p className={cn("text-xs mt-1", isOverLimit ? "text-destructive" : "text-muted-foreground")}>
                {content.length}/{minCharLimit} caracteres {isOverLimit && '(excedido!)'}
              </p>
            </div>

            <div>
              <Label>URL da Imagem (opcional)</Label>
              <Input
                value={mediaUrl}
                onChange={e => setMediaUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
            </div>

            <div>
              <Label>Redes Sociais</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ALL_PLATFORMS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                      platforms.includes(p)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <span>{PLATFORM_CONFIG[p].icon}</span>
                    {PLATFORM_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Hora</Label>
                <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as PostStatus)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label>Preview:</Label>
              <div className="flex gap-1">
                {platforms.map(p => (
                  <button
                    key={p}
                    onClick={() => setPreviewPlatform(p)}
                    className={cn(
                      "text-xs px-2 py-1 rounded-full transition-colors",
                      previewPlatform === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {PLATFORM_CONFIG[p].icon}
                  </button>
                ))}
              </div>
            </div>
            <PostPreview content={content} mediaUrl={mediaUrl || undefined} platform={previewPlatform} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!content.trim() || platforms.length === 0}>
            {post ? 'Salvar' : 'Criar Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
