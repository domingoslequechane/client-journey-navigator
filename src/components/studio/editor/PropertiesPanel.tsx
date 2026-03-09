import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CanvasElement } from '../canvas/types';
import { FONT_OPTIONS } from '@/types/studio';

interface PropertiesPanelProps {
    element: CanvasElement | null;
    onChange: (element: CanvasElement) => void;
}

export function PropertiesPanel({ element, onChange }: PropertiesPanelProps) {
    if (!element) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground p-4 text-center">
                Selecione um elemento no Canvas ou nas Camadas para editá-lo
            </div>
        );
    }

    const handleUpdate = (updates: Partial<CanvasElement>) => {
        onChange({ ...element, ...updates });
    };

    return (
        <div className="flex flex-col h-full gap-4 p-4 overflow-y-auto">
            <div className="space-y-4">
                {/* TEXT PROPERTIES */}
                {element.type === 'text' && (
                    <>
                        <div className="space-y-2">
                            <Label>Texto</Label>
                            <Textarea
                                value={element.text || ''}
                                onChange={(e) => handleUpdate({ text: e.target.value })}
                                rows={4}
                                className="resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Fonte</Label>
                            <Select value={element.fontFamily || 'Inter'} onValueChange={(val) => handleUpdate({ fontFamily: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Fonte" />
                                </SelectTrigger>
                                <SelectContent>
                                    {FONT_OPTIONS.map((font) => (
                                        <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                                            {font}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cor</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        value={element.fill || '#000000'}
                                        onChange={(e) => handleUpdate({ fill: e.target.value })}
                                        className="w-10 h-10 p-1"
                                    />
                                    <Input
                                        type="text"
                                        value={element.fill || '#000000'}
                                        onChange={(e) => handleUpdate({ fill: e.target.value })}
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Tamanho</Label>
                                <Input
                                    type="number"
                                    value={Math.round(element.fontSize || 16)}
                                    onChange={(e) => handleUpdate({ fontSize: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* SHAPE PROPERTIES */}
                {element.type === 'shape' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Cor de Preenchimento</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    value={element.fill || '#000000'}
                                    onChange={(e) => handleUpdate({ fill: e.target.value })}
                                    className="w-10 h-10 p-1"
                                />
                                <Input
                                    type="text"
                                    value={element.fill || '#000000'}
                                    onChange={(e) => handleUpdate({ fill: e.target.value })}
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        {element.shapeType === 'rect' && (
                            <div className="space-y-2">
                                <Label>Arredondamento</Label>
                                <Slider
                                    value={[element.cornerRadius || 0]}
                                    max={200}
                                    step={1}
                                    onValueChange={(val) => handleUpdate({ cornerRadius: val[0] })}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* COMMON PROPERTIES */}
                <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Opacidade</Label>
                            <span className="text-xs text-muted-foreground">{Math.round((element.opacity ?? 1) * 100)}%</span>
                        </div>
                        <Slider
                            value={[(element.opacity ?? 1) * 100]}
                            max={100}
                            step={1}
                            onValueChange={(val) => handleUpdate({ opacity: val[0] / 100 })}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
