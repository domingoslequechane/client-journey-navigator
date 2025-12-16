import { Client, ALL_STAGES } from '@/types';
import { Button } from '@/components/ui/button';
import { AIButton } from '@/components/ui/ai-button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mail, 
  Phone, 
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  CheckSquare,
  Activity,
  Plus,
  Loader2,
  Calendar
} from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

interface ClientDetailContentProps {
  client: Client;
  onUpdate: (client: Client) => void;
}

export function ClientDetailContent({ client, onUpdate }: ClientDetailContentProps) {
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [isLoadingStage, setIsLoadingStage] = useState<'next' | 'prev' | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({ title: '', description: '' });
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);

  const currentStage = ALL_STAGES.find(s => s.id === client.stage);
  const currentStageIndex = ALL_STAGES.findIndex(s => s.id === client.stage);
  const nextStage = ALL_STAGES[currentStageIndex + 1];
  const prevStage = currentStageIndex > 0 ? ALL_STAGES[currentStageIndex - 1] : null;

  // Check if all required checklist items are completed
  const requiredItems = currentStage?.checklist.filter(item => item.required) || [];
  const completedRequiredItems = requiredItems.filter(item => {
    const task = client.tasks.find(t => t.id === item.id);
    return task?.completed;
  });
  const allRequiredCompleted = completedRequiredItems.length === requiredItems.length;

  const handleTaskToggle = async (taskId: string) => {
    setLoadingTaskId(taskId);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const existingTask = client.tasks.find(t => t.id === taskId);
    let updatedTasks;
    
    if (existingTask) {
      updatedTasks = client.tasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      );
    } else {
      // Create new task if it doesn't exist
      updatedTasks = [...client.tasks, { id: taskId, title: '', completed: true, stageId: client.stage }];
    }
    
    onUpdate({ ...client, tasks: updatedTasks });
    setLoadingTaskId(null);
  };

  const handleMoveToNextStage = async () => {
    if (nextStage && allRequiredCompleted) {
      setIsLoadingStage('next');
      await new Promise(resolve => setTimeout(resolve, 800));
      onUpdate({ ...client, stage: nextStage.id });
      setIsLoadingStage(null);
    }
  };

  const handleMoveToPrevStage = async () => {
    if (prevStage) {
      setIsLoadingStage('prev');
      await new Promise(resolve => setTimeout(resolve, 800));
      onUpdate({ ...client, stage: prevStage.id });
      setIsLoadingStage(null);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.title.trim()) return;
    
    setIsAddingActivity(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const activity: ActivityItem = {
      id: `act-${Date.now()}`,
      title: newActivity.title,
      description: newActivity.description,
      createdAt: new Date().toISOString(),
    };
    
    setActivities(prev => [activity, ...prev]);
    setNewActivity({ title: '', description: '' });
    setIsAddingActivity(false);
    setActivityDialogOpen(false);
  };

  const handleAIAnalysis = () => {
    setIsLoadingAi(true);
    setTimeout(() => {
      const suggestions: Record<string, string> = {
        prospecting: `🎯 **Sugestões para "${client.companyName}" na Prospecção:**\n\n• Prepare uma apresentação personalizada focando nos problemas específicos do setor de N/A.\n\n• Pesquise cases de sucesso de empresas similares para usar como prova social.\n\n• Agende a reunião para os próximos 2-3 dias para manter o interesse aquecido.`,
        qualification: `💡 **Sugestões para "${client.companyName}" na Qualificação:**\n\n• Na proposta, destaque o ROI esperado com números concretos.\n\n• Inclua um caso de sucesso do setor de N/A com resultados mensuráveis.\n\n• Ofereça um diagnóstico gratuito de 30 minutos das redes sociais atuais.`,
        closing: `📋 **Sugestões para "${client.companyName}" no Fechamento:**\n\n• Colete todos os acessos às redes sociais nas próximas 48h.\n\n• Crie um documento de onboarding personalizado com as cores e tom da marca.\n\n• Agende uma reunião de kick-off para alinhar expectativas.`,
        production: `🚀 **Sugestões para "${client.companyName}" na Produção:**\n\n• Publique conteúdo 5x por semana para máximo alcance.\n\n• Crie vídeos curtos (Reels/TikTok) mostrando os bastidores do negócio.\n\n• Envie relatório semanal nas primeiras 4 semanas para mostrar progresso.`,
        campaigns: `📊 **Sugestões para "${client.companyName}" em Campanhas:**\n\n• Inicie campanhas de tráfego pago com orçamento teste de 500MT.\n\n• Teste pelo menos 3 criativos diferentes.\n\n• Monitore ROAS diariamente na primeira semana.`,
        retention: `❤️ **Sugestões para "${client.companyName}" na Fidelização:**\n\n• Solicite um depoimento em vídeo de 30 segundos sobre os resultados.\n\n• Peça indicação de 3 parceiros comerciais que poderiam se beneficiar.\n\n• Proponha upgrade para gestão completa (Instagram + TikTok + Tráfego).`
      };
      setAiSuggestion(suggestions[client.stage]);
      setIsLoadingAi(false);
    }, 1500);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Stage Badge */}
      <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${currentStage?.color} ${currentStage?.borderColor} border-2`}>
        {currentStage?.name}
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium truncate">{client.email || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Telefone</p>
            <p className="text-sm font-medium">{client.phone || 'N/A'}</p>
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
          <TabsTrigger value="activities" className="flex-1 gap-2">
            <Activity className="h-4 w-4" />
            Atividades
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 gap-2">
            <MessageSquare className="h-4 w-4" />
            Notas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="mt-4 space-y-3">
          {/* Progress indicator */}
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              Itens obrigatórios: {completedRequiredItems.length}/{requiredItems.length}
            </span>
            {allRequiredCompleted && (
              <span className="text-success font-medium">✓ Completo</span>
            )}
          </div>
          
          {currentStage?.checklist.map((item) => {
            const task = client.tasks.find(t => t.id === item.id);
            const isCompleted = task?.completed || false;
            const isLoading = loadingTaskId === item.id;
            
            return (
              <div 
                key={item.id}
                className={`flex items-start gap-3 p-3 bg-card border border-border rounded-lg cursor-pointer transition-all ${isLoading ? 'opacity-70' : 'hover:border-primary/50'}`}
                onClick={() => !isLoading && handleTaskToggle(item.id)}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mt-0.5 animate-spin text-primary" />
                ) : (
                  <Checkbox 
                    checked={isCompleted}
                    className="mt-0.5 pointer-events-none"
                  />
                )}
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

        <TabsContent value="activities" className="mt-4 space-y-3">
          <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Registrar Atividade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Atividade</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">Título</label>
                  <Input
                    placeholder="Ex: Ligação de follow-up"
                    value={newActivity.title}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea
                    placeholder="Descreva o que foi realizado..."
                    value={newActivity.description}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1"
                    rows={4}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Data/Hora: {formatDateTime(new Date().toISOString())}</span>
                </div>
                <Button 
                  onClick={handleAddActivity} 
                  disabled={!newActivity.title.trim() || isAddingActivity}
                  className="w-full"
                >
                  {isAddingActivity ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Atividade'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma atividade registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="p-3 bg-card border border-border rounded-lg">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-sm">{activity.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(activity.createdAt)}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">{client.notes || 'Nenhuma nota registrada.'}</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Stage Navigation Buttons */}
      <div className="flex gap-2">
        {prevStage && (
          <Button 
            variant="outline"
            onClick={handleMoveToPrevStage}
            disabled={isLoadingStage !== null}
            className="flex-1 gap-2"
          >
            {isLoadingStage === 'prev' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowLeft className="h-4 w-4" />
            )}
            {prevStage.name}
          </Button>
        )}
        
        {nextStage && (
          <Button 
            onClick={handleMoveToNextStage}
            disabled={!allRequiredCompleted || isLoadingStage !== null}
            className="flex-1 gap-2"
            title={!allRequiredCompleted ? 'Complete todos os itens obrigatórios (*) para avançar' : ''}
          >
            {isLoadingStage === 'next' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                {nextStage.name}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>

      {/* Helper text for disabled advance button */}
      {nextStage && !allRequiredCompleted && (
        <p className="text-xs text-muted-foreground text-center">
          Complete todos os itens obrigatórios (*) para avançar para a próxima fase
        </p>
      )}
    </div>
  );
}
