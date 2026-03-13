import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { STUDIO_TOOLS } from '@/types/studio';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface StudioQuickMenuProps {
    currentToolId: string;
}

export function StudioQuickMenu({ currentToolId }: StudioQuickMenuProps) {
    const navigate = useNavigate();

    return (
        <TooltipProvider delayDuration={0}>
            <div className="hidden lg:flex w-[240px] h-full bg-background border-r flex-col py-4 px-3 gap-2.5 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)] overflow-y-auto no-scrollbar shrink-0">
                <div className="px-2 mb-2">
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Studio Tools</h2>
                </div>

                {STUDIO_TOOLS.map((tool) => {
                    const isActive = currentToolId === tool.id;

                    return (
                        <button
                            key={tool.id}
                            onClick={() => navigate(`/app/studio/tools/${tool.id}`)}
                            className={cn(
                                "group relative w-full h-[56px] rounded-xl overflow-hidden text-left transition-all duration-300 transform",
                                isActive
                                    ? "ring-2 ring-primary ring-offset-1 scale-[1.02] shadow-lg shadow-primary/10"
                                    : "hover:scale-[1.01] hover:shadow-md grayscale-[0.3] hover:grayscale-0"
                            )}
                        >
                            {/* Background Image/Gradient */}
                            {tool.previewImage ? (
                                <div
                                    className="absolute inset-0 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${tool.previewImage})` }}
                                />
                            ) : (
                                <div
                                    className="absolute inset-0"
                                    style={{ background: `linear-gradient(135deg, ${tool.gradientFrom}, ${tool.gradientTo})` }}
                                />
                            )}

                            {/* Dark Overlay for Legibility - Stronger on active/hover */}
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent transition-opacity duration-300",
                                isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100"
                            )} />

                            {/* Content */}
                            <div className="relative z-10 w-full h-full flex flex-col justify-center px-4">
                                <span className="font-bold text-[13px] leading-tight text-white drop-shadow-md truncate">
                                    {tool.label}
                                </span>
                            </div>

                            {/* Active Indicator */}
                            {isActive && (
                                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                            )}
                        </button>
                    );
                })}
            </div>
        </TooltipProvider>
    );
}
