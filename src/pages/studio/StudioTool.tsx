"use client";

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Eye, Trash2, Loader2, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ToolGenerationPanel } from '@/components/studio/ToolGenerationPanel';
import { STUDIO_TOOLS } from '@/types/studio';
import { useStudioImages } from '@/hooks/useStudioImages';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ToolGenerationSettings, StudioImage } from '@/types/studio';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RecolorToolView } from '@/components/studio/RecolorToolView';
import { BeautifyToolView } from '@/components/studio/BeautifyToolView';
import { ProductStagingToolView } from '@/components/studio/ProductStagingToolView';
import { FlyerSquadView } from '@/components/studio/FlyerSquadView';
import { FlyerProjectHub } from '@/components/studio/FlyerProjectHub';
import { FlyerProjectOnboarding } from '@/components/studio/FlyerProjectOnboarding';
import { CarouselSquadView } from '@/components/studio/CarouselSquadView';
import { CarouselProjectHub } from '@/components/studio/CarouselProjectHub';
import { CarouselProjectOnboarding } from '@/components/studio/CarouselProjectOnboarding';
import { UpscaleToolView } from '@/components/studio/UpscaleToolView';
import { VideoProjectHub } from '@/components/studio/VideoProjectHub';
import { VideoGeneratorStudio } from '@/components/studio/VideoGeneratorStudio';
import { LongVideoStudio } from '@/components/studio/LongVideoStudio';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { StudioQuickMenu } from '@/components/studio/StudioQuickMenu';
import { useHeader } from '@/contexts/HeaderContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect } from 'react';
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

const ITEMS_PER_PAGE = 12;

