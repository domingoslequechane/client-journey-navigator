import { type SocialPlatform, PLATFORM_CONFIG } from '@/lib/social-media-mock';
import { cn } from '@/lib/utils';

interface PostPreviewProps {
  content: string;
  mediaUrl?: string;
  platform: SocialPlatform;
}

export function PostPreview({ content, mediaUrl, platform }: PostPreviewProps) {
  const config = PLATFORM_CONFIG[platform];
  const charLimit = config.charLimit;
  const isOverLimit = content.length > charLimit;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card max-w-[320px]">
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm", config.color)}>
          {config.icon}
        </div>
        <div>
          <p className="text-xs font-semibold">Sua Empresa</p>
          <p className="text-[10px] text-muted-foreground">@suaempresa</p>
        </div>
      </div>

      {/* Media */}
      {mediaUrl && (
        <div className="aspect-square bg-muted">
          <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <p className="text-xs whitespace-pre-wrap line-clamp-4">
          {content || <span className="text-muted-foreground italic">Escreva o conteúdo do post...</span>}
        </p>
      </div>

      {/* Char count */}
      <div className="px-3 pb-2 flex justify-end">
        <span className={cn("text-[10px]", isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground")}>
          {content.length}/{charLimit}
        </span>
      </div>
    </div>
  );
}
