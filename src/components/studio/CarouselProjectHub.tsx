"use client";

import { useState } from 'react';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  MoreVertical, 
  ExternalLink, 
  Sparkles,
  Loader2,
  FolderOpen,
  Calendar,
  User,
  ArrowRight,
  ChevronLeft,
  Settings,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { StudioQuickMenu } from './StudioQuickMenu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CarouselProjectHubProps {
  onCreateNew: () => void;
  onSelectProject: (projectId: string) => void;
  onEditProject: (projectId: string) => void;
}

export function CarouselProjectHub({ onCreateNew, onSelectProject, onEditProject }: CarouselProjectHubProps) {
  const navigate = useNavigate();
  const { organizationId: orgId } = useOrganization();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [projectToDelete, setProjectToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['studio-projects', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('studio_projects')
        .select(`
          *,
          clients (company_name)
        `)
        .eq('organization_id', orgId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgId
  });

  const handleDeleteProject = async (project: any) => {
    try {
      setIsDeleting(true);
      // Delete carousels and carousels first (cascade should handle this if configured, but doing manually for safety)
      const { error: carouselsError } = await supabase
        .from('studio_carousels')
        .delete()
        .eq('project_id', project.id);
      
      if (carouselsError) throw carouselsError;

      // Delete the project
      const { error: projectError } = await supabase
        .from('studio_projects')
        .delete()
        .eq('id', project.id);
      
      if (projectError) throw projectError;

      toast.success('Projeto eliminado com sucesso');
      setProjectToDelete(null);
      window.location.reload(); // Refresh to update list
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Erro ao eliminar projeto: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.clients?.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
    <div className="flex h-full md:h-screen bg-background relative overflow-hidden w-full">
      <div className="hidden md:block shrink-0 h-full border-r">
        <StudioQuickMenu currentToolId="carousel" />
      </div>

      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        {/* Header Area */}
      <div className="border-b bg-muted/5 px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-xl bg-muted/20 hover:bg-muted/40 transition-all"
                onClick={() => navigate('/app/studio')}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-primary" />
                Seus Projetos de Carrossel
              </h1>
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              Gerencie identidades de marca e crie carrosséis consistentes para seus clientes.
            </p>
          </div>
          <Button 
            onClick={onCreateNew}
            size="lg"
            className="rounded-xl px-8 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
          >
            <Plus className="mr-2 h-5 w-5" />
            Novo Projeto de Marca
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b px-8 py-4 bg-background sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome do projeto ou cliente..." 
              className="pl-10 h-10 rounded-xl bg-muted/20 border-transparent focus-visible:bg-background focus-visible:ring-primary/20 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 border rounded-xl p-1 bg-muted/10 shrink-0">
             <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-8 w-8 rounded-lg"
              onClick={() => setViewMode('grid')}
            >
               <LayoutGrid className="h-4 w-4" />
             </Button>
             <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-8 w-8 rounded-lg"
              onClick={() => setViewMode('list')}
            >
               <List className="h-4 w-4" />
             </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 pb-32">
        <div className="w-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
              <p className="text-muted-foreground font-medium animate-pulse">Carregando seus projetos...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
              <div className="h-24 w-24 rounded-full bg-muted/20 flex items-center justify-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Nenhum projeto encontrado</h3>
                <p className="text-muted-foreground max-w-sm mx-auto text-sm">
                  Comece criando um novo projeto para configurar a identidade visual de um cliente e gerar carrosséis profissionais.
                </p>
              </div>
              <Button variant="outline" onClick={onCreateNew} className="rounded-xl">
                Criar Primeiro Projeto
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-primary/5 hover:border-primary/20 cursor-pointer"
                  onClick={() => onSelectProject(project.id)}
                >
                  <div 
                    className="h-32 bg-gradient-to-br transition-all group-hover:opacity-90"
                    style={{ 
                      background: `linear-gradient(135deg, ${project.primary_color || '#3b82f6'} 0%, ${project.secondary_color || '#1e3a8a'} 100%)` 
                    }}
                  >
                    {project.logo_images?.[0] && (
                      <div className="absolute top-4 left-4 p-2 bg-white rounded-lg shadow-md">
                        <img src={project.logo_images[0]} className="h-8 w-auto object-contain" alt="Logo" />
                      </div>
                    )}
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-1">{project.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {project.clients?.company_name || 'Sem cliente vinculado'}
                        </div>
                        {project.niche && (
                          <div className="pt-1">
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-primary/5 text-primary border-none font-bold">
                              {project.niche}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                         <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                           <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                             <MoreVertical className="h-4 w-4" />
                           </Button>
                         </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditProject(project.id); }}>
                              <Settings className="mr-2 h-4 w-4" /> Editar Identidade
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToDelete(project);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar Projeto
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-primary/5 mt-auto">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true, locale: ptBR })}
                      </div>
                      
                      <div className="shrink-0">
                        <Button size="sm" className="rounded-xl px-4 h-8 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/10">
                          Abrir <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <div 
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="flex items-center gap-4 p-4 bg-background border border-primary/5 rounded-2xl hover:bg-muted/30 transition-all cursor-pointer group"
                >
                  <div 
                    className="w-12 h-12 rounded-xl shrink-0 border shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${project.primary_color || '#3b82f6'}, ${project.secondary_color || '#1e3a8a'})` }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{project.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {project.clients?.company_name} • Atualizado {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                     {project.niche && <Badge variant="outline">{project.niche}</Badge>}
                     <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <ArrowRight className="h-4 w-4" />
                     </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Delete Confirmation */}
    <AlertDialog open={!!projectToDelete} onOpenChange={(o) => !o && setProjectToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza que deseja eliminar o projeto?</AlertDialogTitle>
          <AlertDialogDescription>
            Ao eliminar o projeto <strong>{projectToDelete?.name}</strong>, todos os carrosséis gerados e históricos serão permanentemente removidos. 
            O cliente continuará registrado no sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={isDeleting}
            onClick={() => handleDeleteProject(projectToDelete)}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar Permanentemente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
    </>
  );
}
