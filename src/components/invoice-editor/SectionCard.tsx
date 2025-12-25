import { GripVertical, Eye, EyeOff, Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { InvoiceSection } from './section-types';
import { Draggable } from '@hello-pangea/dnd';

interface SectionCardProps {
  section: InvoiceSection;
  index: number;
  onToggleVisibility: (id: string) => void;
  onOpenSettings: (section: InvoiceSection) => void;
}

export function SectionCard({
  section,
  index,
  onToggleVisibility,
  onOpenSettings,
}: SectionCardProps) {
  return (
    <Draggable draggableId={section.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`
            flex items-center gap-3 p-3 rounded-lg border bg-card
            transition-all duration-200
            ${snapshot.isDragging ? 'shadow-lg border-primary/50 ring-2 ring-primary/20' : 'border-border'}
            ${!section.visible ? 'opacity-60' : ''}
          `}
        >
          <div
            {...provided.dragHandleProps}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{section.label}</p>
            <p className="text-xs text-muted-foreground truncate">
              {section.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={section.visible}
              onCheckedChange={() => onToggleVisibility(section.id)}
              className="data-[state=checked]:bg-primary"
            />
            <span className="text-muted-foreground">
              {section.visible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenSettings(section)}
              disabled={!section.visible}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Draggable>
  );
}
