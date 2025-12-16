import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, GraduationCap, Sparkles, BookOpen, Clock, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { markdownToHtml } from '@/lib/markdown-to-html';

interface StudySuggestion {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty_level: string | null;
  source: string | null;
  ai_generated: boolean;
  created_at: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

export default function Academia() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSuggestions, setGeneratedSuggestions] = useState<string | null>(null);

  // Fetch study suggestions history
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['study-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_suggestions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StudySuggestion[];
    }
  });

  const generateStudySuggestions = async () => {
    setIsGenerating(true);
    setGeneratedSuggestions(null);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Como assistente de marketing especializado, analise as dificuldades comuns que equipes de agências de marketing digital enfrentam durante o processo com clientes e gere 5 sugestões de estudo prioritárias.

Considere áreas como:
- Gestão de redes sociais (Facebook, Instagram, TikTok)
- Criação de conteúdo
- Tráfego pago e campanhas
- Atendimento ao cliente
- Análise de métricas e resultados
- Fechamento de vendas e propostas
- Retenção de clientes

Para cada sugestão, forneça:
1. Título claro e objetivo
2. Descrição do que estudar e por quê
3. Categoria (vendas, marketing, atendimento, técnico, gestão)
4. Nível de dificuldade (beginner, intermediate, advanced)

Formato de resposta:
**Sugestão 1: [Título]**
Descrição: [texto]
Categoria: [categoria]
Nível: [nível]

(repita para as 5 sugestões)`
            }
          ],
          clientData: {
            company_name: "Onix Agence",
            context: "academia_estudo"
          }
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to generate suggestions");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullContent = "";

      while (true) {
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
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullContent += content;
          } catch { /* ignore */ }
        }
      }

      setGeneratedSuggestions(fullContent);

      // Parse and save suggestions to database
      const suggestionRegex = /\*\*Sugestão \d+: (.+?)\*\*\s*\nDescrição: (.+?)\nCategoria: (.+?)\nNível: (.+?)(?=\n\n|\n\*\*|$)/gs;
      let match;
      const parsedSuggestions = [];

      while ((match = suggestionRegex.exec(fullContent)) !== null) {
        parsedSuggestions.push({
          title: match[1].trim(),
          description: match[2].trim(),
          category: match[3].trim().toLowerCase(),
          difficulty_level: match[4].trim().toLowerCase(),
          source: 'ai_analysis',
          ai_generated: true,
        });
      }

      if (parsedSuggestions.length > 0) {
        const { error } = await supabase
          .from('study_suggestions')
          .insert(parsedSuggestions);

        if (error) throw error;
        
        queryClient.invalidateQueries({ queryKey: ['study-suggestions'] });
        toast({ title: 'Sugestões salvas!', description: `${parsedSuggestions.length} novas sugestões de estudo foram adicionadas.` });
      }

    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar sugestões de estudo', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            Academia
          </h1>
          <p className="text-muted-foreground mt-1">
            Sugestões de estudo para a equipe se destacar no mercado
          </p>
        </div>
        <Button 
          onClick={generateStudySuggestions} 
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Gerar Novas Sugestões
            </>
          )}
        </Button>
      </div>

      {/* AI Generated Content */}
      {isGenerating && (
        <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-chart-5/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-primary to-chart-5 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold">Analisando dificuldades da equipe...</h3>
                <p className="text-sm text-muted-foreground">O assistente está gerando sugestões personalizadas</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Escrevendo...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {generatedSuggestions && !isGenerating && (
        <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-chart-5/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Sugestões Geradas
            </CardTitle>
            <CardDescription>
              Baseadas nas dificuldades comuns identificadas durante o processo com clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="prose prose-sm max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(generatedSuggestions) }}
            />
          </CardContent>
        </Card>
      )}

      {/* Suggestions History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Histórico de Sugestões
          </CardTitle>
          <CardDescription>
            Todas as sugestões de estudo geradas anteriormente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma sugestão de estudo ainda</p>
              <p className="text-sm mt-1">Clique em "Gerar Novas Sugestões" para começar</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {suggestions.map((suggestion) => (
                  <div 
                    key={suggestion.id}
                    className="p-4 border border-border rounded-lg hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{suggestion.title}</h3>
                        {suggestion.description && (
                          <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant="outline" className="text-xs">
                            {suggestion.category}
                          </Badge>
                          {suggestion.difficulty_level && (
                            <Badge className={`text-xs ${DIFFICULTY_COLORS[suggestion.difficulty_level] || 'bg-muted text-muted-foreground'}`}>
                              {DIFFICULTY_LABELS[suggestion.difficulty_level] || suggestion.difficulty_level}
                            </Badge>
                          )}
                          {suggestion.ai_generated && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Sparkles className="h-3 w-3" />
                              IA
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatDate(suggestion.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
