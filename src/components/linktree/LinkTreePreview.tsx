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
  Send,
  ExternalLink
} from 'lucide-react';
import { GOOGLE_FONTS } from '@/types/linktree';
import type { LinkPage, LinkBlock } from '@/types/linktree';

interface LinkTreePreviewProps {
  linkPage: LinkPage | null;
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

export function LinkTreePreview({ linkPage }: LinkTreePreviewProps) {
  if (!linkPage) {
    return (
      <div className="w-[320px] h-[620px] rounded-[48px] bg-muted/50 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    );
  }

  const theme = linkPage.theme;
  const blocks = (linkPage.blocks || []).filter(b => b.is_enabled);

  // Get Google Font link
  const fontConfig = GOOGLE_FONTS.find(f => f.value === theme.fontFamily);

  const getButtonRadius = () => {
    switch (theme.buttonRadius) {
      case 'pill': return '9999px';
      case 'rounded': return '12px';
      case 'soft': return '8px';
      case 'square': return '4px';
      default: return '9999px';
    }
  };

  const getButtonStyle = (block?: LinkBlock) => {
    const baseRadius = getButtonRadius();

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
          color: theme.textColor,
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
    <>
      {/* Load Google Font */}
      {fontConfig && (
        <link href={fontConfig.link} rel="stylesheet" />
      )}
      
      {/* Phone Frame */}
      <div className="relative w-[320px]">
        {/* URL Bar */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs shadow-sm border z-20">
          <Globe className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">/l/</span>
          <span className="font-medium">{linkPage.slug}</span>
        </div>

        {/* Phone Body */}
        <div className="relative bg-foreground rounded-[48px] p-3 shadow-2xl">
          {/* Dynamic Island */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-7 bg-foreground rounded-full z-10" />
          
          {/* Screen */}
          <div
            className="w-full h-[620px] rounded-[36px] overflow-hidden relative"
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
              <div className="p-5 pt-14 pb-8 flex flex-col items-center min-h-full">
                {/* Profile */}
                <Avatar className="h-24 w-24 border-4 border-white/20 mb-4 shadow-xl">
                  <AvatarImage src={linkPage.logo_url || undefined} className="object-cover" />
                  <AvatarFallback 
                    className="text-3xl font-bold"
                    style={{ backgroundColor: theme.primaryColor, color: theme.textColor }}
                  >
                    {linkPage.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <h1 
                  className="font-bold text-xl mb-1 text-center"
                  style={{ color: theme.textColor }}
                >
                  {linkPage.name}
                </h1>
                
                {linkPage.bio && (
                  <p 
                    className="text-sm text-center mb-2 px-4 leading-relaxed"
                    style={{ color: `${theme.textColor}cc` }}
                  >
                    {linkPage.bio}
                  </p>
                )}

                <p 
                  className="text-xs mb-6"
                  style={{ color: `${theme.textColor}80` }}
                >
                  @{linkPage.slug}
                </p>

                {/* Blocks */}
                <div className="w-full space-y-3 px-1">
                  {blocks.map((block) => {
                    if (block.type === 'button') {
                      return (
                        <a
                          key={block.id}
                          href={block.content.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3.5 px-4 text-center text-sm font-medium transition-transform hover:scale-[1.02] active:scale-[0.98]"
                          style={getButtonStyle(block)}
                        >
                          {block.content.title || 'Link'}
                          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                        </a>
                      );
                    }

                    if (block.type === 'text') {
                      return (
                        <p
                          key={block.id}
                          className="text-center text-sm px-2 py-2"
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
                          style={{ borderColor: `${theme.textColor}20` }}
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
                                className="w-11 h-11 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
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
                          className="w-full rounded-xl"
                        />
                      );
                    }

                    return null;
                  })}
                </div>

                {/* Footer */}
                <div className="mt-auto pt-10">
                  <p 
                    className="text-[10px] flex items-center gap-1"
                    style={{ color: `${theme.textColor}50` }}
                  >
                    Feito com <span className="text-red-400">❤️</span> usando Qualify
                  </p>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </>
  );
}
