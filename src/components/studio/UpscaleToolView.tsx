import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, ArrowUp, Loader2, Download, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDropzone } from 'react-dropzone';
import { useStudioImages } from '@/hooks/useStudioImages';
import type { StudioTool, StudioImage } from '@/types/studio';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StudioQuickMenu } from './StudioQuickMenu';
import { useHeader } from '@/contexts/HeaderContext';
import { useIsMobile } from '@/hooks/use-mobile';
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

interface UpscaleToolViewProps {
    tool: StudioTool;
}

export function UpscaleToolView({ tool }: UpscaleToolViewProps) {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const { setCustomTitle, setCustomIcon, setBackAction } = useHeader();
    const { images, generateImage, deleteImage, dailyCount } = useStudioImages(tool.id);

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [scaleFactor, setscaleFactor] = useState<string>('HD');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isComposing, setIsComposing] = useState(false);
    const [selectedSize, setSelectedSize] = useState('original');

    const getCardSize = (size: string) => {
        switch (size) {
            case '1080x1080': return "w-[280px] h-[280px] md:w-[520px] md:h-[520px]";
            case '1080x1920': return "w-[200px] h-[355px] md:w-[320px] md:h-[570px]";
            case '1920x1080': return "w-[300px] h-[168px] md:w-[620px] md:h-[348px]";
            case '1080x1350': return "w-[240px] h-[300px] md:w-[420px] md:h-[520px]";
            case 'original': return "w-full max-w-[280px] h-auto aspect-auto md:max-w-[800px] max-h-[70vh]";
            default: return "w-[280px] h-[350px] md:w-[450px] md:h-[580px]";
        }
    };

    const getCardWidth = (size: string) => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        switch (size) {
            case '1080x1080': return isMobile ? 280 : 520;
            case '1080x1920': return isMobile ? 200 : 320;
            case '1920x1080': return isMobile ? 300 : 620;
            case '1080x1350': return isMobile ? 240 : 420;
            default: return isMobile ? 280 : 450;
        }
    };

    // Slider state
    const [activeIndex, setActiveIndex] = useState(0);
    const [maximizedImage, setMaximizedImage] = useState<StudioImage | null>(null);
    const [navDirection, setNavDirection] = useState<'next' | 'prev'>('next');
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;
        const distance = touchStartX.current - touchEndX.current;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        if (isLeftSwipe) {
            handleNext();
        } else if (isRightSwipe) {
            handlePrev();
        }

        touchStartX.current = null;
        touchEndX.current = null;
    };

    useEffect(() => {
        if (isMobile) {
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

    // Keep activeIndex within bounds when images change
    useEffect(() => {
        if (images.length > 0 && activeIndex >= images.length) {
            setActiveIndex(Math.max(0, images.length - 1));
        }
    }, [images.length, activeIndex]);

    const logicalImagesCount = isGenerating ? images.length + 1 : images.length;

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (maximizedImage) {
                const maxIndex = images.findIndex(img => img.id === maximizedImage.id);
                if (maxIndex !== -1) {
                    if ((e.key === 'ArrowLeft' || e.key === '<' || e.key === ',') && maxIndex > 0) {
                        setMaximizedImage(images[maxIndex - 1]);
                    } else if ((e.key === 'ArrowRight' || e.key === '>' || e.key === '.') && maxIndex < images.length - 1) {
                        setMaximizedImage(images[maxIndex + 1]);
                    }
                }
            } else {
                // Support both arrow keys and < > keys
                if (e.key === 'ArrowLeft' || e.key === '<' || e.key === ',') {
                    setActiveIndex(prev => Math.max(prev - 1, 0));
                } else if (e.key === 'ArrowRight' || e.key === '>' || e.key === '.') {
                    setActiveIndex(prev => Math.min(prev + 1, logicalImagesCount - 1));
                }
            }
        };

        // Attach listener globally
        if (logicalImagesCount > 0) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [logicalImagesCount, maximizedImage, images]);

    const handleNext = () => setActiveIndex(prev => Math.min(prev + 1, logicalImagesCount - 1));
    const handlePrev = () => setActiveIndex(prev => Math.max(prev - 1, 0));

    // The most recently generated image for this tool will be our result
    const latestImage = images.length > 0 ? images[0] : null;
    const [deleteTarget, setDeleteTarget] = useState<StudioImage | null>(null);

    const onDrop = (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            setSelectedImage(file);
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
            setIsComposing(true);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': [],
            'image/png': [],
            'image/webp': []
        },
        maxFiles: 1,
    });

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 4096;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        // Convert to slightly compressed JPEG to avoid network limit exceptions
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                        resolve(dataUrl.split(',')[1]);
                    } else {
                        reject(new Error("Failed to get canvas context"));
                    }
                };
                img.onerror = () => reject(new Error("Failed to load image"));
                img.src = e.target?.result as string;
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleGenerate = async () => {
        if (!selectedImage) {
            toast.error('Por favor, carregue uma imagem primeiro.');
            return;
        }

        setActiveIndex(0);
        setIsGenerating(true);
        try {
            const base64 = await fileToBase64(selectedImage);
            const result = await generateImage.mutateAsync({
                toolId: tool.id,
                prompt: `Upscale completely without distortion. Maximize quality and crispness for printing in ${scaleFactor} resolution. Reduce noise and keep exact details intact.`,
                inputImage: `data:image/png;base64,${base64}`,
                size: 'original',
                style: 'vivid',
                model: 'gemini-pro'
            });

            if (result.error) {
                toast.error(result.error);
            } else if (result.imageUrl) {
                toast.success('Aumentado com sucesso! ✨');
                setIsComposing(false);
                setActiveIndex(0);
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
            a.download = `upscale-${image.id.slice(0, 8)}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error('Erro ao descarregar imagem');
        }
    };

    const handleupscaleGenerated = async (img: StudioImage) => {
        try {
            toast.loading('Preparando imagem...', { id: 'prep-img' });
            const res = await fetch(img.image_url);
            const blob = await res.blob();
            const file = new File([blob], `upscale-${img.id}.png`, { type: blob.type || 'image/png' });
            setSelectedImage(file);
            setPreviewUrl(img.image_url);
            setIsComposing(true);
            toast.dismiss('prep-img');
            toast.success('Pronto para nova edição!');
        } catch (e) {
            toast.dismiss('prep-img');
            toast.error('Não foi possivel carregar a imagem.');
        }
    };

    // Determine what to show in the center
    const showResult = images.length > 0 || isGenerating;

    return (
        <div className="flex h-full md:h-screen bg-background relative overflow-hidden w-full">
            <div className="hidden md:block">
                <StudioQuickMenu currentToolId={tool.id} />
            </div>
            <div className="flex-1 flex flex-col relative overflow-hidden w-full">
                {/* Top Bar for Navigation - Hidden on mobile as we use the main header */}
                <div className="hidden md:flex flex-none p-4 pb-0 items-start gap-6 z-20">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/app/studio')} className="shrink-0 rounded-full bg-background dark:bg-card shadow-sm hover:bg-muted border h-10 w-10 text-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-6 pt-8 md:pt-12 pb-32 md:pb-56 sm:pb-20 relative w-full">
                    <div className="max-w-xl w-full flex flex-col items-center gap-6">

                        {showResult ? (
                            <div className="w-full flex-1 flex flex-col items-center justify-center relative animate-in fade-in zoom-in duration-500 min-h-[50vh]">

                                {/* Navigation Prev */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground hover:bg-muted/50 rounded-full h-10 w-10 md:h-12 md:w-12 z-[60]"
                                    onClick={handlePrev}
                                    disabled={activeIndex <= 0}
                                >
                                    <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
                                </Button>
                                
                                {/* Images Container (3D Slider) */}
                                <div 
                                    className="relative w-full max-w-7xl h-[340px] md:h-[550px] flex items-center justify-center perspective-[1200px] mt-2"
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={() => {
                                        if (!touchStartX.current || !touchEndX.current) return;
                                        const distance = touchStartX.current - touchEndX.current;
                                        const isLeftSwipe = distance > 50;
                                        const isRightSwipe = distance < -50;
                                        if (isLeftSwipe && activeIndex < (isGenerating ? images.length : images.length - 1)) {
                                            handleNext();
                                        } else if (isRightSwipe && activeIndex > 0) {
                                            handlePrev();
                                        }
                                        touchStartX.current = null;
                                        touchEndX.current = null;
                                    }}
                                >

                                    {/* GENERATING CARD */}
                                    {isGenerating && (() => {
                                        const logicalIndex = 0;
                                        const offset = logicalIndex - activeIndex;
                                        const absOffset = Math.abs(offset);
                                        const direction = Math.sign(offset);

                                        if (absOffset > 3) return null;

                                        let scale = 1;
                                        let zIndex = 50;
                                        let overlayOpacity = 0;
                                        let translateX = 0;

                                        if (offset !== 0) {
                                            scale = 1 - (absOffset * 0.12);
                                            zIndex = 40 - absOffset;
                                            overlayOpacity = absOffset * 0.3;
                                            const baseTranslate = isMobile ? 50 : 260;
                                            const stepTranslate = isMobile ? 20 : 85;
                                            translateX = direction * (baseTranslate + (absOffset - 1) * stepTranslate);
                                            if (offset === 0) translateX = 0;
                                        }

                                        return (
                                            <div
                                                key="generating-card"
                                                onClick={() => { if (offset !== 0) setActiveIndex(logicalIndex); }}
                                                className={cn(
                                                    "absolute top-0 bottom-0 my-auto transition-all duration-500 ease-out rounded-[2rem] overflow-hidden bg-card border border-border flex flex-col items-center justify-center",
                                                    getCardSize(selectedSize),
                                                    offset === 0 ? "shadow-[0_0px_50px_rgba(0,0,0,0.25)] ring-1 ring-primary/20 cursor-default" : "shadow-xl cursor-pointer"
                                                )}
                                                style={{
                                                    transform: `translateX(${translateX}px) scale(${scale})`,
                                                    zIndex,
                                                    opacity: 1,
                                                    pointerEvents: absOffset > 2 ? 'none' : 'auto',
                                                    filter: offset !== 0 ? `blur(${absOffset * 3}px)` : 'none',
                                                }}
                                            >
                                                <div className="relative w-full h-full flex flex-col items-center justify-center bg-muted/20">
                                                    {offset !== 0 && (
                                                        <div className="absolute inset-0 bg-[#F4F4F5] pointer-events-none z-10" style={{ opacity: overlayOpacity }} />
                                                    )}
                                                    {previewUrl ? (
                                                        <>
                                                            <img src={previewUrl} alt="Original" className="w-full h-full object-contain opacity-50 blur-sm brightness-110 grayscale" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent mix-blend-overlay" />
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full bg-primary/5" />
                                                    )}
                                                    <div className="absolute flex flex-col items-center gap-4">
                                                        <div className="relative">
                                                            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                                                            <div className="relative bg-background border p-4 rounded-full shadow-xl">
                                                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                                            </div>
                                                        </div>
                                                        <span className="font-medium text-primary bg-background/80 border px-4 py-1.5 rounded-full shadow-sm text-sm backdrop-blur-sm">
                                                            Aumentando qualidade...
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    {images.map((img, index) => {
                                        const logicalIndex = isGenerating ? index + 1 : index;
                                        const offset = logicalIndex - activeIndex;
                                        const absOffset = Math.abs(offset);
                                        const direction = Math.sign(offset);

                                        // Max 3 images visibly stacked on either side
                                        if (absOffset > 3) return null;

                                        let scale = 1;
                                        let zIndex = 50;
                                        let overlayOpacity = 0;
                                        let translateX = 0;

                                        if (offset !== 0) {
                                            scale = 1 - (absOffset * 0.12); // 0.88, 0.76, 0.64
                                            zIndex = 40 - absOffset;
                                            overlayOpacity = absOffset * 0.3; // Fade side images
                                            const baseTranslate = isMobile ? 50 : 260;
                                            const stepTranslate = isMobile ? 20 : 85;
                                            translateX = direction * (baseTranslate + (absOffset - 1) * stepTranslate);
                                            if (offset === 0) translateX = 0;
                                        }

                                        // Render actual image card
                                        // const img = item as StudioImage; // This line was causing a redeclaration error if uncommented
                                        return (
                                            <div
                                                key={img.id}
                                                onClick={() => {
                                                    if (offset !== 0) setActiveIndex(logicalIndex);
                                                    else setMaximizedImage(img);
                                                }}
                                                className={cn(
                                                    "absolute top-0 bottom-0 my-auto transition-all duration-500 ease-out rounded-[2rem] overflow-hidden bg-card border border-border flex flex-col",
                                                    getCardSize(img.size || selectedSize),
                                                    offset === 0 ? "shadow-[0_0px_60px_rgba(0,0,0,0.3)] ring-1 ring-primary/20 cursor-zoom-in" : "shadow-xl cursor-pointer"
                                                )}
                                                style={{
                                                    transform: `translateX(${translateX}px) scale(${scale})`,
                                                    zIndex,
                                                    opacity: 1,
                                                    pointerEvents: absOffset > 2 ? 'none' : 'auto',
                                                    filter: offset !== 0 ? `blur(${absOffset * 3}px)` : 'none',
                                                }}
                                            >
                                                {offset !== 0 && (
                                                    <div className="absolute inset-0 bg-background/60 pointer-events-none z-10 backdrop-blur-[2px]" style={{ opacity: overlayOpacity }} />
                                                )}
                                                <img src={img.image_url} alt="Result" className="w-full h-full object-contain" />

                                                {/* Actions overlay for central image */}
                                                {offset === 0 && (
                                                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300 h-[50%]">
                                                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleupscaleGenerated(img); }} className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg text-sm flex-1 font-medium transform transition-transform hover:scale-105">
                                                            <Upload className="h-4 w-4 mr-2" /> Melhorar
                                                        </Button>
                                                        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleDownload(img) }} className="h-10 px-3 rounded-xl shadow-lg border-0 bg-background/90 dark:bg-card/90 hover:bg-background dark:hover:bg-card text-foreground transform transition-transform hover:scale-105">
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="icon" variant="destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(img) }} className="h-10 w-10 rounded-xl shadow-lg shrink-0 transform transition-transform hover:scale-105">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Navigation Next */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground hover:bg-muted/50 rounded-full h-10 w-10 md:h-12 md:w-12 z-[60]"
                                    onClick={handleNext}
                                    disabled={activeIndex >= logicalImagesCount - 1}
                                >
                                    <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
                                </Button>

                                <div className="mt-8 md:mt-12 z-[60]">
                                    <Button variant="outline" onClick={() => { setSelectedImage(null); setPreviewUrl(null); setIsComposing(true); }} className="rounded-full px-8 h-10 bg-background dark:bg-card shadow-sm border-primary text-primary hover:bg-primary/10 transition-colors font-medium">
                                        Upscale outra Imagem
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
                                <p className="text-xl font-medium text-foreground tracking-tight text-center">
                                    Aumente a qualidade de uma imagem sem distorcer nada, <br /> deixando a imagem com uma qualidade boa para levar para impressão.
                                </p>
                                <img
                                    src="/inspiration/upscale_hero_graphic.png"
                                    alt="upscale graphic"
                                    className="w-full max-w-[400px] object-contain drop-shadow-sm"
                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Floating Control Panel */}
                <div className="fixed bottom-4 left-4 right-4 z-20 md:absolute md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg md:px-0">
                    <div className="bg-background dark:bg-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-border p-1.5 overflow-hidden flex flex-col gap-1 transition-all duration-300 hover:shadow-[0_8px_40px_rgb(0,0,0,0.25)]">

                        {/* Upload Dropzone Area */}
                        <div
                            {...getRootProps()}
                            className={cn(
                                "group cursor-pointer border border-dashed rounded-xl p-2 flex flex-col items-center justify-center transition-all min-h-[60px] md:min-h-[70px]",
                                isDragActive ? "border-primary bg-primary/5" : "border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-muted",
                                previewUrl && !isDragActive ? "bg-muted/50" : ""
                            )}
                        >
                            <input {...getInputProps()} />
                            {previewUrl ? (
                                <div className="flex items-center gap-4 w-full px-2">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border bg-background dark:bg-card shrink-0">
                                        <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-medium text-foreground truncate">{selectedImage?.name}</p>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground">Clique para alterar</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 text-slate-500 group-hover:text-primary transition-colors">
                                    <Upload className="h-5 w-5" />
                                    <span className="text-sm font-medium">Drop a file or <span className="text-primary font-semibold">select an image</span></span>
                                </div>
                            )}
                        </div>

                        {/* Upscale Settings & Submit Bar */}
                        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-xl border border-border/50">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Qualidade Max</span>
                                    <span className="text-[10px] text-muted-foreground font-medium">Pronto para impressão</span>
                                </div>
                            </div>

                            <Button
                                onClick={handleGenerate}
                                disabled={!selectedImage || isGenerating}
                                size="icon"
                                className="rounded-xl h-10 w-10 bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 disabled:opacity-50 transition-all hover:-translate-y-0.5"
                            >
                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
                            </Button>
                        </div>

                    </div>
                </div>
            </div>

            {/* Sidebar and Modal removed in favor of main Coverflow slider */}

            {/* Maximized Image Lightbox */}
            {maximizedImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300"
                    onClick={() => setMaximizedImage(null)}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 md:top-8 md:right-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full h-12 w-12 z-[110]"
                        onClick={(e) => { e.stopPropagation(); setMaximizedImage(null); }}
                    >
                        <X className="h-8 w-8" />
                    </Button>

                    {/* Navigation Prev */}
                    {images.findIndex(img => img.id === maximizedImage.id) > 0 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white hover:bg-white/10 rounded-full h-12 w-12 md:h-14 md:w-14 z-[110]"
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setNavDirection('prev');
                                setMaximizedImage(images[images.findIndex(img => img.id === maximizedImage.id) - 1]); 
                            }}
                        >
                            <ChevronLeft className="h-8 w-8 md:h-10 md:w-10" />
                        </Button>
                    )}

                    <div 
                        key={`${maximizedImage.id}-${navDirection}`}
                        className={cn(
                            "w-full h-full flex items-center justify-center p-4 md:p-8 touch-pan-y animate-in fade-in duration-300 ease-out",
                            navDirection === 'next' ? "slide-in-from-right-12" : "slide-in-from-left-12"
                        )}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={() => {
                            if (!touchStartX.current || !touchEndX.current) return;
                            const distance = touchStartX.current - touchEndX.current;
                            const isLeftSwipe = distance > 50;
                            const isRightSwipe = distance < -50;
                            const currentIndex = images.findIndex(img => img.id === maximizedImage.id);

                            if (isLeftSwipe && currentIndex < images.length - 1) {
                                setNavDirection('next');
                                setMaximizedImage(images[currentIndex + 1]);
                            } else if (isRightSwipe && currentIndex > 0) {
                                setNavDirection('prev');
                                setMaximizedImage(images[currentIndex - 1]);
                            }
                            touchStartX.current = null;
                            touchEndX.current = null;
                        }}
                    >
                        <img
                            src={maximizedImage.image_url}
                            alt="Maximized Result"
                            className="w-full h-full object-contain cursor-zoom-out z-[105]"
                            onClick={(e) => { e.stopPropagation(); setMaximizedImage(null); }}
                        />
                    </div>

                    {/* Navigation Next */}
                    {images.findIndex(img => img.id === maximizedImage.id) < images.length - 1 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white hover:bg-white/10 rounded-full h-12 w-12 md:h-14 md:w-14 z-[110]"
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setNavDirection('next');
                                setMaximizedImage(images[images.findIndex(img => img.id === maximizedImage.id) + 1]); 
                            }}
                        >
                            <ChevronRight className="h-8 w-8 md:h-10 md:w-10" />
                        </Button>
                    )}

                    {/* Action buttons inside lightbox */}
                    <div className="absolute inset-x-0 bottom-8 md:bottom-12 flex justify-center px-6 z-[110] pointer-events-none">
                        <div className="pointer-events-auto flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-500">
                            <Button size="lg" onClick={(e) => { e.stopPropagation(); setMaximizedImage(null); handleupscaleGenerated(maximizedImage); }} className="h-12 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-xl font-bold transition-all active:scale-95">
                                <Upload className="h-4 w-4 mr-2" /> Melhorar
                            </Button>
                            <Button size="icon" variant="secondary" onClick={(e) => { e.stopPropagation(); handleDownload(maximizedImage) }} className="h-12 w-12 rounded-2xl shadow-xl border border-border bg-background/95 dark:bg-card/95 hover:bg-background dark:hover:bg-card text-foreground transition-all active:scale-95">
                                <Download className="h-5 w-5" />
                            </Button>
                            <Button size="icon" variant="destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(maximizedImage); setMaximizedImage(null); }} className="h-12 w-12 rounded-2xl shadow-xl transition-all active:scale-95">
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar imagem?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita e a imagem upscaleida será apagada permanentemente.</AlertDialogDescription>
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
