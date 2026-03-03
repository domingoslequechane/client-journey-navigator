"use client";

import React from 'react';
import { X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PendingFile } from './types';

interface FilePreviewProps {
  file: PendingFile | null;
  onRemove: () => void;
}

export const FilePreview = ({ file, onRemove }: FilePreviewProps) => {
  if (!file) return null;

  const isImage = file.type.startsWith('image/');

  return (
    <div className="px-3 md:px-4 py-2 border-t border-border bg-muted/50">
      <div className="flex items-center gap-2 text-sm">
        {isImage ? (
          <div className="h-10 w-10 rounded border border-border overflow-hidden shrink-0">
            <img src={file.url} alt="Preview" className="w-full h-full object-cover" />
          </div>
        ) : (
          <FileText className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="truncate flex-1 font-medium">{file.name}</span>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onRemove}
          className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};