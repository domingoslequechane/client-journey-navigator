import { useState } from 'react';
import { Download, Eye, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImagePreviewModal } from './ImagePreviewModal';
import { StarRating } from './StarRating';
import { cn } from '@/lib/utils';
import type { StudioFlyer } from '@/types/studio';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FlyerGalleryProps {
  flyers: StudioFlyer[];
  loading?: boolean;
  onRate?: (flyerId: string, rating: number) => void;
  className?: string;
}

export function FlyerGallery({ flyers, loading, onRate, className }: FlyerGalleryProps) {
  const [previewFlyer, setPreviewFlyer] = useState<StudioFlyer | null>(null);

  const handleDownload = async (flyer: StudioFlyer) => {
    try {
      const response = await fetch(flyer.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flyer-${flyer.id.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (flyers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum flyer gerado ainda</p>
        <p className="text-sm">Use o painel de geração para criar seu primeiro flyer</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4', className)}>
        {flyers.map((flyer) => (
          <Card key={flyer.id} className="group overflow-hidden">
            <div className="relative aspect-square">
              <img
                src={flyer.image_url}
                alt={flyer.prompt}
                className="w-full h-full object-cover"
              />
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => setPreviewFlyer(flyer)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => handleDownload(flyer)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                
                {onRate && (
                  <StarRating
                    rating={0}
                    onRatingChange={(rating) => onRate(flyer.id, rating)}
                    size="sm"
                  />
                )}
              </div>
            </div>

            <div className="p-2 border-t">
              <p className="text-xs text-muted-foreground truncate" title={flyer.prompt}>
                {flyer.prompt}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">
                  {flyer.size}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(flyer.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {previewFlyer && (
        <ImagePreviewModal
          open={!!previewFlyer}
          onOpenChange={(open) => !open && setPreviewFlyer(null)}
          imageUrl={previewFlyer.image_url}
          title={previewFlyer.prompt}
        />
      )}
    </>
  );
}
