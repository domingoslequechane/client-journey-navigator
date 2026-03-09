import React, { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Upload, Plus, X, Search } from 'lucide-react';
import { INSPIRATION_FLYERS, InspirationFlyer } from '@/types/studio';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface VisualInspirationGridProps {
    selectedImages: string[];
    maxImages?: number;
    onImagesChange: (images: string[]) => void;
}

export function VisualInspirationGrid({
    selectedImages,
    maxImages = 4,
    onImagesChange
}: VisualInspirationGridProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewImage, setPreviewImage] = React.useState<string | null>(null);

    const toggleImageSelection = (url: string) => {
        if (selectedImages.includes(url)) {
            onImagesChange(selectedImages.filter(img => img !== url));
        } else {
            if (selectedImages.length >= maxImages) {
                toast.error(`Máximo de ${maxImages} imagens permitidas.`);
                return;
            }
            onImagesChange([...selectedImages, url]);
        }
    };

    const removeImage = (e: React.MouseEvent, url: string) => {
        e.stopPropagation();
        onImagesChange(selectedImages.filter(img => img !== url));
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        if (selectedImages.length + files.length > maxImages) {
            toast.error(`Limite excedido. Esclha no máximo mais ${maxImages - selectedImages.length} arquivos.`);
            return;
        }

        const toastId = toast.loading('Fazendo upload da inspiração...');
        const uploadedUrls: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `inspiration/${fileName}`;

            try {
                const { error: uploadError } = await supabase.storage
                    .from('studio-assets')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('studio-assets')
                    .getPublicUrl(filePath);

                uploadedUrls.push(publicUrl);
            } catch (error: any) {
                console.error('Error uploading:', error);
                toast.error(`Erro ao fazer upload da imagem ${i + 1}`);
            }
        }

        if (uploadedUrls.length > 0) {
            onImagesChange([...selectedImages, ...uploadedUrls]);
            toast.success('Upload concluído com sucesso!', { id: toastId });
        } else {
            toast.dismiss(toastId);
        }

        // reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Separa as imagens entre as que vêm da galeria estática vs uploads do usuário
    const customUploadedImages = selectedImages.filter(
        selectedUrl => !INSPIRATION_FLYERS.some(flyer => flyer.url === selectedUrl)
    );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">

                {/* Card de Fazer Upload (Custom) */}
                <Card
                    className="overflow-hidden border-dashed border-2 hover:border-primary/50 cursor-pointer transition-colors group bg-muted/20 aspect-[4/5]"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground group-hover:text-primary p-2">
                        <div className="bg-background rounded-full p-2 mb-2 shadow-sm group-hover:scale-110 transition-transform">
                            <Upload className="h-5 w-5" />
                        </div>
                        <span className="font-medium text-[10px] text-center">Upload</span>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*"
                        multiple
                    />
                </Card>

                {/* Imagens Reais Customizadas do Usuário */}
                {customUploadedImages.map((url, idx) => (
                    <Card
                        key={`custom-${idx}`}
                        className="overflow-hidden cursor-pointer relative border-primary ring-2 ring-primary group aspect-[4/5]"
                        onClick={() => toggleImageSelection(url)}
                    >
                        <div
                            className="h-full w-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${url})` }}
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity z-10 pointer-events-none">
                            <CheckCircle2 className="h-8 w-8 text-white drop-shadow-md" />
                        </div>
                        <Badge className="absolute top-2 left-2 bg-primary/90 text-[10px] px-1.5 py-0 h-4 border-none shadow-sm z-20 pointer-events-none">
                            Seu Upload
                        </Badge>
                        <div className="absolute top-2 right-2 flex flex-col gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImage(url);
                                }}
                                className="bg-black/50 hover:bg-black/70 rounded-full p-1.5 text-white transition-colors"
                            >
                                <Search className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={(e) => removeImage(e, url)}
                                className="bg-black/50 hover:bg-red-500 rounded-full p-1.5 text-white transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </Card>
                ))}

                {/* Imagens de Inspiração Globais */}
                {INSPIRATION_FLYERS.map((flyer) => {
                    const isSelected = selectedImages.includes(flyer.url);

                    return (
                        <Card
                            key={flyer.id}
                            className={cn(
                                "overflow-hidden cursor-pointer transition-all hover:border-primary/50 group relative aspect-[4/5]",
                                isSelected ? "border-primary ring-2 ring-primary" : "border-border"
                            )}
                            onClick={() => toggleImageSelection(flyer.url)}
                        >
                            <div
                                className="h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                                style={{ backgroundImage: `url(${flyer.url})` }}
                            />
                            {isSelected && (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10 transition-opacity">
                                    <CheckCircle2 className="h-8 w-8 text-white drop-shadow-md" />
                                </div>
                            )}
                            {!isSelected && (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10 flex items-center justify-center">
                                    <div className="bg-white/80 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100">
                                        <Plus className="h-5 w-5 text-gray-800" />
                                    </div>
                                </div>
                            )}
                            <div className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewImage(flyer.url);
                                    }}
                                    className="bg-black/50 hover:bg-black/70 rounded-full p-1.5 text-white transition-colors shadow-sm"
                                >
                                    <Search className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6 z-20 pointer-events-none">
                                <div className="flex flex-col gap-0.5 items-start">
                                    <Badge variant="secondary" className="bg-white/20 text-white border-none text-[8px] h-3 px-1 backdrop-blur-sm">
                                        {flyer.category}
                                    </Badge>
                                    <span className="text-white text-[9px] font-medium drop-shadow-sm leading-tight line-clamp-2">{flyer.alt}</span>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
            <p className="text-xs text-muted-foreground flex justify-between items-center px-1">
                <span>Selecione da galeria ou faça upload das que você mais gosta.</span>
                <span>{selectedImages.length} de {maxImages} selecionadas</span>
            </p>

            <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent className="max-w-4xl w-fit p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
                    {previewImage && (
                        <img
                            src={previewImage}
                            alt="Preview Completo"
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-md shadow-2xl"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
