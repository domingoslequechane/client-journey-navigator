import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LinkBlock, LinkPageTheme } from '@/types/linktree';

interface CarouselBlockPreviewProps {
  block: LinkBlock;
  theme: LinkPageTheme;
  onRecordClick?: (blockId: string) => void;
}

interface CarouselImage {
  url: string;
  alt?: string;
  link?: string;
}

export function CarouselBlockPreview({ block, theme, onRecordClick }: CarouselBlockPreviewProps) {
  const images = (block.content.images as CarouselImage[]) || [];
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleImageClick = (image: CarouselImage) => {
    if (image.link) {
      onRecordClick?.(block.id);
      window.open(image.link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden">
      {/* Main Image */}
      <div 
        className="relative aspect-[4/3] cursor-pointer"
        onClick={() => handleImageClick(images[currentIndex])}
      >
        <img
          src={images[currentIndex].url}
          alt={images[currentIndex].alt || ''}
          className="w-full h-full object-cover"
        />
        
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{
                backgroundColor: `${theme.primaryColor}cc`,
                color: theme.textColor,
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{
                backgroundColor: `${theme.primaryColor}cc`,
                color: theme.textColor,
              }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Dots Indicator */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 py-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                backgroundColor: idx === currentIndex 
                  ? theme.primaryColor 
                  : `${theme.textColor}40`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