export default function StudioTool() {
    const { toolId } = useParams();
    const navigate = useNavigate();
    const tool = STUDIO_TOOLS.find((t) => t.id === toolId);

    // Pass tools to standard hooks
    const queryClient = useQueryClient();
    const { images, isLoading, generateImage, deleteImage, dailyCount } = useStudioImages(toolId);
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewImage, setPreviewImage] = useState<StudioImage | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<StudioImage | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [editProjectId, setEditProjectId] = useState<string | null>(null);
    const [isOnboarding, setIsOnboarding] = useState(false);
    const { setCustomTitle, setCustomIcon, setBackAction } = useHeader();
    const isMobile = useIsMobile();

    useEffect(() => {
        if (isMobile && tool) {
            setCustomTitle(tool.label);
            setCustomIcon(tool.icon);
            setBackAction(() => () => navigate('/app/studio'));
        }
        return () => {
            setCustomTitle(null);
            setCustomIcon(null);
            setBackAction(null);
        };
    }, [isMobile, tool, setCustomTitle, setCustomIcon, setBackAction, navigate]);

    const totalPages = Math.ceil(images.length / ITEMS_PER_PAGE);
    const paginated = images.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

    if (!tool) {
        return (
            <div className="container mx-auto p-6 text-center">
                <p className="text-muted-foreground mb-4">Ferramenta não encontrada</p>
                <Button onClick={() => navigate('/app/studio')}>Voltar ao Studio</Button>
            </div>
        );
    }

    if (tool.id === 'recolor') {
        return <RecolorToolView tool={tool} />;
    }

    if (tool.id === 'upscale') {
        return <UpscaleToolView tool={tool} />;
    }

    if (tool.id === 'product-beautifier') {
        return <BeautifyToolView tool={tool} />;
    }

    if (tool.id === 'product-staging') {
        return <ProductStagingToolView tool={tool} />;
    }

    if (tool.id === 'flyer') {
        if (isOnboarding || editProjectId) {
            return (
                <FlyerProjectOnboarding 
                    projectId={editProjectId || undefined}
                    onComplete={(p) => {
                        queryClient.invalidateQueries({ queryKey: ['studio-project', p.id] });
                        setSelectedProjectId(p.id);
                        setIsOnboarding(false);
                        setEditProjectId(null);
                    }}
                    onCancel={() => {
                        setIsOnboarding(false);
                        setEditProjectId(null);
                    }}
                />
            );
        }

        if (selectedProjectId) {
            return (
                <FlyerSquadView 
                    tool={tool} 
                    projectId={selectedProjectId} 
                    onBackToHub={() => setSelectedProjectId(null)}
                />
            );
        }

        return (
            <FlyerProjectHub 
                onCreateNew={() => setIsOnboarding(true)}
                onSelectProject={(id) => setSelectedProjectId(id)}
                onEditProject={(id) => setEditProjectId(id)}
            />
        );
    }

    if (tool.id === 'carousel') {
        if (isOnboarding || editProjectId) {
            return (
                <CarouselProjectOnboarding 
                    projectId={editProjectId || undefined}
                    onComplete={(p) => {
                        queryClient.invalidateQueries({ queryKey: ['studio-project', p.id] });
                        setSelectedProjectId(p.id);
                        setIsOnboarding(false);
                        setEditProjectId(null);
                    }}
                    onCancel={() => {
                        setIsOnboarding(false);
                        setEditProjectId(null);
                    }}
                />
            );
        }

        if (selectedProjectId) {
            return (
                <CarouselSquadView 
                    tool={tool} 
                    projectId={selectedProjectId} 
                    onBackToHub={() => setSelectedProjectId(null)}
                />
            );
        }

        return (
            <CarouselProjectHub 
                onCreateNew={() => setIsOnboarding(true)}
                onSelectProject={(id) => setSelectedProjectId(id)}
                onEditProject={(id) => setEditProjectId(id)}
            />
        );
    }

    if (tool.id === 'video-generator') {
        if (isOnboarding || editProjectId) {
            // For now, video project creation just creates a default project entry quickly.
            // Using a simple alert-like wrapper or just a function call.
            // But we actually need to ask for a project name or just create it with a default name.
            // For simplicity, we can do inline creation logic or reuse Onboarding logic.
            // Since there is no explicit VideoProjectOnboarding, we can use an effect to auto-create and select if isOnboarding.
        }

        if (selectedProjectId) {
            return (
                <VideoGeneratorStudio 
                    projectId={selectedProjectId}
                    onBackToHub={() => setSelectedProjectId(null)}
                />
            );
        }

        return (
            <VideoProjectHub 
                onCreateNew={async () => {
                   try {
                     const { data: { user } } = await supabase.auth.getUser();
                     const { data: orgMember } = await supabase.from('organization_members').select('organization_id').eq('user_id', user?.id).single();
                     if (!orgMember?.organization_id) return;

                     const { data, error } = await supabase.from('video_projects').insert({
                       name: 'Novo Projeto de Vídeo',
                       organization_id: orgMember.organization_id,
                       created_by: user?.id,
                     }).select().single();

                     if (error) throw error;
                     setSelectedProjectId(data.id);
                   } catch(err) {
                      toast.error('Erro ao criar projeto');
                   }
                }}
                onSelectProject={(id) => setSelectedProjectId(id)}
            />
        );
    }

    if (tool.id === 'longa-metragem') {
        if (selectedProjectId) {
            return (
                <LongVideoStudio 
                    projectId={selectedProjectId}
                    onBackToHub={() => setSelectedProjectId(null)}
                />
            );
        }

        return (
            <VideoProjectHub 
                toolId="longa-metragem"
                onCreateNew={async () => {
                   try {
                     const { data: { user } } = await supabase.auth.getUser();
                     const { data: orgMember } = await supabase.from('organization_members').select('organization_id').eq('user_id', user?.id).single();
                     if (!orgMember?.organization_id) return;

                     const { data, error } = await supabase.from('video_projects').insert({
                       name: 'Novo Longa Metragem',
                       organization_id: orgMember.organization_id,
                       created_by: user?.id,
                       tool_id: 'longa-metragem'
                     }).select().single();

                     if (error) throw error;
                     setSelectedProjectId(data.id);
                   } catch(err) {
                      toast.error('Erro ao criar projeto');
                   }
                }}
                onSelectProject={(id) => setSelectedProjectId(id)}
            />
        );
    }

    const handleGenerate = async (settings: ToolGenerationSettings) => {
        setIsGenerating(true);
        try {
            const result = await generateImage.mutateAsync(settings);
            if (result.error) {
                toast.error(result.error);
            } else if (result.imageUrl) {
                toast.success('Imagem gerada com sucesso! ✨');
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro ao gerar imagem');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async (image: StudioImage) => {
        try {
            const response = await fetch(image.image_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tool.label.replace(/\s+/g, '-').toLowerCase()}-${image.id.slice(0, 8)}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error('Erro ao descarregar imagem');
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full overflow-hidden bg-background">
            <div className="hidden md:block">
                <StudioQuickMenu currentToolId={tool.id} />
            </div>
            {/* ── Left Sidebar ── */}
            <div className="hidden md:flex w-[420px] border-r shrink-0 flex-col bg-muted/10 h-full overflow-hidden">
                {/* Header */}
                <div className="h-16 border-b bg-background flex items-center gap-3 px-4 shrink-0 shadow-sm">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/app/studio')} className="shrink-0 -ml-1">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${tool.gradientFrom}, ${tool.gradientTo})` }}
                    >
                        {tool.icon && <tool.icon className="h-5 w-5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-sm font-bold truncate leading-none">{tool.label}</h1>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{tool.description}</p>
                    </div>
                </div>

                {/* Panel */}
                <div className="flex-1 overflow-y-auto p-4">
                    <ToolGenerationPanel
                        tool={tool}
                        onGenerate={handleGenerate}
                        isGenerating={isGenerating}
                        dailyCount={dailyCount}
                    />
                </div>
            </div>

            {/* ── Main Area ── */}
            <div className="flex-1 flex flex-col overflow-hidden h-full">
                {/* Right header - Hidden on mobile */}
                <div className="hidden md:flex h-16 border-b bg-background items-center justify-between px-6 shrink-0 shadow-sm">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Imagens Geradas</span>
                        {images.length > 0 && (
                            <Badge variant="secondary" className="text-xs">{images.length}</Badge>
                        )}
                    </div>
                </div>

                {/* Gallery */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : images.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-6 text-center max-w-md mx-auto">
                            {tool.previewImage ? (
                                <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-primary/10">
                                    <div
                                        className="absolute inset-0 bg-cover bg-center"
                                        style={{ backgroundImage: `url(${tool.previewImage})` }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    <div className="absolute bottom-4 left-4 flex items-center gap-3">
                                        <div className="text-left text-white">
                                            <p className="font-bold text-2xl">{tool.label}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl"
                                        style={{ background: `linear-gradient(135deg, ${tool.gradientFrom}22, ${tool.gradientTo}33)`, border: `1px solid ${tool.gradientFrom}40` }}
                                    >
                                        {tool.icon && <tool.icon className="h-12 w-12 text-primary" />}
                                    </div>
                                    <p className="font-semibold tracking-tight text-xl text-foreground">{tool.label}</p>
                                </>
                            )}
                            <div>
                                <p className="text-base text-muted-foreground mt-1">
                                    {tool.description}. Configure o painel lateral e clique em "Gerar com IA" para começar a criar.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {paginated.map((image) => (
                                    <Card key={image.id} className="group overflow-hidden">
                                        <div
                                            className="relative aspect-square cursor-pointer"
                                            onClick={() => setPreviewImage(image)}
                                        >
                                            <img
                                                src={image.image_url}
                                                alt={image.prompt}
                                                className="w-full h-full object-cover"
                                            />
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                                                <Button size="icon" variant="secondary" onClick={(e) => { e.stopPropagation(); setPreviewImage(image); }}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="secondary" onClick={(e) => { e.stopPropagation(); handleDownload(image); }}>
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(image); }}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="p-2 border-t">
                                            <p className="text-xs font-medium truncate" title={image.title || image.prompt}>
                                                {image.title || image.prompt}
                                            </p>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[10px] text-muted-foreground">{image.size}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {formatDistanceToNow(new Date(image.created_at), { addSuffix: true, locale: ptBR })}
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2">
                                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    {Array.from({ length: totalPages }, (_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i)}
                                            className={cn(
                                                'w-8 h-8 rounded-md text-sm font-medium transition-colors',
                                                currentPage === i ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
                                            )}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Dialog */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={previewImage.image_url}
                            alt={previewImage.prompt}
                            className="w-full h-full object-contain rounded-xl shadow-2xl"
                        />
                        <div className="absolute top-4 right-4 flex gap-2">
                            <Button size="icon" variant="secondary" onClick={() => handleDownload(previewImage)}>
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="secondary" onClick={() => setPreviewImage(null)}>
                                ✕
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Dialog */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar imagem?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => { if (deleteTarget) { deleteImage.mutate(deleteTarget.id); setDeleteTarget(null); } }}
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
