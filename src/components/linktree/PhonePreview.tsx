import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Globe, 
  Instagram, 
  Youtube, 
  Twitter, 
  Facebook, 
  Linkedin, 
  MessageCircle,
  Music,
  Music2,
  Github,
  MessageSquare,
  Send
} from 'lucide-react';
import { CarouselBlockPreview } from './blocks/CarouselBlockPreview';
import { ContactFormBlockPreview } from './blocks/ContactFormBlockPreview';
import type { LinkPage, LinkBlock } from '@/types/linktree';

interface PhonePreviewProps {
  linkPage: LinkPage;
}

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  youtube: Youtube,
  twitter: Twitter,
  facebook: Facebook,
  linkedin: Linkedin,
  whatsapp: MessageCircle,
  spotify: Music,
  tiktok: Music2,
  github: Github,
  discord: MessageSquare,
  telegram: Send,
  website: Globe,
};

export function PhonePreview({ linkPage }: PhonePreviewProps) {
  const theme = linkPage.theme;
  const blocks = (linkPage.blocks || []).filter(b => b.is_enabled);

  const getButtonStyle = (block?: LinkBlock) => {
    const baseRadius = 
      theme.buttonRadius === 'pill' ? '9999px' :
      theme.buttonRadius === 'rounded' ? '12px' :
      theme.buttonRadius === 'soft' ? '8px' : '4px';

    // Individual block style
    if (block?.style) {
      if (block.style.isTransparent) {
        return {
          backgroundColor: 'transparent',
          color: block.style.backgroundColor || theme.primaryColor,
          border: `2px solid ${block.style.backgroundColor || theme.primaryColor}`,
          borderRadius: baseRadius,
        };
      }
      return {
        backgroundColor: block.style.backgroundColor || theme.primaryColor,
        color: block.style.textColor || theme.textColor,
        borderRadius: baseRadius,
      };
    }

    // Theme button style
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
    <div className="relative">
      {/* Phone Frame */}
      <div className="relative w-[280px] h-[580px] bg-black rounded-[40px] p-3 shadow-2xl">
        {/* Dynamic Island */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />
        
        {/* Screen */}
        <div
          className="w-full h-full rounded-[32px] overflow-hidden relative"
          style={{
            backgroundColor: theme.backgroundColor,
            backgroundImage: theme.backgroundImage ? `url(${theme.backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            fontFamily: theme.fontFamily,
          }}
        >
          {/* Overlay for background image */}
          {theme.backgroundImage && (
            <div className="absolute inset-0 bg-black/30" />
          )}
          
          <ScrollArea className="h-full relative z-10">
            <div className="p-4 pt-10 pb-8 flex flex-col items-center min-h-full">
              {/* Profile */}
              <Avatar className="h-20 w-20 border-4 border-white/20 mb-3">
                <AvatarImage src={linkPage.logo_url || undefined} />
                <AvatarFallback 
                  className="text-2xl"
                  style={{ backgroundColor: theme.primaryColor, color: theme.textColor }}
                >
                  {linkPage.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <h1 
                className="font-bold text-lg mb-1 text-center"
                style={{ color: theme.textColor }}
              >
                {linkPage.name}
              </h1>
              
              {linkPage.bio && (
                <p 
                  className="text-sm text-center mb-4 px-4"
                  style={{ color: `${theme.textColor}cc` }}
                >
                  {linkPage.bio}
                </p>
              )}

              <p 
                className="text-xs mb-6"
                style={{ color: `${theme.textColor}99` }}
              >
                @{linkPage.slug}
              </p>

              {/* Blocks */}
              <div className="w-full space-y-3 px-2">
                {blocks.map((block) => {
                  if (block.type === 'button') {
                    return (
                      <a
                        key={block.id}
                        href={block.content.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-3 px-4 text-center text-sm font-medium transition-transform hover:scale-[1.02]"
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
                        className="text-center text-sm px-2"
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
                        className="border-t my-4"
                        style={{ borderColor: `${theme.textColor}30` }}
                      />
                    );
                  }

                  if (block.type === 'social') {
                    return (
                      <div key={block.id} className="flex justify-center gap-3 py-2">
                        {block.content.socials?.map((social) => {
                          const Icon = SOCIAL_ICONS[social.platform] || Globe;
                          return (
                            <a
                              key={social.platform}
                              href={social.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                              style={{
                                backgroundColor: theme.primaryColor,
                                color: theme.textColor,
                              }}
                            >
                              <Icon className="h-5 w-5" />
                            </a>
                          );
                        })}
                      </div>
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
              <div className="mt-auto pt-8">
                <p 
                  className="text-[10px]"
                  style={{ color: `${theme.textColor}66` }}
                >
                  Feito com Qualify
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* URL Bar */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-muted/80 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
        <Globe className="h-3 w-3" />
        <span className="text-muted-foreground">/l/</span>
        <span className="font-medium">{linkPage.slug}</span>
      </div>
    </div>
  );
}
