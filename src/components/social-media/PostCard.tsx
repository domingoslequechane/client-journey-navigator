import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Pencil, Trash2, Eye, Heart, MessageCircle, Share2, MousePointer, Bookmark, Send, RefreshCw, Zap, Copy, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { STATUS_CONFIG, CONTENT_TYPE_CONFIG, type PostStatus, type ContentType } from '@/lib/social-media-mock';
import { PlatformIcon } from './PlatformIcon';
import { ConfirmActionModal } from './ConfirmActionModal';
import { cn } from '@/lib/utils';
import type { SocialPostRow } from '@/hooks/useSocialPosts';

interface PostCardProps {
  post: SocialPostRow;
  onEdit: (post: SocialPostRow) => void;
  onDelete: (id: string) => void;
  onSendForApproval?: (id: string) => void;
  onRetry?: (postId: string) => void;
  onPublish?: (postId: string, publishNow: boolean) => void;
  onClone?: (post: SocialPostRow) => void;
  onBoost?: (post: SocialPostRow) => void;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

export function PostCard({ post, onEdit, onDelete, onSendForApproval, onRetry, onPublish, onClone, onBoost, isSelected, onSelect }: PostCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const statusCfg = STATUS_CONFIG[post.status as PostStatus] || STATUS_CONFIG.draft;
  const contentTypeCfg = CONTENT_TYPE_CONFIG[post.content_type as ContentType] || CONTENT_TYPE_CONFIG.feed;
  const mediaUrl = post.media_urls?.[0] || null;
  const metrics = post.metrics as Record<string, number> | null;
  const isPublished = post.status === 'published';

  return (
    <Card className={cn(
      "hover:border-primary/30 transition-all relative group",
      isSelected && "border-primary bg-primary/5 ring-1 ring-primary/20"
    )}>
      <CardContent className="p-4">
        <div className="flex flex-row items-center gap-3 sm:gap-4">
          {onSelect && (
            <div 
              className="cursor-pointer px-1 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(post.id, !isSelected);
              }}
            >
              <div className={cn(
                "h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 shadow-sm",
                isSelected 
                  ? "bg-primary border-primary text-primary-foreground scale-110" 
                  : "bg-background border-slate-300 hover:border-primary hover:bg-slate-50"
              )}>
                {isSelected && <CheckCircle2 className="h-4 w-4" />}
              </div>
            </div>
          )}

          {mediaUrl && (
            <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 border bg-muted relative">
              {(mediaUrl.includes('video') || mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.mov') || mediaUrl.endsWith('.webm')) ? (
                <div className="w-full h-full relative flex items-center justify-center bg-black">
                  <video src={mediaUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[7px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {post.client_name && (
                <span className="text-xs font-semibold text-primary">{post.client_name}</span>
              )}
              <Badge variant="outline" className="text-[10px]">{contentTypeCfg.label}</Badge>
              <Badge variant={statusCfg.variant} className="text-[10px]">{statusCfg.label}</Badge>
            </div>

            <p className="text-sm line-clamp-2">{post.content}</p>

            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {post.platforms.map(p => (
                  <PlatformIcon key={p} platform={p} size="xs" variant="circle" />
                ))}
              </div>
              {post.scheduled_at && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(parseISO(post.scheduled_at), "dd MMM, HH:mm", { locale: ptBR })}
                </span>
              )}
            </div>

            {metrics && (
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {metrics.likes != null && <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{metrics.likes.toLocaleString()}</span>}
                {metrics.comments != null && <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{metrics.comments.toLocaleString()}</span>}
                {metrics.shares != null && <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{metrics.shares.toLocaleString()}</span>}
                {metrics.reach != null && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{metrics.reach.toLocaleString()}</span>}
                {metrics.saves != null && <span className="flex items-center gap-1"><Bookmark className="h-3 w-3" />{metrics.saves.toLocaleString()}</span>}
                {metrics.clicks != null && <span className="flex items-center gap-1"><MousePointer className="h-3 w-3" />{metrics.clicks.toLocaleString()}</span>}
              </div>
            )}

            {post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.hashtags.map(tag => (
                  <span key={tag} className="text-[10px] text-primary">#{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-row items-center gap-4 shrink-0">
            {/* Actions */}
            <div className="flex flex-row sm:flex-col gap-1 shrink-0">
              {!isPublished && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(post)} title="Editar">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {post.status === 'draft' && onSendForApproval && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(var(--warning))]" onClick={() => onSendForApproval(post.id)} title="Enviar para aprovação">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              )}
              {post.status === 'draft' && onPublish && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(var(--success))]" onClick={() => onPublish(post.id, true)} title="Publicar agora">
                  <Zap className="h-3.5 w-3.5" />
                </Button>
              )}
              {post.status === 'failed' && onRetry && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(var(--warning))]" onClick={() => onRetry(post.id)} title="Tentar novamente">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              )}
              {onClone && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onClone(post)} title="Clonar post">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              )}
              {onBoost && isPublished && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => onBoost(post)} title="Impulsionar">
                  <TrendingUp className="h-3.5 w-3.5" />
                </Button>
              )}
              {!isPublished && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete(true)} title="Excluir">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <ConfirmActionModal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={post.notes?.includes('BATCH_META:') && post.status === 'draft' ? "Excluir lote de posts" : "Excluir post"}
        description={post.notes?.includes('BATCH_META:') && post.status === 'draft' 
          ? "Esta postagem faz parte de um agendamento em lote. Tem certeza que deseja excluir o LOTE COMPLETO? Esta ação não pode ser desfeita."
          : "Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita."
        }
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={() => {
          onDelete(post.id);
          setConfirmDelete(false);
        }}
      />
    </Card>
  );
}
