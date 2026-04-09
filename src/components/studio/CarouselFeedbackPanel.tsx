import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, BookOpen, Plus, Trash2, Brain, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useProjectLearnings, LearningType, ProjectLearning } from '@/hooks/useProjectLearnings';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CarouselFeedbackPanelProps {
  projectId: string;
  /** Called after submitting a quick thumbs rating tied to a carousel result */
  onFeedbackSubmitted?: () => void;
}

const LEARNING_TYPE_CONFIG: Record<LearningType, { label: string; color: string; icon: React.ReactNode; placeholder: string }> = {
  positive: {
    label: 'Aprovação',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    icon: <ThumbsUp className="h-3.5 w-3.5" />,
    placeholder: 'Ex: O estilo de tipografia com headlines grandes ficou excelente. Continuar assim.',
  },
  negative: {
    label: 'Rejeição',
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    icon: <ThumbsDown className="h-3.5 w-3.5" />,
    placeholder: 'Ex: Nunca usar fundo preto. O cliente prefere fundos claros.',
  },
  instruction: {
    label: 'Instrução Fixa',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    icon: <Lightbulb className="h-3.5 w-3.5" />,
    placeholder: 'Ex: Sempre incluir o slogan da empresa no último slide.',
  },
};

export function CarouselFeedbackPanel({ projectId, onFeedbackSubmitted }: CarouselFeedbackPanelProps) {
  const { learnings, isLoading, addLearning, isAdding, deleteLearning } = useProjectLearnings(projectId);
  const [activeType, setActiveType] = useState<LearningType>('positive');
  const [newContent, setNewContent] = useState('');
  const [newContext, setNewContext] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSubmit = () => {
    if (!newContent.trim()) return;
    addLearning({
      type: activeType,
      content: newContent.trim(),
      context: newContext.trim() || undefined,
    });
    setNewContent('');
    setNewContext('');
    setShowAddForm(false);
    onFeedbackSubmitted?.();
  };

  const typeGroups: Record<LearningType, ProjectLearning[]> = {
    positive: learnings.filter(l => l.learning_type === 'positive'),
    negative: learnings.filter(l => l.learning_type === 'negative'),
    instruction: learnings.filter(l => l.learning_type === 'instruction'),
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <Brain className="h-4 w-4 text-violet-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-white leading-tight">Memória do Projeto</h4>
          <p className="text-[10px] text-white/40 leading-tight">
            {learnings.length} aprendizado{learnings.length !== 1 ? 's' : ''} ativos
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
            showAddForm
              ? 'bg-white/10 text-white/60'
              : 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-300'
          )}
        >
          <Plus className="h-3 w-3" />
          {showAddForm ? 'Fechar' : 'Adicionar'}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
          {/* Type selector */}
          <div className="flex gap-2">
            {(Object.keys(LEARNING_TYPE_CONFIG) as LearningType[]).map(type => {
              const cfg = LEARNING_TYPE_CONFIG[type];
              return (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex-1 justify-center',
                    activeType === type ? cfg.color : 'text-white/30 bg-white/[0.03] border-white/5 hover:border-white/10'
                  )}
                >
                  {cfg.icon}
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Content textarea */}
          <Textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder={LEARNING_TYPE_CONFIG[activeType].placeholder}
            className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 text-sm rounded-xl resize-none min-h-[80px] focus:border-violet-500/50"
          />

          {/* Optional context */}
          <input
            type="text"
            value={newContext}
            onChange={e => setNewContext(e.target.value)}
            placeholder="Contexto opcional (ex: slides de capa, modo dinâmico)"
            className="bg-white/[0.03] border border-white/5 text-white/70 placeholder:text-white/20 text-xs rounded-xl px-3 py-2 outline-none focus:border-violet-500/30 transition-colors"
          />

          <Button
            className="bg-violet-600 hover:bg-violet-500 text-white font-bold h-9 rounded-xl text-sm"
            onClick={handleSubmit}
            disabled={!newContent.trim() || isAdding}
          >
            {isAdding ? 'Salvando...' : 'Salvar Aprendizado'}
          </Button>
        </div>
      )}

      {/* Existing learnings summary */}
      {learnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {(Object.keys(typeGroups) as LearningType[]).map(type => {
            const group = typeGroups[type];
            if (!group.length) return null;
            const cfg = LEARNING_TYPE_CONFIG[type];
            return (
              <div key={type} className={cn('rounded-xl border p-3 flex flex-col gap-2', cfg.color)}>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-70">
                  {cfg.icon}
                  {cfg.label} ({group.length})
                </div>
                <div className="flex flex-col gap-1.5">
                  {group.slice(0, showHistory ? undefined : 2).map(l => (
                    <div key={l.id} className="flex items-start gap-2 group">
                      <p className="text-[11px] leading-relaxed opacity-90 flex-1">
                        {l.content}
                        {l.context && <span className="opacity-50 ml-1">({l.context})</span>}
                      </p>
                      <button
                        onClick={() => deleteLearning(l.id)}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity shrink-0 mt-0.5"
                        title="Remover aprendizado"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {group.length > 2 && !showHistory && (
                    <button
                      onClick={() => setShowHistory(true)}
                      className="text-[10px] opacity-60 hover:opacity-100 text-left transition-opacity"
                    >
                      + {group.length - 2} mais
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {showHistory && (
            <button
              onClick={() => setShowHistory(false)}
              className="text-[10px] text-white/30 hover:text-white/60 text-center transition-colors"
            >
              <ChevronUp className="h-3 w-3 inline mr-1" />Mostrar menos
            </button>
          )}
        </div>
      )}

      {learnings.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center gap-2 py-6 text-white/20">
          <BookOpen className="h-8 w-8 opacity-30" />
          <p className="text-[11px] font-bold uppercase tracking-widest">Nenhum aprendizado ainda</p>
          <p className="text-[10px] text-center leading-relaxed px-4">
            Adicione instruções para que a IA aprenda as preferências deste projecto.
          </p>
        </div>
      )}
    </div>
  );
}

/** Compact quick-rating bar shown right after generation */
export function CarouselQuickRating({
  projectId,
  carouselImages,
  onDone,
}: {
  projectId: string;
  carouselImages: string[];
  onDone?: () => void;
}) {
  const { addLearning, isAdding } = useProjectLearnings(projectId);
  const [step, setStep] = useState<'rating' | 'comment' | 'done'>('rating');
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
  const [comment, setComment] = useState('');

  if (step === 'done') return null;

  const handleRate = (r: 'positive' | 'negative') => {
    setRating(r);
    setStep('comment');
  };

  const handleSubmit = () => {
    if (!rating) return;
    const baseContent = rating === 'positive'
      ? 'Carrossel aprovado pelo cliente. ' + (comment.trim() || 'O resultado geral foi satisfatório.')
      : 'Carrossel rejeitado pelo cliente. ' + (comment.trim() || 'O resultado não agradou.');
    addLearning({ type: rating, content: baseContent, context: 'Feedback rápido pós-geração' });
    setStep('done');
    onDone?.();
  };

  return (
    <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-4 flex flex-col gap-3 animate-in slide-in-from-bottom-3 duration-300">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-violet-400" />
        <p className="text-xs font-bold text-white">Como ficou este carrossel?</p>
        <p className="text-[10px] text-white/30 ml-auto">A IA aprende com sua resposta</p>
      </div>

      {step === 'rating' && (
        <div className="flex gap-3">
          <button
            onClick={() => handleRate('positive')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold hover:bg-emerald-500/20 transition-all"
          >
            <ThumbsUp className="h-4 w-4" />
            Aprovado!
          </button>
          <button
            onClick={() => handleRate('negative')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold hover:bg-rose-500/20 transition-all"
          >
            <ThumbsDown className="h-4 w-4" />
            Pode melhorar
          </button>
        </div>
      )}

      {step === 'comment' && (
        <>
          <div className={cn(
            'flex items-center gap-2 text-xs font-bold',
            rating === 'positive' ? 'text-emerald-400' : 'text-rose-400'
          )}>
            {rating === 'positive' ? <ThumbsUp className="h-3.5 w-3.5" /> : <ThumbsDown className="h-3.5 w-3.5" />}
            {rating === 'positive' ? 'Que ótimo! O que ficou bom?' : 'O que precisa melhorar?'}
          </div>
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={
              rating === 'positive'
                ? 'Ex: Gostei muito da tipografia e do uso de espaço negativo.'
                : 'Ex: As cores ficaram saturadas demais e o texto foi cortado.'
            }
            className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 text-sm rounded-xl resize-none min-h-[70px] focus:border-violet-500/50"
          />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('rating')}
              className="text-white/40 hover:text-white/70 text-xs"
            >
              Voltar
            </Button>
            <Button
              className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-bold h-9 rounded-xl text-sm"
              onClick={handleSubmit}
              disabled={isAdding}
            >
              {isAdding ? 'Salvando...' : 'Enviar Feedback'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
