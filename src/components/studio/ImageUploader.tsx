import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  label: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  accept?: string;
  className?: string;
  gridClassName?: string;
}

export function ImageUploader({
  label,
  images,
  onImagesChange,
  maxImages = 5,
  accept = 'image/*',
  className,
  gridClassName,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Máximo de ${maxImages} imagens atingido`);
      return;
    }

    setUploading(true);
    const newImages: string[] = [];

    try {
      const filesToUpload = Array.from(files).slice(0, remainingSlots);

      for (const file of filesToUpload) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} é muito grande (máx 5MB)`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('studio-assets')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Erro ao fazer upload de ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('studio-assets')
          .getPublicUrl(filePath);

        newImages.push(publicUrl);
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
        toast.success(`${newImages.length} imagem(s) carregada(s)`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro no upload');
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>

      <div className={cn("grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2", gridClassName)}>
        {images.map((url, index) => (
          <div
            key={url}
            className="relative aspect-square rounded-lg overflow-hidden border bg-muted group"
          >
            <img
              src={url}
              alt={`Upload ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-1 transition-colors',
              'hover:border-primary/50 hover:bg-primary/5',
              uploading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Upload</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleUpload}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">
        {images.length}/{maxImages} imagens • Máx 5MB cada
      </p>
    </div>
  );
}
