import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Building2, Calendar, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/hooks/useOrganization';
import type { FinanceProject } from '@/types/finance';
import { PROJECT_STATUS_LABELS } from '@/types/finance';

interface ProjectCardProps {
  project: FinanceProject;
  onEdit: (project: FinanceProject) => void;
  onDelete: (id: string) => void;
  canManage?: boolean;
}

const statusColors = {
  planning: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  in_progress: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  canManage = true,
}: ProjectCardProps) {
  const { currencySymbol } = useOrganization();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Badge 
              variant="outline" 
              className={cn('text-xs', statusColors[project.status])}
            >
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            <CardTitle className="text-lg">{project.name}</CardTitle>
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(project)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(project.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {project.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {project.description}
          </p>
        )}
        
        <div className="space-y-2 text-sm">
          {project.clientName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{project.clientName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(project.startDate), 'dd MMM yyyy', { locale: ptBR })}
              {project.endDate && ` - ${format(new Date(project.endDate), 'dd MMM yyyy', { locale: ptBR })}`}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-2xl font-bold text-primary">
            {currencySymbol} {project.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground">Orçamento</p>
        </div>
      </CardContent>
    </Card>
  );
}

