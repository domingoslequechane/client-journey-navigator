import { useState } from 'react';
import { 
  Building2, 
  User, 
  FileText, 
  Sparkles,
  GripVertical,
  Type,
  Image,
  Minus,
  QrCode,
  PenLine,
  Table
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { INVOICE_VARIABLES, InvoiceVariable } from './types';

interface VariablePanelProps {
  onDragStart: (variable: InvoiceVariable | { type: 'element'; elementType: string }) => void;
  onAddElement: (type: 'text' | 'line' | 'table') => void;
}

const CATEGORY_INFO: Record<string, { icon: React.ElementType; label: string }> = {
  agency: { icon: Building2, label: 'Agência' },
  client: { icon: User, label: 'Cliente' },
  invoice: { icon: FileText, label: 'Factura' },
  misc: { icon: Sparkles, label: 'Outros' },
};

export function VariablePanel({ onDragStart, onAddElement }: VariablePanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>('agency');

  const variablesByCategory = INVOICE_VARIABLES.reduce((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {} as Record<string, InvoiceVariable[]>);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Elementos</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <Tabs defaultValue="variables" className="h-full flex flex-col">
          <TabsList className="mx-3 mb-2 grid grid-cols-2">
            <TabsTrigger value="variables" className="text-xs">Variáveis</TabsTrigger>
            <TabsTrigger value="elements" className="text-xs">Elementos</TabsTrigger>
          </TabsList>

          <TabsContent value="variables" className="flex-1 overflow-hidden m-0 px-3">
            {/* Category tabs */}
            <div className="flex gap-1 mb-2 overflow-x-auto">
              {Object.entries(CATEGORY_INFO).map(([key, { icon: Icon, label }]) => (
                <Button
                  key={key}
                  variant={activeCategory === key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveCategory(key)}
                  className="text-xs h-7 px-2 flex-shrink-0"
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {label}
                </Button>
              ))}
            </div>

            {/* Variables list */}
            <ScrollArea className="h-[calc(100%-40px)]">
              <div className="space-y-1 pb-4">
                {variablesByCategory[activeCategory]?.map((variable) => (
                  <div
                    key={variable.key}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify(variable));
                      onDragStart(variable);
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md border border-border",
                      "cursor-grab active:cursor-grabbing",
                      "hover:bg-accent hover:border-primary/50 transition-colors",
                      "select-none"
                    )}
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{variable.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {variable.sampleValue || `{{${variable.key}}}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="elements" className="flex-1 overflow-hidden m-0 px-3">
            <ScrollArea className="h-full">
              <div className="space-y-1 pb-4">
                {/* Text element */}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'element', elementType: 'text' }));
                    onDragStart({ type: 'element', elementType: 'text' });
                  }}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md border border-border",
                    "cursor-grab active:cursor-grabbing",
                    "hover:bg-accent hover:border-primary/50 transition-colors",
                    "select-none"
                  )}
                >
                  <Type className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-xs font-medium">Caixa de Texto</div>
                    <div className="text-[10px] text-muted-foreground">Texto livre editável</div>
                  </div>
                </div>

                {/* Line element */}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'element', elementType: 'line' }));
                    onDragStart({ type: 'element', elementType: 'line' });
                  }}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md border border-border",
                    "cursor-grab active:cursor-grabbing",
                    "hover:bg-accent hover:border-primary/50 transition-colors",
                    "select-none"
                  )}
                >
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-xs font-medium">Linha Separadora</div>
                    <div className="text-[10px] text-muted-foreground">Linha horizontal</div>
                  </div>
                </div>

                {/* Table element */}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'element', elementType: 'table' }));
                    onDragStart({ type: 'element', elementType: 'table' });
                  }}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md border border-border",
                    "cursor-grab active:cursor-grabbing",
                    "hover:bg-accent hover:border-primary/50 transition-colors",
                    "select-none"
                  )}
                >
                  <Table className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-xs font-medium">Tabela de Serviços</div>
                    <div className="text-[10px] text-muted-foreground">Lista de serviços da factura</div>
                  </div>
                </div>

                {/* QR Code element */}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'element', elementType: 'qrcode' }));
                    onDragStart({ type: 'element', elementType: 'qrcode' });
                  }}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md border border-border",
                    "cursor-grab active:cursor-grabbing",
                    "hover:bg-accent hover:border-primary/50 transition-colors",
                    "select-none"
                  )}
                >
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-xs font-medium">Código QR</div>
                    <div className="text-[10px] text-muted-foreground">Para verificação</div>
                  </div>
                </div>

                {/* Signature element */}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'element', elementType: 'signature' }));
                    onDragStart({ type: 'element', elementType: 'signature' });
                  }}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md border border-border",
                    "cursor-grab active:cursor-grabbing",
                    "hover:bg-accent hover:border-primary/50 transition-colors",
                    "select-none"
                  )}
                >
                  <PenLine className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-xs font-medium">Campo de Assinatura</div>
                    <div className="text-[10px] text-muted-foreground">Área para assinatura</div>
                  </div>
                </div>

                {/* Image placeholder */}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'element', elementType: 'image' }));
                    onDragStart({ type: 'element', elementType: 'image' });
                  }}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md border border-border",
                    "cursor-grab active:cursor-grabbing",
                    "hover:bg-accent hover:border-primary/50 transition-colors",
                    "select-none"
                  )}
                >
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-xs font-medium">Logo / Imagem</div>
                    <div className="text-[10px] text-muted-foreground">Imagem ou logo da agência</div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
