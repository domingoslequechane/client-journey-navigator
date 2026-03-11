import { FaInstagram, FaFacebookF, FaLinkedinIn, FaTiktok, FaYoutube, FaPinterestP, FaThreads, FaCircleQuestion, FaGoogle, FaReddit, FaTelegram, FaSnapchat, FaCloud } from 'react-icons/fa6';
import { FaXTwitter } from 'react-icons/fa6';
import { type SocialPlatform } from '@/lib/social-media-mock';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: FaInstagram,
  facebook: FaFacebookF,
  linkedin: FaLinkedinIn,
  tiktok: FaTiktok,
  twitter: FaXTwitter,
  youtube: FaYoutube,
  pinterest: FaPinterestP,
  threads: FaThreads,
  googlebusiness: FaGoogle,
  reddit: FaReddit,
  telegram: FaTelegram,
  snapchat: FaSnapchat,
  bluesky: FaCloud,
};

const COLOR_MAP: Record<string, string> = {
  instagram: 'text-[hsl(330,70%,50%)]',
  facebook: 'text-[hsl(220,70%,50%)]',
  linkedin: 'text-[hsl(210,80%,40%)]',
  tiktok: 'text-foreground',
  twitter: 'text-foreground',
  youtube: 'text-[hsl(0,80%,50%)]',
  pinterest: 'text-[hsl(350,80%,45%)]',
  threads: 'text-foreground',
  googlebusiness: 'text-[hsl(210,100%,45%)]',
  reddit: 'text-[hsl(15,100%,50%)]',
  telegram: 'text-[hsl(200,80%,50%)]',
  snapchat: 'text-[hsl(55,100%,50%)]',
  bluesky: 'text-[hsl(200,90%,60%)]',
};

const BG_MAP: Record<string, string> = {
  instagram: 'bg-gradient-to-br from-[hsl(280,70%,50%)] via-[hsl(330,80%,55%)] to-[hsl(30,90%,55%)]',
  facebook: 'bg-[hsl(220,70%,50%)]',
  linkedin: 'bg-[hsl(210,80%,40%)]',
  tiktok: 'bg-foreground',
  twitter: 'bg-foreground',
  youtube: 'bg-[hsl(0,80%,50%)]',
  pinterest: 'bg-[hsl(350,80%,45%)]',
  threads: 'bg-foreground',
  googlebusiness: 'bg-[hsl(210,100%,45%)]',
  reddit: 'bg-[hsl(15,100%,50%)]',
  telegram: 'bg-[hsl(200,80%,50%)]',
  snapchat: 'bg-[hsl(55,100%,50%)]',
  bluesky: 'bg-[hsl(200,90%,60%)]',
};

interface PlatformIconProps {
  platform: SocialPlatform | string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'badge' | 'circle';
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const circleSizeClasses = {
  xs: 'h-5 w-5',
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
};

const circleIconSizeClasses = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function PlatformIcon({ platform, className, size = 'md', variant = 'icon' }: PlatformIconProps) {
  const Icon = ICON_MAP[platform] || FaCircleQuestion;
  const colorClass = COLOR_MAP[platform] || 'text-muted-foreground';
  const bgClass = BG_MAP[platform] || 'bg-muted-foreground';

  if (variant === 'circle') {
    return (
      <div className={cn(
        "rounded-full flex items-center justify-center text-primary-foreground",
        circleSizeClasses[size],
        bgClass,
        className
      )}>
        <Icon className={circleIconSizeClasses[size]} />
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-primary-foreground",
        bgClass,
        className
      )}>
        <Icon className="h-3 w-3" />
      </div>
    );
  }

  return <Icon className={cn(sizeClasses[size], colorClass, className)} />;
}

export { ICON_MAP, COLOR_MAP, BG_MAP };

