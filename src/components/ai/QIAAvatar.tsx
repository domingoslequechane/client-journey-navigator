interface QIAAvatarProps {
  size?: number;
  className?: string;
}

const QIAAvatar = ({ size = 32, className }: QIAAvatarProps) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 40 40" 
    fill="none" 
    className={className}
    aria-label="QIA Avatar"
  >
    <defs>
      <linearGradient id="qia-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--primary))" />
        <stop offset="100%" stopColor="hsl(var(--chart-5))" />
      </linearGradient>
      <linearGradient id="qia-shine" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="0.3" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
      </linearGradient>
    </defs>
    
    {/* Background circle with gradient */}
    <circle cx="20" cy="20" r="18" fill="url(#qia-gradient)" />
    
    {/* Shine effect */}
    <ellipse cx="14" cy="14" rx="8" ry="6" fill="url(#qia-shine)" />
    
    {/* Q letter */}
    <text 
      x="20" 
      y="26" 
      textAnchor="middle" 
      fill="white" 
      fontSize="18" 
      fontWeight="bold" 
      fontFamily="system-ui, -apple-system, sans-serif"
    >
      Q
    </text>
    
    {/* AI sparkle particles */}
    <circle cx="33" cy="9" r="3" fill="hsl(var(--chart-5))" opacity="0.9">
      <animate 
        attributeName="opacity" 
        values="0.9;0.4;0.9" 
        dur="2s" 
        repeatCount="indefinite" 
      />
    </circle>
    <circle cx="36" cy="16" r="1.8" fill="hsl(var(--primary))" opacity="0.7">
      <animate 
        attributeName="opacity" 
        values="0.7;0.3;0.7" 
        dur="2.5s" 
        repeatCount="indefinite" 
      />
    </circle>
    <circle cx="30" cy="5" r="2.2" fill="white" opacity="0.6">
      <animate 
        attributeName="opacity" 
        values="0.6;0.2;0.6" 
        dur="1.8s" 
        repeatCount="indefinite" 
      />
    </circle>
  </svg>
);

export default QIAAvatar;
