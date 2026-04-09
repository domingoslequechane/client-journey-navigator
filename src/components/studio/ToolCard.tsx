import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudioTool } from '@/types/studio';

interface ToolCardProps {
    tool: StudioTool;
    className?: string;
    isLocked?: boolean;
    usageCount?: number;
    maxCount?: number | null;
    onClick?: (e: React.MouseEvent) => void;
}

export function ToolCard({ tool, className, isLocked, usageCount, maxCount, onClick }: ToolCardProps) {
    const navigate = useNavigate();

    const handleClick = (e: React.MouseEvent) => {
        if (onClick) {
            onClick(e);
            return;
        }
        if (!isLocked) {
            navigate(`/app/studio/tools/${tool.id}`);
        }
    };

    return (
        <button
            onClick={handleClick}
            className={cn(
                'group relative flex flex-col justify-end items-start p-5 rounded-2xl border bg-card overflow-hidden',
                'hover:border-primary/50 hover:shadow-xl transition-all duration-300 text-left min-h-[160px]',
                'hover:-translate-y-1 active:translate-y-0 transform-gpu',
                isLocked && 'opacity-90 grayscale-[0.5]',
                className
            )}
            style={{ isolation: 'isolate', WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
        >
            {/* Background Image / Gradient Fallback */}
            {tool.previewImage ? (
                <>
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url(${tool.previewImage})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                </>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div
                        className="absolute inset-0 opacity-10 transition-transform duration-500 group-hover:scale-110"
                        style={{ background: `linear-gradient(135deg, ${tool.gradientFrom}, ${tool.gradientTo})` }}
                    />
                    <tool.icon className="h-16 w-16 opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500 text-foreground" />
                </div>
            )}

            {/* Content Container (Layer on top of background) */}
            <div className="relative z-10 w-full flex flex-col gap-2">
                <div className="flex items-center justify-between w-full">
                    {/* Credit Badge */}
                    <div className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md border shadow-sm",
                        tool.previewImage 
                            ? "bg-black/40 text-white/90 border-white/10" 
                            : "bg-muted text-muted-foreground border-border"
                    )}>
                        {maxCount === null ? 'Ilimitado' : `${usageCount || 0}/${maxCount} créditos`}
                    </div>

                    {/* Arrow / Lock */}
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                        isLocked 
                            ? "bg-destructive/10 text-destructive border border-destructive/20" 
                            : tool.previewImage 
                                ? "bg-white/10 backdrop-blur-md text-white group-hover:bg-primary group-hover:text-primary-foreground" 
                                : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    )}>
                        {isLocked ? (
                            <div className="relative">
                                <ArrowRight className="h-4 w-4 opacity-0" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                </div>
                            </div>
                        ) : (
                            <ArrowRight className="h-4 w-4" />
                        )}
                    </div>
                </div>

                {/* Text content */}
                <div className="flex-1 min-w-0 mt-2">
                    <p className={cn(
                        "font-bold text-base leading-tight transition-colors",
                        tool.previewImage ? "text-white group-hover:text-white" : "text-foreground group-hover:text-primary"
                    )}>
                        {tool.label}
                    </p>
                    <p className={cn(
                        "text-xs mt-1 leading-snug line-clamp-2",
                        tool.previewImage ? "text-white/70" : "text-muted-foreground"
                    )}>
                        {tool.description}
                    </p>
                </div>
            </div>

            {/* Input badge */}
            {isLocked ? (
                <span className="absolute top-3 left-3 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-destructive text-white border border-white/20 z-10 shadow-sm">
                    Limite Atingido
                </span>
            ) : tool.requiresInputImage && (
                <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-white border border-white/20 z-10 shadow-sm">
                    + Imagem
                </span>
            )}
        </button>
    );
}
