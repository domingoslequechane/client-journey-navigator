import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, GraduationCap, Sparkles, BookOpen, Clock, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AnimatedContainer } from '@/components/ui/animated-container';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  iniciante: 'bg-green-100 text-green-800',
  intermediário: 'bg-yellow-100 text-yellow-800',
  avançado: 'bg-red-100 text-red-800',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
  iniciante: 'Iniciante',
  intermediário: 'Intermediário',
  avançado: 'Avançado',
};

export default function Academia() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestionToDelete, setSuggestionToDelete] = useState<StudySuggestion | null>(null);

  // Fetch study suggestions history
  const { data: suggestions = [], isLoading, refetch } = useQuery({
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

  const parseSuggestions = (content: string) => {
    const suggestions = [];
    
    // Try different patterns to extract suggestions
    const patterns = [
      // Pattern 1: **Sugestão X: Title**
      /\*{0,2}Sugestão\s*\d+[:\s]+([^\n*]+)\*{0,2}\s*\n+(?:Descrição[:\s]*)?([^\n]+(?:\n(?!Categoria|Nível|Sugestão)[^\n]+)*)\s*\n*(?:Categoria[:\s]*)?([^\n]+)\s*\n*(?:Nível[:\s]*)?([^\n]+)/gi,
      // Pattern 2: numbered list
      /(\d+)\.\s*\*{0,2}([^\n*]+)\*{0,2}\s*\n+([^\n]+(?:\n(?!\d+\.)[^\n]+)*)/gi,
    ];

    // First pattern
    let regex = /Sugestão\s*\d+[:\s.]*\*{0,2}([^\n*]+)\*{0,2}\s*\n+(?:Descrição[:\s]*)?([^\n]+)/gi;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const title = match[1].replace(/\*+/g, '').trim();
      const description = match[2].replace(/\*+/g, '').trim();
      
      // Try to find category and level after the match
      const afterMatch = content.slice(match.index + match[0].length, match.index + match[0].length + 200);
      
      const categoryMatch = afterMatch.match(/Categoria[:\s]*([^\n]+)/i);
      const levelMatch = afterMatch.match(/Nível[:\s]*([^\n]+)/i);
      
      suggestions.push({
        title,
        description,
        category: categoryMatch ? categoryMatch[1].trim().toLowerCase() : 'marketing',
        difficulty_level: levelMatch ? levelMatch[1].trim().toLowerCase() : 'intermediate',
        source: 'ai_analysis',
        ai_generated: true,
      });
    }

    // If no matches found, try a simpler approach
    if (suggestions.length === 0) {
      const lines = content.split('\n').filter(l => l.trim());
      let currentSuggestion: any = null;
      
      for (const line of lines) {
        const cleanLine = line.replace(/\*+/g, '').trim();
        
        if (cleanLine.match(/^(Sugestão\s*\d+|\d+\.)/i)) {
          if (currentSuggestion && currentSuggestion.title) {
            suggestions.push(currentSuggestion);
          }
          const titleMatch = cleanLine.match(/(?:Sugestão\s*\d+[:\s.]*|\d+\.\s*)(.+)/i);
          currentSuggestion = {
            title: titleMatch ? titleMatch[1].trim() : cleanLine,
            description: '',
            category: 'marketing',
            difficulty_level: 'intermediate',
            source: 'ai_analysis',
            ai_generated: true,
          };
        } else if (currentSuggestion) {
          if (cleanLine.toLowerCase().startsWith('descrição')) {
            currentSuggestion.description = cleanLine.replace(/^descrição[:\s]*/i, '').trim();
          } else if (cleanLine.toLowerCase().startsWith('categoria')) {
            currentSuggestion.category = cleanLine.replace(/^categoria[:\s]*/i, '').trim().toLowerCase();
          } else if (cleanLine.toLowerCase().startsWith('nível')) {
            currentSuggestion.difficulty_level = cleanLine.replace(/^nível[:\s]*/i, '').trim().toLowerCase();
          } else if (!currentSuggestion.description && cleanLine.length > 10) {
            currentSuggestion.description = cleanLine;
          }
        }
      }
      
      if (currentSuggestion && currentSuggestion.title) {
        suggestions.push(currentSuggestion);
      }
    }

    return suggestions;
  };

  const generateStudySuggestions = async () => {
    setIsGenerating(true);

    try {
      // Get session token for authenticated request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Você precisa estar logado para gerar sugestões");
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
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

Para cada sugestão, forneça no formato EXATO abaixo:

Sugestão 1: [Título aqui]
Descrição: [Descrição detalhada do que estudar]
Categoria: [vendas/marketing/atendimento/técnico/gestão]
Nível: [iniciante/intermediário/avançado]

Sugestão 2: [Título aqui]
Descrição: [Descrição detalhada]
Categoria: [categoria]
Nível: [nível]

(Continue para as 5 sugestões)`
            }
          ],
          clientData: {
            company_name: "Onix Agence",
            context: "academia_estudo"
          }
        }),
      });

      if (resp.status === 429) {
        throw new Error("Limite de requisições excedido. Tente novamente em alguns minutos.");
      }
      if (resp.status === 402) {
        throw new Error("Créditos insuficientes. Adicione créditos à sua conta.");
      }
      if (!resp.ok || !resp.body) {
        throw new Error("Falha ao gerar sugestões");
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

      // Parse and save suggestions to database
      const parsedSuggestions = parseSuggestions(fullContent);

      console.log('Parsed suggestions:', parsedSuggestions);

      if (parsedSuggestions.length > 0) {
        const { error } = await supabase
          .from('study_suggestions')
          .insert(parsedSuggestions);

        if (error) {
          console.error('Error saving suggestions:', error);
          throw error;
        }
        
        await refetch();
        toast({ title: 'Sugestões salvas!', description: `${parsedSuggestions.length} novas sugestões de estudo foram adicionadas ao histórico.` });
      } else {
        toast({ title: 'Sugestões geradas', description: 'As sugestões foram geradas mas não puderam ser salvas automaticamente.' });
      }

    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar sugestões de estudo', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteSuggestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('study_suggestions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await refetch();
      toast({ title: 'Sugestão removida', description: 'A sugestão de estudo foi removida do histórico.' });
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      toast({ title: 'Erro', description: 'Não foi possível remover a sugestão', variant: 'destructive' });
    } finally {
      setSuggestionToDelete(null);
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
      <AnimatedContainer animation="fade-up" className="flex items-center justify-between mb-6">
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
      </AnimatedContainer>

      {/* AI Generated Content */}
      {isGenerating && (
        <AnimatedContainer animation="scale-in">
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
        </AnimatedContainer>
      )}


      {/* Suggestions History */}
      <AnimatedContainer animation="fade-up" delay={0.2} className="w-full">
      <Card className="w-full">
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
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">{suggestion.title}</h3>
                        {suggestion.description && (
                          <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
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
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(suggestion.created_at)}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setSuggestionToDelete(suggestion)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      </AnimatedContainer>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!suggestionToDelete} onOpenChange={() => setSuggestionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover sugestão de estudo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a sugestão "{suggestionToDelete?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => suggestionToDelete && deleteSuggestion(suggestionToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
