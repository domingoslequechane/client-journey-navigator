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

interface Firework {
  id: number;
  left: number;
  bottom: number;
  delay: number;
  color: string;
}

const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#F59E0B', '#EC4899', '#10B981'];
const CONFETTI_SHAPES = ['■', '●', '▲', '◆'];

export function NewYearEffect() {
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const [fireworks, setFireworks] = useState<Firework[]>([]);

  useEffect(() => {
    const particles: Confetti[] = [];
    const count = 60;

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

    // Create fireworks
    const fireworksArray: Firework[] = [];
    for (let i = 0; i < 8; i++) {
      fireworksArray.push({
        id: i,
        left: 10 + Math.random() * 80,
        bottom: 30 + Math.random() * 40,
        delay: Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }

    setConfetti(particles);
    setFireworks(fireworksArray);
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
        
        @keyframes fireworkLaunch {
          0% {
            transform: translateY(100vh) scale(0);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
        }
        
        @keyframes fireworkExplode {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          20% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        @keyframes textGlow {
          0%, 100% {
            text-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 215, 0, 0.4);
            transform: scale(1);
          }
          50% {
            text-shadow: 0 0 30px rgba(255, 215, 0, 1), 0 0 60px rgba(255, 215, 0, 0.8), 0 0 90px rgba(255, 215, 0, 0.6);
            transform: scale(1.02);
          }
        }
        
        @keyframes textReveal {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.8);
            filter: blur(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        
        @keyframes sparkBurst {
          0% {
            transform: translate(-50%, -50%) scale(0) rotate(0deg);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
            opacity: 0;
          }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {/* Fireworks */}
        {fireworks.map((fw) => (
          <div
            key={`firework-${fw.id}`}
            className="absolute"
            style={{
              left: `${fw.left}%`,
              bottom: `${fw.bottom}%`,
              animation: `fireworkExplode 2s ease-out ${fw.delay}s infinite`,
            }}
          >
            {/* Explosion particles */}
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: fw.color,
                  boxShadow: `0 0 10px ${fw.color}, 0 0 20px ${fw.color}`,
                  transform: `rotate(${i * 30}deg) translateY(-30px)`,
                }}
              />
            ))}
          </div>
        ))}
        
        {/* Confetti */}
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
