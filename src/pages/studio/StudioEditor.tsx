import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GenerationPanel } from '@/components/studio/GenerationPanel';
import { FlyerGallery } from '@/components/studio/FlyerGallery';
import { useStudioProject } from '@/hooks/useStudioProjects';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { toast } from 'sonner';
import type { GenerationSettings } from '@/types/studio';

export default function StudioEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { 
    project, projectLoading, 
    flyers, flyersLoading, 
    generateFlyer, refetchFlyers,
    deleteFlyer, rateFlyer, ratings 
  } = useStudioProject(projectId);
  const { incrementUsage } = usePlanLimits();
  const [isGenerating, setIsGenerating] = useState(false);

  const remainingGenerations = null;

  const handleGenerate = async (settings: GenerationSettings) => {
    if (!project) return;

    setIsGenerating(true);
    try {
      const result = await generateFlyer.mutateAsync(settings);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Flyer gerado com sucesso!');
        await incrementUsage('studio_generations' as any);
        refetchFlyers();
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar flyer');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteFlyer = (flyerId: string) => {
    deleteFlyer.mutate(flyerId);
  };

  const handleRateFlyer = (flyerId: string, rating: number, feedback?: string) => {
    rateFlyer.mutate({ flyerId, rating, feedback });
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-muted-foreground mb-4">Projeto não encontrado</p>
        <Button onClick={() => navigate('/app/studio')}>
          Voltar ao Studio
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/studio')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.niche && (
              <p className="text-muted-foreground">{project.niche}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div
              className="w-6 h-6 rounded-full border"
              style={{ backgroundColor: project.primary_color }}
            />
            <div
              className="w-6 h-6 rounded-full border"
              style={{ backgroundColor: project.secondary_color }}
            />
          </div>
          
          <Button variant="outline" size="icon" asChild>
            <Link to={`/app/studio/${projectId}/edit`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-[1fr,400px] gap-6">
        {/* Gallery */}
        <div className="space-y-4">
          <Tabs defaultValue="generated" className="w-full">
            <TabsList>
              <TabsTrigger value="generated">Flyers Gerados</TabsTrigger>
              <TabsTrigger value="reference">Referências</TabsTrigger>
            </TabsList>
            <TabsContent value="generated" className="mt-4">
              <FlyerGallery
                flyers={flyers}
                loading={flyersLoading}
                onRate={handleRateFlyer}
                onDelete={handleDeleteFlyer}
                ratings={ratings}
              />
            </TabsContent>
            <TabsContent value="reference" className="mt-4">
              {project.reference_images && project.reference_images.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                  {project.reference_images.map((url, index) => (
                    <div key={url} className="aspect-square rounded-lg overflow-hidden border">
                      <img
                        src={url}
                        alt={`Referência ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma imagem de referência adicionada
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Generation Panel */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <GenerationPanel
            project={project}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            remainingGenerations={remainingGenerations}
          />
        </div>
      </div>
    </div>
  );
}
