"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Send, Sparkles, User, Loader2, Paperclip, FileText, Image as ImageIcon, X, Building2, Search, Filter, PanelRightClose, PanelRightOpen, ArrowLeft, Copy, Check, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import QIAAvatar from '@/components/ai/QIAAvatar';
import { ChatMessagesSkeleton } from '@/components/ai/ChatMessagesSkeleton';
import { ScrollToBottomButton } from '@/components/ai/ScrollToBottomButton';
import { toast } from '@/hooks/use-toast';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { supabase } from '@/integrations/supabase/client';
import { markdownToHtml } from '@/lib/markdown-to-html';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import { useRateLimit } from '@/hooks/useRateLimit';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useSubscription } from '@/hooks/useSubscription';
import { useMessageFavorites } from '@/hooks/useMessageFavorites';
import { useDraft } from '@/hooks/useDraft';
import { LimitReachedCard } from '@/components/subscription/LimitReachedCard';
import { SubscriptionRequired } from '@/components/subscription/SubscriptionRequired';
import { useAuth } from '@/contexts/AuthContext';

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'code', 'h1', 'h2', 'h3', 'div', 'span'],
  ALLOWED_ATTR: ['href', 'class', 'target', 'rel'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
};

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  created_at: string;
}

interface ClientWithConversation {
  id: string;
  company_name: string;
  contact_name: string;
  current_stage: string;
  qualification: string;
  email: string | null;
  phone: string | null;
  monthly_budget: number | null;
  paid_traffic_budget: number | null;
  services: string[] | null;
  notes: string | null;
  bant_budget: number | null;
  bant_authority: number | null;
  bant_need: number | null;
  bant_timeline: number | null;
  conversation_id?: string;
}

const CHAT_URL = `https://hrarkpjuchrbffnrhzcy.supabase.co/functions/v1/chat`;

const STAGE_OPTIONS = [
  { value: 'all', label: 'Todas as fases' },
  { value: 'prospeccao', label: 'Prospecção' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'contratacao', label: 'Contratação' },
  { value: 'producao', label: 'Produção' },
  { value: 'trafego', label: 'Tráfego' },
  { value: 'retencao', label: 'Retenção' },
];

const AI_SIDEBAR_COLLAPSED_KEY = 'qualify-ai-sidebar-collapsed';

