import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type LearningType = 'positive' | 'negative' | 'instruction';

export interface ProjectLearning {
  id: string;
  project_id: string;
  user_id: string;
  learning_type: LearningType;
  content: string;
  context: string | null;
  created_at: string;
}

export function useProjectLearnings(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const QUERY_KEY = ['project-learnings', projectId];

  const { data: learnings = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studio_ai_learnings')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ProjectLearning[];
    },
  });

  const addLearning = useMutation({
    mutationFn: async ({
      type,
      content,
      context,
    }: {
      type: LearningType;
      content: string;
      context?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('studio_ai_learnings').insert({
        project_id: projectId!,
        user_id: user.id,
        learning_type: type,
        content,
        context: context || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Aprendizado salvo! A IA usará isso nas próximas gerações.');
    },
    onError: (err: any) => {
      toast.error('Erro ao salvar aprendizado: ' + err.message);
    },
  });

  const deleteLearning = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('studio_ai_learnings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Aprendizado removido.');
    },
    onError: (err: any) => {
      toast.error('Erro ao remover aprendizado: ' + err.message);
    },
  });

  // Format learnings as a prompt-ready string for injection into AI
  const buildLearningsPrompt = (): string => {
    if (!learnings.length) return '';
    const positives = learnings.filter(l => l.learning_type === 'positive');
    const negatives = learnings.filter(l => l.learning_type === 'negative');
    const instructions = learnings.filter(l => l.learning_type === 'instruction');

    const lines: string[] = ['=== APRENDIZADOS DO CLIENTE (MEMORIAS PERMANENTES - OBEDECER SEMPRE) ==='];

    if (instructions.length) {
      lines.push('\nINSTRUCOES FIXAS DO USUARIO (LEI MAXIMA - NAO IGNORAR):');
      instructions.forEach(l => lines.push('  • ' + l.content));
    }
    if (positives.length) {
      lines.push('\nO QUE O CLIENTE APROVOU E GOSTA (REPETIR E AMPLIAR):');
      positives.forEach(l => lines.push('  ✓ ' + l.content + (l.context ? ' [contexto: ' + l.context + ']' : '')));
    }
    if (negatives.length) {
      lines.push('\nO QUE O CLIENTE REJEITOU E NAO GOSTA (ABSOLUTAMENTE PROIBIDO REPETIR):');
      negatives.forEach(l => lines.push('  ✗ ' + l.content + (l.context ? ' [contexto: ' + l.context + ']' : '')));
    }
    lines.push('=== FIM DOS APRENDIZADOS ===');
    return lines.join('\n');
  };

  return {
    learnings,
    isLoading,
    addLearning: addLearning.mutate,
    isAdding: addLearning.isPending,
    deleteLearning: deleteLearning.mutate,
    isDeleting: deleteLearning.isPending,
    buildLearningsPrompt,
  };
}
