import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, ArrowUp, ArrowRight, Loader2, Download, Trash2, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDropzone } from 'react-dropzone';
import { useStudioImages } from '@/hooks/useStudioImages';
import type { StudioTool, StudioImage } from '@/types/studio';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StudioQuickMenu } from './StudioQuickMenu';
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

interface BeautifyToolViewProps {
    tool: StudioTool;
}

export function BeautifyToolView({ tool }: BeautifyToolViewProps) {
    const navigate = useNavigate();
    const { images, generateImage, deleteImage, dailyCount } = useStudioImages(tool.id);

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isComposing, setIsComposing] = useState(false);
    const [selectedSize, setSelectedSize] = useState('1080x1080');
    const [customPrompt, setCustomPrompt] = useState('');

    const getCardSize = (size: string) => {
        switch (size) {
            case '1080x1080': return "w-[320px] h-[320px] md:w-[580px] md:h-[580px]";
            case '1080x1920': return "w-[240px] h-[426px] md:w-[380px] md:h-[675px]";
            case '1920x1080': return "w-[340px] h-[191px] md:w-[680px] md:h-[382px]";
            case '1080x1350': return "w-[280px] h-[350px] md:w-[480px] md:h-[600px]";
            default: return "w-[320px] h-[450px] md:w-[450px] md:h-[600px]";
        }
    };

    // Slider state
    const [activeIndex, setActiveIndex] = useState(0);
    const [maximizedImage, setMaximizedImage] = useState<StudioImage | null>(null);

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
            // Prevent interference when typing in prompt input
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

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
                    const MAX_SIZE = 1024;

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
            const finalPrompt = customPrompt.trim()
                ? `${customPrompt}. Professional studio product background, high-end commercial photography, soft studio lighting, clean minimalist environment, 8k resolution, highly detailed`
                : "Professional studio product background, high-end commercial photography, soft studio lighting, clean minimalist environment, 8k resolution, highly detailed";

            const result = await generateImage.mutateAsync({
                toolId: tool.id,
                prompt: finalPrompt,
                inputImage: `data:image/png;base64,${base64}`,
                size: selectedSize as any,
                style: 'vivid',
                model: 'gemini-pro'
            });

            if (result.error) {
                toast.error(result.error);
            } else if (result.imageUrl) {
                toast.success('Imagem gerada com sucesso! ✨');
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
            a.download = `beautify-${image.id.slice(0, 8)}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error('Erro ao descarregar imagem');
        }
    };

    const handleBeautifyGenerated = async (img: StudioImage) => {
        try {
            toast.loading('Preparando imagem...', { id: 'prep-img' });
            const res = await fetch(img.image_url);
            const blob = await res.blob();
            const file = new File([blob], `beautify-${img.id}.png`, { type: blob.type || 'image/png' });
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
        <div className="flex h-[calc(100vh-4rem)] bg-white relative overflow-hidden">
            <StudioQuickMenu currentToolId={tool.id} />
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* Top Bar for Navigation */}
                <div className="flex-none p-6 pb-0 flex items-start gap-6 z-20">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/app/studio')} className="shrink-0 rounded-full bg-white shadow-sm hover:bg-muted border h-10 w-10">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                    <div className="max-w-xl w-full flex flex-col items-center gap-6">

                        {showResult ? (
                            <div className="w-full flex-1 flex flex-col items-center justify-center relative animate-in fade-in zoom-in duration-500 min-h-[50vh]">

                                {/* Navigation Prev */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 hover:bg-slate-100/50 rounded-full h-12 w-12 z-[60]"
                                    onClick={handlePrev}
                                    disabled={activeIndex <= 0}
                                >
                                    <ChevronLeft className="h-8 w-8" />
                                </Button>

                                {/* Images Container (3D Slider) */}
                                <div className="relative w-full max-w-7xl h-[450px] md:h-[700px] flex items-center justify-center perspective-[1200px] mt-4">

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
                                            const isMobile = window.innerWidth < 768;
                                            const baseTranslate = isMobile
                                                ? (selectedSize === '1920x1080' ? 240 : (selectedSize === '1080x1080' ? 200 : 160))
                                                : (selectedSize === '1920x1080' ? 420 : (selectedSize === '1080x1080' ? 360 : 260));
                                            const stepTranslate = isMobile ? 40 : 85;
                                            translateX = direction * (baseTranslate + absOffset * stepTranslate);
                                        }

                                        return (
                                            <div
                                                key="generating-card"
                                                onClick={() => { if (offset !== 0) setActiveIndex(logicalIndex); }}
                                                className={cn(
                                                    "absolute top-0 bottom-0 my-auto transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] rounded-[2rem] overflow-hidden bg-[#F4F4F5] flex flex-col items-center justify-center",
                                                    getCardSize(selectedSize),
                                                    offset === 0 ? "shadow-[0_0px_50px_rgba(0,0,0,0.15)] ring-1 ring-black/5 cursor-default" : "shadow-xl cursor-pointer"
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
                                                            <div className="relative bg-white p-4 rounded-full shadow-xl">
                                                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                                            </div>
                                                        </div>
                                                        <span className="font-medium text-primary bg-white/90 px-4 py-1.5 rounded-full shadow-sm text-sm">
                                                            A embelezar produto...
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
                                            const isMobile = window.innerWidth < 768;
                                            const baseTranslate = isMobile
                                                ? (selectedSize === '1920x1080' ? 240 : (selectedSize === '1080x1080' ? 200 : 160))
                                                : (selectedSize === '1920x1080' ? 420 : (selectedSize === '1080x1080' ? 360 : 260));
                                            const stepTranslate = isMobile ? 40 : 85;
                                            translateX = direction * (baseTranslate + absOffset * stepTranslate);
                                        }

                                        return (
                                            <div
                                                key={img.id}
                                                onClick={() => {
                                                    if (offset !== 0) setActiveIndex(logicalIndex);
                                                    else setMaximizedImage(img);
                                                }}
                                                className={cn(
                                                    "absolute top-0 bottom-0 my-auto transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] rounded-[2rem] overflow-hidden bg-[#F4F4F5] flex flex-col",
                                                    getCardSize(selectedSize),
                                                    offset === 0 ? "shadow-[0_0px_50px_rgba(0,0,0,0.15)] ring-1 ring-black/5 cursor-zoom-in" : "shadow-xl cursor-pointer"
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
                                                    <div className="absolute inset-0 bg-[#F4F4F5] pointer-events-none z-10" style={{ opacity: overlayOpacity }} />
                                                )}
                                                <img src={img.image_url} alt="Result" className="w-full h-full object-contain" />

                                                {/* Actions overlay for central image */}
                                                {offset === 0 && (
                                                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300 h-[50%]">
                                                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleBeautifyGenerated(img); }} className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg text-sm flex-1 font-medium transform transition-transform hover:scale-105">
                                                            <Upload className="h-4 w-4 mr-2" /> Embelezar
                                                        </Button>
                                                        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleDownload(img) }} className="h-10 px-3 rounded-xl shadow-lg border-0 bg-white/90 hover:bg-white text-slate-800 transform transition-transform hover:scale-105">
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
                                    className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 hover:bg-slate-100/50 rounded-full h-12 w-12 z-[60]"
                                    onClick={handleNext}
                                    disabled={activeIndex >= logicalImagesCount - 1}
                                >
                                    <ChevronRight className="h-8 w-8" />
                                </Button>

                                <div className="mt-8 z-[60]">
                                    <Button variant="outline" onClick={() => { setSelectedImage(null); setPreviewUrl(null); setIsComposing(true); }} className="rounded-full px-8 h-10 bg-white shadow-sm border-slate-200 text-slate-600 hover:text-primary transition-colors">
                                        Embeleze outra imagem
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
                                <div className="relative flex items-center justify-center">
                                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 rotate-[-8deg] translate-x-12 z-10 w-[200px] aspect-square flex items-center justify-center overflow-hidden">
                                        <img src="/inspiration/beautify_placeholder_before.png" alt="Before" className="w-full h-full object-contain opacity-40" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27%3E%3Crect width=%2718%27 height=%2718%27 x=%273%27 y=%273%27 rx=%272%27/%3E%3C/svg%3E'; }} />
                                    </div>
                                    <ArrowRight className="h-8 w-8 text-slate-300 z-20 mx-4" />
                                    <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 rotate-[8deg] -translate-x-12 z-10 w-[200px] aspect-square flex items-center justify-center overflow-hidden">
                                        <img src="/inspiration/beautify_placeholder_after.png" alt="After" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27%3E%3Crect width=%2718%27 height=%2718%27 x=%273%27 y=%273%27 rx=%272%27/%3E%3C/svg%3E'; }} />
                                    </div>
                                </div>
                                <p className="text-secondary-foreground text-sm font-medium mt-4">
                                    Get a polished, professional image of your product
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Unified Bottom Control Panel - Recolor Style Match */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg z-20 px-4">
                    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 p-2 overflow-hidden flex flex-col gap-2 transition-all duration-300 hover:shadow-[0_8px_40px_rgb(0,0,0,0.16)]">

                        {/* Top Area: Large Upload Zone (Reference Image Style) */}
                        <div
                            {...getRootProps()}
                            className={cn(
                                "group cursor-pointer border border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all min-h-[100px]",
                                isDragActive ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/50 hover:bg-slate-50",
                                previewUrl && !isDragActive ? "bg-slate-50/50" : ""
                            )}
                        >
                            <input {...getInputProps()} />
                            {previewUrl ? (
                                <div className="flex items-center gap-4 w-full px-2">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden border bg-white shadow-sm shrink-0">
                                        <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700 truncate">Imagem Base</p>
                                        <p className="text-xs text-slate-400">Clique para alterar</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 text-slate-500 group-hover:text-primary transition-colors">
                                    <Upload className="h-5 w-5" />
                                    <span className="text-sm font-medium">Drop a file or <span className="text-[#FFB084] font-semibold">select an image</span></span>
                                </div>
                            )}
                        </div>

                        {/* Bottom Area: Prompt, Sizes & Action */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/50 rounded-xl border border-slate-100/50">
                            {/* Prompt Input */}
                            <div className="flex-1 flex items-center min-w-0">
                                <input
                                    type="text"
                                    placeholder="Adicionar detalhes..."
                                    className="w-full bg-transparent border-none py-1 text-xs sm:text-sm focus:ring-0 outline-none placeholder:text-slate-400 font-medium"
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                />
                            </div>

                            {/* Divider */}
                            <div className="w-[1px] h-6 bg-slate-200 mx-1" />

                            {/* Compact Sizes - Geometric Shapes */}
                            <div className="flex items-center gap-1 sm:gap-1.5 px-0.5 sm:px-1">
                                {[
                                    { id: '1080x1080', label: '1:1', type: 'square' },
                                    { id: '1080x1920', label: '9:16', type: 'portrait' },
                                    { id: '1920x1080', label: '16:9', type: 'landscape' },
                                    { id: '1080x1350', label: '4:5', type: 'tall' },
                                ].map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setSelectedSize(s.id)}
                                        title={s.label}
                                        className={cn(
                                            "w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-all border shrink-0",
                                            selectedSize === s.id
                                                ? "bg-[#FFB084] border-[#FFB084] shadow-sm scale-110"
                                                : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                        )}
                                    >
                                        <div className={cn(
                                            "border-[1.5px] sm:border-2 rounded-[2px] transition-colors",
                                            selectedSize === s.id ? "border-white" : "border-slate-400",
                                            s.type === 'square' ? "w-3 h-3 sm:w-4 sm:h-4" :
                                                s.type === 'portrait' ? "w-2.5 h-4.5 sm:w-3.5 sm:h-6" :
                                                    s.type === 'landscape' ? "w-4.5 h-2.5 sm:w-6 sm:h-3.5" : "w-3 h-4 sm:w-4 sm:h-5"
                                        )} />
                                    </button>
                                ))}
                            </div>

                            {/* Action Button - Recolor Style Circular */}
                            <Button
                                onClick={handleGenerate}
                                disabled={!selectedImage || isGenerating}
                                className={cn(
                                    "rounded-full h-10 w-10 p-0 shrink-0 transition-all duration-300 shadow-md",
                                    "bg-[#FFB084] hover:bg-[#FF9E66] text-white border-0",
                                    "flex items-center justify-center",
                                    "transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                                )}
                            >
                                {isGenerating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ArrowUp className="h-5 w-5" />
                                )}
                            </Button>
                        </div>

                    </div>
                </div>
            </div>

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
                            className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white hover:bg-white/10 rounded-full h-14 w-14 z-[110]"
                            onClick={(e) => { e.stopPropagation(); setMaximizedImage(images[images.findIndex(img => img.id === maximizedImage.id) - 1]); }}
                        >
                            <ChevronLeft className="h-10 w-10" />
                        </Button>
                    )}

                    <img
                        src={maximizedImage.image_url}
                        alt="Maximized Result"
                        className="w-full h-full object-contain cursor-zoom-out z-[105]"
                        onClick={(e) => { e.stopPropagation(); setMaximizedImage(null); }}
                    />

                    {/* Navigation Next */}
                    {images.findIndex(img => img.id === maximizedImage.id) < images.length - 1 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white hover:bg-white/10 rounded-full h-14 w-14 z-[110]"
                            onClick={(e) => { e.stopPropagation(); setMaximizedImage(images[images.findIndex(img => img.id === maximizedImage.id) + 1]); }}
                        >
                            <ChevronRight className="h-10 w-10" />
                        </Button>
                    )}

                    {/* Action buttons inside lightbox */}
                    <div className="absolute inset-x-0 bottom-0 p-8 md:p-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end justify-center gap-4 z-[110] pointer-events-none">
                        <div className="pointer-events-auto flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-500">
                            <Button size="lg" onClick={(e) => { e.stopPropagation(); setMaximizedImage(null); handleBeautifyGenerated(maximizedImage); }} className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-xl font-medium transform transition-transform hover:scale-105">
                                <Upload className="h-5 w-5 mr-2" /> Embelezar
                            </Button>
                            <Button size="lg" variant="secondary" onClick={(e) => { e.stopPropagation(); handleDownload(maximizedImage) }} className="h-12 px-6 rounded-xl shadow-xl border-0 bg-white/95 hover:bg-white text-slate-900 transform transition-transform hover:scale-105 font-medium">
                                <Download className="h-5 w-5 mr-2" /> Transferir
                            </Button>
                            <Button size="icon" variant="destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(maximizedImage); setMaximizedImage(null); }} className="h-12 w-12 rounded-xl shadow-xl shrink-0 transform transition-transform hover:scale-105">
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
                        <AlertDialogDescription>Esta ação não pode ser desfeita e a imagem será apagada permanentemente.</AlertDialogDescription>
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
