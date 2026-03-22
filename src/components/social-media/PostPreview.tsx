import React from 'react';
import { type SocialPlatform, PLATFORM_CONFIG, type ContentType } from '@/lib/social-media-mock';
import { PlatformIcon } from './PlatformIcon';
import { cn } from '@/lib/utils';
import { Heart, MessageCircle, Send, Bookmark, Share2, ThumbsUp, Repeat2, MoreHorizontal, Camera } from 'lucide-react';

interface PostPreviewProps {
  content: string;
  mediaUrl?: string;
  platform: SocialPlatform;
  contentType?: ContentType;
  accountName?: string;
  accountUsername?: string;
  accountAvatarUrl?: string;
  isVideo?: boolean;
}

const isVideo = (url?: string, isVideoProp?: boolean) => {
  if (isVideoProp !== undefined) return isVideoProp;
  if (!url) return false;
  return /\.(mp4|mov|avi|webm|m4v)$/i.test(url) || url.includes('video');
};

export function PostPreview({ content, mediaUrl, platform, contentType, accountName, accountUsername, accountAvatarUrl, isVideo: isVideoProp }: PostPreviewProps) {
  const config = PLATFORM_CONFIG[platform];
  const charLimit = config.charLimit;
  const isOverLimit = content.length > charLimit;

  const displayName = accountName || 'Conta Social';
  const username = accountUsername ? (accountUsername.startsWith('@') ? accountUsername : `@${accountUsername}`) : '@usuario';
  const initials = displayName.substring(0, 2).toUpperCase();

  const MediaDisplay = ({ url, className, objectFit = 'object-cover' }: { url?: string; className?: string, objectFit?: 'object-cover' | 'object-contain' }) => {
    if (!url) return (
      <div className={cn("aspect-square bg-muted flex items-center justify-center", className)}>
        <span className="text-muted-foreground text-xs">Sem mídia</span>
      </div>
    );

    if (isVideo(url, isVideoProp)) {
      return (
        <div className={cn("aspect-square bg-black relative flex items-center justify-center", className)}>
          <video src={url} className={cn("w-full h-full", objectFit)} autoPlay loop muted playsInline />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={cn("aspect-square bg-muted overflow-hidden", className)}>
        <img src={url} alt="" className={cn("w-full h-full", objectFit)} />
      </div>
    );
  };

  const Avatar = ({ size = 'w-8 h-8', className }: { size?: string; className?: string }) => (
    accountAvatarUrl ? (
      <img src={accountAvatarUrl} alt="" className={cn(size, "rounded-full object-cover border border-white/10 shadow-sm", className)} />
    ) : (
      <div className={cn(size, "rounded-full flex items-center justify-center text-primary-foreground text-[10px] font-bold border border-white/10 shadow-sm", className)}>
        {initials}
      </div>
    )
  );

  // Dedicated Story Preview
  if (contentType === 'stories') {
    return (
      <StoryPreview
        content={content}
        mediaUrl={mediaUrl}
        platform={platform}
        displayName={displayName}
        username={username}
        avatar={<Avatar size="w-8 h-8" />}
        isVideo={isVideoProp}
      />
    );
  }

  if (platform === 'instagram') return (
    <InstagramPreview content={content} mediaUrl={mediaUrl} isOverLimit={isOverLimit} charLimit={charLimit}
      displayName={displayName} username={username} avatar={<Avatar size="w-8 h-8" className="ring-2 ring-pink-500 ring-offset-1 ring-offset-[#1a1a1a]" />} MediaDisplay={MediaDisplay} />
  );
  if (platform === 'facebook') return (
    <FacebookPreview content={content} mediaUrl={mediaUrl} isOverLimit={isOverLimit} charLimit={charLimit}
      displayName={displayName} avatar={<Avatar size="w-10 h-10" className="bg-[hsl(220,70%,50%)]" />} MediaDisplay={MediaDisplay} />
  );
  if (platform === 'linkedin') return (
    <LinkedInPreview content={content} mediaUrl={mediaUrl} isOverLimit={isOverLimit} charLimit={charLimit}
      displayName={displayName} avatar={<Avatar size="w-10 h-10" className="bg-[hsl(210,80%,40%)]" />} MediaDisplay={MediaDisplay} />
  );
  if (platform === 'twitter') return (
    <TwitterPreview content={content} mediaUrl={mediaUrl} isOverLimit={isOverLimit} charLimit={charLimit}
      displayName={displayName} username={username} avatar={<Avatar size="w-10 h-10" className="bg-foreground" />} MediaDisplay={MediaDisplay} />
  );
  return (
    <GenericPreview content={content} mediaUrl={mediaUrl} platform={platform} isOverLimit={isOverLimit} charLimit={charLimit}
      displayName={displayName} username={username} avatar={<Avatar size="w-11 h-11" />} MediaDisplay={MediaDisplay} />
  );
}

interface PreviewCommonProps {
  content: string;
  mediaUrl?: string;
  isOverLimit: boolean;
  charLimit: number;
  displayName: string;
  avatar: React.ReactNode;
  MediaDisplay: React.ComponentType<{ url?: string; className?: string }>;
}

function InstagramPreview({ content, mediaUrl, isOverLimit, charLimit, displayName, avatar, username, MediaDisplay }: PreviewCommonProps & { username: string }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#1a1a1a] text-white border border-white/5 shadow-2xl w-full mx-auto">
      <div className="flex items-center justify-between p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] p-[1.5px] shrink-0">
            <div className="w-full h-full rounded-full bg-[#1a1a1a] overflow-hidden border border-black/10">
              {avatar}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold tracking-tight truncate max-w-[160px]">{username.replace('@', '')}</p>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-white/40" />
      </div>

      <MediaDisplay url={mediaUrl} className="aspect-square bg-[#121212]" />

      <div className="p-4 space-y-3.5 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Heart className="h-6 w-6 text-white/90" />
            <MessageCircle className="h-6 w-6 text-white/90" />
            <Send className="h-6 w-6 text-white/90" />
          </div>
          <Bookmark className="h-6 w-6 text-white/90" />
        </div>
        <div className="space-y-1.5">
          <p className="text-[13px] leading-snug">
            <span className="font-bold mr-2">{username.replace('@', '')}</span>
            <span className={cn("whitespace-pre-wrap", !content && "text-white/30 italic font-normal")}>
              {content || 'Escreva o conteúdo...'}
            </span>
          </p>
          <div className="flex justify-between items-center pt-3">
            <span className="text-[11px] text-white/20">Agora mesmo</span>
            <span className={cn("text-[11px] font-mono font-medium", isOverLimit ? "text-red-400 font-bold" : "text-white/20")}>
              {content.length}/{charLimit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FacebookPreview({ content, mediaUrl, isOverLimit, charLimit, displayName, avatar, MediaDisplay }: PreviewCommonProps) {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#1a1a1a] text-white border border-white/5 shadow-2xl w-full mx-auto">
      <div className="flex items-center gap-3.5 p-5">
        <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 shrink-0">
          {avatar}
        </div>
        <div>
          <p className="text-[14px] font-bold truncate max-w-[180px]">{displayName}</p>
          <p className="text-[11px] text-white/40 flex items-center gap-1">Agora mesmo · <span className="text-[9px]">🌐</span></p>
        </div>
      </div>

      <div className="px-5 pb-4">
        <p className={cn("text-[14px] whitespace-pre-wrap leading-relaxed font-sans", !content && "text-white/30 italic font-normal")}>
          {content || 'Escreva o conteúdo...'}
        </p>
      </div>

      <MediaDisplay url={mediaUrl} className="aspect-square bg-[#121212]" />

      <div className="px-5 py-4 flex items-center justify-between border-t border-white/5 mt-2 font-sans font-semibold">
        <div className="flex items-center gap-2 text-white/60 text-[12px]"><ThumbsUp className="h-5 w-5" /> Curtir</div>
        <div className="flex items-center gap-2 text-white/60 text-[12px]"><MessageCircle className="h-5 w-5" /> Comentar</div>
        <div className="flex items-center gap-2 text-white/60 text-[12px]"><Share2 className="h-5 w-5" /> Compartilhar</div>
      </div>

      <div className="px-5 pb-4 flex justify-end">
        <span className={cn("text-[11px] font-mono font-medium", isOverLimit ? "text-red-400 font-bold" : "text-white/20")}>
          {content.length}/{charLimit}
        </span>
      </div>
    </div>
  );
}

function LinkedInPreview({ content, mediaUrl, isOverLimit, charLimit, displayName, avatar, MediaDisplay }: PreviewCommonProps) {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#1a1a1a] text-white border border-white/5 shadow-2xl w-full mx-auto">
      <div className="flex items-center gap-4 p-5">
        <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 shrink-0">
          {avatar}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-bold truncate max-w-[180px]">{displayName}</p>
          <p className="text-[11px] text-white/40">Marketing Expert · Agora</p>
        </div>
      </div>

      <div className="px-5 pb-4 font-sans">
        <p className={cn("text-[14px] whitespace-pre-wrap leading-relaxed", !content && "text-white/30 italic")}>
          {content || 'Escreva o conteúdo...'}
        </p>
      </div>

      <MediaDisplay url={mediaUrl} className="aspect-video bg-[#121212]" />

      <div className="px-5 py-4 flex items-center justify-between border-t border-white/5 mt-2 text-white/60 font-sans font-semibold">
        <div className="flex items-center gap-2 text-[12px]"><ThumbsUp className="h-5 w-5" /> Gostei</div>
        <div className="flex items-center gap-2 text-[12px]"><MessageCircle className="h-5 w-5" /> Comentar</div>
        <div className="flex items-center gap-2 text-[12px]"><Repeat2 className="h-5 w-5" /> Repostar</div>
        <div className="flex items-center gap-2 text-[12px]"><Send className="h-5 w-5" /> Enviar</div>
      </div>

      <div className="px-5 pb-4 flex justify-end">
        <span className={cn("text-[11px] font-mono font-medium", isOverLimit ? "text-red-400 font-bold" : "text-white/20")}>
          {content.length}/{charLimit}
        </span>
      </div>
    </div>
  );
}

function TwitterPreview({ content, mediaUrl, isOverLimit, charLimit, displayName, username, avatar, MediaDisplay }: PreviewCommonProps & { username: string }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#1a1a1a] text-white border border-white/5 shadow-2xl w-full mx-auto">
      <div className="flex items-start gap-4 p-5">
        <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 shrink-0">
          {avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[14px] font-bold truncate max-w-[140px]">{displayName}</p>
            <p className="text-[11px] text-white/40 truncate">{username} · Agora</p>
          </div>
          <p className={cn("text-[14px] whitespace-pre-wrap mt-2.5 leading-relaxed font-sans", !content && "text-white/30 italic")}>
            {content || 'Escreva o conteúdo...'}
          </p>
          {mediaUrl && <MediaDisplay url={mediaUrl} className="mt-4 rounded-2xl overflow-hidden aspect-video bg-[#121212]" />}
          <div className="flex items-center justify-between mt-5 px-3 text-white/40">
            <MessageCircle className="h-5 w-5" />
            <Repeat2 className="h-5 w-5" />
            <Heart className="h-5 w-5" />
            <Share2 className="h-5 w-5" />
          </div>
        </div>
      </div>
      <div className="px-5 pb-4 flex justify-end">
        <span className={cn("text-[11px] font-mono font-medium", isOverLimit ? "text-red-400 font-bold" : "text-white/20")}>
          {content.length}/{charLimit}
        </span>
      </div>
    </div>
  );
}

function GenericPreview({ content, mediaUrl, platform, isOverLimit, charLimit, displayName, username, avatar, MediaDisplay }: PreviewCommonProps & { username: string; platform: SocialPlatform; }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#1a1a1a] text-white border border-white/5 shadow-2xl w-full mx-auto">
      <div className="flex items-center gap-4 p-5">
        <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 shrink-0">
          {avatar}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-bold truncate max-w-[180px]">{displayName}</p>
          <p className="text-[11px] text-white/40 truncate">{username}</p>
        </div>
      </div>

      <MediaDisplay url={mediaUrl} className="aspect-square bg-[#121212]" />

      <div className="p-5 font-sans">
        <p className={cn("text-[14px] whitespace-pre-wrap leading-relaxed", !content && "text-white/30 italic")}>
          {content || 'Escreva o conteúdo...'}
        </p>
      </div>

      <div className="px-5 pb-4 flex justify-end">
        <span className={cn("text-[11px] font-mono font-medium", isOverLimit ? "text-red-400 font-bold" : "text-white/20")}>
          {content.length}/{charLimit}
        </span>
      </div>
    </div>
  );
}

