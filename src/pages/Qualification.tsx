import { useState } from 'react';
import { JOURNEY_STAGES } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AIButton } from '@/components/ui/ai-button';
import { cn } from '@/lib/utils';
import { Target, Calculator, Sparkles, CheckCircle2, XCircle } from 'lucide-react';

interface BANTScores {
  budget: number;
  authority: number;
  need: number;
  timeline: number;
}

export default function Qualification() {
  const [scores, setScores] = useState<BANTScores>({
    budget: 3,
    authority: 3,
    need: 3,
    timeline: 3
  });
  const [leadName, setLeadName] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const totalScore = Object.values(scores).reduce((sum, val) => sum + val, 0);
  const maxScore = 20;
  const percentage = (totalScore / maxScore) * 100;

  const getQualificationLevel = () => {
    if (percentage >= 80) return { level: 'SQL', label: 'Sales Qualified Lead', color: 'bg-success' };
    if (percentage >= 60) return { level: 'MQL', label: 'Marketing Qualified Lead', color: 'bg-warning' };
    return { level: 'RAW', label: 'Lead Bruto', color: 'bg-destructive' };
  };

  const qualification = getQualificationLevel();

  const bantDescriptions = {
    budget: {
      title: 'Budget (Orçamento)',
      question: 'O lead tem recursos financeiros para investir?',
      levels: ['Sem orçamento', 'Orçamento limitado', 'Orçamento médio', 'Orçamento bom', 'Orçamento ideal']
    },
    authority: {
      title: 'Authority (Autoridade)',
      question: 'O contato tem poder de decisão?',
      levels: ['Sem influência', 'Influenciador', 'Decisão parcial', 'Decisor', 'Decisor final']
    },
    need: {
      title: 'Need (Necessidade)',
      question: 'Existe uma necessidade real do serviço?',
      levels: ['Sem necessidade', 'Curiosidade', 'Necessidade futura', 'Necessidade atual', 'Urgente']
    },
    timeline: {
      title: 'Timeline (Prazo)',
      question: 'Quando pretende iniciar?',
      levels: ['Indefinido', '+6 meses', '3-6 meses', '1-3 meses', 'Imediato']
    }
  };

  const handleAIAnalysis = () => {
    setIsLoadingAi(true);
    setTimeout(() => {
      const weakPoints = [];
      const strongPoints = [];
      
      if (scores.budget <= 2) weakPoints.push('orçamento');
      else if (scores.budget >= 4) strongPoints.push('orçamento definido');
      
      if (scores.authority <= 2) weakPoints.push('autoridade de decisão');
      else if (scores.authority >= 4) strongPoints.push('contato com decisor');
      
      if (scores.need <= 2) weakPoints.push('necessidade clara');
      else if (scores.need >= 4) strongPoints.push('necessidade urgente');
      
      if (scores.timeline <= 2) weakPoints.push('prazo definido');
      else if (scores.timeline >= 4) strongPoints.push('prazo imediato');

      let analysis = `🎯 **Análise de Qualificação${leadName ? ` - ${leadName}` : ''}**\n\n`;
      analysis += `**Classificação:** ${qualification.level} (${qualification.label})\n`;
      analysis += `**Score:** ${totalScore}/${maxScore} pontos (${percentage.toFixed(0)}%)\n\n`;

      if (strongPoints.length > 0) {
        analysis += `✅ **Pontos Fortes:** ${strongPoints.join(', ')}\n\n`;
      }

      if (weakPoints.length > 0) {
        analysis += `⚠️ **Pontos a Desenvolver:** ${weakPoints.join(', ')}\n\n`;
        analysis += `**Sugestões:**\n`;
        
        if (scores.budget <= 2) {
          analysis += `• **Budget:** Pergunte sobre o investimento atual em marketing. Mostre ROI de outros clientes.\n`;
        }
        if (scores.authority <= 2) {
          analysis += `• **Autoridade:** Peça para envolver o decisor na próxima reunião. Use a técnica "Triangulação".\n`;
        }
        if (scores.need <= 2) {
          analysis += `• **Necessidade:** Faça perguntas de implicação (SPIN). Mostre o custo de não agir.\n`;
        }
        if (scores.timeline <= 2) {
          analysis += `• **Timeline:** Crie urgência com ofertas limitadas. Mostre concorrentes que estão agindo.\n`;
        }
      } else {
        analysis += `🚀 **Este lead está pronto para fechar!** Envie a proposta imediatamente e agende reunião de fechamento.`;
      }

      setAiAnalysis(analysis);
      setIsLoadingAi(false);
    }, 1500);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Qualificação BANT</h1>
          <p className="text-muted-foreground mt-1">Avalie e qualifique seus leads com metodologia comprovada</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* BANT Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <Label htmlFor="leadName" className="text-sm font-medium">Nome do Lead / Empresa</Label>
            <Input
              id="leadName"
              placeholder="Ex: Restaurante Sabor da Terra"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              className="mt-2"
            />
          </div>

          {(Object.keys(bantDescriptions) as Array<keyof typeof bantDescriptions>).map((key) => {
            const bant = bantDescriptions[key];
            const value = scores[key];
            
            return (
              <div key={key} className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{bant.title}</h3>
                    <p className="text-sm text-muted-foreground">{bant.question}</p>
                  </div>
                  <div className="text-2xl font-bold text-primary">{value}</div>
                </div>
                
                <Slider
                  value={[value]}
                  onValueChange={([v]) => setScores(prev => ({ ...prev, [key]: v }))}
                  min={1}
                  max={5}
                  step={1}
                  className="mb-4"
                />
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  {bant.levels.map((level, i) => (
                    <span 
                      key={i}
                      className={cn(
                        'text-center flex-1',
                        value === i + 1 && 'text-primary font-medium'
                      )}
                    >
                      {level}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          <AIButton onClick={handleAIAnalysis} isLoading={isLoadingAi} className="w-full">
            Analisar Qualificação
          </AIButton>

          {aiAnalysis && (
            <div className="bg-gradient-to-r from-primary/10 to-chart-5/10 border border-primary/20 rounded-xl p-6">
              <div className="text-sm whitespace-pre-line">{aiAnalysis}</div>
            </div>
          )}
        </div>

        {/* Score Summary */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 sticky top-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mb-4">
                <Target className="h-10 w-10 text-primary" />
              </div>
              <div className="text-5xl font-bold">{totalScore}</div>
              <div className="text-muted-foreground">de {maxScore} pontos</div>
            </div>

            <div className="h-4 bg-muted rounded-full overflow-hidden mb-4">
              <div 
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  qualification.color
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <Badge className={cn('w-full justify-center py-2 text-primary-foreground', qualification.color)}>
              {qualification.level} - {qualification.label}
            </Badge>

            <div className="mt-6 space-y-3">
              <h4 className="font-semibold text-sm">Próximos Passos:</h4>
              {percentage >= 80 ? (
                <>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                    <span>Enviar proposta comercial</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                    <span>Agendar reunião de fechamento</span>
                  </div>
                </>
              ) : percentage >= 60 ? (
                <>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-warning mt-0.5" />
                    <span>Aprofundar diagnóstico</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-warning mt-0.5" />
                    <span>Nutrir com conteúdo relevante</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <span>Continuar nutrição via marketing</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <span>Não priorizar para vendas diretas</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
