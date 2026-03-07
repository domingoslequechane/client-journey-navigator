import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicLinkPage, recordAnalyticsEvent } from '@/hooks/useLinkPage';
import { Button } from '@/components/ui/button';
import { ExternalLink, Mail, TreeDeciduous, ChevronLeft, ChevronRight } from 'lucide-react';
import { SOCIAL_PLATFORMS, GOOGLE_FONTS, LinkPageTheme } from '@/types/linktree';
import { CarouselBlockPreview } from '@/components/linktree/blocks/CarouselBlockPreview';
import { ContactFormBlockPreview } from '@/components/linktree/blocks/ContactFormBlockPreview';

interface SocialIconsCarouselProps {
  blockId: string;
  socials: Array<{ platform: string; url: string }>;
  useOfficialColors?: boolean;
  theme: LinkPageTheme;
  onBlockClick: (blockId: string, url?: string) => void;
}

const MAX_VISIBLE_ICONS = 5;

function SocialIconsCarousel({ blockId, socials, useOfficialColors, theme, onBlockClick }: SocialIconsCarouselProps) {
  const [startIndex, setStartIndex] = useState(0);
  const hasMore = socials.length > MAX_VISIBLE_ICONS;
  const visibleSocials = hasMore ? socials.slice(startIndex, startIndex + MAX_VISIBLE_ICONS) : socials;

  const canGoNext = startIndex + MAX_VISIBLE_ICONS < socials.length;
  const canGoPrev = startIndex > 0;

  const handleNext = () => {
    if (canGoNext) {
      setStartIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (canGoPrev) {
      setStartIndex(prev => prev - 1);
    }
  };

  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-center gap-2">
        {hasMore && (
          <button
            onClick={handlePrev}
            disabled={!canGoPrev}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-white/10"
            style={{ color: theme.textColor }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div className="flex gap-3">
          {visibleSocials.map((social, idx) => {
            const platform = SOCIAL_PLATFORMS.find(p => p.id === social.platform);
            const Icon = platform?.icon;
            if (!Icon) return null;
            return (
              <button
                key={`${social.platform}-${startIndex + idx}`}
                onClick={() => onBlockClick(blockId, social.url)}
                className="p-3 rounded-full transition-transform hover:scale-110 flex-shrink-0"
                style={{
                  backgroundColor: useOfficialColors ? platform?.color : `${theme.primaryColor}30`,
                  color: useOfficialColors ? '#ffffff' : theme.textColor,
                }}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>

        {hasMore && (
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:bg-white/10"
            style={{ color: theme.textColor }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Indicator dots for pagination */}
      {hasMore && (
        <div className="flex justify-center gap-1 mt-2">
          {Array.from({ length: Math.ceil(socials.length - MAX_VISIBLE_ICONS + 1) }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                backgroundColor: i === startIndex ? theme.primaryColor : `${theme.textColor}30`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LinkTreePublic() {
  const { orgSlug, handle } = useParams<{ orgSlug: string; handle: string }>();
  const cleanSlug = handle?.startsWith('@') ? handle.slice(1) : handle;
  const { data: linkPage, isLoading, error } = usePublicLinkPage(cleanSlug, orgSlug);

  // Record page view
  useEffect(() => {
    if (linkPage?.id) {
      recordAnalyticsEvent(linkPage.id, 'view');
    }
  }, [linkPage?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="relative">
          <TreeDeciduous className="h-16 w-16 text-primary animate-pulse" />
        </div>
        <p className="mt-4 text-white/80 text-sm animate-pulse">
          Carregando sua árvore de links...
        </p>
      </div>
    );
  }

  if (error || !linkPage) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-2">Página não encontrada</h1>
          <p className="text-muted-foreground">Esta página de links não existe ou foi removida.</p>
        </div>
      </div>
    );
  }

  const theme = linkPage.theme;
  const blocks = linkPage.blocks || [];
  const enabledBlocks = blocks.filter(b => b.is_enabled !== false);

  const handleBlockClick = (blockId: string, url?: string) => {
    if (url) {
      recordAnalyticsEvent(linkPage.id, 'click', blockId);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const getButtonStyles = () => {
    const baseStyles = 'w-full p-4 text-center font-medium transition-all duration-200 hover:scale-[1.02]';

    switch (theme.buttonRadius) {
      case 'pill':
        return `${baseStyles} rounded-full`;
      case 'rounded':
        return `${baseStyles} rounded-xl`;
      case 'soft':
        return `${baseStyles} rounded-lg`;
      case 'square':
        return `${baseStyles} rounded-none`;
      default:
        return `${baseStyles} rounded-full`;
    }
  };

  const getButtonVariantStyles = () => {
    // Cores coletivas do tema apenas
    switch (theme.buttonStyle) {
      case 'glass':
        return {
          backgroundColor: `${theme.primaryColor}40`,
          color: theme.textColor,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${theme.primaryColor}60`,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: theme.textColor,
          border: `2px solid ${theme.primaryColor}`,
        };
      case 'soft':
        return {
          backgroundColor: `${theme.primaryColor}30`,
          color: theme.textColor,
        };
      case 'solid':
      default:
        return {
          backgroundColor: theme.primaryColor,
          color: theme.textColor,
        };
    }
  };

  const fontConfig = GOOGLE_FONTS.find(f => f.value === theme.fontFamily);
  const fontLink = fontConfig?.link || '';

  return (
    <>
      {fontLink && (
        <link href={fontLink} rel="stylesheet" />
      )}
      <div
        className="min-h-screen w-full relative"
        style={{
          backgroundColor: theme.backgroundColor,
          fontFamily: theme.fontFamily,
        }}
      >
        {/* Fixed Background Image */}
        {theme.backgroundImage && (
          <div
            className="fixed inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${theme.backgroundImage})` }}
          />
        )}

        {/* Overlay */}
        {theme.backgroundImage && (
          <div className="fixed inset-0 bg-black/40" />
        )}

        {/* Content */}
        <div className="relative z-10 min-h-screen w-full flex items-center justify-center">
          <div className="w-full max-w-md px-4 py-12 space-y-6">
            {/* Profile Section */}
            <div className="text-center space-y-3">
              {/* Avatar com fallback - SEMPRE renderiza */}
              <div
                className="w-24 h-24 rounded-full mx-auto flex items-center justify-center border-4 overflow-hidden"
                style={{
                  borderColor: theme.primaryColor,
                  backgroundColor: linkPage.logo_url ? 'transparent' : theme.primaryColor
                }}
              >
                {linkPage.logo_url ? (
                  <img
                    src={linkPage.logo_url}
                    alt={linkPage.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span
                    className="text-3xl font-bold"
                    style={{ color: theme.textColor }}
                  >
                    {linkPage.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <h1
                className="text-2xl font-bold"
                style={{ color: theme.textColor }}
              >
                {linkPage.name}
              </h1>
              {/* Slug @handle */}
              <p
                className="text-xs opacity-60"
                style={{ color: theme.textColor }}
              >
                @{linkPage.slug}
              </p>
              {linkPage.bio && (
                <p
                  className="text-sm opacity-80"
                  style={{ color: theme.textColor }}
                >
                  {linkPage.bio}
                </p>
              )}
            </div>

            {/* Blocks */}
            <div className="space-y-3">
              {enabledBlocks.map((block) => {
                switch (block.type) {
                  case 'button':
                    return (
                      <button
                        key={block.id}
                        onClick={() => handleBlockClick(block.id, block.content.url)}
                        className={getButtonStyles()}
                        style={getButtonVariantStyles()}
                      >
                        <span className="flex items-center justify-center gap-2">
                          {block.content.title}
                          <ExternalLink className="h-4 w-4 opacity-60" />
                        </span>
                      </button>
                    );

                  case 'text':
                    return (
                      <div
                        key={block.id}
                        className="text-center py-2"
                        style={{ color: theme.textColor }}
                      >
                        <p className="text-lg font-medium">{block.content.title}</p>
                        {block.content.text && (
                          <p className="text-sm opacity-80">{block.content.text}</p>
                        )}
                      </div>
                    );

                  case 'image':
                    return block.content.imageUrl ? (
                      <div key={block.id} className="rounded-xl overflow-hidden">
                        <img
                          src={block.content.imageUrl}
                          alt={block.content.title || 'Image'}
                          className="w-full h-auto"
                        />
                      </div>
                    ) : null;

                  case 'video':
                    if (!block.content.videoUrl) return null;

                    let videoEmbedUrl = null;
                    const youtubeMatch = block.content.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                    const vimeoMatch = block.content.videoUrl.match(/vimeo\.com\/([0-9]{9,12})/);

                    if (youtubeMatch) {
                      videoEmbedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
                    } else if (vimeoMatch) {
                      videoEmbedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
                    }

                    return videoEmbedUrl ? (
                      <div key={block.id} className="rounded-xl overflow-hidden aspect-video">
                        <iframe
                          src={videoEmbedUrl}
                          className="w-full h-full"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      </div>
                    ) : null;

                  case 'social':
                    const useOfficialColors = block.style?.useOfficialColors;
                    const socials = block.content.socials || [];
                    return (
                      <SocialIconsCarousel
                        key={block.id}
                        blockId={block.id}
                        socials={socials}
                        useOfficialColors={useOfficialColors}
                        theme={theme}
                        onBlockClick={handleBlockClick}
                      />
                    );

                  case 'divider':
                    return (
                      <div
                        key={block.id}
                        className="h-px w-full opacity-30"
                        style={{ backgroundColor: theme.textColor }}
                      />
                    );

                  case 'email-form':
                    return (
                      <div
                        key={block.id}
                        className="p-4 rounded-xl"
                        style={{ backgroundColor: `${theme.primaryColor}20` }}
                      >
                        <p className="text-center mb-3" style={{ color: theme.textColor }}>
                          {block.content.title || 'Inscreva-se na newsletter'}
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            placeholder="seu@email.com"
                            className="flex-1 px-4 py-2 rounded-lg bg-background/80 text-foreground"
                          />
                          <Button size="icon" style={{ backgroundColor: theme.primaryColor }}>
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );

                  case 'carousel':
                    return (
                      <CarouselBlockPreview
                        key={block.id}
                        block={block}
                        theme={theme}
                        onRecordClick={(blockId) => recordAnalyticsEvent(linkPage.id, 'click', blockId)}
                      />
                    );

                  case 'contact-form':
                    return (
                      <ContactFormBlockPreview
                        key={block.id}
                        block={block}
                        theme={theme}
                        onRecordClick={(blockId) => recordAnalyticsEvent(linkPage.id, 'click', blockId)}
                        linkPageName={linkPage.name}
                      />
                    );

                  default:
                    return null;
                }
              })}
            </div>

            {/* Footer */}
            <div className="text-center pt-8">
              <a
                href="https://qualify.marketing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs opacity-50 hover:opacity-80 transition-opacity"
                style={{ color: theme.textColor }}
              >
                Feito com ❤️ usando <span className="font-semibold underline">Qualify</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}