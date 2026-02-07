import { useState } from 'react';
import { Download, Eye, Trash2, Loader2, Star, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ImagePreviewModal } from './ImagePreviewModal';
import { StarRating } from './StarRating';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { StudioFlyer } from '@/types/studio';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FlyerGalleryProps {
  flyers: StudioFlyer[];
  loading?: boolean;
  onRate?: (flyerId: string, rating: number, feedback?: string) => void;
  onDelete?: (flyerId: string) => void;
  ratings?: Record<string, { rating: number; feedback: string | null }>;
  className?: string;
}

const ITEMS_PER_PAGE = 9;

export function FlyerGallery({ flyers, loading, onRate, onDelete, ratings = {}, className }: FlyerGalleryProps) {
  const [previewFlyer, setPreviewFlyer] = useState<StudioFlyer | null>(null);
  const [deleteFlyer, setDeleteFlyer] = useState<StudioFlyer | null>(null);
  const [feedbackFlyer, setFeedbackFlyer] = useState<StudioFlyer | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.ceil(flyers.length / ITEMS_PER_PAGE);
  const paginatedFlyers = flyers.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

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

  const handleDeleteConfirm = () => {
    if (deleteFlyer && onDelete) {
      onDelete(deleteFlyer.id);
      setDeleteFlyer(null);
    }
  };

  const handleFeedbackSubmit = () => {
    if (feedbackFlyer && onRate && feedbackRating > 0) {
      onRate(feedbackFlyer.id, feedbackRating, feedbackText || undefined);
      setFeedbackFlyer(null);
      setFeedbackText('');
      setFeedbackRating(0);
    }
  };

  const openFeedback = (flyer: StudioFlyer) => {
    const existing = ratings[flyer.id];
    setFeedbackFlyer(flyer);
    setFeedbackRating(existing?.rating || 0);
    setFeedbackText(existing?.feedback || '');
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
      <div className={cn('space-y-4', className)}>
        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {paginatedFlyers.map((flyer) => {
            const flyerRating = ratings[flyer.id];
            
            return (
              <Card key={flyer.id} className="group overflow-hidden">
                <div className="relative aspect-square">
                  <img
                    src={flyer.image_url}
                    alt={flyer.prompt}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
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
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => openFeedback(flyer)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      {onDelete && (
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => setDeleteFlyer(flyer)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Quick star rating */}
                    {onRate && (
                      <StarRating
                        rating={flyerRating?.rating || 0}
                        onRatingChange={(rating) => onRate(flyer.id, rating)}
                        size="sm"
                      />
                    )}
                  </div>

                  {/* Rating badge */}
                  {flyerRating && (
                    <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-background/90 rounded-full px-1.5 py-0.5">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      <span className="text-[10px] font-medium">{flyerRating.rating}</span>
                    </div>
                  )}
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
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={cn(
                    'w-8 h-8 rounded-md text-sm font-medium transition-colors',
                    currentPage === i
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground'
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewFlyer && (
        <ImagePreviewModal
          open={!!previewFlyer}
          onOpenChange={(open) => !open && setPreviewFlyer(null)}
          imageUrl={previewFlyer.image_url}
          title={previewFlyer.prompt}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteFlyer} onOpenChange={(open) => !open && setDeleteFlyer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar flyer?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O flyer será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feedback Dialog */}
      <Dialog open={!!feedbackFlyer} onOpenChange={(open) => !open && setFeedbackFlyer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Avaliar Flyer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {feedbackFlyer && (
              <div className="w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                <img 
                  src={feedbackFlyer.image_url} 
                  alt={feedbackFlyer.prompt} 
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            
            <div className="flex justify-center">
              <StarRating
                rating={feedbackRating}
                onRatingChange={setFeedbackRating}
                size="lg"
              />
            </div>

            <Textarea
              placeholder="O que pode melhorar? (opcional — ajuda a IA a aprender)"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={3}
            />

            <p className="text-xs text-muted-foreground text-center">
              💡 Sua avaliação ajuda a IA a gerar flyers melhores no futuro
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackFlyer(null)}>
              Cancelar
            </Button>
            <Button onClick={handleFeedbackSubmit} disabled={feedbackRating === 0}>
              Enviar Avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
