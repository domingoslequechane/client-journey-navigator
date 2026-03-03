"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Sparkles, Loader2, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { ChatMessagesSkeleton } from '@/components/ai/ChatMessagesSkeleton';
import { ScrollToBottomButton } from '@/components/ai/ScrollToBottomButton';
import { toast } from '@/hooks/use-toast';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import { useRateLimit } from '@/hooks/useRateLimit';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useSubscription } from '@/hooks/useSubscription';
import { useMessageFavorites } from '@/hooks/useMessageFavorites';
import { useDraft } from '@/hooks/useDraft';
import { SubscriptionRequired } from '@/components/subscription/SubscriptionRequired';
import { useAuth } from '@/contexts/AuthContext';

// Modular Components
import { Message, ClientWithConversation, PendingFile } from '@/components/ai/types';
import { MessageItem } from '@/components/ai/MessageItem';
import { ChatHeader } from '@/components/ai/ChatHeader';
import { ChatInput } from '@/components/ai/ChatInput';
import { FilePreview } from '@/components/ai/FilePreview';
import { ClientSidebar } from '@/components/ai/ClientSidebar';
import QIAAvatar from '@/components/ai/QIAAvatar';

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
  const { canAccessAI, incrementUsage, usage, limits } = usePlanLimits();
  const { hasActiveSubscription, loading: subLoading } = useSubscription();
  const { isFavorited, toggleFavorite, isToggling } = useMessageFavorites(organizationId);
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const { value: input, setValue: setInput } = useDraft({
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
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
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

  const { data: conversationMessages = [] } = useQuery({
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

  const streamChat = async (userMessage: string, fileInfo?: PendingFile) => {
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

    const apiMessages = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }));
    
    if (fileInfo?.type.startsWith('image/') && fileInfo.base64) {
      apiMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: userMessage },
          { type: 'image_url', image_url: { url: fileInfo.base64 } }
        ]
      } as any);
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
      if (event.target) event.target.value = '';
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
    
    setTimeout(() => { sendingRef.current = false; }, 500);
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      prospeccao: 'Prospecção', reuniao: 'Reunião', contratacao: 'Fechamento',
      producao: 'Configuração', trafego: 'Produção', retencao: 'Campanhas'
    };
    return labels[stage] || stage;
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
      });
    }, 400);
  };

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
        ) : (
          <div className="flex flex-col bg-background h-full">
            <ChatHeader 
              client={selectedClient} 
              isMobile={isMobile} 
              onBack={handleBackToClientList} 
              getStageLabel={getStageLabel} 
            />

            <div className="flex-1 relative overflow-hidden min-h-0">
              <ScrollArea className="h-full p-3 md:p-4" onScrollCapture={handleScroll}>
                <div className="space-y-4 max-w-3xl mx-auto">
                  {isLoadingMessages ? <ChatMessagesSkeleton /> : (
                    <>
                      {messages.map((message) => (
                        <MessageItem
                          key={message.id}
                          message={message}
                          isMobile={isMobile}
                          isStreaming={streamingMessageId === message.id}
                          isFavorited={isFavorited(message.id)}
                          isTogglingFavorite={isToggling}
                          copiedMessageId={copiedMessageId}
                          onCopy={copyToClipboard}
                          onToggleFavorite={(id) => user && toggleFavorite(id, user.id)}
                        />
                      ))}
                      {isTyping && (
                        <div className="flex gap-2 md:gap-3 animate-fade-in">
                          <QIAAvatar size={isMobile ? 28 : 32} className="shrink-0" />
                          <div className="bg-muted rounded-xl px-3 py-2.5 md:px-4 md:py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{pendingFile ? 'analisando arquivo' : 'digitando'}</span>
                              <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" />
                                <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <ScrollToBottomButton visible={showScrollButton} onClick={() => scrollToBottom(true)} className="bottom-32 md:bottom-28" />
            </div>

            <FilePreview file={pendingFile} onRemove={() => setPendingFile(null)} />

            <ChatInput 
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              isTyping={isTyping}
              isUploading={uploadingFile}
              onSend={handleSend}
              onFileUpload={handleFileUpload}
            />
          </div>
        )}
      </div>

      <div className={cn("border-l border-border bg-muted/30 flex flex-col transition-all duration-300", sidebarCollapsed ? "w-16" : "w-80")}>
        <div className="h-16 px-4 border-b border-border flex items-center justify-between">
          {!sidebarCollapsed && <h2 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Conversas</h2>}
          <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className={sidebarCollapsed ? "mx-auto" : ""}>
            {sidebarCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
          </Button>
        </div>
        
        {!sidebarCollapsed && limits.maxAIMessagesPerMonth !== null && (
          <div className="p-4 border-b border-border">
            <div className="text-xs text-muted-foreground mb-2">Uso de IA este mês</div>
            <div className="flex items-center gap-3">
              <Progress
                value={(usage.aiMessagesThisMonth / (limits.maxAIMessagesPerMonth || 1)) * 100}
                className="w-full"
              />
              <span className="text-xs font-mono text-muted-foreground shrink-0">
                {usage.aiMessagesThisMonth}/{limits.maxAIMessagesPerMonth}
              </span>
            </div>
          </div>
        )}

        {!sidebarCollapsed && (
          <ClientSidebar 
            clients={filteredClients}
            loadingClients={loadingClients}
            selectedClientId={selectedClientId}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStage={filterStage}
            setFilterStage={setFilterStage}
            onSelectClient={handleSelectClient}
            getStageLabel={getStageLabel}
            stageOptions={STAGE_OPTIONS}
          />
        )}
      </div>
    </AnimatedContainer>
  );
}