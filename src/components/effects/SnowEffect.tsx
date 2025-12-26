import { useEffect, useState } from 'react';

interface Confetti {
  id: number;
  left: number;
  animationDuration: number;
  animationDelay: number;
  size: number;
  color: string;
  rotation: number;
  type: 'confetti' | 'star' | 'sparkle';
}

const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#F59E0B', '#EC4899', '#10B981'];
const CONFETTI_SHAPES = ['■', '●', '▲', '◆'];

export function NewYearEffect() {
  const [confetti, setConfetti] = useState<Confetti[]>([]);

  useEffect(() => {
    const particles: Confetti[] = [];
    const count = 40;

    for (let i = 0; i < count; i++) {
      const type = Math.random() > 0.7 ? 'star' : Math.random() > 0.5 ? 'sparkle' : 'confetti';
      particles.push({
        id: i,
        left: Math.random() * 100,
        animationDuration: 4 + Math.random() * 6,
        animationDelay: Math.random() * 8,
        size: type === 'star' ? 12 + Math.random() * 8 : 6 + Math.random() * 10,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        type,
      });
    }

    setConfetti(particles);
  }, []);

  const getSymbol = (particle: Confetti) => {
    if (particle.type === 'star') return '✦';
    if (particle.type === 'sparkle') return '✨';
    return CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)];
  };

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-10vh) translateX(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          25% {
            transform: translateY(25vh) translateX(20px) rotate(180deg) scale(0.9);
          }
          50% {
            transform: translateY(50vh) translateX(-15px) rotate(360deg) scale(1.1);
          }
          75% {
            transform: translateY(75vh) translateX(25px) rotate(540deg) scale(0.8);
          }
          100% {
            transform: translateY(110vh) translateX(-10px) rotate(720deg) scale(0.6);
            opacity: 0;
          }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        
        @keyframes sparkleFloat {
          0% {
            transform: translateY(-5vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {confetti.map((particle) => (
          <div
            key={particle.id}
            className="absolute"
            style={{
              left: `${particle.left}%`,
              top: '-20px',
              fontSize: `${particle.size}px`,
              color: particle.color,
              textShadow: particle.type === 'sparkle' ? `0 0 10px ${particle.color}` : 'none',
              animation: particle.type === 'sparkle' 
                ? `sparkleFloat ${particle.animationDuration}s ease-in-out ${particle.animationDelay}s infinite, twinkle 1s ease-in-out infinite`
                : `confettiFall ${particle.animationDuration}s linear ${particle.animationDelay}s infinite`,
            }}
          >
            {getSymbol(particle)}
          </div>
        ))}
      </div>
    </>
  );
}

// Export with old name for backwards compatibility
export { NewYearEffect as SnowEffect };
