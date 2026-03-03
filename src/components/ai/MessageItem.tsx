"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Star, Image as ImageIcon, FileText, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import QIAAvatar from './QIAAvatar';
import { Message } from './types';

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
      
      <div className="flex flex-col max-w-[90%] md:max-w-[85%]">
        <div
          className={cn(
            'rounded-xl px-3 py-2.5 md:px-4 md:py-3 transition-all duration-200 shadow-sm',
            isUser 
              ? 'bg-primary text-primary-foreground rounded-br-none' 
              : 'bg-card border border-border/50 text-foreground rounded-bl-none'
          )}
        >
          {isAssistant ? (
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-li:my-0.5 prose-ul:my-2 prose-ol:my-2 prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Personalização dos elementos Markdown para visual profissional
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed text-foreground/90" {...props} />,
                  a: ({node, ...props}) => <a className="text-primary font-medium hover:underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
                  ul: ({node, ...props}) => <ul className="my-2 ml-5 list-disc space-y-1 text-foreground/90" {...props} />,
                  ol: ({node, ...props}) => <ol className="my-2 ml-5 list-decimal space-y-1 text-foreground/90" {...props} />,
                  li: ({node, ...props}) => <li className="pl-1" {...props} />,
                  h1: ({node, ...props}) => <h1 className="text-lg font-bold text-foreground mt-4 mb-2" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-base font-bold text-foreground mt-3 mb-2" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-sm font-bold text-foreground mt-3 mb-1" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-primary/40 pl-4 italic my-2 text-muted-foreground" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} />,
                  code: ({node, inline, className, children, ...props}: any) => {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline ? (
                      <div className="relative my-3 rounded-md bg-muted/80 p-3 font-mono text-xs border border-border/50 overflow-x-auto">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </div>
                    ) : (
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium border border-border/30" {...props}>
                        {children}
                      </code>
                    )
                  },
                  table: ({node, ...props}) => (
                    <div className="my-4 w-full overflow-y-auto rounded-lg border border-border">
                      <table className="w-full text-sm" {...props} />
                    </div>
                  ),
                  thead: ({node, ...props}) => <thead className="bg-muted/50 border-b border-border" {...props} />,
                  tbody: ({node, ...props}) => <tbody className="divide-y divide-border" {...props} />,
                  tr: ({node, ...props}) => <tr className="hover:bg-muted/30 transition-colors" {...props} />,
                  th: ({node, ...props}) => <th className="px-4 py-2 text-left font-medium text-muted-foreground" {...props} />,
                  td: ({node, ...props}) => <td className="px-4 py-2" {...props} />,
                  hr: ({node, ...props}) => <hr className="my-4 border-border" {...props} />,
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-[2px] h-4 bg-primary animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          ) : (
            <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
          )}

          {message.file_url && (
            <div className="mt-3">
              {message.file_type?.startsWith('image/') ? (
                <div className="relative rounded-lg overflow-hidden border border-border/50 max-w-xs bg-background/50">
                  <img src={message.file_url} alt={message.file_name || 'Imagem'} className="w-full h-auto object-cover max-h-60" />
                </div>
              ) : (
                <a 
                  href={message.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-2 text-xs p-2 rounded-md border transition-colors",
                    isUser 
                      ? 'bg-white/10 border-white/20 hover:bg-white/20 text-white' 
                      : 'bg-muted border-border hover:bg-muted/80 text-foreground'
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-full", 
                    isUser ? "bg-white/20" : "bg-background"
                  )}>
                    {getFileIcon(message.file_type)}
                  </div>
                  <span className="underline decoration-dotted underline-offset-2">{message.file_name}</span>
                </a>
              )}
            </div>
          )}

          <p className={cn(
            'text-[10px] mt-1.5 opacity-70 select-none',
            isUser ? 'text-right text-primary-foreground/80' : 'text-muted-foreground'
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
              className="p-1.5 rounded-md hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
              title="Copiar mensagem"
            >
              {copiedMessageId === message.id ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={() => onToggleFavorite(message.id)}
              disabled={isTogglingFavorite}
              className="p-1.5 rounded-md hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
              title={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <Star 
                className={cn(
                  "h-3.5 w-3.5 transition-all",
                  isFavorited ? "fill-yellow-500 text-yellow-500" : ""
                )} 
              />
            </button>
          </div>
        )}
      </div>

      {isUser && (
        <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
        </div>
      )}
    </div>
  );
};