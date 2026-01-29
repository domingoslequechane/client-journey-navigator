import { useNavigate, useParams } from 'react-router-dom';
import { ProjectForm } from '@/components/studio/ProjectForm';
import { useStudioProjects, useStudioProject } from '@/hooks/useStudioProjects';
import { Loader2 } from 'lucide-react';

export default function NewStudioProject() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { createProject, updateProject } = useStudioProjects();
  const { project, projectLoading } = useStudioProject(projectId);

  const isEditing = !!projectId;

  const handleSubmit = async (data: any) => {
    if (isEditing && projectId) {
      await updateProject.mutateAsync({ id: projectId, ...data });
      navigate(`/app/studio/${projectId}`);
    } else {
      const newProject = await createProject.mutateAsync(data);
      navigate(`/app/studio/${newProject.id}`);
    }
  };

  if (isEditing && projectLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <ProjectForm
        project={isEditing ? project : null}
        onSubmit={handleSubmit}
        isSubmitting={createProject.isPending || updateProject.isPending}
      />
    </div>
  );
}
