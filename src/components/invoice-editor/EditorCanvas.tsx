import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Rect, Textbox, Line, Group, FabricObject } from 'fabric';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { PaperSize, PAPER_DIMENSIONS, MM_TO_PX, EditorElement, InvoiceVariable, INVOICE_VARIABLES } from './types';

// Extend FabricObject to include custom data
declare module 'fabric' {
  interface FabricObject {
    data?: { elementId: string };
  }
}

interface EditorCanvasProps {
  paperSize: PaperSize;
  onPaperSizeChange: (size: PaperSize) => void;
  elements: EditorElement[];
  onElementsChange: (elements: EditorElement[]) => void;
  primaryColor: string;
}

export function EditorCanvas({
  paperSize,
  onPaperSizeChange,
  elements,
  onElementsChange,
  primaryColor,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const dimensions = PAPER_DIMENSIONS[paperSize];
  const canvasWidth = dimensions.width * MM_TO_PX;
  const canvasHeight = dimensions.height * MM_TO_PX;

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    // Selection events
    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0];
      if (obj && obj.data?.elementId) {
        setSelectedElement(obj.data.elementId);
      }
    });

    canvas.on('selection:cleared', () => {
      setSelectedElement(null);
    });

    // Object modified event - sync back to state
    canvas.on('object:modified', (e) => {
      const obj = e.target;
      if (obj && obj.data?.elementId) {
        syncElementFromCanvas(obj);
      }
    });

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [canvasWidth, canvasHeight]);

  // Sync canvas elements with state
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Clear and redraw
    canvas.clear();
    canvas.backgroundColor = '#ffffff';

    elements.forEach((el) => {
      const fabricObj = createFabricObject(el);
      if (fabricObj) {
        fabricObj.data = { elementId: el.id };
        canvas.add(fabricObj);
      }
    });

    canvas.renderAll();
  }, [elements, primaryColor]);

  const createFabricObject = (el: EditorElement): FabricObject | null => {
    switch (el.type) {
      case 'text':
      case 'variable': {
        const content = el.type === 'variable' 
          ? getVariableSample(el.variableKey || '')
          : el.content || 'Texto';
        
        const text = new Textbox(content, {
          left: el.x,
          top: el.y,
          width: el.width,
          fontSize: el.fontSize || 12,
          fontWeight: el.fontWeight || 'normal',
          textAlign: el.textAlign || 'left',
          fill: el.color || '#000000',
          fontFamily: 'Helvetica',
          editable: el.type === 'text',
          backgroundColor: el.backgroundColor || undefined,
          padding: 4,
        });
        return text;
      }

      case 'line': {
        const line = new Line([0, 0, el.width, 0], {
          left: el.x,
          top: el.y,
          stroke: el.borderColor || '#cccccc',
          strokeWidth: el.borderWidth || 1,
        });
        return line;
      }

      case 'table': {
        // Create a simple table representation
        const tableGroup = createTablePreview(el);
        return tableGroup;
      }

      case 'qrcode': {
        // QR code placeholder
        const qrRect = new Rect({
          left: el.x,
          top: el.y,
          width: el.width,
          height: el.height,
          fill: '#f0f0f0',
          stroke: '#cccccc',
          strokeWidth: 1,
        });
        
        const qrText = new Textbox('QR', {
          left: el.x + el.width / 2 - 10,
          top: el.y + el.height / 2 - 8,
          fontSize: 14,
          fill: '#666666',
          fontFamily: 'Helvetica',
          textAlign: 'center',
          editable: false,
        });
        
        return new Group([qrRect, qrText], { left: el.x, top: el.y });
      }

      case 'signature': {
        const sigRect = new Rect({
          left: 0,
          top: 0,
          width: el.width,
          height: el.height,
          fill: 'transparent',
          stroke: '#cccccc',
          strokeWidth: 1,
          strokeDashArray: [4, 4],
        });
        
        const sigLine = new Line([10, el.height - 20, el.width - 10, el.height - 20], {
          stroke: '#000000',
          strokeWidth: 1,
        });
        
        const sigText = new Textbox(el.content || 'Assinatura', {
          left: 10,
          top: el.height - 15,
          width: el.width - 20,
          fontSize: 8,
          fill: '#666666',
          textAlign: 'center',
          editable: false,
        });
        
        return new Group([sigRect, sigLine, sigText], { left: el.x, top: el.y });
      }

      case 'image': {
        // Image placeholder
        const imgRect = new Rect({
          left: el.x,
          top: el.y,
          width: el.width,
          height: el.height,
          fill: '#f5f5f5',
          stroke: primaryColor,
          strokeWidth: 2,
          strokeDashArray: [6, 6],
        });
        return imgRect;
      }

      default:
        return null;
    }
  };

  const createTablePreview = (el: EditorElement): Group => {
    const rows = 4;
    const cols = 4;
    const cellWidth = el.width / cols;
    const cellHeight = el.height / rows;
    const objects: FabricObject[] = [];

    // Header row background
    objects.push(new Rect({
      left: 0,
      top: 0,
      width: el.width,
      height: cellHeight,
      fill: primaryColor,
      stroke: '#cccccc',
      strokeWidth: 1,
    }));

    // Header text
    const headers = ['#', 'Descrição', 'Qtd', 'Total'];
    headers.forEach((text, i) => {
      objects.push(new Textbox(text, {
        left: i * cellWidth + 4,
        top: 4,
        width: cellWidth - 8,
        fontSize: 9,
        fill: '#ffffff',
        fontWeight: 'bold',
        fontFamily: 'Helvetica',
        editable: false,
      }));
    });

    // Grid lines
    for (let r = 1; r < rows; r++) {
      objects.push(new Line([0, r * cellHeight, el.width, r * cellHeight], {
        stroke: '#e0e0e0',
        strokeWidth: 1,
      }));
    }
    for (let c = 1; c < cols; c++) {
      objects.push(new Line([c * cellWidth, 0, c * cellWidth, el.height], {
        stroke: '#e0e0e0',
        strokeWidth: 1,
      }));
    }

    // Outer border
    objects.push(new Rect({
      left: 0,
      top: 0,
      width: el.width,
      height: el.height,
      fill: 'transparent',
      stroke: '#cccccc',
      strokeWidth: 1,
    }));

    return new Group(objects, { left: el.x, top: el.y });
  };

  const getVariableSample = (key: string): string => {
    const variable = INVOICE_VARIABLES.find(v => v.key === key);
    return variable?.sampleValue || `{{${key}}}`;
  };

  const syncElementFromCanvas = (obj: FabricObject) => {
    const elementId = obj.data?.elementId;
    if (!elementId) return;

    onElementsChange(elements.map(el => {
      if (el.id === elementId) {
        return {
          ...el,
          x: obj.left || 0,
          y: obj.top || 0,
          width: obj.getScaledWidth ? obj.getScaledWidth() : el.width,
          height: obj.getScaledHeight ? obj.getScaledHeight() : el.height,
        };
      }
      return el;
    }));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const canvas = fabricRef.current;
    if (!canvas || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      let newElement: EditorElement;
      const id = `el_${Date.now()}`;

      if (data.type === 'element') {
        // Element drag
        switch (data.elementType) {
          case 'text':
            newElement = {
              id,
              type: 'text',
              content: 'Texto editável',
              x,
              y,
              width: 150,
              height: 24,
              fontSize: 12,
            };
            break;
          case 'line':
            newElement = {
              id,
              type: 'line',
              x,
              y,
              width: 200,
              height: 2,
              borderColor: '#cccccc',
              borderWidth: 1,
            };
            break;
          case 'table':
            newElement = {
              id,
              type: 'table',
              x,
              y,
              width: 400,
              height: 100,
            };
            break;
          case 'qrcode':
            newElement = {
              id,
              type: 'qrcode',
              x,
              y,
              width: 60,
              height: 60,
            };
            break;
          case 'signature':
            newElement = {
              id,
              type: 'signature',
              content: 'Assinatura',
              x,
              y,
              width: 150,
              height: 50,
            };
            break;
          case 'image':
            newElement = {
              id,
              type: 'image',
              x,
              y,
              width: 80,
              height: 80,
            };
            break;
          default:
            return;
        }
      } else {
        // Variable drag
        const variable = data as InvoiceVariable;
        newElement = {
          id,
          type: 'variable',
          variableKey: variable.key,
          x,
          y,
          width: 150,
          height: 20,
          fontSize: 11,
        };
      }

      onElementsChange([...elements, newElement]);
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }, [elements, onElementsChange, zoom]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDeleteSelected = () => {
    if (!selectedElement) return;
    onElementsChange(elements.filter(el => el.id !== selectedElement));
    setSelectedElement(null);
    fabricRef.current?.discardActiveObject();
    fabricRef.current?.renderAll();
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(2, Math.max(0.3, prev + delta)));
  };

  const handleReset = () => {
    setZoom(0.8);
    onElementsChange([]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2">
          <Select value={paperSize} onValueChange={(v) => onPaperSizeChange(v as PaperSize)}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAPER_DIMENSIONS).map(([key, val]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleZoom(-0.1)}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleZoom(0.1)}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleReset}
            title="Limpar tudo"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          {selectedElement && (
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Canvas container */}
      <div className="flex-1 overflow-auto bg-muted/50 rounded-lg p-4">
        <div
          ref={containerRef}
          className="mx-auto shadow-lg"
          style={{
            width: canvasWidth * zoom,
            height: canvasHeight * zoom,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: canvasWidth,
              height: canvasHeight,
            }}
          />
        </div>
      </div>
    </div>
  );
}
