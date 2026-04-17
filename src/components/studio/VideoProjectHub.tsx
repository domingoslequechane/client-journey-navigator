import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Play, Trash2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface VideoProject {
  id: string;
  name: string;
  created_at: string;
  videos_count?: number;
}

interface VideoProjectHubProps {
  onCreateNew: () => void;
  onSelectProject: (id: string) => void;
  toolId?: string;
}

export function VideoProjectHub({ onCreateNew, onSelectProject, toolId }: VideoProjectHubProps) {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!user) return;
    try {
      setLoading(true);
      let query = supabase
        .from('video_projects')
        .select('*, generated_videos(count)')
        
      if (toolId) {
        query = query.eq('tool_id', toolId);
      } else {
        // Default to generator if no toolId (legacy)
        query = query.is('tool_id', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(data.map(p => ({
        ...p,
        videos_count: p.generated_videos[0].count
      })));
    } catch (err: any) {
      toast.error('Erro ao carregar projetos de vídeo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Tem a certeza que deseja eliminar este projeto? Todos os vídeos gerados serão apagados.')) return;

    setIsDeleting(id);
    try {
      const { error } = await supabase.from('video_projects').delete().eq('id', id);
      if (error) throw error;
      toast.success('Projeto eliminado com sucesso');
      setProjects(projects.filter(p => p.id !== id));
    } catch (err: any) {
      toast.error('Erro ao eliminar: ' + err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 space-y-6 overflow-y-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {toolId === 'longa-metragem' ? 'Projetos de Longa Metragem' : 'Projetos de Vídeo'}
        </h1>
        <p className="text-muted-foreground">
          {toolId === 'longa-metragem' 
            ? 'Crie narrativas completas encadeando múltiplas cenas com a Veo 3.1.' 
            : 'Crie vídeos impressionantes com a tecnologia Veo 3.1 da Google.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Create New Card */}
        <Card
          className="group relative aspect-[4/3] flex flex-col items-center justify-center p-6 cursor-pointer border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
          onClick={onCreateNew}
        >
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-medium text-lg">Novo Projeto</h3>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Comece do zero com imagens ou texto
          </p>
        </Card>

        {/* Project Cards */}
        {projects.map((project) => (
          <Card
            key={project.id}
            className="group relative aspect-[4/3] flex flex-col cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={() => onSelectProject(project.id)}
          >
            <div className="flex-1 bg-muted/30 flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
              <Video className="w-12 h-12 text-primary/20" />
            </div>
            
            <div className="p-4 border-t bg-card shrink-0">
              <h3 className="font-semibold truncate pr-8">{project.name}</h3>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  {project.videos_count || 0} vídeos
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            </div>

            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
              onClick={(e) => handleDelete(e, project.id)}
              disabled={isDeleting === project.id}
            >
              {isDeleting === project.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
