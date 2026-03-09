import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { INSPIRATION_TEMPLATES, InspirationTemplate } from '@/types/studio';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
    selectedTemplateId: string | null;
    onSelectTemplate: (template: InspirationTemplate) => void;
}

export function TemplateSelector({ selectedTemplateId, onSelectTemplate }: TemplateSelectorProps) {
    return (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x select-none">
            {INSPIRATION_TEMPLATES.map((template) => {
                const isSelected = selectedTemplateId === template.id;

                return (
                    <Card
                        key={template.id}
                        className={cn(
                            "overflow-hidden cursor-pointer transition-all hover:border-primary/50 group relative min-w-[260px] md:min-w-[300px] shrink-0 snap-center",
                            isSelected ? "border-primary ring-1 ring-primary" : "border-border"
                        )}
                        onClick={() => onSelectTemplate(template)}
                    >
                        {/* Visual Thumbnail */}
                        <div
                            className="h-24 w-full relative"
                            style={{ background: template.thumbnailUrl }}
                        >
                            {isSelected && (
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                    <CheckCircle2 className="h-8 w-8 text-white drop-shadow-md" />
                                </div>
                            )}
                            {template.badge && (
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "absolute top-2 right-2 shadow-sm font-semibold text-[10px] px-1.5 py-0 h-4 border-none",
                                        isSelected ? "bg-white text-primary hover:bg-white" : "bg-white/90 text-foreground hover:bg-white/90"
                                    )}
                                >
                                    {template.badge}
                                </Badge>
                            )}
                        </div>

                        {/* Content */}
                        <CardContent className="p-3">
                            <h4 className="font-semibold text-sm line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                                {template.name}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {template.description}
                            </p>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
