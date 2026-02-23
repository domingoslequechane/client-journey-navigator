import { type SocialPlatform, PLATFORM_CONFIG } from '@/lib/social-media-mock';
import { PlatformIcon } from './PlatformIcon';
import { cn } from '@/lib/utils';
import { Heart, MessageCircle, Send, Bookmark, Share2, ThumbsUp, Repeat2, MoreHorizontal } from 'lucide-react';

interface PostPreviewProps {
  content: string;
  mediaUrl?: string;
  platform: SocialPlatform;
}

export function PostPreview({ content, mediaUrl, platform }: PostPreviewProps) {
  const config = PLATFORM_CONFIG[platform];
  const charLimit = config.charLimit;
  const isOverLimit = content.length > charLimit;

  if (platform === 'instagram') return <InstagramPreview content={content} mediaUrl={mediaUrl} isOverLimit={isOverLimit} charLimit={charLimit} />;
  if (platform === 'facebook') return <FacebookPreview content={content} mediaUrl={mediaUrl} isOverLimit={isOverLimit} charLimit={charLimit} />;
  if (platform === 'linkedin') return <LinkedInPreview content={content} mediaUrl={mediaUrl} isOverLimit={isOverLimit} charLimit={charLimit} />;
  if (platform === 'twitter') return <TwitterPreview content={content} mediaUrl={mediaUrl} isOverLimit={isOverLimit} charLimit={charLimit} />;
  return <GenericPreview content={content} mediaUrl={mediaUrl} platform={platform} isOverLimit={isOverLimit} charLimit={charLimit} />;
}

