import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JOURNEY_STAGES } from '@/types';
import { cn } from '@/lib/utils';
import { Send, Sparkles, User, Bot, Loader2, RefreshCcw } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedPrompts = [
  "Como melhorar a taxa de conversão de leads para clientes?",
  "Quais são as melhores práticas para o onboarding de novos clientes?",
  "Sugira ideias de conteúdo para redes sociais de um restaurante",
  "Como estruturar uma proposta comercial irrecusável?",
  "Quais perguntas fazer na reunião de diagnóstico?"
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou o assistente de marketing do Qualify com mais de 20 anos de experiência. Como posso ajudar você hoje?\n\nPosso auxiliar com:\n• Estratégias para cada fase da jornada do cliente\n• Ideias de conteúdo para redes sociais\n• Técnicas de qualificação e vendas\n• Melhores práticas de onboarding\n• Análise de pipeline e otimização',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('conversão') || lowerMessage.includes('converter')) {
      return `📈 **Estratégias para Aumentar Conversão:**\n\n**1. Reduza o Tempo de Resposta**\nLeads respondidos em menos de 5 minutos têm 21x mais chance de conversão. Configure alertas automáticos.\n\n**2. Use Prova Social**\nInclua 2-3 depoimentos de clientes similares em cada proposta. Cases do mesmo setor convertem 35% mais.\n\n**3. Crie Urgência Genuína**\nOfertas limitadas por tempo ou vagas funcionam. "Só tenho 2 vagas disponíveis este mês" é mais efetivo que descontos.\n\n**4. Follow-up Estruturado**\n- 1º follow-up: 24h após proposta\n- 2º follow-up: 72h (com conteúdo de valor)\n- 3º follow-up: 7 dias (última chance)\n\n**5. Qualifique Melhor com BANT**\nLeads com score BANT acima de 80% têm 4x mais chance de fechar.`;
    }
    
    if (lowerMessage.includes('onboarding')) {
      return `🚀 **Melhores Práticas de Onboarding:**\n\n**Primeiras 24 horas:**\n• Envie e-mail de boas-vindas personalizado\n• Compartilhe cronograma das próximas 2 semanas\n• Colete todos os acessos (formulário único)\n\n**Primeira Semana:**\n• Reunião de kick-off (máx. 45 min)\n• Defina 3 KPIs principais juntos\n• Publique primeiro conteúdo\n• Envie relatório "Ponto de Partida"\n\n**Primeiro Mês:**\n• Relatórios semanais nas primeiras 4 semanas\n• Check-in de 15 min na semana 2\n• Ajustes de estratégia conforme feedback\n\n**Dica de Ouro:** Clientes que recebem valor nas primeiras 72h têm 80% mais chance de renovar o contrato.`;
    }
    
    if (lowerMessage.includes('conteúdo') || lowerMessage.includes('redes sociais') || lowerMessage.includes('restaurante')) {
      return `🍽️ **Ideias de Conteúdo para Restaurante:**\n\n**Reels/TikTok (Alto Engajamento):**\n1. "Como fazemos nosso prato mais pedido" (bastidores)\n2. "Transformação: cozinha vazia → mesa cheia"\n3. "POV: você é o chef por um dia"\n4. "O segredo do nosso tempero especial"\n\n**Feed Instagram:**\n• Fotos profissionais dos pratos (2x/semana)\n• Depoimentos de clientes (1x/semana)\n• Equipe em ação (humanização)\n\n**Stories Diários:**\n• Prato do dia\n• Enquete: "Qual sabor você prefere?"\n• Contagem regressiva para novidades\n• Repost de clientes\n\n**Calendário Sugerido:**\n- Segunda: Dica de harmonização\n- Quarta: Bastidores\n- Sexta: Promoção fim de semana\n- Sábado: UGC (conteúdo dos clientes)`;
    }
    
    if (lowerMessage.includes('proposta')) {
      return `📝 **Estrutura de Proposta Irrecusável:**\n\n**1. Capa Impactante**\n"Proposta para [Nome da Empresa] alcançar [Resultado Específico]"\n\n**2. Diagnóstico (1 página)**\n• Resumo da situação atual (dores identificadas)\n• O que está custando não resolver isso\n• Oportunidade identificada\n\n**3. Solução (2 páginas)**\n• O que vamos fazer (escopo claro)\n• Como vamos fazer (metodologia)\n• Cronograma visual\n• Resultados esperados com números\n\n**4. Prova Social (1 página)**\n• 2-3 cases de clientes similares\n• Depoimento em destaque\n• Números concretos de resultado\n\n**5. Investimento**\n• 3 opções (Bronze, Prata, Ouro)\n• Opção do meio como âncora\n• Bônus por decisão rápida\n\n**6. Próximos Passos**\n• CTA claro: "Para iniciar, basta..."\n• Prazo de validade (7 dias)`;
    }
    
    if (lowerMessage.includes('reunião') || lowerMessage.includes('diagnóstico') || lowerMessage.includes('perguntas')) {
      return `🎯 **Perguntas Poderosas para Diagnóstico (SPIN):**\n\n**Situação (entender contexto):**\n• "Conte-me sobre o marketing atual da empresa"\n• "Quem é responsável pelas redes sociais hoje?"\n• "Qual o investimento mensal atual em marketing?"\n\n**Problema (identificar dores):**\n• "Qual o maior desafio de marketing hoje?"\n• "O que já tentaram que não funcionou?"\n• "Como os concorrentes estão se posicionando?"\n\n**Implicação (criar urgência):**\n• "O que acontece se continuar assim por mais 6 meses?"\n• "Quanto em faturamento estima perder por mês?"\n• "Como isso afeta o moral da equipe?"\n\n**Necessidade (mostrar solução):**\n• "Se pudéssemos resolver X, qual seria o impacto?"\n• "O que significaria ter Y resultados?"\n• "Como seria seu marketing ideal?"\n\n**Dica:** Deixe o cliente falar 70% do tempo. Sua função é fazer as perguntas certas.`;
    }
    
    // Resposta padrão
    return `Excelente pergunta! Como especialista em marketing digital com mais de 20 anos de experiência, posso te ajudar com isso.\n\n**Algumas orientações gerais:**\n\n1. **Foco no Cliente:** Sempre coloque as necessidades do cliente no centro de qualquer estratégia\n\n2. **Dados são Rei:** Tome decisões baseadas em métricas, não em achismos\n\n3. **Teste Constantemente:** O que funciona para um cliente pode não funcionar para outro\n\n4. **Consistência:** Resultados em marketing vêm da consistência, não de ações isoladas\n\nPode me dar mais detalhes sobre sua situação específica? Assim posso oferecer orientações mais direcionadas para o seu caso.`;
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      const response = generateResponse(input);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-8 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-primary to-chart-5 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              Assistente de IA
            </h1>
            <p className="text-muted-foreground mt-1">Seu especialista em marketing com 20+ anos de experiência</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setMessages([messages[0]])}
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Nova Conversa
          </Button>
        </div>

        {/* Stage Filter */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedStage === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStage(null)}
          >
            Geral
          </Button>
          {JOURNEY_STAGES.map((stage) => (
            <Button
              key={stage.id}
              variant={selectedStage === stage.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStage(stage.id)}
            >
              {stage.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 space-y-4">
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
              <p className="text-sm whitespace-pre-line">{message.content}</p>
              <p className={cn(
                'text-xs mt-2 opacity-70',
                message.role === 'user' ? 'text-right' : ''
              )}>
                {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {message.role === 'user' && (
              <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-primary to-chart-5 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="bg-muted rounded-xl px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length <= 1 && (
        <div className="px-8 py-4">
          <p className="text-sm text-muted-foreground mb-3">Sugestões:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedPrompt(prompt)}
                className="text-xs bg-muted hover:bg-accent px-3 py-2 rounded-lg transition-colors text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-8 pt-4 border-t border-border">
        <div className="flex gap-3">
          <Input
            placeholder="Pergunte sobre estratégias, ideias de conteúdo, vendas..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
