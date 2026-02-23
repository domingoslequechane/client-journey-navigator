import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PostPreview } from './PostPreview';
import { PlatformIcon } from './PlatformIcon';
import { type SocialPlatform, type PostStatus, type ContentType, PLATFORM_CONFIG, CONTENT_TYPE_CONFIG, ALL_PLATFORMS } from '@/lib/social-media-mock';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import type { SocialPostRow } from '@/hooks/useSocialPosts';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Upload, Calendar, Clock, Hash, Send, Loader2, X, Image as ImageIcon } from 'lucide-react';

interface PostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: SocialPostRow | null;
  onSave: (data: any) => void;
  defaultDate?: string;
}

export function PostModal({ open, onOpenChange, post, onSave, defaultDate }: PostModalProps) {
  const { accounts } = useSocialAccounts();
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(['instagram']);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('10:00');
  const [status, setStatus] = useState<PostStatus>('draft');
  const [contentType, setContentType] = useState<ContentType>('feed');
  const [hashtags, setHashtags] = useState('');
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('instagram');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const connectedPlatforms = accounts.filter(a => a.is_connected).map(a => a.platform as SocialPlatform);

  useEffect(() => {
    if (post) {
      setContent(post.content);
      setMediaUrls(post.media_urls || []);
      setPlatforms(post.platforms || ['instagram']);
      if (post.scheduled_at) {
        const dt = new Date(post.scheduled_at);
        setDate(format(dt, 'yyyy-MM-dd'));
        setTime(format(dt, 'HH:mm'));
      }
      setStatus(post.status as PostStatus);
      setContentType(post.content_type as ContentType);
      setHashtags(post.hashtags?.join(', ') || '');
      setPreviewPlatform(post.platforms?.[0] || 'instagram');
    } else {
      setContent('');
      setMediaUrls([]);
      setPlatforms(['instagram']);
      setDate(defaultDate || format(new Date(), 'yyyy-MM-dd'));
      setTime('10:00');
      setStatus('draft');
      setContentType('feed');
      setHashtags('');
      setPreviewPlatform('instagram');
    }
  }, [post, open, defaultDate]);

  const togglePlatform = (p: SocialPlatform) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from('social-media')
          .upload(path, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }
      setMediaUrls(prev => [...prev, ...newUrls]);
    } catch (err: any) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!content.trim() || platforms.length === 0) return;
    onSave({
      content,
      media_urls: mediaUrls,
      platforms,
      scheduled_at: `${date}T${time}:00`,
      status,
      content_type: contentType,
      hashtags: hashtags ? hashtags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
    onOpenChange(false);
  };

  const minCharLimit = Math.min(...platforms.map(p => PLATFORM_CONFIG[p]?.charLimit || 2200));
  const isOverLimit = content.length > minCharLimit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{post ? 'Editar Post' : 'Agendar Post'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left column - Form */}
          <div className="space-y-5">
            {/* Step 1: Select channels */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
                Selecione os canais
              </Label>
              <div className="flex flex-wrap gap-2">
                {ALL_PLATFORMS.map(p => {
                  const isConnected = connectedPlatforms.includes(p);
                  const isSelected = platforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => isConnected && togglePlatform(p)}
                      disabled={!isConnected}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : isConnected
                          ? "border-border hover:border-primary/50"
                          : "border-border opacity-40 cursor-not-allowed"
                      )}
                    >
                      <PlatformIcon platform={p} size="sm" />
                      {PLATFORM_CONFIG[p].label}
                      {!isConnected && <Badge variant="outline" className="text-[8px] px-1 py-0">Não conectado</Badge>}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Step 2: Content */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
                Texto do post
              </Label>
              <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Digite o seu texto..." className="min-h-[140px]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="hashtags separadas por vírgula" className="h-7 text-xs w-[200px]" />
                </div>
                <p className={cn("text-xs", isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground")}>
                  {content.length}/{minCharLimit}
                </p>
              </div>
            </div>

            <Separator />

            {/* Step 3: Media */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">3</span>
                Mídias
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Select value={contentType} onValueChange={v => setContentType(v as ContentType)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tipo de conteúdo" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CONTENT_TYPE_CONFIG) as ContentType[]).map(t => (
                      <SelectItem key={t} value={t}>{CONTENT_TYPE_CONFIG[t].icon} {CONTENT_TYPE_CONFIG[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-9 gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={e => handleFileUpload(e.target.files)}
                />
              </div>
              {mediaUrls.length === 0 && (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">Imagens, vídeos ou documentos</p>
                  <p className="text-xs text-muted-foreground mt-1">Envie arquivos clicando aqui ou arrastando</p>
                </div>
              )}
              {mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mediaUrls.map((url, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeMedia(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Step 4: Schedule */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">4</span>
                Data e horário
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" />
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-9" />
                </div>
                <Select value={status} onValueChange={v => setStatus(v as PostStatus)}>
                  <SelectTrigger className="h-9">
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
          </div>

          {/* Right column - Preview */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Preview</Label>
            {platforms.length > 0 ? (
              <>
                <div className="flex gap-1 flex-wrap">
                  {platforms.map(p => (
                    <button key={p} onClick={() => setPreviewPlatform(p)} className={cn("p-1.5 rounded-lg transition-colors", previewPlatform === p ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted")}>
                      <PlatformIcon platform={p} size="sm" />
                    </button>
                  ))}
                </div>
                <PostPreview content={content} mediaUrl={mediaUrls[0]} platform={previewPlatform} />
              </>
            ) : (
              <div className="border border-border rounded-xl p-8 text-center">
                <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Aguardando conteúdo.</p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!content.trim() || platforms.length === 0} className="gap-2">
            <Send className="h-4 w-4" />
            {post ? 'Salvar' : 'Agendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
