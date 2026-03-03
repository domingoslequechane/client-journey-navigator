"use client";

import React from 'react';
import DOMPurify from 'dompurify';
import { Copy, Check, Star, Image as ImageIcon, FileText, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import QIAAvatar from './QIAAvatar';
import { markdownToHtml } from '@/lib/markdown-to-html';
import { Message } from './types';

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'code', 'h1', 'h2', 'h3', 'div', 'span'],
  ALLOWED_ATTR: ['href', 'class', 'target', 'rel'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
};

interface MessageItemProps {
  message: Message;
  isMobile: boolean;
  isStreaming?: boolean;
  isFavorited?: boolean;
  isTogglingFavorite?: boolean;
  copiedMessageId: string | null;
  onCopy: (id: string, content: string) => void;
  onToggleFavorite: (id: string) => void;
}

const getFileIcon = (type?: string | null) => {
  if (type?.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
};

export const MessageItem = ({
  message,
  isMobile,
  isStreaming,
  isFavorited,
  isTogglingFavorite,
  copiedMessageId,
  onCopy,
  onToggleFavorite
}: MessageItemProps) => {
  const isAssistant = message.role === 'assistant';
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-2 md:gap-3 animate-fade-in group',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {isAssistant && (
        <QIAAvatar size={isMobile ? 28 : 32} className="shrink-0" />
      )}
      
      <div className="flex flex-col max-w-[85%] md:max-w-[80%]">
        <div
          className={cn(
            'rounded-xl px-3 py-2.5 md:px-4 md:py-3 transition-all duration-200',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
          {isAssistant ? (
            <div className="text-sm max-w-none [&>p]:leading-relaxed [&>ul]:space-y-0.5 [&>ol]:space-y-0.5">
              <span dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(markdownToHtml(message.content), SANITIZE_CONFIG) 
              }} />
              {isStreaming && (
                <span className="inline-block w-[2px] h-4 bg-primary animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          ) : (
            <p className="text-sm whitespace-pre-line">{message.content}</p>
          )}

          {message.file_url && (
            <div className="mt-2">
              {message.file_type?.startsWith('image/') ? (
                <div className="relative rounded-lg overflow-hidden border border-border/50 max-w-xs">
                  <img src={message.file_url} alt={message.file_name || 'Imagem'} className="w-full h-auto object-cover max-h-60" />
                </div>
              ) : (
                <a 
                  href={message.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-2 text-xs underline",
                    isUser ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}
                >
                  {getFileIcon(message.file_type)}
                  {message.file_name}
                </a>
              )}
            </div>
          )}

          <p className={cn(
            'text-xs mt-2 opacity-70',
            isUser ? 'text-right' : ''
          )}>
            {new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        
        {isAssistant && message.id !== 'welcome' && !message.id.startsWith('temp-') && !isStreaming && (
          <div className={cn(
            "flex gap-1 mt-1 ml-1 transition-opacity",
            isFavorited ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
          )}>
            <button
              onClick={() => onCopy(message.id, message.content)}
              className="p-1.5 rounded-md hover:bg-muted/80 transition-colors"
              title="Copiar mensagem"
            >
              {copiedMessageId === message.id ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => onToggleFavorite(message.id)}
              disabled={isTogglingFavorite}
              className="p-1.5 rounded-md hover:bg-muted/80 transition-colors"
              title={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <Star 
                className={cn(
                  "h-3.5 w-3.5 transition-all",
                  isFavorited ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                )} 
              />
            </button>
          </div>
        )}
      </div>

      {isUser && (
        <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <User className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </div>
      )}
    </div>
  );
};