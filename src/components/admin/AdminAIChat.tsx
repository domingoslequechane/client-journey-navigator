import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Maximize2, Minimize2, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function AdminAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Carregar histórico da B.D. apenas uma vez ao abrir
  useEffect(() => {
    if (isOpen && !hasLoadedHistory) {
      const fetchHistory = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data, error } = await (supabase
            .from('admin_chat_messages' as any)
            .select('role, content')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(50) as any);

          if (error) throw error;
          
          if (data && data.length > 0) {
            setMessages(data as any as Message[]);
          } else {
            setMessages([
              {
                role: 'assistant',
                content: 'Olá! Sou a sua IA Especialista do Qualify, com domínio em SaaS, Marketing e Finanças.\nAcedi ao contexto do painel e aos dados da plataforma.\n\nComo posso ajudar hoje com estratégias de divulgação, crescimento ou resolução de problemas no nosso SaaS?'
              }
            ]);
          }
          setHasLoadedHistory(true);
        } catch (err) {
          console.error('Erro ao carregar histórico:', err);
        }
      };
      fetchHistory();
    }
  }, [isOpen, hasLoadedHistory]);

  // Fechar ao clicar fora, mas manter o estado (draft do input)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Pequeno delay para garantir que a animação de abertura permite o scroll correto
      const timeout = setTimeout(scrollToBottom, 300);
      return () => clearTimeout(timeout);
    }
  }, [messages, isOpen, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sessão inválida');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ messages: [userMessage] }) // A logic de history agora está na Edge Function
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao contactar o assistente IA');
      }

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let aiResponseText = '';
      let streamBuffer = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          streamBuffer += chunk;
          
          const parts = streamBuffer.split('\n\n');
          // Manter o último fragmento (que pode estar incompleto) para a próxima volta
          streamBuffer = parts.pop() || '';

          for (const part of parts) {
            const line = part.trim();
            if (!line || line === 'data: [DONE]') continue;

            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.substring(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  aiResponseText += content;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    if (newMessages[lastIndex].role === 'assistant') {
                      newMessages[lastIndex].content = aiResponseText;
                    }
                    return newMessages;
                  });
                }
              } catch (e) {
                // Se o JSON falhar nesta parte, tentamos novamente no próximo loop
                streamBuffer = part + '\n\n' + streamBuffer;
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      // Tentar extrair detalhes do erro se for um JSON do servidor
      let errorMessage = err.message || 'Erro ao processar a mensagem.';
      
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: `### ⚠️ Erro de Comunicação\n${errorMessage}\n\n*Certifique-se de que a ANTHROPIC_API_KEY está correta no Supabase.*` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      toast.success('Conversa copiada!');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      toast.error('Erro ao copiar texto.');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-4 pointer-events-none" ref={containerRef}>
      {/* Painel do Chat com Animação Slide-up */}
      <div 
        className={cn(
          "flex flex-col shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden border-primary/20 bg-background/95 backdrop-blur-md rounded-2xl origin-bottom-right",
          isOpen 
            ? "scale-100 opacity-100 translate-y-0 pointer-events-auto" 
            : "scale-90 opacity-0 translate-y-10 pointer-events-none disabled shadow-none",
          isExpanded 
            ? "w-[calc(100vw-32px)] sm:w-[600px] h-[80vh]" 
            : "w-[calc(100vw-32px)] sm:w-[380px] h-[70vh] sm:h-[600px]"
        )}
      >
        {/* Header */}
        <div className="bg-primary px-4 py-3 flex items-center gap-3 shrink-0 text-primary-foreground">
          <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center border border-primary-foreground/30">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">CEO Board IA</h3>
            <p className="text-[11px] text-primary-foreground/80 truncate">Especialista Qualify & Growth</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages Window */}
        <ScrollArea className="flex-1 p-4 w-full" ref={scrollRef}>
          <div className="space-y-4 pb-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground opacity-50">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p className="text-xs">A carregar histórico...</p>
              </div>
            )}
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={cn(
                  "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  msg.role === 'user' ? "flex-row-reverse" : ""
                )}
              >
                <Avatar className={cn("h-8 w-8 shrink-0", msg.role === 'user' ? "" : "border border-primary/20 bg-primary/10")}>
                  {msg.role === 'assistant' ? (
                    <Bot className="h-5 w-5 m-auto text-primary" />
                  ) : (
                    <AvatarFallback className="bg-muted">Tu</AvatarFallback>
                  )}
                </Avatar>

                <div className={cn("flex flex-col gap-1 max-w-[85%]", msg.role === 'user' ? "items-end" : "items-start")}>
                  <div 
                    className={cn(
                      "rounded-2xl px-3 py-2 sm:px-4 sm:py-3 text-sm shadow-sm break-words relative",
                      msg.role === 'user' 
                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                        : "bg-muted text-foreground rounded-tl-sm border"
                    )}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none 
                        prose-p:leading-relaxed prose-p:my-3 
                        prose-headings:text-primary prose-headings:mb-3 prose-headings:mt-5
                        prose-li:my-1.5 prose-ul:my-3 prose-ol:my-3
                        prose-strong:text-primary prose-strong:font-bold
                        prose-code:bg-muted prose-code:px-1 prose-code:rounded
                        break-words">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  
                  {/* Message Actions (ChatGPT style) - Apenas para mensagens da IA */}
                  {msg.role === 'assistant' && msg.content && (
                    <div className="flex items-center gap-2 mt-1 px-1 flex-row">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md hover:bg-muted text-muted-foreground/60 hover:text-primary transition-colors"
                        onClick={() => handleCopy(msg.content, index)}
                      >
                        {copiedIndex === index ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {copiedIndex === index && (
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">
                          Copiado!
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Âncora invisível para scroll automático */}
            <div ref={messagesEndRef} />

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0 border border-primary/20 bg-primary/10">
                  <Bot className="h-5 w-5 m-auto text-primary" />
                </Avatar>
                <div className="bg-muted text-muted-foreground rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">A analisar estratégias...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-3 border-t bg-background/50 shrink-0">
          <form 
            onSubmit={handleSubmit} 
            className="flex items-end gap-2 bg-muted/50 rounded-2xl p-2 border focus-within:border-primary/30 transition-colors"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Escreva aqui..."
              className="flex-1 border-none bg-transparent focus:ring-0 focus:outline-none outline-none resize-none py-2 px-3 text-sm min-h-[40px] max-h-[150px] scrollbar-hide appearance-none shadow-none"
              disabled={isLoading}
              rows={1}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="rounded-full shrink-0 h-10 w-10 transition-all hover:scale-110 active:scale-95 shadow-lg mb-0.5"
              disabled={!input.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="text-center mt-2">
            <p className="text-[10px] text-muted-foreground/60 flex items-center justify-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Especialista com memória de 3 meses ativo.
            </p>
          </div>
        </div>
      </div>

      {/* Botão Flutuante Principal */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-full shadow-2xl p-0 hover:scale-110 active:scale-90 transition-all duration-300 z-50 flex items-center justify-center pointer-events-auto",
          isOpen ? "bg-muted text-muted-foreground rotate-90" : "bg-primary text-white"
        )}
      >
        {isOpen ? <X className="h-7 w-7" /> : <Bot className="h-7 w-7 animate-pulse" />}
      </Button>
    </div>
  );
}

