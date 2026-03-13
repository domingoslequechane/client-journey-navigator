import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudioTool } from '@/types/studio';

interface ToolCardProps {
    tool: StudioTool;
    className?: string;
}

export function ToolCard({ tool, className }: ToolCardProps) {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate(`/app/studio/tools/${tool.id}`)}
            className={cn(
                'group relative flex flex-col justify-end items-start p-5 rounded-2xl border bg-card overflow-hidden',
                'hover:border-primary/50 hover:shadow-xl transition-all duration-300 text-left min-h-[160px]',
                'hover:-translate-y-1 active:translate-y-0 transform-gpu',
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
                <div className="flex items-center justify-end w-full">
                    {/* Arrow */}
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                        tool.previewImage ? "bg-white/10 backdrop-blur-md text-white group-hover:bg-primary group-hover:text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    )}>
                        <ArrowRight className="h-4 w-4" />
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
            {tool.requiresInputImage && (
                <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-white border border-white/20 z-10 shadow-sm">
                    + Imagem
                </span>
            )}
        </button>
    );
}
