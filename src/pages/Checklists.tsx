import { useState } from 'react';
import { ALL_STAGES, StageConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { AIButton } from '@/components/ui/ai-button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Search, Target, FileCheck, Cog, Megaphone, Heart, ChevronDown, ChevronUp } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Search,
  Target,
  FileCheck,
  Cog,
  Megaphone,
  Heart
};

export default function Checklists() {
  const [expandedStage, setExpandedStage] = useState<string | null>('prospecting');
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [aiTips, setAiTips] = useState<Record<string, string>>({});
  const [loadingStage, setLoadingStage] = useState<string | null>(null);

  const toggleItem = (itemId: string) => {
    setCompletedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const getCompletionRate = (stage: StageConfig) => {
    const completed = stage.checklist.filter(item => completedItems[item.id]).length;
    return (completed / stage.checklist.length) * 100;
  };

  const handleAITips = (stageId: string) => {
    setLoadingStage(stageId);
    setTimeout(() => {
      const tips: Record<string, string> = {
        prospecting: "💡 **Dicas para Prospecção:**\n\n• Use o LinkedIn Sales Navigator para encontrar decisores.\n\n• Prepare um script de cold call de 30 segundos.\n\n• Envie um material de valor (case study) antes de ligar.\n\n• O melhor horário para ligações é entre 10h-11h e 15h-16h.",
        qualification: "💡 **Dicas para Qualificação:**\n\n• Use a técnica SPIN Selling na reunião.\n\n• Prepare 3 perguntas de implicação poderosas.\n\n• Mostre o custo de não agir (perda de mercado).\n\n• Envie a proposta em até 24h após a reunião.",
        closing: "💡 **Dicas para Fechamento:**\n\n• Crie um cronograma visual do onboarding.\n\n• Peça todos os acessos em um único formulário.\n\n• Agende a reunião de kick-off para a primeira semana.\n\n• Defina expectativas claras sobre resultados.",
        production: "💡 **Dicas para Produção:**\n\n• Publique o primeiro conteúdo em até 72h.\n\n• Crie um mix: 70% valor, 20% engajamento, 10% venda.\n\n• Use Stories diários para aumentar alcance.\n\n• Envie relatórios semanais nas primeiras 4 semanas.",
        campaigns: "💡 **Dicas para Campanhas:**\n\n• Teste pelo menos 3 criativos diferentes.\n\n• Comece com públicos amplos e refine.\n\n• Monitore ROAS diariamente na primeira semana.\n\n• Otimize anúncios com CTR abaixo de 1%.",
        retention: "💡 **Dicas para Fidelização:**\n\n• Peça depoimento quando cliente demonstrar satisfação.\n\n• Crie um programa de indicação simples (10% desconto).\n\n• Envie presente simbólico em datas especiais.\n\n• Proponha novos serviços a cada 3 meses."
      };
      setAiTips(prev => ({ ...prev, [stageId]: tips[stageId] }));
      setLoadingStage(null);
    }, 1500);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Checklists</h1>
          <p className="text-muted-foreground mt-1">Tarefas essenciais para cada fase da jornada</p>
        </div>
      </div>

      <div className="space-y-4 max-w-4xl">
        {ALL_STAGES.map((stage) => {
          const Icon = iconMap[stage.icon as keyof typeof iconMap];
          const isExpanded = expandedStage === stage.id;
          const completionRate = getCompletionRate(stage);
          
          return (
            <div key={stage.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                className="w-full flex items-center gap-4 p-6 hover:bg-muted/50 transition-colors"
              >
                <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', stage.color)}>
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-lg">{stage.name}</h3>
                  <p className="text-sm text-muted-foreground">{stage.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{completionRate.toFixed(0)}%</p>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden mt-1">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Content */}
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-border">
                  <div className="flex justify-end mt-4 mb-4">
                    <AIButton 
                      onClick={() => handleAITips(stage.id)} 
                      isLoading={loadingStage === stage.id}
                    >
                      Dicas de Especialista
                    </AIButton>
                  </div>

                  {aiTips[stage.id] && (
                    <div className="mb-4 bg-gradient-to-r from-primary/10 to-chart-5/10 border border-primary/20 rounded-lg p-4">
                      <div className="text-sm whitespace-pre-line">{aiTips[stage.id]}</div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {stage.checklist.map((item) => (
                      <div 
                        key={item.id}
                        className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg"
                      >
                        <Checkbox 
                          checked={completedItems[item.id] || false}
                          onCheckedChange={() => toggleItem(item.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <p className={cn(
                            'font-medium',
                            completedItems[item.id] && 'line-through text-muted-foreground'
                          )}>
                            {item.title}
                            {item.required && <span className="text-destructive ml-1">*</span>}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">
                    * Tarefas obrigatórias para avançar para a próxima fase
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
