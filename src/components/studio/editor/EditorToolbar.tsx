import { Type, Square, Circle, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { CanvasElement } from '../canvas/types';

interface EditorToolbarProps {
    onAddElement: (element: Partial<CanvasElement>) => void;
}

export function EditorToolbar({ onAddElement }: EditorToolbarProps) {
    const handleAddText = () => {
        onAddElement({
            type: 'text',
            text: 'Novo Texto',
            fontSize: 48,
            fontFamily: 'Inter',
            fontStyle: 'bold',
            fill: '#000000',
            align: 'center',
            width: 400,
            x: 340,
            y: 500,
        });
    };

    const handleAddRect = () => {
        onAddElement({
            type: 'shape',
            shapeType: 'rect',
            width: 200,
            height: 200,
            fill: '#cccccc',
            cornerRadius: 16,
            x: 440,
            y: 440,
        });
    };

    const handleAddCircle = () => {
        onAddElement({
            type: 'shape',
            shapeType: 'circle',
            width: 200,
            height: 200, // Used for radius
            fill: '#cccccc',
            x: 440,
            y: 440,
        });
    };

    return (
        <div className="flex items-center gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={handleAddText} className="gap-2">
                            <Type className="h-4 w-4" />
                            <span className="hidden sm:inline">Texto</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Adicionar Texto</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={handleAddRect} className="gap-2">
                            <Square className="h-4 w-4" />
                            <span className="hidden sm:inline">Forma</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Adicionar Quadrado</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={handleAddCircle} className="gap-2">
                            <Circle className="h-4 w-4" />
                            <span className="hidden sm:inline">Círculo</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Adicionar Círculo</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
