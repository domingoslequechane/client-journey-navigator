import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Pencil, Trash2, Eye, Heart, MessageCircle, Share2, MousePointer, Bookmark, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { STATUS_CONFIG, CONTENT_TYPE_CONFIG, type PostStatus, type ContentType } from '@/lib/social-media-mock';
import { PlatformIcon } from './PlatformIcon';
import type { SocialPostRow } from '@/hooks/useSocialPosts';

interface PostCardProps {
  post: SocialPostRow;
  onEdit: (post: SocialPostRow) => void;
  onDelete: (id: string) => void;
  onSendForApproval?: (id: string) => void;
}

export function PostCard({ post, onEdit, onDelete, onSendForApproval }: PostCardProps) {
  const statusCfg = STATUS_CONFIG[post.status as PostStatus] || STATUS_CONFIG.draft;
  const contentTypeCfg = CONTENT_TYPE_CONFIG[post.content_type as ContentType] || CONTENT_TYPE_CONFIG.feed;
  const mediaUrl = post.media_urls?.[0] || null;
  const metrics = post.metrics as Record<string, number> | null;

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Media thumbnail */}
          {mediaUrl && (
            <img src={mediaUrl} alt="" className="w-24 h-24 rounded-lg object-cover shrink-0" />
          )}

          {/* Content */}
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

            {/* Metrics */}
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

            {/* Hashtags */}
            {post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.hashtags.map(tag => (
                  <span key={tag} className="text-[10px] text-primary">#{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(post)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {post.status === 'draft' && onSendForApproval && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(var(--warning))]" onClick={() => onSendForApproval(post.id)}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(post.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
