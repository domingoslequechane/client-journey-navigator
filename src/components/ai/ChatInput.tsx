"use client";

import React, { useRef, forwardRef } from 'react';
import { Paperclip, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isTyping: boolean;
  isUploading: boolean;
  onSend: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(({
  input,
  setInput,
  isLoading,
  isTyping,
  isUploading,
  onSend,
  onFileUpload
}, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-3 md:p-4 border-t border-border bg-background shrink-0">
      <div className="flex gap-2 max-w-3xl mx-auto">
        <input
          ref={fileInputRef}
          type="file"
          onChange={onFileUpload}
          className="sr-only"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          tabIndex={-1}
        />
        <Button 
          type="button"
          variant="outline" 
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="shrink-0"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>
        <AutoResizeTextarea
          ref={ref}
          placeholder="Escreva sua mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          disabled={isLoading || isTyping}
          maxHeight={200}
        />
        <Button 
          type="button"
          onClick={onSend} 
          disabled={isLoading || isTyping || (!input.trim())}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

ChatInput.displayName = "ChatInput";