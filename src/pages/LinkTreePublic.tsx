import { useParams } from 'react-router-dom';
import { usePublicLinkPage, recordAnalyticsEvent } from '@/hooks/useLinkPage';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ExternalLink, Mail } from 'lucide-react';
import { SOCIAL_PLATFORMS, GOOGLE_FONTS } from '@/types/linktree';
import { CarouselBlockPreview } from '@/components/linktree/blocks/CarouselBlockPreview';
import { ContactFormBlockPreview } from '@/components/linktree/blocks/ContactFormBlockPreview';
import { useEffect } from 'react';

export default function LinkTreePublic() {
  const { orgSlug, slug } = useParams<{ orgSlug: string; slug: string }>();
  const { data: linkPage, isLoading, error } = usePublicLinkPage(slug, orgSlug);

  // Record page view
  useEffect(() => {
    if (linkPage?.id) {
      recordAnalyticsEvent(linkPage.id, 'view');
    }
  }, [linkPage?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
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

  const getButtonVariantStyles = (block: typeof blocks[0]) => {
    const bgColor = block.style?.backgroundColor || theme.primaryColor;
    const textColor = block.style?.textColor || theme.textColor;
    const isTransparent = block.style?.isTransparent;

    if (isTransparent) {
      return {
        backgroundColor: 'transparent',
        color: textColor,
        border: `2px solid ${bgColor}`,
      };
    }

    switch (theme.buttonStyle) {
      case 'glass':
        return {
          backgroundColor: `${bgColor}40`,
          color: textColor,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${bgColor}60`,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: textColor,
          border: `2px solid ${bgColor}`,
        };
      case 'soft':
        return {
          backgroundColor: `${bgColor}30`,
          color: textColor,
        };
      case 'solid':
      default:
        return {
          backgroundColor: bgColor,
          color: textColor,
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
        className="min-h-screen w-full flex items-center justify-center"
        style={{
          backgroundColor: theme.backgroundColor,
          backgroundImage: theme.backgroundImage ? `url(${theme.backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: theme.fontFamily,
        }}
      >
        <div 
          className="min-h-screen w-full flex items-center justify-center" 
          style={{
            background: theme.backgroundImage ? 'rgba(0,0,0,0.4)' : undefined,
          }}
        >
          <div className="w-full max-w-md px-4 py-12 space-y-6">
            {/* Profile Section */}
            <div className="text-center space-y-3">
              {linkPage.logo_url && (
                <img
                  src={linkPage.logo_url}
                  alt={linkPage.name}
                  className="w-24 h-24 rounded-full mx-auto object-cover border-4"
                  style={{ borderColor: theme.primaryColor }}
                />
              )}
              <h1
                className="text-2xl font-bold"
                style={{ color: theme.textColor }}
              >
                {linkPage.name}
              </h1>
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
                        style={getButtonVariantStyles(block)}
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
                    const videoId = block.content.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)([^&\n?#]+)/)?.[1];
                    const isYoutube = block.content.videoUrl.includes('youtube') || block.content.videoUrl.includes('youtu.be');
                    return videoId ? (
                      <div key={block.id} className="rounded-xl overflow-hidden aspect-video">
                        <iframe
                          src={isYoutube ? `https://www.youtube.com/embed/${videoId}` : `https://player.vimeo.com/video/${videoId}`}
                          className="w-full h-full"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      </div>
                    ) : null;

                  case 'social':
                    return (
                      <div key={block.id} className="flex justify-center gap-3 py-2">
                        {block.content.socials?.map((social, idx) => {
                          const platform = SOCIAL_PLATFORMS.find(p => p.id === social.platform);
                          const Icon = platform?.icon;
                          return Icon ? (
                            <button
                              key={idx}
                              onClick={() => handleBlockClick(block.id, social.url)}
                              className="p-3 rounded-full transition-transform hover:scale-110"
                              style={{
                                backgroundColor: `${theme.primaryColor}30`,
                                color: theme.textColor,
                              }}
                            >
                              <Icon className="h-5 w-5" />
                            </button>
                          ) : null;
                        })}
                      </div>
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
                      />
                    );

                  default:
                    return null;
                }
              })}
            </div>

            {/* Footer */}
            <div className="text-center pt-8">
              <p
                className="text-xs opacity-50"
                style={{ color: theme.textColor }}
              >
                Feito com ❤️ usando Qualify
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
