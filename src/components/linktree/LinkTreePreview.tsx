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
  ExternalLink,
  Video
} from 'lucide-react';
import { GOOGLE_FONTS } from '@/types/linktree';
import { useIsMobile } from '@/hooks/use-mobile';
import type { LinkPage, LinkBlock } from '@/types/linktree';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CarouselBlockPreview } from './blocks/CarouselBlockPreview';
import { ContactFormBlockPreview } from './blocks/ContactFormBlockPreview';

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
      <div className="w-full max-w-[280px] lg:max-w-[320px] aspect-[320/680] rounded-[40px] lg:rounded-[48px] bg-muted/50 flex items-center justify-center">
        <p className="text-muted-foreground text-xs lg:text-sm">Carregando...</p>
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
      
      {/* Phone Frame - Responsive */}
      <div className="relative w-[280px] lg:w-[320px] flex-shrink-0 flex items-center justify-center">
        {/* URL Bar */}
        <div className="absolute -top-7 lg:-top-8 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-lg px-2 lg:px-3 py-1 lg:py-1.5 flex items-center gap-1 lg:gap-2 text-[10px] lg:text-xs shadow-sm border z-20 w-[90%]">
          <Globe className="h-2.5 w-2.5 lg:h-3 lg:w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground flex-shrink-0">/l/</span>
          <span className="font-medium truncate min-w-0">{linkPage.slug}</span>
        </div>

        {/* Phone Body */}
        <div className="relative w-full bg-foreground rounded-[40px] lg:rounded-[48px] p-2 lg:p-3 shadow-2xl overflow-hidden">
          {/* Dynamic Island */}
          <div className="absolute top-3 lg:top-4 left-1/2 -translate-x-1/2 w-24 lg:w-28 h-6 lg:h-7 bg-foreground rounded-full z-10" />
          
          {/* Screen */}
          <div
            className="w-full aspect-[280/580] lg:aspect-[294/620] rounded-[32px] lg:rounded-[36px] overflow-hidden relative"
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
              <div className="p-4 lg:p-5 pt-10 lg:pt-14 pb-6 lg:pb-8 flex flex-col items-center min-h-full">
                {/* Profile */}
                <Avatar className="h-20 w-20 lg:h-24 lg:w-24 border-4 border-white/20 mb-3 lg:mb-4 shadow-xl">
                  <AvatarImage src={linkPage.logo_url || undefined} className="object-cover" />
                  <AvatarFallback 
                    className="text-2xl lg:text-3xl font-bold"
                    style={{ backgroundColor: theme.primaryColor, color: theme.textColor }}
                  >
                    {linkPage.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <h1 
                  className="font-bold text-lg lg:text-xl mb-1 text-center truncate w-full max-w-full px-2 overflow-hidden"
                  style={{ color: theme.textColor }}
                >
                  {linkPage.name}
                </h1>
                
                {linkPage.bio && (
                  <div 
                    className="text-xs lg:text-sm text-center mb-2 px-3 lg:px-4 leading-relaxed max-w-full overflow-hidden prose prose-sm prose-invert"
                    style={{ color: `${theme.textColor}cc` }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {linkPage.bio}
                    </ReactMarkdown>
                  </div>
                )}

                <p 
                  className="text-[10px] lg:text-xs mb-4 lg:mb-6 truncate w-full max-w-full text-center px-4 overflow-hidden"
                  style={{ color: `${theme.textColor}80` }}
                >
                  @{linkPage.slug}
                </p>

                {/* Blocks */}
                <div className="w-full space-y-2 lg:space-y-3 px-1 overflow-hidden">
                  {blocks.map((block) => {
                    if (block.type === 'button') {
                      return (
                        <a
                          key={block.id}
                          href={block.content.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3 lg:py-3.5 px-3 lg:px-4 text-center text-xs lg:text-sm font-medium transition-transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                          style={getButtonStyle(block)}
                        >
                          <span className="truncate min-w-0">{block.content.title || 'Link'}</span>
                          <ExternalLink className="h-3 w-3 lg:h-3.5 lg:w-3.5 opacity-60 flex-shrink-0" />
                        </a>
                      );
                    }

                    if (block.type === 'text') {
                      return (
                        <div
                          key={block.id}
                          className="text-center text-xs lg:text-sm px-2 py-1 lg:py-2 break-words overflow-hidden prose prose-sm prose-invert"
                          style={{ color: theme.textColor }}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {block.content.text || ''}
                          </ReactMarkdown>
                        </div>
                      );
                    }

                    if (block.type === 'divider') {
                      return (
                        <hr
                          key={block.id}
                          className="border-t my-3 lg:my-4"
                          style={{ borderColor: `${theme.textColor}20` }}
                        />
                      );
                    }

                    if (block.type === 'social') {
                      return (
                        <div key={block.id} className="w-full overflow-x-auto py-1 lg:py-2">
                          <div className="flex justify-center gap-2 lg:gap-3 min-w-min px-1 lg:px-2">
                            {block.content.socials?.map((social) => {
                              const Icon = SOCIAL_ICONS[social.platform] || Globe;
                              return (
                                <a
                                  key={social.platform}
                                  href={social.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-9 h-9 lg:w-11 lg:h-11 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 flex-shrink-0"
                                  style={{
                                    backgroundColor: theme.primaryColor,
                                    color: theme.textColor,
                                  }}
                                >
                                  <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    if (block.type === 'image' && block.content.imageUrl) {
                      return (
                        <div key={block.id} className="w-full">
                          <img
                            src={block.content.imageUrl}
                            alt=""
                            className="w-full rounded-lg lg:rounded-xl"
                          />
                          {block.content.title && (
                            <div className="mt-2 text-center text-[10px] lg:text-xs opacity-70 prose prose-sm prose-invert max-w-full">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {block.content.title}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (block.type === 'video' && block.content.videoUrl) {
                      const youtubeMatch = block.content.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                      const vimeoMatch = block.content.videoUrl.match(/vimeo\.com\/([0-9]{9,12})/);
                      let embedUrl = null;
                      
                      if (youtubeMatch) embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
                      else if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;

                      return (
                        <div key={block.id} className="w-full">
                          {embedUrl ? (
                            <div className="aspect-video rounded-lg lg:rounded-xl overflow-hidden">
                              <iframe
                                src={embedUrl}
                                className="w-full h-full"
                                allowFullScreen
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              />
                            </div>
                          ) : (
                            <a 
                              href={block.content.videoUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-xs"
                            >
                              <Video className="h-4 w-4" />
                              Ver Vídeo
                            </a>
                          )}
                          {block.content.title && (
                            <div className="mt-2 text-center text-[10px] lg:text-xs opacity-70 prose prose-sm prose-invert max-w-full">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {block.content.title}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
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
                          isPreview={true}
                          linkPageName={linkPage.name}
                        />
                      );
                    }

                    return null;
                  })}
                </div>

                {/* Footer */}
                <div className="mt-auto pt-6 lg:pt-10">
                  <p 
                    className="text-[9px] lg:text-[10px] flex items-center gap-1"
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
