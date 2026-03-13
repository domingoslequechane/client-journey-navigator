"use client";

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Settings, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GenerationPanel } from '@/components/studio/GenerationPanel';
import { FlyerGallery } from '@/components/studio/FlyerGallery';
import { useStudioProject } from '@/hooks/useStudioProjects';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useHeader } from '@/contexts/HeaderContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import type { GenerationSettings } from '@/types/studio';
import { useEffect } from 'react';

export default function StudioEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const {
    project, projectLoading,
    flyers, flyersLoading,
    generateFlyer, refetchFlyers,
    deleteFlyer, rateFlyer, ratings,
    dailyCount,
  } = useStudioProject(projectId);
  const { incrementUsage } = usePlanLimits();
  const { setCustomTitle, setBackAction } = useHeader();
  const isMobile = useIsMobile();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reusedPrompt, setReusedPrompt] = useState<string>('');

  useEffect(() => {
    if (isMobile && project) {
      setCustomTitle(project.name);
      setBackAction(() => () => navigate('/app/studio'));
    }
    return () => {
      setCustomTitle(null);
      setBackAction(null);
    };
  }, [isMobile, project, setCustomTitle, setBackAction, navigate]);

  const handleGenerate = async (settings: GenerationSettings) => {
    if (!project) return;
    setIsGenerating(true);
    try {
      const result = await generateFlyer.mutateAsync({ ...settings });
      if (result.error) {
        toast.error(result.error);
      } else if (result.imageUrl) {
        toast.success('Flyer gerado com sucesso!');
        await refetchFlyers();
      }
      await incrementUsage('studio_generations' as any);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar flyer');
    } finally {
      setIsGenerating(false);
    }
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
        <Button onClick={() => navigate('/app/studio')}>Voltar ao Studio</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full md:h-[calc(100vh-4rem)] overflow-hidden bg-background">

      {/* ── Left Sidebar ── */}
      <div className="w-full md:w-[480px] border-r shrink-0 flex flex-col bg-muted/10 h-full overflow-hidden">

        {/* Left header — same height as right header */}
        <div className="hidden md:flex h-16 border-b bg-background items-center gap-2 px-4 shrink-0 shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/studio')} className="shrink-0 -ml-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold truncate leading-none">{project.name}</h1>
            {project.niche && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{project.niche}</p>
            )}
          </div>
          <Button variant="outline" size="icon" asChild title="Configurações do Projeto">
            <Link to={`/app/studio/${projectId}/edit`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">
          <GenerationPanel
            project={project}
            dailyCount={dailyCount}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            reusedPrompt={reusedPrompt}
            onClearReusedPrompt={() => setReusedPrompt('')}
          />
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">

        {/* Right header — same height as left header */}
        <div className="h-14 md:h-16 border-b bg-background flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Flyers Gerados</span>
            {flyers.length > 0 && (
              <Badge variant="secondary" className="text-xs">{flyers.length}</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <div className="w-4 h-4 md:w-5 md:h-5 rounded-full border shadow-inner" style={{ backgroundColor: project.primary_color }} title="Cor Primária" />
            <div className="w-4 h-4 md:w-5 md:h-5 rounded-full border shadow-inner" style={{ backgroundColor: project.secondary_color }} title="Cor Secundária" />
          </div>
        </div>

        {/* Gallery */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32">
          {flyersLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : flyers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Nenhum flyer gerado ainda</p>
                <p className="text-sm text-muted-foreground mt-1 px-4">
                  Configure o projeto e clique em "Gerar Flyer com IA" no painel acima para começar.
                </p>
              </div>
            </div>
          ) : (
            <FlyerGallery
              flyers={flyers}
              loading={flyersLoading}
              onRate={(id, rating, feedback) => rateFlyer.mutate({ flyerId: id, rating, feedback })}
              onDelete={(id) => deleteFlyer.mutate(id)}
              onEdit={() => { }}
              onReusePrompt={(prompt) => setReusedPrompt(prompt)}
              ratings={ratings}
            />
          )}
        </div>
      </div>
    </div>
  );
}