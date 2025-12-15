import { Client, JOURNEY_STAGES } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { AIButton } from '@/components/ui/ai-button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Mail, 
  Phone, 
  Calendar, 
  ArrowRight,
  MessageSquare,
  FileText,
  CheckSquare
} from 'lucide-react';
import { useState } from 'react';

interface ClientDetailSheetProps {
  client: Client | null;
  onClose: () => void;
  onUpdate: (client: Client) => void;
}

export function ClientDetailSheet({ client, onClose, onUpdate }: ClientDetailSheetProps) {
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  if (!client) return null;

  const currentStage = JOURNEY_STAGES.find(s => s.id === client.stage);
  const currentStageIndex = JOURNEY_STAGES.findIndex(s => s.id === client.stage);
  const nextStage = JOURNEY_STAGES[currentStageIndex + 1];

  const handleTaskToggle = (taskId: string) => {
    const updatedTasks = client.tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    onUpdate({ ...client, tasks: updatedTasks });
  };

  const handleMoveToNextStage = () => {
    if (nextStage) {
      onUpdate({ ...client, stage: nextStage.id });
    }
  };

  const handleAIAnalysis = () => {
    setIsLoadingAi(true);
    setTimeout(() => {
      const suggestions = {
        discovery: `🎯 **Sugestões para "${client.companyName}" na fase Descoberta:**\n\n• Prepare uma apresentação personalizada focando nos problemas específicos do setor de ${client.industry}.\n\n• Pesquise cases de sucesso de empresas similares para usar como prova social.\n\n• Agende a reunião para os próximos 2-3 dias para manter o interesse aquecido.\n\n• Pergunte sobre os objetivos de faturamento para o próximo trimestre.`,
        attraction: `💡 **Sugestões para "${client.companyName}" na fase Atração:**\n\n• Na proposta, destaque o ROI esperado com números concretos.\n\n• Inclua um caso de sucesso do setor de ${client.industry} com resultados mensuráveis.\n\n• Ofereça um diagnóstico gratuito de 30 minutos das redes sociais atuais.\n\n• Prepare objeções comuns: preço, tempo para resultados, comprometimento.`,
        consideration: `📋 **Sugestões para "${client.companyName}" na fase Consideração:**\n\n• Colete todos os acessos às redes sociais nas próximas 48h.\n\n• Crie um documento de onboarding personalizado com as cores e tom da marca.\n\n• Agende uma reunião de kick-off para alinhar expectativas.\n\n• Defina 3 KPIs principais para acompanhamento mensal.`,
        action: `🚀 **Sugestões para "${client.companyName}" na fase Ação:**\n\n• Publique conteúdo 5x por semana para máximo alcance.\n\n• Inicie campanhas de tráfego pago com orçamento teste de 500MT.\n\n• Crie vídeos curtos (Reels/TikTok) mostrando os bastidores do negócio.\n\n• Envie relatório semanal nas primeiras 4 semanas para mostrar progresso.`,
        advocacy: `❤️ **Sugestões para "${client.companyName}" na fase Apologia:**\n\n• Solicite um depoimento em vídeo de 30 segundos sobre os resultados.\n\n• Peça indicação de 3 parceiros comerciais que poderiam se beneficiar.\n\n• Proponha upgrade para gestão completa (Instagram + TikTok + Tráfego).\n\n• Crie um programa de indicação com desconto de 10% por novo cliente.`
      };
      setAiSuggestion(suggestions[client.stage]);
      setIsLoadingAi(false);
    }, 1500);
  };

  return (
    <Sheet open={!!client} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl">{client.companyName}</SheetTitle>
              <p className="text-muted-foreground text-sm mt-1">{client.contactName}</p>
              <Badge className={`${currentStage?.color} text-primary-foreground mt-2`}>
                {currentStage?.name}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium truncate">{client.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="text-sm font-medium">{client.phone}</p>
              </div>
            </div>
          </div>

          {/* BANT Score */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-3">Qualificação BANT</h4>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Budget', value: client.bant.budget },
                { label: 'Authority', value: client.bant.authority },
                { label: 'Need', value: client.bant.need },
                { label: 'Timeline', value: client.bant.timeline }
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-2xl font-bold text-primary">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${client.score}%` }}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground mt-1">
              Score Total: {client.score}/100
            </p>
          </div>

          {/* AI Button */}
          <AIButton onClick={handleAIAnalysis} isLoading={isLoadingAi} className="w-full">
            Sugestões para esta fase
          </AIButton>

          {/* AI Suggestion */}
          {aiSuggestion && (
            <div className="bg-gradient-to-r from-primary/10 to-chart-5/10 border border-primary/20 rounded-lg p-4">
              <div className="text-sm whitespace-pre-line">{aiSuggestion}</div>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="checklist">
            <TabsList className="w-full">
              <TabsTrigger value="checklist" className="flex-1 gap-2">
                <CheckSquare className="h-4 w-4" />
                Checklist
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex-1 gap-2">
                <MessageSquare className="h-4 w-4" />
                Notas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="checklist" className="mt-4 space-y-3">
              {currentStage?.checklist.map((item) => {
                const task = client.tasks.find(t => t.id === item.id);
                const isCompleted = task?.completed || false;
                
                return (
                  <div 
                    key={item.id}
                    className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg"
                  >
                    <Checkbox 
                      checked={isCompleted}
                      onCheckedChange={() => handleTaskToggle(item.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {item.title}
                        {item.required && <span className="text-destructive ml-1">*</span>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{client.notes || 'Nenhuma nota registrada.'}</p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Move to Next Stage */}
          {nextStage && (
            <Button 
              onClick={handleMoveToNextStage}
              className="w-full gap-2"
            >
              Avançar para {nextStage.name}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
