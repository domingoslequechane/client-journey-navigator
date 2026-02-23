import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, BarChart3, Pencil, Trash2, Eye, Heart, MessageCircle, Share2, MousePointer, Bookmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type SocialPost, STATUS_CONFIG, CONTENT_TYPE_CONFIG } from '@/lib/social-media-mock';
import { PlatformIcon } from './PlatformIcon';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: SocialPost;
  onEdit: (post: SocialPost) => void;
  onDelete: (id: string) => void;
}

export function PostCard({ post, onEdit, onDelete }: PostCardProps) {
  const statusCfg = STATUS_CONFIG[post.status];
  const contentTypeCfg = CONTENT_TYPE_CONFIG[post.contentType];

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Media thumbnail */}
          {post.mediaUrl && (
            <img
              src={post.mediaUrl}
              alt=""
              className="w-24 h-24 rounded-lg object-cover shrink-0"
            />
          )}

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header with client name and content type */}
            <div className="flex items-center gap-2 flex-wrap">
              {post.clientName && (
                <span className="text-xs font-semibold text-primary">{post.clientName}</span>
              )}
              <Badge variant="outline" className="text-[10px]">
                {contentTypeCfg.label}
              </Badge>
              <Badge variant={statusCfg.variant} className="text-[10px]">
                {statusCfg.label}
              </Badge>
            </div>

            {/* Post content */}
            <p className="text-sm line-clamp-2">{post.content}</p>

            {/* Platform icons */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {post.platforms.map(p => (
                  <PlatformIcon key={p} platform={p} size="xs" variant="circle" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(parseISO(post.scheduledAt), "dd MMM, HH:mm", { locale: ptBR })}
              </span>
            </div>

            {/* Metrics row */}
            {post.metrics && (
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.metrics.likes.toLocaleString()}</span>
                <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{post.metrics.comments.toLocaleString()}</span>
                <span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{post.metrics.shares.toLocaleString()}</span>
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.metrics.reach.toLocaleString()}</span>
                {post.metrics.saves && <span className="flex items-center gap-1"><Bookmark className="h-3 w-3" />{post.metrics.saves.toLocaleString()}</span>}
                {post.metrics.clicks && <span className="flex items-center gap-1"><MousePointer className="h-3 w-3" />{post.metrics.clicks.toLocaleString()}</span>}
              </div>
            )}

            {/* Hashtags */}
            {post.hashtags && post.hashtags.length > 0 && (
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
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(post.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
