import { useState, useCallback, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImagePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title?: string;
  // Navigation support
  allImages?: { url: string; title?: string }[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

export function ImagePreviewModal({
  open,
  onOpenChange,
  imageUrl,
  title,
  allImages,
  currentIndex = 0,
  onNavigate,
}: ImagePreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const hasNavigation = allImages && allImages.length > 1 && onNavigate;
  const canGoPrev = hasNavigation && currentIndex > 0;
  const canGoNext = hasNavigation && currentIndex < allImages.length - 1;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handlePrev = useCallback(() => {
    if (canGoPrev) {
      setZoom(1);
      setRotation(0);
      onNavigate!(currentIndex - 1);
    }
  }, [canGoPrev, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (canGoNext) {
      setZoom(1);
      setRotation(0);
      onNavigate!(currentIndex + 1);
    }
  }, [canGoNext, currentIndex, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handlePrev, handleNext]);

  const handleDownload = async () => {
    try {
      // Use canvas approach for reliable cross-origin downloads
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          toast.error('Erro ao processar imagem');
          return;
        }
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            toast.error('Erro ao converter imagem');
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const fileName = (title || 'flyer').replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || 'flyer';
          a.download = `${fileName}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success('Download iniciado!');
        }, 'image/png');
      };

      img.onerror = () => {
        // Fallback: try direct fetch with blob
        fetch(imageUrl)
          .then(r => r.blob())
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${(title || 'flyer').replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || 'flyer'}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            toast.success('Download iniciado!');
          })
          .catch(() => toast.error('Erro ao baixar imagem'));
      };

      img.src = imageUrl;
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erro ao baixar imagem');
    }
  };

  const handleClose = () => {
    setZoom(1);
    setRotation(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden">
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-background/80 to-transparent">
            <h3 className="font-medium text-sm truncate max-w-[50%]">
              {title || 'Preview'}
              {hasNavigation && (
                <span className="text-muted-foreground ml-2">
                  ({currentIndex + 1}/{allImages.length})
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleRotate}>
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Image Container */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-muted/50 relative">
            {/* Navigation: Previous */}
            {canGoPrev && (
              <Button
                variant="secondary"
                size="icon"
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg opacity-80 hover:opacity-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}

            <img
              src={imageUrl}
              alt={title || 'Preview'}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            />

            {/* Navigation: Next */}
            {canGoNext && (
              <Button
                variant="secondary"
                size="icon"
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-lg opacity-80 hover:opacity-100"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
