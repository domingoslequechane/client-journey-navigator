import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, Sparkles, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProjectCard } from '@/components/studio/ProjectCard';
import { useStudioProjects } from '@/hooks/useStudioProjects';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { cn } from '@/lib/utils';

export default function StudioDashboard() {
  const navigate = useNavigate();
  const { projects, projectsLoading, deleteProject } = useStudioProjects();
  const { limits, usage } = usePlanLimits();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.niche?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string) => {
    deleteProject.mutate(id);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Studio AI
            </div>
            {limits.dailyStudioLimit !== null && (
              <Badge variant="outline" className="font-mono">
                Créditos hoje: {usage.studioGenerationsToday}/{limits.dailyStudioLimit}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Gere flyers profissionais com inteligência artificial
          </p>
        </div>
        
        <Button onClick={() => navigate('/app/studio/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Projeto
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar projetos..."
          className="pl-10"
        />
      </div>

      {/* Content */}
      {projectsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          {searchQuery ? (
            <>
              <h3 className="text-lg font-medium">Nenhum projeto encontrado</h3>
              <p className="text-muted-foreground mt-1">
                Tente uma pesquisa diferente
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium">Nenhum projeto ainda</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                Crie seu primeiro projeto para começar a gerar flyers
              </p>
              <Button onClick={() => navigate('/app/studio/new')} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Projeto
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
