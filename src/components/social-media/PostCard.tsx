import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, BarChart3, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type SocialPost, PLATFORM_CONFIG, STATUS_CONFIG } from '@/lib/social-media-mock';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: SocialPost;
  onEdit: (post: SocialPost) => void;
  onDelete: (id: string) => void;
}

export function PostCard({ post, onEdit, onDelete }: PostCardProps) {
  const statusCfg = STATUS_CONFIG[post.status];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {post.mediaUrl && (
            <img
              src={post.mediaUrl}
              alt=""
              className="w-20 h-20 rounded-lg object-cover shrink-0"
            />
          )}
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-sm line-clamp-2">{post.content}</p>
            <div className="flex flex-wrap gap-1.5">
              {post.platforms.map(p => (
                <span key={p} className={cn("text-[10px] px-1.5 py-0.5 rounded-full text-primary-foreground", PLATFORM_CONFIG[p].color)}>
                  {PLATFORM_CONFIG[p].label}
                </span>
              ))}
              <Badge variant={statusCfg.variant} className="text-[10px]">{statusCfg.label}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(parseISO(post.scheduledAt), "dd MMM, HH:mm", { locale: ptBR })}
              </span>
              {post.metrics && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {post.metrics.reach.toLocaleString()} alcance
                </span>
              )}
            </div>
          </div>
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