export default function AIAssistant() {
  const queryClient = useQueryClient();
  const { currencySymbol, organizationId } = useOrganizationCurrency();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { canAccessAI, incrementUsage } = usePlanLimits();
  const { hasActiveSubscription, loading: subLoading } = useSubscription();
  const { isFavorited, toggleFavorite, isToggling } = useMessageFavorites(organizationId);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const { value: input, setValue: setInput, clearDraft: clearInputDraft } = useDraft({
    key: 'ai_assistant_input',
    initialValue: '',
    storage: 'session',
    debounceMs: 200,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ url: string; type: string; name: string; base64?: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(AI_SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });
  const [showClientList, setShowClientList] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const { checkRateLimit, isRateLimited } = useRateLimit({ maxRequests: 15, windowMs: 60000 });

  useEffect(() => {
    localStorage.setItem(AI_SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients-with-conversations'],
    queryFn: async () => {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('updated_at', { ascending: false });

      if (clientsError) throw clientsError;

      const { data: conversations } = await supabase
        .from('ai_conversations')
        .select('id, client_id');

      return (clientsData || []).map(client => ({
        ...client,
        conversation_id: conversations?.find(c => c.client_id === client.id)?.id,
      })) as ClientWithConversation[];
    }
  });

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.contact_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = filterStage === 'all' || client.current_stage === filterStage;
    return matchesSearch && matchesStage;
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const { data: conversationMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['conversation-messages', selectedClient?.conversation_id],
    queryFn: async () => {
      if (!selectedClient?.conversation_id) return [];
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', selectedClient.conversation_id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedClient?.conversation_id
  });

  useEffect(() => {
    if (sendingRef.current) return;
    if (selectedClient?.conversation_id && conversationMessages.length > 0) {
      setMessages(conversationMessages);
    } else if (selectedClientId && selectedClient) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Olá! Sou a **QIA**, a tua assistente inteligente. Estou aqui para ajudar com o cliente **${selectedClient.company_name}**.\n\nComo posso auxiliar hoje?`,
        created_at: new Date().toISOString()
      }]);
    }
  }, [selectedClient?.conversation_id, conversationMessages, selectedClientId]);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    setShowScrollButton(false);
  }, []);

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  const getOrCreateConversation = async (clientId: string): Promise<string> => {
    const { data: existing } = await supabase.from('ai_conversations').select('id').eq('client_id', clientId).maybeSingle();
    if (existing) return existing.id;
    const { data: newConv, error } = await supabase.from('ai_conversations').insert({ client_id: clientId }).select('id').single();
    if (error) throw error;
    return newConv.id;
  };

  const saveMessage = async (conversationId: string, message: Omit<Message, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      file_url: message.file_url,
      file_type: message.file_type,
      file_name: message.file_name
    }).select().single();
    if (error) throw error;
    return data;
  };

  const streamChat = async (userMessage: string, fileInfo?: { url: string; type: string; name: string; base64?: string }) => {
    if (!selectedClientId || !selectedClient) return;

    const conversationId = await getOrCreateConversation(selectedClientId);
    const userMsgContent = fileInfo ? `${userMessage}\n\n[Arquivo anexado: ${fileInfo.name}]` : userMessage;

    await saveMessage(conversationId, {
      role: 'user',
      content: userMsgContent,
      file_url: fileInfo?.url,
      file_type: fileInfo?.type,
      file_name: fileInfo?.name
    });

    // Preparar histórico para a API
    const apiMessages = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }));
    
    // Adicionar mensagem atual com suporte a imagem (base64 se disponível)
    if (fileInfo?.type.startsWith('image/') && fileInfo.base64) {
      apiMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: userMessage },
          { type: 'image_url', image_url: { url: fileInfo.base64 } }
        ]
      });
    } else {
      apiMessages.push({ role: 'user', content: userMsgContent });
    }

    setIsTyping(true);
    const assistantId = `msg-${Date.now()}`;
    let hasReceivedFirstToken = false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          messages: apiMessages,
          clientData: selectedClient
        }),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        let errorMessage = "Erro ao conectar ao assistente";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              if (!hasReceivedFirstToken) {
                hasReceivedFirstToken = true;
                setIsTyping(false);
                setStreamingMessageId(assistantId);
                setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', created_at: new Date().toISOString() }]);
              }
              assistantContent += content;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m));
            }
          } catch { /* ignore partials */ }
        }
      }

      setIsTyping(false);
      setStreamingMessageId(null);
      await saveMessage(conversationId, { role: 'assistant', content: assistantContent });
      queryClient.invalidateQueries({ queryKey: ['clients-with-conversations'] });

    } catch (error: any) {
      console.error('Chat error:', error);
      setIsTyping(false);
      setStreamingMessageId(null);
      toast({ title: 'Erro', description: error.message || 'Não foi possível conectar ao assistente', variant: 'destructive' });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'O tamanho máximo é 10MB', variant: 'destructive' });
      return;
    }

    setUploadingFile(true);
    try {
      // Converter para base64 para envio imediato (melhor reconhecimento)
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error } = await supabase.storage.from('chat-files').upload(fileName, file);
      if (error) throw error;

      const { data: signedData } = await supabase.storage.from('chat-files').createSignedUrl(fileName, 3600);
      const base64 = await base64Promise;

      setPendingFile({
        url: signedData!.signedUrl,
        type: file.type,
        name: file.name,
        base64: base64
      });

      toast({ title: 'Arquivo anexado', description: file.name });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Erro no upload', description: 'Não foi possível enviar o arquivo', variant: 'destructive' });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !pendingFile) || isLoading || !selectedClientId || isRateLimited) return;
    if (!canAccessAI) {
      toast({ title: 'Limite atingido', description: 'Você atingiu o limite de mensagens IA do seu plano', variant: 'destructive' });
      return;
    }
    if (!checkRateLimit()) return;

    sendingRef.current = true;
    const userMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: pendingFile ? `${input}\n\n[Arquivo anexado: ${pendingFile.name}]` : input,
      file_url: pendingFile?.url,
      file_type: pendingFile?.type,
      file_name: pendingFile?.name,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input;
    const fileToSend = pendingFile;
    setInput('');
    setPendingFile(null);
    setIsLoading(true);

    await streamChat(messageText, fileToSend || undefined);
    await incrementUsage('ai_messages');
    setIsLoading(false);
    focusInput();
    setTimeout(() => { sendingRef.current = false; }, 500);
  };

  const getFileIcon = (type?: string | null) => {
    if (type?.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      prospeccao: 'Prospecção', reuniao: 'Reunião', contratacao: 'Fechamento',
      producao: 'Configuração', trafego: 'Produção', retencao: 'Campanhas'
    };
    return labels[stage] || stage;
  };

  const copyToClipboard = async (messageId: string, content: string) => {
    try {
      const plainText = content.replace(/<[^>]*>/g, '');
      await navigator.clipboard.writeText(plainText);
      setCopiedMessageId(messageId);
      toast({ title: 'Copiado!' });
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    }
  };

  const handleSelectClient = (clientId: string) => {
    if (clientId !== selectedClientId) {
      setIsLoadingMessages(true);
      setMessages([]);
    }
    setSelectedClientId(clientId);
    if (isMobile) setShowClientList(false);
    setTimeout(() => {
      setIsLoadingMessages(false);
      requestAnimationFrame(() => {
        scrollToBottom(false);
        focusInput();
      });
    }, 400);
  };

  const renderClientList = () => (
    <>
      <div className="p-4 border-b border-border space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="h-9">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filtrar por fase" />
          </SelectTrigger>
          <SelectContent>
            {STAGE_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <ScrollArea className="flex-1">
        {loadingClients ? (
          <div className="p-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredClients.map(client => (
              <div key={client.id} onClick={() => handleSelectClient(client.id)} className={cn("w-full text-left p-3 rounded-lg transition-colors cursor-pointer", selectedClientId === client.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted")}>
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{client.company_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{client.contact_name}</p>
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-1 inline-block">{getStageLabel(client.current_stage)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );

  const renderChatContent = () => (
    <div className="flex flex-col bg-background h-full">
      <div className="h-14 md:h-16 px-3 md:px-4 border-b border-border bg-background flex items-center gap-2 shrink-0 sticky top-0 z-10">
        {isMobile && <Button variant="ghost" size="icon" onClick={() => setShowClientList(true)} className="shrink-0"><ArrowLeft className="h-5 w-5" /></Button>}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-gradient-to-r from-primary to-chart-5 flex items-center justify-center shrink-0"><Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" /></div>
          <div className="min-w-0">
            <h1 className="font-semibold text-sm md:text-base truncate">{selectedClient?.company_name}</h1>
            <p className="text-xs md:text-sm text-muted-foreground truncate">{selectedClient?.contact_name} • {getStageLabel(selectedClient?.current_stage || '')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden min-h-0">
        <ScrollArea className="h-full p-3 md:p-4" onScrollCapture={handleScroll}>
          <div className="space-y-4 max-w-3xl mx-auto">
            {isLoadingMessages ? <ChatMessagesSkeleton /> : (
              <>
                {messages.map((message, index) => (
                  <div key={message.id} className={cn('flex gap-2 md:gap-3 animate-fade-in group', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {message.role === 'assistant' && <QIAAvatar size={isMobile ? 28 : 32} className="shrink-0" />}
                    <div className="flex flex-col max-w-[85%] md:max-w-[80%]">
                      <div className={cn('rounded-xl px-3 py-2.5 md:px-4 md:py-3 transition-all duration-200', message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        {message.role === 'assistant' ? (
                          <div className="text-sm max-w-none [&>p]:leading-relaxed">
                            <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(markdownToHtml(message.content), SANITIZE_CONFIG) }} />
                            {streamingMessageId === message.id && <span className="inline-block w-[2px] h-4 bg-primary animate-pulse ml-0.5 align-middle" />}
                          </div>
                        ) : <p className="text-sm whitespace-pre-line">{message.content}</p>}
                        {message.file_url && (
                          <div className="mt-2">
                            {message.file_type?.startsWith('image/') ? (
                              <div className="relative rounded-lg overflow-hidden border border-border/50 max-w-xs"><img src={message.file_url} alt="Imagem" className="w-full h-auto object-cover max-h-60" /></div>
                            ) : <a href={message.file_url} target="_blank" rel="noopener noreferrer" className={cn("flex items-center gap-2 text-xs underline", message.role === 'user' ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{getFileIcon(message.file_type)}{message.file_name}</a>}
                          </div>
                        )}
                        <p className={cn('text-xs mt-2 opacity-70', message.role === 'user' ? 'text-right' : '')}>{new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      {message.role === 'assistant' && message.id !== 'welcome' && !message.id.startsWith('temp-') && streamingMessageId !== message.id && (
                        <div className={cn("flex gap-1 mt-1 ml-1 transition-opacity", isFavorited(message.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                          <button onClick={() => copyToClipboard(message.id, message.content)} className="p-1.5 rounded-md hover:bg-muted/80">{copiedMessageId === message.id ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}</button>
                          <button onClick={() => user && toggleFavorite(message.id, user.id)} disabled={isToggling} className="p-1.5 rounded-md hover:bg-muted/80"><Star className={cn("h-3.5 w-3.5", isFavorited(message.id) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground")} /></button>
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0"><User className="h-3.5 w-3.5 md:h-4 md:w-4" /></div>}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-2 md:gap-3 animate-fade-in">
                    <QIAAvatar size={isMobile ? 28 : 32} className="shrink-0" />
                    <div className="bg-muted rounded-xl px-3 py-2.5 md:px-4 md:py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{pendingFile ? 'analisando arquivo' : 'digitando'}</span>
                        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <ScrollToBottomButton visible={showScrollButton} onClick={() => { scrollToBottom(true); focusInput(); }} className="bottom-32 md:bottom-28" />
      </div>

      {pendingFile && (
        <div className="px-3 md:px-4 py-2 border-t border-border bg-muted/50">
          <div className="flex items-center gap-2 text-sm">
            {pendingFile.type.startsWith('image/') ? <div className="h-10 w-10 rounded border border-border overflow-hidden shrink-0"><img src={pendingFile.url} alt="Preview" className="w-full h-full object-cover" /></div> : getFileIcon(pendingFile.type)}
            <span className="truncate flex-1">{pendingFile.name}</span>
            <Button variant="ghost" size="sm" onClick={() => setPendingFile(null)} className="h-6 w-6 p-0"><X className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <div className="p-3 md:p-4 border-t border-border bg-background shrink-0">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="sr-only" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
          <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} className="shrink-0">{uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}</Button>
          <AutoResizeTextarea ref={inputRef} placeholder="Escreva sua mensagem..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} className="flex-1" disabled={isLoading || isTyping} maxHeight={200} />
          <Button type="button" onClick={handleSend} disabled={isLoading || isTyping || (!input.trim() && !pendingFile)} className="shrink-0"><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );

  if (subLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!hasActiveSubscription) return <SubscriptionRequired feature="o Qualify IA" />;

  return (
    <AnimatedContainer animation="fade-in" className="flex h-full">
      <div className="flex-1 flex flex-col">
        {!selectedClientId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <AnimatedContainer animation="scale-in" className="text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary/50" />
              <h3 className="text-lg font-medium">QIA</h3>
              <p className="text-sm mt-1">Selecione um cliente para iniciar uma conversa</p>
            </AnimatedContainer>
          </div>
        ) : renderChatContent()}
      </div>

      <div className={cn("border-l border-border bg-muted/30 flex flex-col transition-all duration-300", sidebarCollapsed ? "w-16" : "w-80")}>
        <div className="h-16 px-4 border-b border-border flex items-center justify-between">
          {!sidebarCollapsed && <h2 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Conversas</h2>}
          <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className={sidebarCollapsed ? "mx-auto" : ""}>{sidebarCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}</Button>
        </div>
        {!sidebarCollapsed && renderClientList()}
      </div>
    </AnimatedContainer>
  );
}