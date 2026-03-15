import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, GraduationCap, Sparkles, BookOpen, Clock, Trash2, ChevronLeft, ChevronRight, BrainCircuit, Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { usePagination } from '@/hooks/usePagination';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTitle as AlertDialogTitleComponent,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useHeader } from '@/contexts/HeaderContext';

interface StudySuggestion {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty_level: string | null;
  source: string | null;
  ai_generated: boolean;
  created_at: string;
  user_id: string | null;
  completed: boolean;
}

const CHAT_URL = `https://hrarkpjuchrbffnrhzcy.supabase.co/functions/v1/chat`;

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
  iniciante: 'bg-green-100 text-green-800',
  intermediário: 'bg-yellow-100 text-yellow-800',
  avançado: 'bg-red-100 text-red-800',
};

const PRIVILEGE_MAP: Record<string, string> = {
  admin: 'navigation.settings',
  sales: 'navigation.salesFunnel',
  operations: 'navigation.operationalFlow',
  clients: 'navigation.clients',
  campaign_management: 'navigation.pipeline',
  finance: 'navigation.finance',
  academy: 'navigation.academy',
  team: 'navigation.team',
  studio: 'navigation.studio',
};

export default function Academia() {
  const { t, i18n } = useTranslation('academia');
  const { t: tCommon } = useTranslation('common');
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestionToDelete, setSuggestionToDelete] = useState<StudySuggestion | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<StudySuggestion | null>(null);
  const [newDifficulty, setNewDifficulty] = useState('');
  const [isUpdatingDifficulties, setIsUpdatingDifficulties] = useState(false);
  const { setBackAction, setCustomTitle, setCustomIcon, setRightAction } = useHeader();

  // Fetch user profile for difficulties and privileges
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['user-profile-academy'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, organization_id, privileges, difficulties')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as any; // Cast to any to avoid TS errors with the new column
    }
  });

  // Fetch study suggestions history filtered by user
  const { data: suggestions = [], isLoading, refetch } = useQuery({
    queryKey: ['study-suggestions', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('study_suggestions')
        .select('*')
        .eq('user_id', profile?.id)
        .order('completed', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[] as StudySuggestion[];
    }
  });

  // Pagination
  const {
    currentPage,
    totalPages,
    paginatedData,
    nextPage,
    prevPage,
    isFirstPage,
    isLastPage,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination<StudySuggestion>({ data: suggestions, itemsPerPage: 10 });

  const parseSuggestions = (content: string) => {
    const suggestions = [];

    // First pattern
    let regex = /Sugestão\s*\d+[:\s.]*\*{0,2}([^\n*]+)\*{0,2}\s*\n+(?:Descrição[:\s]*)?([^\n]+)/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const title = match[1].replace(/\*+/g, '').trim();
      const description = match[2].replace(/\*+/g, '').trim();

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Você precisa estar logado para gerar sugestões");
      }

      if (!profile?.organization_id) {
        throw new Error("Organização não encontrada");
      }

      const userPrivileges = profile?.privileges?.map((p: string) => tCommon(PRIVILEGE_MAP[p] || p)).join(', ') || tCommon('status.none');
      const userDifficulties = profile?.difficulties?.join(', ') || t('difficulties.empty');

      const isEnglish = i18n.language.startsWith('en');

      const ptPrompt = `Como assistente de marketing especializado (QIA), analise o perfil do colaborador abaixo e gere 5 sugestões de estudo prioritárias e personalizadas.

Perfil do Colaborador:
- Privilégios/Áreas de Atuação: ${userPrivileges}
- Dificuldades Atuais: ${userDifficulties}
${suggestions.filter(s => s.completed).length > 0 ? `- Estudos JÁ CONCLUÍDOS (não repetir estes temas): ${suggestions.filter(s => s.completed).map(s => s.title).join(', ')}` : ''}
${suggestions.filter(s => !s.completed).length > 0 ? `- Estudos Sugeridos Anteriormente: ${suggestions.filter(s => !s.completed).map(s => s.title).join(', ')}` : ''}

REGRAS DE INTELIGÊNCIA PROATIVA:
1. Se dificuldades específicas foram listadas, coloque-as como prioridade máxima.
2. CASO o usuário NÃO tenha informado dificuldades específicas, você deve ser inteligente o suficiente para IDENTIFICAR GARGALOS e gargalos potenciais baseados em suas áreas de atuação (${userPrivileges}). 
3. Identifique o que esse perfil precisa dominar para ser um profissional de elite na sua função, focando em produtividade, tendências de mercado e otimização de processos.
4. EVITE repetir temas que já foram sugeridos ou concluídos. Se for necessário tocar em um tema similar, garanta que seja um APROFUNDAMENTO (Nível superior).

Para cada sugestão, forneça no formato EXATO abaixo:

Sugestão 1: [Título aqui]
Descrição: [Descrição detalhada do porquê dominar este tema removerá um gargalo ou melhorará a eficiência]
Categoria: [vendas/marketing/atendimento/técnico/gestão]
Nível: [iniciante/intermediário/avançado]

Sugestão 2: [Título aqui]
Descrição: [Descrição detalhada]
Categoria: [categoria]
Nível: [nível]

(Continue para as 5 sugestões)`;

      const enPrompt = `As a specialized marketing assistant (QIA), analyze the employee profile below and generate 5 priority and personalized study suggestions.

Employee Profile:
- Privileges/Areas of Action: ${userPrivileges}
- Current Difficulties: ${userDifficulties}
${suggestions.filter(s => s.completed).length > 0 ? `- ALREADY COMPLETED studies (do not repeat these themes): ${suggestions.filter(s => s.completed).map(s => s.title).join(', ')}` : ''}
${suggestions.filter(s => !s.completed).length > 0 ? `- Previously Suggested Studies: ${suggestions.filter(s => !s.completed).map(s => s.title).join(', ')}` : ''}

PROACTIVE INTELLIGENCE RULES:
1. If specific difficulties were listed, set them as top priority.
2. IF the user has NOT provided specific difficulties, you must be smart enough to IDENTIFY BOTTLENECKS and potential bottlenecks based on their areas of activity (${userPrivileges}). 
3. Identify what this profile needs to master to be an elite professional in their role, focusing on productivity, market trends, and process optimization.
4. AVOID repeating themes that have already been suggested or completed. If it is necessary to touch on a similar theme, ensure it is a DEEPENING (Higher level).

For each suggestion, provide in the EXACT format below:

Suggestion 1: [Title here]
Description: [Detailed description of why mastering this theme will remove a bottleneck or improve efficiency]
Category: [sales/marketing/service/technical/management]
Level: [beginner/intermediate/advanced]

Suggestion 2: [Title here]
Description: [Detailed description]
Category: [category]
Level: [level]

(Continue for the 5 suggestions)`;

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
              content: isEnglish ? enPrompt : ptPrompt
            }
          ]
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

      const parsedSuggestions = parseSuggestions(fullContent);

      if (parsedSuggestions.length > 0) {
        const suggestionsWithMetadata = parsedSuggestions.map(s => ({
          ...s,
          organization_id: profile.organization_id,
          user_id: profile.id
        }));

        const { error } = await (supabase as any)
          .from('study_suggestions')
          .insert(suggestionsWithMetadata);

        if (error) throw error;

        await refetch();
        toast({ title: t('messages.saved'), description: t('messages.savedDesc', { count: parsedSuggestions.length }) });
      } else {
        toast({ title: t('messages.generated'), description: t('messages.generatedDesc') });
      }

    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      let errorMsg = t('messages.errorGenerate');
      if (error.message.includes('logado')) errorMsg = t('messages.authError');
      if (error.message.includes('Organização')) errorMsg = t('messages.orgError');
      if (error.message.includes('Limite')) errorMsg = t('messages.limitError');
      if (error.message.includes('Créditos')) errorMsg = t('messages.creditError');
      
      toast({ title: t('messages.error'), description: errorMsg, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Sync header with context
  useEffect(() => {
    setCustomTitle(t('title'));
    setCustomIcon(GraduationCap);
    
    const generateButton = (
      <Button
        onClick={generateStudySuggestions}
        disabled={isGenerating}
        size="sm"
        className="gap-2 bg-gradient-to-r from-primary to-chart-5 hover:opacity-90 transition-opacity"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {isGenerating ? t('actions.generating') : t('actions.generate')}
        </span>
      </Button>
    );

    setRightAction(generateButton);

    return () => {
      setCustomTitle(null);
      setCustomIcon(null);
      setRightAction(null);
    };
  }, [t, isGenerating]);

  const toggleSuggestionCompletion = async (suggestion: StudySuggestion) => {
    try {
      const { error } = await (supabase as any)
        .from('study_suggestions')
        .update({ completed: !suggestion.completed })
        .eq('id', suggestion.id);

      if (error) throw error;

      await refetch();
      
      const action = !suggestion.completed ? t('messages.studyCompleted') : t('messages.studyReopened');
      const actionDesc = !suggestion.completed 
        ? t('messages.studyCompletedDesc', { title: suggestion.title }) 
        : t('messages.studyReopenedDesc', { title: suggestion.title });
        
      toast({ 
        title: action, 
        description: actionDesc 
      });

      if (selectedSuggestion?.id === suggestion.id) {
        setSelectedSuggestion({ ...suggestion, completed: !suggestion.completed });
      }
    } catch (error) {
      console.error('Error toggling completion:', error);
      toast({ title: t('messages.error'), description: t('messages.errorStatus'), variant: 'destructive' });
    }
  };

  const addDifficulty = async () => {
    if (!newDifficulty.trim() || !profile) return;

    setIsUpdatingDifficulties(true);
    try {
      const currentDifficulties = profile.difficulties || [];
      if (currentDifficulties.includes(newDifficulty.trim())) {
        toast({ title: t('messages.error'), description: t('difficulties.alreadyExists') });
        return;
      }

      const updatedDifficulties = [...currentDifficulties, newDifficulty.trim()];

      const { error } = await supabase
        .from('profiles')
        .update({ difficulties: updatedDifficulties } as any)
        .eq('id', profile.id);

      if (error) throw error;

      await refetchProfile();
      setNewDifficulty('');
      toast({ title: t('difficulties.added'), description: t('difficulties.addedDesc') });
    } catch (error) {
      console.error('Error adding difficulty:', error);
      toast({ title: t('messages.error'), description: t('messages.errorStatus'), variant: 'destructive' });
    } finally {
      setIsUpdatingDifficulties(false);
    }
  };

  const removeDifficulty = async (difficulty: string) => {
    if (!profile) return;

    setIsUpdatingDifficulties(true);
    try {
      const updatedDifficulties = (profile.difficulties || []).filter(d => d !== difficulty);

      const { error } = await supabase
        .from('profiles')
        .update({ difficulties: updatedDifficulties } as any)
        .eq('id', profile.id);

      if (error) throw error;

      await refetchProfile();
      toast({ title: t('difficulties.removed'), description: t('difficulties.removedDesc') });
    } catch (error) {
      console.error('Error removing difficulty:', error);
      toast({ title: t('messages.error'), description: t('messages.errorStatus'), variant: 'destructive' });
    } finally {
      setIsUpdatingDifficulties(false);
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
      toast({ title: t('messages.deleted'), description: t('messages.deletedDesc') });
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      toast({ title: t('messages.error'), description: t('messages.errorDelete'), variant: 'destructive' });
    } finally {
      setSuggestionToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="p-4 md:p-8 pt-4 md:pt-6 h-full flex flex-col overflow-auto">
      <AnimatedContainer animation="fade-up" className="hidden md:flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <GraduationCap className="h-7 w-7 md:h-8 md:w-8 text-primary" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={generateStudySuggestions}
            disabled={isGenerating}
            className="gap-2 w-full md:w-auto bg-gradient-to-r from-primary to-chart-5 hover:opacity-90 transition-opacity"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('actions.generating')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>{t('actions.generate')}</span>
              </>
            )}
          </Button>
        </div>
      </AnimatedContainer>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 flex-1 min-h-0">
        {/* Left Column - User Context & Status */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Difficulties Section */}
          <AnimatedContainer animation="fade-up" delay={0.1}>
            <Card className="border-primary/20 bg-primary/5 h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                  {t('difficulties.title')}
                </CardTitle>
                <CardDescription>
                  {t('difficulties.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder={t('difficulties.placeholder')}
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addDifficulty()}
                    disabled={isUpdatingDifficulties}
                  />
                  <Button
                    size="icon"
                    onClick={addDifficulty}
                    disabled={isUpdatingDifficulties || !newDifficulty.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 min-h-[40px]">
                  {profile?.difficulties && profile.difficulties.length > 0 ? (
                    profile.difficulties.map((difficulty: string) => (
                      <Badge
                        key={difficulty}
                        variant="secondary"
                        className="px-2 py-1 gap-1 group bg-background/50 border-primary/20"
                      >
                        {difficulty}
                        <X
                          className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => removeDifficulty(difficulty)}
                        />
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {t('difficulties.empty')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </AnimatedContainer>

          {/* User Profile Info Section */}
          <AnimatedContainer animation="fade-up" delay={0.2}>
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-chart-5" />
                  {t('focus.title')}
                </CardTitle>
                <CardDescription>
                  {t('focus.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('focus.areas')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {profile?.privileges && profile.privileges.length > 0 ? (
                      profile.privileges.map((p: string) => (
                        <Badge key={p} variant="outline" className="bg-primary/5 border-primary/20">
                          {tCommon(PRIVILEGE_MAP[p] || p)}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline">{t('focus.collaborator')}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground pt-2">
                    {t('focus.hint')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </AnimatedContainer>

          {/* Integration Status Section */}
          <AnimatedContainer animation="fade-up" delay={0.3}>
            <Card className="border-chart-2/20 bg-chart-2/5 h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-chart-2" />
                  {t('title')}
                </CardTitle>
                <CardDescription>
                  {t('history.all')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold">{suggestions.length}</div>
                  <div className="text-sm text-muted-foreground">{t('stats.topicsCount')}</div>
                </div>
              </CardContent>
            </Card>
          </AnimatedContainer>
        </div>

        {/* Right Column - Suggestions History */}
        <div className="lg:col-span-9 flex flex-col gap-6 min-h-0">
          {/* AI Generating Feedback Overlay */}
          {isGenerating && (
            <AnimatedContainer animation="scale-in">
              <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-chart-5/5 to-primary/5 animate-glow overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center shadow-lg animate-float">
                      <Sparkles className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        {t('generating.title')}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex gap-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">
                          {t('generating.subtitle')}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedContainer>
          )}

          {/* Suggestions History */}
          <AnimatedContainer animation="fade-up" delay={0.2} className="w-full flex-1 flex flex-col min-h-0">
            <Card className="w-full flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <BookOpen className="h-5 w-5" />
                      {t('history.title')}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {totalItems > 0 ? t('history.count', { count: totalItems }) : t('history.all')}
                    </CardDescription>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <span className="text-sm text-muted-foreground order-2 md:order-1">
                        {t('history.showing', { start: startIndex, end: endIndex, total: totalItems })}
                      </span>

                      <div className="flex items-center gap-1 order-1 md:order-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 pl-2 pr-3"
                          onClick={prevPage}
                          disabled={isFirstPage}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline">{t('history.prev')}</span>
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = currentPage;
                            if (currentPage <= 3) pageNum = i + 1;
                            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                            else pageNum = currentPage - 2 + i;

                            if (pageNum < 1 || pageNum > totalPages) return null;

                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "ghost"}
                                size="icon"
                                className="h-8 w-8 text-xs"
                                onClick={() => {}}
                                disabled={currentPage === pageNum}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 pl-3 pr-2"
                          onClick={nextPage}
                          disabled={isLastPage}
                        >
                          <span className="hidden sm:inline">{t('history.next')}</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('history.empty')}</p>
                    <p className="text-sm mt-1">{t('history.emptyDesc')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <ScrollArea className="flex-1 pr-4">
                      <div className="space-y-3">
                        {paginatedData.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            className={`p-3 md:p-4 border border-border rounded-lg hover:border-primary/30 transition-all cursor-pointer group relative ${suggestion.completed ? 'bg-muted/30 opacity-75' : 'bg-background'}`}
                            onClick={() => setSelectedSuggestion(suggestion)}
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className={`font-semibold text-sm flex-1 group-hover:text-primary transition-colors ${suggestion.completed ? 'line-through text-muted-foreground' : ''}`}>
                                  {suggestion.title}
                                </h3>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-7 w-7 shrink-0 transition-colors ${suggestion.completed ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground hover:text-green-500'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSuggestionCompletion(suggestion);
                                    }}
                                    title={suggestion.completed ? t('suggestion.markPending') : t('suggestion.markCompleted')}
                                  >
                                    {suggestion.completed ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle"><circle cx="12" cy="12" r="10"/></svg>
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSuggestionToDelete(suggestion);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {suggestion.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 italic">"{suggestion.description}"</p>
                              )}

                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider py-0 px-2 h-5">
                                  {suggestion.category}
                                </Badge>
                                {suggestion.difficulty_level && (
                                  <Badge className={`text-[10px] uppercase font-bold tracking-wider py-0 px-2 h-5 ${DIFFICULTY_COLORS[suggestion.difficulty_level] || 'bg-muted text-muted-foreground'}`}>
                                    {t(`difficulties_labels.${suggestion.difficulty_level}`, { defaultValue: suggestion.difficulty_level })}
                                  </Badge>
                                )}
                                {suggestion.ai_generated && (
                                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider py-0 px-2 h-5 gap-1 bg-chart-5/10 text-chart-5 border-chart-5/20">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    {t('suggestion.ai')}
                                  </Badge>
                                )}
                                {suggestion.completed && (
                                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider py-0 px-2 h-5 gap-1 bg-green-500/10 text-green-500 border-green-500/20">
                                    {t('suggestion.completed')}
                                  </Badge>
                                )}
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto font-medium">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(suggestion.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Bottom Pagination controls */}
                    {totalPages > 1 && (
                      <div className="border-t pt-4 mt-2 flex justify-center">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={prevPage}
                            disabled={isFirstPage}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span>{t('history.prev')}</span>
                          </Button>

                          <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "ghost"}
                                size="icon"
                                className={`h-8 w-8 text-xs ${currentPage !== pageNum ? 'hidden sm:flex' : 'flex'}`}
                                onClick={() => {}}
                                disabled={currentPage === pageNum}
                              >
                                {pageNum}
                              </Button>
                            ))}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={nextPage}
                            disabled={isLastPage}
                          >
                            <span>{t('history.next')}</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </AnimatedContainer>
        </div>
      </div>

      {/* View Suggestion Modal */}
      <Dialog open={!!selectedSuggestion} onOpenChange={() => setSelectedSuggestion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {selectedSuggestion?.ai_generated && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  {t('suggestion.ai')}
                </Badge>
              )}
              {selectedSuggestion?.difficulty_level && (
                <Badge className={DIFFICULTY_COLORS[selectedSuggestion.difficulty_level] || 'bg-muted text-muted-foreground'}>
                  {t(`difficulties_labels.${selectedSuggestion.difficulty_level}`, { defaultValue: selectedSuggestion.difficulty_level })}
                </Badge>
              )}
              <Badge variant="outline">
                {selectedSuggestion?.category}
              </Badge>
              {selectedSuggestion?.completed && (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  {t('suggestion.completed')}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl leading-relaxed">
              {selectedSuggestion?.title}
            </DialogTitle>
            {selectedSuggestion?.created_at && (
              <DialogDescription className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4" />
                {formatDate(selectedSuggestion.created_at)}
              </DialogDescription>
            )}
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {selectedSuggestion?.description && (
                <p className="text-base leading-relaxed text-foreground">
                  {selectedSuggestion.description}
                </p>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedSuggestion && toggleSuggestionCompletion(selectedSuggestion)}
              className={`gap-2 ${selectedSuggestion?.completed ? 'text-green-500 border-green-500/50' : ''}`}
            >
              {selectedSuggestion?.completed ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                  {t('suggestion.completed')}
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle"><circle cx="12" cy="12" r="10"/></svg>
                  {t('suggestion.markCompleted')}
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setSuggestionToDelete(selectedSuggestion);
                setSelectedSuggestion(null);
              }}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {tCommon('actions.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!suggestionToDelete} onOpenChange={() => setSuggestionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('messages.deleted')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('messages.confirmDelete')} "{suggestionToDelete?.title}"? {tCommon('messages.irreversible')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => suggestionToDelete && deleteSuggestion(suggestionToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tCommon('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
