import { FaInstagram, FaFacebookF, FaLinkedinIn, FaTiktok, FaYoutube, FaPinterestP, FaThreads, FaXTwitter } from 'react-icons/fa6';
import { Image, Film, Layers, Video, Type, CircleDashed } from 'lucide-react';
import { type ContentType } from '@/lib/social-media-mock';
import { cn } from '@/lib/utils';

const CONTENT_TYPE_ICONS: Record<ContentType, { icon: React.ReactNode; color: string }> = {
  feed: { icon: <Image className="h-4 w-4" />, color: 'text-primary' },
  stories: { icon: <CircleDashed className="h-4 w-4" />, color: 'text-primary' },
  reels: { icon: <Film className="h-4 w-4" />, color: 'text-primary' },
  carousel: { icon: <Layers className="h-4 w-4" />, color: 'text-primary' },
  video: { icon: <Video className="h-4 w-4" />, color: 'text-primary' },
  text: { icon: <Type className="h-4 w-4" />, color: 'text-primary' },
};

interface ContentTypeIconProps {
  type: ContentType;
  className?: string;
}

export function ContentTypeIcon({ type, className }: ContentTypeIconProps) {
  const config = CONTENT_TYPE_ICONS[type];
  if (!config) return null;
  return <span className={cn(config.color, className)}>{config.icon}</span>;
}