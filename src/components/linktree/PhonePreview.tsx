import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { CarouselBlockPreview } from './blocks/CarouselBlockPreview';
import { ContactFormBlockPreview } from './blocks/ContactFormBlockPreview';
import { SOCIAL_PLATFORMS } from '@/types/linktree';
import type { LinkPage, LinkBlock, LinkPageTheme } from '@/types/linktree';

interface PhonePreviewProps {
  linkPage: LinkPage;
}

interface SocialIconsCarouselProps {
  socials: Array<{ platform: string; url: string }>;
  useOfficialColors?: boolean;
  theme: LinkPageTheme;
}

const MAX_VISIBLE_ICONS = 5;

function SocialIconsCarousel({ socials, useOfficialColors, theme }: SocialIconsCarouselProps) {
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
    <div className="w-full py-1 lg:py-2">
      <div className="flex items-center justify-center gap-1">
        {hasMore && (
          <button
            onClick={handlePrev}
            disabled={!canGoPrev}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
            style={{ color: theme.textColor }}
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
        )}
        
        <div className="flex gap-2 lg:gap-3">
          {visibleSocials.map((social, idx) => {
            const platform = SOCIAL_PLATFORMS.find(p => p.id === social.platform);
            const Icon = platform?.icon;
            if (!Icon) return null;
            return (
              <a
                key={`${social.platform}-${startIndex + idx}`}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 flex-shrink-0"
                style={{
                  backgroundColor: useOfficialColors ? platform?.color : theme.primaryColor,
                  color: useOfficialColors ? '#ffffff' : theme.textColor,
                }}
              >
                <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
              </a>
            );
          })}
        </div>
        
        {hasMore && (
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
            style={{ color: theme.textColor }}
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export function PhonePreview({ linkPage }: PhonePreviewProps) {
  const theme = linkPage.theme;
  const blocks = (linkPage.blocks || []).filter(b => b.is_enabled);

  const getButtonStyle = (block?: LinkBlock) => {
    const baseRadius = 
      theme.buttonRadius === 'pill' ? '9999px' :
      theme.buttonRadius === 'rounded' ? '12px' :
      theme.buttonRadius === 'soft' ? '8px' : '4px';

    // Theme button style - cores coletivas apenas
    switch (theme.buttonStyle) {
      case 'solid':
        return {
          backgroundColor: theme.primaryColor,
          color: theme.textColor,
          borderRadius: baseRadius,
        };
      case 'glass':
        return {
          backgroundColor: `${theme.primaryColor}40`,
          color: theme.textColor,
          backdropFilter: 'blur(10px)',
          borderRadius: baseRadius,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: theme.primaryColor,
          border: `2px solid ${theme.primaryColor}`,
          borderRadius: baseRadius,
        };
      case 'soft':
        return {
          backgroundColor: `${theme.primaryColor}30`,
          color: theme.textColor,
          borderRadius: baseRadius,
        };
      default:
        return {
          backgroundColor: theme.primaryColor,
          color: theme.textColor,
          borderRadius: baseRadius,
        };
    }
  };

  return (
    <div className="relative flex items-center justify-center w-[260px] lg:w-[280px] flex-shrink-0">
      {/* Phone Frame - Responsive */}
      <div className="relative w-full aspect-[280/580] bg-black rounded-[36px] lg:rounded-[40px] p-2 lg:p-3 shadow-2xl overflow-hidden">
        {/* Dynamic Island */}
        <div className="absolute top-3 lg:top-4 left-1/2 -translate-x-1/2 w-20 lg:w-24 h-5 lg:h-6 bg-black rounded-full z-10" />
        
        {/* Screen */}
        <div
          className="w-full h-full rounded-[28px] lg:rounded-[32px] overflow-hidden relative"
          style={{
            backgroundColor: theme.backgroundColor,
            fontFamily: theme.fontFamily,
          }}
        >
          {/* Fixed Background Image */}
          {theme.backgroundImage && (
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${theme.backgroundImage})` }}
            />
          )}
          
          {/* Overlay for background image */}
          {theme.backgroundImage && (
            <div className="absolute inset-0 bg-black/30" />
          )}
          
          <ScrollArea className="h-full relative z-10">
            <div className="p-3 lg:p-4 pt-8 lg:pt-10 pb-6 lg:pb-8 flex flex-col items-center min-h-full">
              {/* Profile */}
              <Avatar className="h-16 w-16 lg:h-20 lg:w-20 border-4 border-white/20 mb-2 lg:mb-3">
                <AvatarImage src={linkPage.logo_url || undefined} />
                <AvatarFallback 
                  className="text-xl lg:text-2xl"
                  style={{ backgroundColor: theme.primaryColor, color: theme.textColor }}
                >
                  {linkPage.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <h1 
                className="font-bold text-base lg:text-lg mb-1 text-center truncate w-full max-w-full px-2 overflow-hidden"
                style={{ color: theme.textColor }}
              >
                {linkPage.name}
              </h1>
              
              {linkPage.bio && (
                <p 
                  className="text-xs lg:text-sm text-center mb-3 lg:mb-4 px-3 lg:px-4 line-clamp-2 max-w-full overflow-hidden"
                  style={{ color: `${theme.textColor}cc` }}
                >
                  {linkPage.bio}
                </p>
              )}

              <p 
                className="text-[10px] lg:text-xs mb-4 lg:mb-6 truncate w-full max-w-full text-center px-4 overflow-hidden"
                style={{ color: `${theme.textColor}99` }}
              >
                @{linkPage.slug}
              </p>

              {/* Blocks */}
              <div className="w-full space-y-2 lg:space-y-3 px-1 lg:px-2 overflow-hidden">
                {blocks.map((block) => {
                  if (block.type === 'button') {
                    return (
                      <a
                        key={block.id}
                        href={block.content.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-2.5 lg:py-3 px-3 lg:px-4 text-center text-xs lg:text-sm font-medium transition-transform hover:scale-[1.02] truncate overflow-hidden"
                        style={getButtonStyle(block)}
                      >
                        {block.content.title || 'Link'}
                      </a>
                    );
                  }

                  if (block.type === 'text') {
                    return (
                      <p
                        key={block.id}
                        className="text-center text-xs lg:text-sm px-2 break-words"
                        style={{ color: theme.textColor }}
                      >
                        {block.content.text}
                      </p>
                    );
                  }

                  if (block.type === 'divider') {
                    return (
                      <hr
                        key={block.id}
                        className="border-t my-3 lg:my-4"
                        style={{ borderColor: `${theme.textColor}30` }}
                      />
                    );
                  }

                  if (block.type === 'social') {
                    const useOfficialColors = block.style?.useOfficialColors;
                    const socials = block.content.socials || [];
                    return (
                      <SocialIconsCarousel 
                        key={block.id}
                        socials={socials}
                        useOfficialColors={useOfficialColors}
                        theme={theme}
                      />
                    );
                  }

                  if (block.type === 'image' && block.content.imageUrl) {
                    return (
                      <img
                        key={block.id}
                        src={block.content.imageUrl}
                        alt=""
                        className="w-full rounded-lg"
                      />
                    );
                  }

                  if (block.type === 'carousel') {
                    return (
                      <CarouselBlockPreview
                        key={block.id}
                        block={block}
                        theme={theme}
                      />
                    );
                  }

                  if (block.type === 'contact-form') {
                    return (
                      <ContactFormBlockPreview
                        key={block.id}
                        block={block}
                        theme={theme}
                        isPreview
                      />
                    );
                  }

                  return null;
                })}
              </div>

              {/* Footer */}
              <div className="mt-auto pt-6 lg:pt-8">
                <a 
                  href="https://qualify.onixagence.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] lg:text-[10px] hover:underline"
                  style={{ color: `${theme.textColor}66` }}
                >
                  Feito com ❤️ usando Qualify
                </a>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* URL Bar */}
      <div className="absolute -top-7 lg:-top-8 left-1/2 -translate-x-1/2 bg-muted/80 backdrop-blur-sm rounded-lg px-2 lg:px-3 py-1 lg:py-1.5 flex items-center gap-1 lg:gap-2 text-[10px] lg:text-xs w-[90%]">
        <Globe className="h-2.5 w-2.5 lg:h-3 lg:w-3 flex-shrink-0" />
        <span className="text-muted-foreground flex-shrink-0">/l/</span>
        <span className="font-medium truncate min-w-0">{linkPage.slug}</span>
      </div>
    </div>
  );
}
