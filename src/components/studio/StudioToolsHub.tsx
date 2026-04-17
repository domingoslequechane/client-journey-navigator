import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ToolCard } from './ToolCard';
import { cn } from '@/lib/utils';
import { STUDIO_TOOLS, STUDIO_TOOL_CATEGORIES } from '@/types/studio';
import type { StudioToolCategory } from '@/types/studio';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { FreeLimitModal } from '@/components/subscription/FreeLimitModal';

interface StudioToolsHubProps {
    className?: string;
}

export function StudioToolsHub({ className }: StudioToolsHubProps) {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<StudioToolCategory | 'all'>('all');
    const { limits, usage, planType } = usePlanLimits();
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [limitDesc, setLimitDesc] = useState('');

    const getToolStatus = (toolId: string) => {
        const isLimited = ['free', 'trial'].includes(planType as string);
        // Fallback limits if not provided by the hook for some reason
        const defaultLimit = 5;
        
        switch (toolId) {
            case 'studio_flyer': {
                const max = limits.maxStudioFlyer ?? (isLimited ? defaultLimit : null);
                return { usage: usage.studioFlyerCount, max, isLocked: isLimited && usage.studioFlyerCount >= (max ?? 0), label: '5 Flyers no Studio' };
            }
            case 'studio_carousel': {
                const max = limits.maxStudioCarousel ?? (isLimited ? defaultLimit : null);
                return { usage: usage.studioCarouselCount, max, isLocked: isLimited && usage.studioCarouselCount >= (max ?? 0), label: '5 Carrosséis no Studio' };
            }
            case 'studio_recolor': {
                const max = limits.maxStudioRecolor ?? (isLimited ? defaultLimit : null);
                return { usage: usage.studioRecolorCount, max, isLocked: isLimited && usage.studioRecolorCount >= (max ?? 0), label: '5 Recolorações no Studio' };
            }
            case 'studio_product_beauty': {
                const max = limits.maxStudioProductBeauty ?? (isLimited ? defaultLimit : null);
                return { usage: usage.studioProductBeautyCount, max, isLocked: isLimited && usage.studioProductBeautyCount >= (max ?? 0), label: '5 Produtos Embelezados no Studio' };
            }
            case 'studio_product_scene': {
                const max = limits.maxStudioProductScene ?? (isLimited ? defaultLimit : null);
                return { usage: usage.studioProductSceneCount, max, isLocked: isLimited && usage.studioProductSceneCount >= (max ?? 0), label: '5 Cenários de Produto no Studio' };
            }
            case 'video-generator': {
                const max = isLimited ? 2 : null; // Limit to 2 videos on free plan
                return { usage: 0, max, isLocked: false, label: '2 Vídeos no Studio' }; // Assuming zero usage tracking for now for simplicity, or we could fetch it explicitly.
            }
            default:
                return { usage: 0, max: null, isLocked: false, label: '' };
        }
    };

    const filtered = STUDIO_TOOLS.filter((tool) => {
        const matchesSearch =
            search.trim() === '' ||
            tool.label.toLowerCase().includes(search.toLowerCase()) ||
            tool.description.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    // Group by category for display
    const groups =
        activeCategory === 'all'
            ? STUDIO_TOOL_CATEGORIES.map((cat) => ({
                ...cat,
                tools: filtered.filter((t) => t.category === cat.id),
            })).filter((g) => g.tools.length > 0)
            : [
                {
                    ...STUDIO_TOOL_CATEGORIES.find((c) => c.id === activeCategory)!,
                    tools: filtered,
                },
            ];

    return (
        <div className={cn('space-y-8', className)}>
            {/* Search + Category Tabs */}
            <div className="space-y-4">
                {/* Search */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Pesquisar ferramentas..."
                        className="pl-10 h-9"
                    />
                </div>

                {/* Category tabs */}
                {STUDIO_TOOL_CATEGORIES.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
                                activeCategory === 'all'
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                            )}
                        >
                            Todas
                        </button>
                        {STUDIO_TOOL_CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border flex items-center gap-1.5',
                                    activeCategory === cat.id
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                )}
                            >
                                {cat.label}
                            </button>
                        ))}
                </div>
            )}
        </div>

        {/* Tool groups */}
        {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">Nenhuma ferramenta encontrada para "{search}"</p>
            </div>
        ) : (
            groups.map((group) => (
                <section key={group.id}>
                    <div className="flex items-center gap-2 mb-3">
                        <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
                        <span className="text-xs text-muted-foreground">({group.tools.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {group.tools.map((tool) => {
                                const status = getToolStatus(tool.id);
                                return (
                                    <ToolCard 
                                        key={tool.id} 
                                        tool={tool} 
                                        isLocked={status.isLocked}
                                        usageCount={status.usage}
                                        maxCount={status.max}
                                        onClick={status.isLocked ? () => {
                                            setLimitDesc(status.label);
                                            setShowLimitModal(true);
                                        } : undefined}
                                    />
                                );
                            })}
                        </div>
                    </section>
                ))
            )}

            <FreeLimitModal
                open={showLimitModal}
                onOpenChange={setShowLimitModal}
                limitDescription={limitDesc}
            />
        </div>
    );
}
