import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, Pencil, Trash2, Image as ImageIcon, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StudioProject } from '@/types/studio';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectCardProps {
  project: StudioProject;
  onDelete: (id: string) => void;
  flyersCount?: number;
}

export function ProjectCard({ project, onDelete, flyersCount = 0 }: ProjectCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = () => {
    onDelete(project.id);
    setDeleteOpen(false);
  };

  return (
    <>
      <Card className="group hover:shadow-lg transition-shadow overflow-hidden">
        <CardHeader className="p-0">
          {/* Color Banner */}
          <div
            className="h-20 relative"
            style={{
              background: `linear-gradient(135deg, ${project.primary_color}, ${project.secondary_color})`,
            }}
          >
            {project.logo_images?.[0] && (
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src={project.logo_images[0]}
                  alt={project.name}
                  className="h-12 w-12 object-contain rounded-lg bg-background/90 p-1"
                />
              </div>
            )}

            {/* Actions */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={`/app/studio/${project.id}/edit`}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <Link to={`/app/studio/${project.id}`} className="block space-y-3">
            <div>
              <h3 className="font-semibold text-lg truncate hover:text-primary transition-colors">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {project.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {project.niche && (
                <Badge variant="secondary" className="text-xs">
                  {project.niche}
                </Badge>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ImageIcon className="h-3 w-3" />
                {flyersCount} flyers
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <div className="flex items-center gap-2">
                <Palette className="h-3 w-3" />
                <div className="flex gap-1">
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: project.primary_color }}
                  />
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: project.secondary_color }}
                  />
                </div>
              </div>
              <span>
                {formatDistanceToNow(new Date(project.updated_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          </Link>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os flyers gerados para este projeto também serão eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
