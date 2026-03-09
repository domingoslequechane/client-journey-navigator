import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Type, Image as ImageIcon, Square, Circle, Eye, EyeOff, Lock, LockOpen, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { CanvasElement } from '../canvas/types';

interface LayerManagerProps {
    elements: CanvasElement[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onChange: (elements: CanvasElement[]) => void;
}

export function LayerManager({ elements, selectedId, onSelect, onChange }: LayerManagerProps) {
    // Sort elements by zIndex descending for the visual list (top layer first)
    const sortedElements = [...elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

    const handleDragEnd = (result: any) => {
        if (!result.destination) return;

        const startIndex = result.source.index;
        const endIndex = result.destination.index;

        const resultList = Array.from(sortedElements);
        const [removed] = resultList.splice(startIndex, 1);
        resultList.splice(endIndex, 0, removed);

        // Reassign zIndex based on new order (highest zIndex = top of the list)
        const baseZIndex = 10;
        const updatedElements = resultList.map((el, idx) => ({
            ...el,
            zIndex: baseZIndex + (resultList.length - idx),
        }));

        // Update the main elements array
        const newElements = elements.map(el => {
            const updated = updatedElements.find(u => u.id === el.id);
            return updated || el;
        });

        onChange(newElements);
    };

    const toggleLock = (id: string, currentLock?: boolean) => {
        onChange(elements.map(el => el.id === id ? { ...el, isLocked: !currentLock } : el));
    };

    const toggleVisibility = (id: string, currentOpacity?: number) => {
        const isVisible = currentOpacity !== 0;
        onChange(elements.map(el => el.id === id ? { ...el, opacity: isVisible ? 0 : 1 } : el));
    };

    const deleteElement = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onChange(elements.filter(el => el.id !== id));
    };

    const getIcon = (type: string, shapeType?: string) => {
        if (type === 'text') return <Type className="h-4 w-4" />;
        if (type === 'image') return <ImageIcon className="h-4 w-4" />;
        if (type === 'shape') {
            if (shapeType === 'circle') return <Circle className="h-4 w-4" />;
            return <Square className="h-4 w-4" />;
        }
        return <Square className="h-4 w-4" />;
    };

    const getName = (el: CanvasElement) => {
        if (el.type === 'text') return el.text?.substring(0, 15) || 'Texto';
        if (el.type === 'image') return 'Imagem';
        if (el.type === 'shape') return `Forma (${el.shapeType || 'rect'})`;
        return 'Elemento';
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-border/50 text-sm font-medium">Camadas</div>
            <ScrollArea className="flex-1 p-2">
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="layers">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                                {sortedElements.map((el, index) => (
                                    <Draggable key={el.id} draggableId={el.id} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded-md border text-sm transition-colors cursor-pointer",
                                                    selectedId === el.id
                                                        ? "bg-primary/10 border-primary/30 text-primary"
                                                        : "bg-card hover:bg-muted border-border/50"
                                                )}
                                                onClick={() => onSelect(el.id)}
                                            >
                                                <div {...provided.dragHandleProps} className="text-muted-foreground/50 hover:text-foreground">
                                                    <GripVertical className="h-4 w-4" />
                                                </div>

                                                <div className="text-muted-foreground">
                                                    {getIcon(el.type, el.shapeType)}
                                                </div>

                                                <div className="flex-1 truncate select-none">
                                                    {getName(el)}
                                                </div>

                                                <div className="flex items-center gap-1 opacity-60 hover:opacity-100">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id, el.opacity); }}
                                                        title={el.opacity === 0 ? "Mostrar" : "Esconder"}
                                                    >
                                                        {el.opacity === 0 ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={(e) => { e.stopPropagation(); toggleLock(el.id, el.isLocked); }}
                                                        title={el.isLocked ? "Desbloquear" : "Bloquear"}
                                                    >
                                                        {el.isLocked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                                        onClick={(e) => deleteElement(e, el.id)}
                                                        title="Apagar"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </ScrollArea>
        </div>
    );
}
