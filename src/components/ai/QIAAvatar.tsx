import { MessagesSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QIAAvatarProps {
  size?: number;
  className?: string;
}

const QIAAvatar = ({ size = 32, className }: QIAAvatarProps) => {
  // Use a fixed smaller size for the icon relative to the avatar container
  const iconSize = Math.max(14, size * 0.55);

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "relative flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-chart-5 shadow-sm shrink-0 overflow-hidden",
        className
      )}
      aria-label="Assistente QIA Avatar"
    >
      <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
      <MessagesSquare 
        size={iconSize} 
        color="white" 
        strokeWidth={2.5}
        className="relative z-10"
      />
    </div>
  );
};

export default QIAAvatar;