function StoryPreview({ content, mediaUrl, platform, displayName, username, avatar, isVideo: isVideoProp }: { content: string; mediaUrl?: string; platform: SocialPlatform; displayName: string; username: string; avatar: React.ReactNode; isVideo?: boolean }) {
  const isVid = isVideo(mediaUrl, isVideoProp);
  return (
    <div className="rounded-[32px] overflow-hidden bg-black text-white border border-white/10 shadow-2xl w-full aspect-[9/16] relative flex flex-col group/story">
      {/* Background with blur effect to avoid "empty" space */}
      <div className="absolute inset-0 z-0">
        {mediaUrl ? (
          <div className="w-full h-full relative">
            {isVid ? (
              <video src={mediaUrl} className="w-full h-full object-cover blur-2xl opacity-40 scale-110" autoPlay loop muted playsInline />
            ) : (
              <img src={mediaUrl} className="w-full h-full object-cover blur-2xl opacity-40 scale-110" alt="" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-slate-900 to-black" />
        )}
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pt-6">
          <div className="flex items-center gap-2">
            <div className="ring-2 ring-primary ring-offset-2 ring-offset-black rounded-full overflow-hidden">
              {avatar}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-none">{username.replace('@', '')}</span>
              <span className="text-[10px] text-white/60 leading-tight">2 min</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MoreHorizontal className="h-4 w-4 text-white/80" />
          </div>
        </div>

        {/* Media Block - Aspect Contain to avoid zoom/crop */}
        <div className="flex-1 flex items-center justify-center p-2">
          {mediaUrl ? (
            <div className="w-full max-h-full aspect-square relative shadow-2xl rounded-lg overflow-hidden border border-white/5 bg-black">
              {isVid ? (
                <video src={mediaUrl} className="w-full h-full object-contain" autoPlay loop muted playsInline />
              ) : (
                <img src={mediaUrl} className="w-full h-full object-contain" alt="" />
              )}
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center">
              <Camera className="h-8 w-8 text-white/20" />
            </div>
          )}
        </div>

        {/* Caption Overlay (Story style) */}
        {content && (
          <div className="px-6 py-8">
            <div className="bg-black/40 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <p className="text-xs leading-relaxed line-clamp-3 text-white/90 shadow-sm">{content}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 flex items-center gap-4 border-t border-white/5 bg-black/20 backdrop-blur-sm">
          <div className="flex-1 h-10 rounded-full border border-white/20 px-4 flex items-center text-[11px] text-white/40">
            Diz alguma coisa...
          </div>
          <Heart className="h-6 w-6 text-white/80" />
          <Send className="h-6 w-6 text-white/80 -rotate-12" />
        </div>
      </div>

      {/* Platform Badge */}
      <div className="absolute top-4 right-4 z-20">
        <PlatformIcon platform={platform} size="xs" variant="circle" />
      </div>
    </div>
  );
}