function InstagramPreview({ content, mediaUrl, isOverLimit, charLimit }: { content: string; mediaUrl?: string; isOverLimit: boolean; charLimit: number }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card max-w-[320px]">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(280,70%,50%)] via-[hsl(330,80%,55%)] to-[hsl(30,90%,55%)] p-[2px]">
            <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
              <span className="text-[10px] font-bold">DH</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold">dreamhouse</p>
            <p className="text-[9px] text-muted-foreground">Patrocinado</p>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>

      {mediaUrl ? (
        <div className="aspect-square bg-muted">
          <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-square bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-xs">Sem imagem</span>
        </div>
      )}

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5" />
            <MessageCircle className="h-5 w-5" />
            <Send className="h-5 w-5" />
          </div>
          <Bookmark className="h-5 w-5" />
        </div>
        <p className="text-xs">
          <span className="font-semibold">dreamhouse </span>
          <span className="whitespace-pre-wrap line-clamp-3">
            {content || <span className="text-muted-foreground italic">Escreva o conteúdo...</span>}
          </span>
        </p>
      </div>

      <div className="px-3 pb-2 flex justify-end">
        <span className={cn("text-[10px]", isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground")}>
          {content.length}/{charLimit}
        </span>
      </div>
    </div>
  );
}

function FacebookPreview({ content, mediaUrl, isOverLimit, charLimit }: { content: string; mediaUrl?: string; isOverLimit: boolean; charLimit: number }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card max-w-[320px]">
      <div className="flex items-center gap-2 p-3">
        <div className="w-10 h-10 rounded-full bg-[hsl(220,70%,50%)] flex items-center justify-center text-primary-foreground text-sm font-bold">DH</div>
        <div>
          <p className="text-xs font-semibold">Dream House</p>
          <p className="text-[10px] text-muted-foreground">Agora mesmo · 🌐</p>
        </div>
      </div>

      <div className="px-3 pb-2">
        <p className="text-xs whitespace-pre-wrap line-clamp-4">
          {content || <span className="text-muted-foreground italic">Escreva o conteúdo...</span>}
        </p>
      </div>

      {mediaUrl && (
        <div className="aspect-video bg-muted">
          <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-3 border-t border-border flex items-center justify-around text-muted-foreground">
        <div className="flex items-center gap-1 text-xs"><ThumbsUp className="h-4 w-4" /> Curtir</div>
        <div className="flex items-center gap-1 text-xs"><MessageCircle className="h-4 w-4" /> Comentar</div>
        <div className="flex items-center gap-1 text-xs"><Share2 className="h-4 w-4" /> Compartilhar</div>
      </div>

      <div className="px-3 pb-2 flex justify-end">
        <span className={cn("text-[10px]", isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground")}>
          {content.length}/{charLimit}
        </span>
      </div>
    </div>
  );
}

function LinkedInPreview({ content, mediaUrl, isOverLimit, charLimit }: { content: string; mediaUrl?: string; isOverLimit: boolean; charLimit: number }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card max-w-[320px]">
      <div className="flex items-center gap-2 p-3">
        <div className="w-10 h-10 rounded-full bg-[hsl(210,80%,40%)] flex items-center justify-center text-primary-foreground text-sm font-bold">DH</div>
        <div>
          <p className="text-xs font-semibold">Dream House</p>
          <p className="text-[10px] text-muted-foreground">Marketing Agency · 1h</p>
        </div>
      </div>

      <div className="px-3 pb-2">
        <p className="text-xs whitespace-pre-wrap line-clamp-4">
          {content || <span className="text-muted-foreground italic">Escreva o conteúdo...</span>}
        </p>
      </div>

      {mediaUrl && (
        <div className="aspect-video bg-muted">
          <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-3 border-t border-border flex items-center justify-around text-muted-foreground">
        <div className="flex items-center gap-1 text-xs"><ThumbsUp className="h-4 w-4" /> Gostei</div>
        <div className="flex items-center gap-1 text-xs"><MessageCircle className="h-4 w-4" /> Comentar</div>
        <div className="flex items-center gap-1 text-xs"><Repeat2 className="h-4 w-4" /> Repostar</div>
        <div className="flex items-center gap-1 text-xs"><Send className="h-4 w-4" /> Enviar</div>
      </div>

      <div className="px-3 pb-2 flex justify-end">
        <span className={cn("text-[10px]", isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground")}>
          {content.length}/{charLimit}
        </span>
      </div>
    </div>
  );
}

function TwitterPreview({ content, mediaUrl, isOverLimit, charLimit }: { content: string; mediaUrl?: string; isOverLimit: boolean; charLimit: number }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card max-w-[320px]">
      <div className="flex items-start gap-2 p-3">
        <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center text-background text-sm font-bold shrink-0">DH</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold">Dream House</p>
            <p className="text-[10px] text-muted-foreground">@dreamhouse · 1h</p>
          </div>
          <p className="text-xs whitespace-pre-wrap mt-1 line-clamp-4">
            {content || <span className="text-muted-foreground italic">Escreva o conteúdo...</span>}
          </p>
          {mediaUrl && (
            <div className="mt-2 rounded-xl overflow-hidden aspect-video bg-muted">
              <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex items-center justify-between mt-2 text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <Repeat2 className="h-4 w-4" />
            <Heart className="h-4 w-4" />
            <Share2 className="h-4 w-4" />
          </div>
        </div>
      </div>
      <div className="px-3 pb-2 flex justify-end">
        <span className={cn("text-[10px]", isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground")}>
          {content.length}/{charLimit}
        </span>
      </div>
    </div>
  );
}

function GenericPreview({ content, mediaUrl, platform, isOverLimit, charLimit }: { content: string; mediaUrl?: string; platform: SocialPlatform; isOverLimit: boolean; charLimit: number }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card max-w-[320px]">
      <div className="flex items-center gap-2 p-3">
        <PlatformIcon platform={platform} size="md" variant="circle" />
        <div>
          <p className="text-xs font-semibold">Dream House</p>
          <p className="text-[10px] text-muted-foreground">@dreamhouse</p>
        </div>
      </div>
      {mediaUrl && (
        <div className="aspect-square bg-muted">
          <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3">
        <p className="text-xs whitespace-pre-wrap line-clamp-4">
          {content || <span className="text-muted-foreground italic">Escreva o conteúdo...</span>}
        </p>
      </div>
      <div className="px-3 pb-2 flex justify-end">
        <span className={cn("text-[10px]", isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground")}>
          {content.length}/{charLimit}
        </span>
      </div>
    </div>
  );
}
