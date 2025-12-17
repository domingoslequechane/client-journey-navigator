import { ReactNode, useEffect, useState } from 'react';

interface PublicBackgroundProps {
  children: ReactNode;
}

export function PublicBackground({ children }: PublicBackgroundProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>
      
      {/* Background Elements with z-index -10 to stay behind content */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-background to-background" />
        
        {/* Animated blur glow orbs */}
        <div 
          className="absolute top-[5%] left-[5%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] bg-primary/8 rounded-full blur-[120px]"
          style={{ animation: 'glow 8s ease-in-out infinite' }}
        />
        <div 
          className="absolute top-[50%] right-[5%] w-[25vw] h-[25vw] max-w-[350px] max-h-[350px] bg-primary/6 rounded-full blur-[100px]"
          style={{ animation: 'glow 10s ease-in-out infinite', animationDelay: '2s' }}
        />
        <div 
          className="absolute bottom-[10%] left-[15%] w-[20vw] h-[20vw] max-w-[300px] max-h-[300px] bg-primary/8 rounded-full blur-[80px]"
          style={{ animation: 'glow 12s ease-in-out infinite', animationDelay: '4s' }}
        />
        
        {/* Glass balls with parallax effect */}
        <div 
          className="absolute w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm border border-primary/10"
          style={{ 
            top: '15%', 
            left: '10%',
            transform: `translateY(${scrollY * 0.1}px)`,
            animation: 'float 6s ease-in-out infinite',
            boxShadow: '0 8px 32px hsl(var(--primary) / 0.1), inset 0 0 32px hsl(var(--primary) / 0.05)'
          }}
        />
        <div 
          className="absolute w-24 h-24 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-primary/15 to-transparent backdrop-blur-sm border border-primary/10"
          style={{ 
            top: '60%', 
            right: '8%',
            transform: `translateY(${scrollY * 0.15}px)`,
            animation: 'float 8s ease-in-out infinite',
            animationDelay: '1s',
            boxShadow: '0 8px 32px hsl(var(--primary) / 0.1), inset 0 0 32px hsl(var(--primary) / 0.05)'
          }}
        />
        <div 
          className="absolute w-20 h-20 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-primary/25 to-primary/5 backdrop-blur-sm border border-primary/15"
          style={{ 
            bottom: '20%', 
            left: '20%',
            transform: `translateY(${scrollY * 0.08}px)`,
            animation: 'float 7s ease-in-out infinite',
            animationDelay: '2s',
            boxShadow: '0 8px 32px hsl(var(--primary) / 0.15), inset 0 0 32px hsl(var(--primary) / 0.08)'
          }}
        />
        <div 
          className="absolute w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/20 to-transparent backdrop-blur-sm border border-primary/10"
          style={{ 
            top: '30%', 
            right: '25%',
            transform: `translateY(${scrollY * 0.12}px)`,
            animation: 'float 9s ease-in-out infinite',
            animationDelay: '3s',
            boxShadow: '0 8px 32px hsl(var(--primary) / 0.1), inset 0 0 32px hsl(var(--primary) / 0.05)'
          }}
        />
        <div 
          className="absolute w-14 h-14 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-sm border border-primary/20"
          style={{ 
            top: '75%', 
            left: '60%',
            transform: `translateY(${scrollY * 0.06}px)`,
            animation: 'float 10s ease-in-out infinite',
            animationDelay: '4s',
            boxShadow: '0 8px 32px hsl(var(--primary) / 0.12), inset 0 0 32px hsl(var(--primary) / 0.06)'
          }}
        />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb,0,0,0)/0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb,0,0,0)/0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Content */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
}
