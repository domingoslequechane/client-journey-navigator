import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { Camera, Loader2, Upload, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageChange: (url: string | undefined) => void;
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
}

export function ImageUpload({
  currentImageUrl,
  onImageChange,
  name,
  className,
  size = 'lg',
  shape = 'circle',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 2MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `profiles/${crypto.randomUUID()}.${fileExt}`;

      // Upload to Supabase Storage (linktree-assets bucket)
      const { error: uploadError } = await supabase.storage
        .from('linktree-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('linktree-assets')
        .getPublicUrl(fileName);

      onImageChange(publicUrl);
      toast({ title: 'Imagem atualizada!' });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer o upload da imagem',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const hasImage = !!currentImageUrl;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div 
        className="relative group cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Avatar className={cn(
          sizeClasses[size],
          shape === 'square' && 'rounded-lg',
          'transition-all'
        )}>
          <AvatarImage src={currentImageUrl} className="object-cover" />
          <AvatarFallback 
            className={cn(
              'bg-primary/10 text-primary text-xl',
              shape === 'square' && 'rounded-lg'
            )}
          >
            {hasImage ? name.charAt(0).toUpperCase() : <Upload className="h-6 w-6" />}
          </AvatarFallback>
        </Avatar>
        
        {/* Overlay on hover */}
        <div 
          className={cn(
            'absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity',
            shape === 'circle' ? 'rounded-full' : 'rounded-lg'
          )}
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : hasImage ? (
            <Pencil className="h-5 w-5 text-white" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
