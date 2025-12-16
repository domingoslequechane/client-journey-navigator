import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Send, Sparkles, User, Bot, Loader2, Paperclip, FileText, Image as ImageIcon, X, Building2, Search, Filter, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { markdownToHtml } from '@/lib/markdown-to-html';

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
  last_message?: string;
  last_message_at?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const STAGE_OPTIONS = [
  { value: 'all', label: 'Todas as fases' },
  { value: 'prospeccao', label: 'Prospecção' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'contratacao', label: 'Contratação' },
  { value: 'producao', label: 'Produção' },
  { value: 'trafego', label: 'Tráfego' },
  { value: 'retencao', label: 'Retenção' },
];

export default function AIAssistant() {
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ url: string; type: string; name: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch clients with their conversations
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients-with-conversations'],
    queryFn: async () => {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, company_name, contact_name, current_stage, qualification, email, phone, monthly_budget, paid_traffic_budget, services, notes, bant_budget, bant_authority, bant_need, bant_timeline')
        .order('updated_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Get conversations for each client
      const { data: conversations, error: convError } = await supabase
        .from('ai_conversations')
        .select('id, client_id, updated_at')
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      // Map clients with their conversations (without last message)
      return (clientsData || []).map(client => {
        const conv = conversations?.find(c => c.client_id === client.id);
        return {
          ...client,
          conversation_id: conv?.id,
        };
      }) as ClientWithConversation[];
    }
  });

  // Filter clients based on search and stage
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.contact_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = filterStage === 'all' || client.current_stage === filterStage;
    return matchesSearch && matchesStage;
  });

  // Get selected client
  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Fetch messages for selected conversation
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

  // Update local messages when conversation changes
  useEffect(() => {
    if (selectedClient?.conversation_id) {
      setMessages(conversationMessages);
    } else if (selectedClientId && selectedClient) {
      // New conversation - show welcome message with full client context
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Olá! Sou o assistente de marketing do Qualify. Estou aqui para ajudar com o cliente **${selectedClient.company_name}**.\n\n**Contexto do Cliente:**\n- Contato: ${selectedClient.contact_name}\n- Fase atual: ${getStageLabel(selectedClient.current_stage)}\n- Qualificação: ${selectedClient.qualification}\n- Orçamento mensal: ${selectedClient.monthly_budget ? `${selectedClient.monthly_budget.toLocaleString()} MT` : 'Não informado'}\n\nComo posso auxiliar hoje?`,
        created_at: new Date().toISOString()
      }]);
    } else {
      setMessages([]);
    }
  }, [selectedClient?.conversation_id, conversationMessages, selectedClientId, selectedClient?.company_name]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Create or get conversation
  const getOrCreateConversation = async (clientId: string): Promise<string> => {
    const { data: existing } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('client_id', clientId)
      .single();

    if (existing) return existing.id;

    const { data: newConv, error } = await supabase
      .from('ai_conversations')
      .insert({ client_id: clientId })
      .select('id')
      .single();

    if (error) throw error;
    return newConv.id;
  };

  // Save message to database
  const saveMessage = async (conversationId: string, message: Omit<Message, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        file_url: message.file_url,
        file_type: message.file_type,
        file_name: message.file_name
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const streamChat = async (userMessage: string, fileInfo?: { url: string; type: string; name: string }) => {
    if (!selectedClientId || !selectedClient) return;

    const conversationId = await getOrCreateConversation(selectedClientId);

    // Save user message
    const userMsgContent = fileInfo 
      ? `${userMessage}\n\n[Arquivo anexado: ${fileInfo.name}]`
      : userMessage;

    await saveMessage(conversationId, {
      role: 'user',
      content: userMsgContent,
      file_url: fileInfo?.url,
      file_type: fileInfo?.type,
      file_name: fileInfo?.name
    });

    // Build messages for API
    const apiMessages = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }));
    
    apiMessages.push({ role: 'user', content: userMsgContent });

    // Show typing animation
    setIsTyping(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: apiMessages,
          clientData: {
            company_name: selectedClient.company_name,
            contact_name: selectedClient.contact_name,
            current_stage: selectedClient.current_stage,
            qualification: selectedClient.qualification,
            email: selectedClient.email,
            phone: selectedClient.phone,
            monthly_budget: selectedClient.monthly_budget,
            paid_traffic_budget: selectedClient.paid_traffic_budget,
            services: selectedClient.services,
            notes: selectedClient.notes,
            bant_budget: selectedClient.bant_budget,
            bant_authority: selectedClient.bant_authority,
            bant_need: selectedClient.bant_need,
            bant_timeline: selectedClient.bant_timeline
          }
        }),
      });

      if (resp.status === 429) {
        toast({ title: 'Limite excedido', description: 'Tente novamente em alguns minutos', variant: 'destructive' });
        setIsTyping(false);
        return;
      }
      if (resp.status === 402) {
        toast({ title: 'Créditos insuficientes', description: 'Adicione créditos à sua conta', variant: 'destructive' });
        setIsTyping(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        throw new Error("Failed to start stream");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
            }
          } catch { /* ignore */ }
        }
      }

      // Hide typing animation and show complete message
      setIsTyping(false);
      
      // Add complete assistant message to UI
      const assistantId = `msg-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: assistantContent,
        created_at: new Date().toISOString()
      }]);

      // Save assistant message to database
      await saveMessage(conversationId, {
        role: 'assistant',
        content: assistantContent
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['clients-with-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });

    } catch (error) {
      console.error('Chat error:', error);
      setIsTyping(false);
      toast({ title: 'Erro', description: 'Não foi possível conectar ao assistente', variant: 'destructive' });
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      setPendingFile({
        url: publicUrl,
        type: file.type,
        name: file.name
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
    if ((!input.trim() && !pendingFile) || isLoading || !selectedClientId) return;

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
    setIsLoading(false);
  };

  const getFileIcon = (type?: string | null) => {
    if (type?.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      prospeccao: 'Prospecção',
      reuniao: 'Reunião',
      contratacao: 'Contratação',
      producao: 'Produção',
      trafego: 'Tráfego',
      retencao: 'Retenção'
    };
    return labels[stage] || stage;
  };

  return (
    <div className="flex h-full">
      {/* Chat Area - Center */}
      <div className="flex-1 flex flex-col">
        {!selectedClientId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary/50" />
              <h3 className="text-lg font-medium">Assistente de IA</h3>
              <p className="text-sm mt-1">Selecione um cliente para iniciar uma conversa</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border bg-background">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-primary to-chart-5 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-semibold">{selectedClient?.company_name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {selectedClient?.contact_name} • {getStageLabel(selectedClient?.current_stage || '')}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-primary to-chart-5 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-xl px-4 py-3',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <div 
                          className="text-sm prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: markdownToHtml(message.content) }}
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                      )}
                      {message.file_url && (
                        <a 
                          href={message.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-2 mt-2 text-xs underline",
                            message.role === 'user' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          )}
                        >
                          {getFileIcon(message.file_type)}
                          {message.file_name}
                        </a>
                      )}
                      <p className={cn(
                        'text-xs mt-2 opacity-70',
                        message.role === 'user' ? 'text-right' : ''
                      )}>
                        {new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing Animation */}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-primary to-chart-5 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Pending File */}
            {pendingFile && (
              <div className="px-4 py-2 border-t border-border bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                  {getFileIcon(pendingFile.type)}
                  <span className="truncate flex-1">{pendingFile.name}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setPendingFile(null)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2 max-w-3xl mx-auto">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                >
                  {uploadingFile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
                <Input
                  placeholder="Escreva sua mensagem..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  className="flex-1"
                  disabled={isLoading || isTyping}
                />
                <Button onClick={handleSend} disabled={isLoading || isTyping || (!input.trim() && !pendingFile)}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Clients Sidebar - Right */}
      <div className={cn(
        "border-l border-border bg-muted/30 flex flex-col transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-80"
      )}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            {!sidebarCollapsed && (
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Conversas por Cliente
              </h2>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={sidebarCollapsed ? "mx-auto" : ""}
            >
              {sidebarCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
            </Button>
          </div>
          
          {!sidebarCollapsed && (
            <>
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              
              {/* Filter */}
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="h-9">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filtrar por fase" />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        
        <ScrollArea className="flex-1">
          {loadingClients ? (
            <div className="p-4 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {sidebarCollapsed ? '' : 'Nenhum cliente encontrado'}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors",
                    selectedClientId === client.id 
                      ? "bg-primary/10 border border-primary/20" 
                      : "hover:bg-muted",
                    sidebarCollapsed && "flex items-center justify-center"
                  )}
                  title={sidebarCollapsed ? client.company_name : undefined}
                >
                  {sidebarCollapsed ? (
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-sm">
                        {client.company_name.charAt(0)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{client.company_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{client.contact_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {getStageLabel(client.current_stage)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
