import { Client, ALL_STAGES } from '@/types';
import { Button } from '@/components/ui/button';
import { AIButton } from '@/components/ui/ai-button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Calendar,
  Globe,
  MapPin,
  FileText,
  Pause,
  Play
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ContractModal } from './ContractModal';

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

interface ClientDetailContentProps {
  client: Client;
  onUpdate: (client: Client) => Promise<void>;
  isAdmin?: boolean;
  userRole?: string;
}

export function ClientDetailContent({ client, onUpdate, isAdmin = false, userRole = 'sales' }: ClientDetailContentProps) {
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [isLoadingStage, setIsLoadingStage] = useState<'next' | 'prev' | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({ title: '', description: '' });
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractUrl, setContractUrl] = useState<string | null>(null);
  const [contractName, setContractName] = useState<string | null>(null);

  const currentStage = ALL_STAGES.find(s => s.id === client.stage);
  const currentStageIndex = ALL_STAGES.findIndex(s => s.id === client.stage);
  const nextStage = ALL_STAGES[currentStageIndex + 1];
  const prevStage = currentStageIndex > 0 ? ALL_STAGES[currentStageIndex - 1] : null;

  // Check if client is paused
  const isPaused = (client as any).paused || false;

  // Fetch contract info on mount
  useEffect(() => {
    const fetchContract = async () => {
      const { data } = await supabase
        .from('clients')
        .select('contract_url, contract_name')
        .eq('id', client.id)
        .single();
      
      if (data) {
        setContractUrl(data.contract_url);
        setContractName(data.contract_name);
      }
    };
    fetchContract();
  }, [client.id]);

  // Check if all required checklist items are completed
  const requiredItems = currentStage?.checklist.filter(item => item.required) || [];
  const completedRequiredItems = requiredItems.filter(item => {
    const task = client.tasks.find(t => t.id === item.id);
    return task?.completed;
  });
  const allRequiredCompleted = completedRequiredItems.length === requiredItems.length;

  // Check if user can see contract button (closing stage or later, only for sales and admin)
  const closingAndLaterStages = ['closing', 'production', 'campaigns', 'retention'];
  const canSeeContract = closingAndLaterStages.includes(client.stage) && (userRole === 'sales' || userRole === 'admin' || isAdmin);

  const handleContractUpdated = async () => {
    const { data } = await supabase
      .from('clients')
      .select('contract_url, contract_name')
      .eq('id', client.id)
      .single();
    
    if (data) {
      setContractUrl(data.contract_url);
      setContractName(data.contract_name);
    }
  };

  const handleTaskToggle = async (taskId: string) => {
    if (isPaused) {
      toast({ title: 'Cliente pausado', description: 'Este cliente está pausado. Contacte um administrador.', variant: 'destructive' });
      return;
    }

    setLoadingTaskId(taskId);
    
    const existingTask = client.tasks.find(t => t.id === taskId);
    let updatedTasks;
    
    if (existingTask) {
      updatedTasks = client.tasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      );
    } else {
      updatedTasks = [...client.tasks, { id: taskId, title: '', completed: true, stageId: client.stage }];
    }
    
    try {
      await onUpdate({ ...client, tasks: updatedTasks });
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleMoveToNextStage = async () => {
    if (isPaused) {
      toast({ title: 'Cliente pausado', description: 'Este cliente está pausado. Contacte um administrador.', variant: 'destructive' });
      return;
    }

    if (nextStage && allRequiredCompleted) {
      setIsLoadingStage('next');
      try {
        await onUpdate({ ...client, stage: nextStage.id });
      } finally {
        setIsLoadingStage(null);
      }
    }
  };

  const handleMoveToPrevStage = async () => {
    if (isPaused) {
      toast({ title: 'Cliente pausado', description: 'Este cliente está pausado. Contacte um administrador.', variant: 'destructive' });
      return;
    }

    if (prevStage) {
      setIsLoadingStage('prev');
      try {
        await onUpdate({ ...client, stage: prevStage.id });
      } finally {
        setIsLoadingStage(null);
      }
    }
  };

  const handleTogglePause = async () => {
    setIsPausing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('clients')
        .update({
          paused: !isPaused,
          paused_at: !isPaused ? new Date().toISOString() : null,
          paused_by: !isPaused ? user?.id : null,
        })
        .eq('id', client.id);

      if (error) throw error;

      toast({ 
        title: isPaused ? 'Cliente reativado!' : 'Cliente pausado!', 
        description: isPaused ? 'O cliente foi reativado com sucesso.' : 'Todas as atividades foram bloqueadas.'
      });
      setPauseDialogOpen(false);
      
      // Trigger a refetch by calling onUpdate with paused state
      await onUpdate({ ...client, stage: client.stage });
    } catch (error) {
      console.error('Error toggling pause:', error);
      toast({ title: 'Erro', description: 'Não foi possível alterar o estado do cliente', variant: 'destructive' });
    } finally {
      setIsPausing(false);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.title.trim() || isPaused) return;
    
    setIsAddingActivity(true);
    
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
        prospecting: `Sugestões para "${client.companyName}" na Prospecção:\n\nPrepare uma apresentação personalizada focando nos problemas específicos do setor.\n\nPesquise cases de sucesso de empresas similares para usar como prova social.\n\nAgende a reunião para os próximos 2-3 dias para manter o interesse aquecido.`,
        qualification: `Sugestões para "${client.companyName}" na Qualificação:\n\nNa proposta, destaque o ROI esperado com números concretos.\n\nInclua um caso de sucesso do setor com resultados mensuráveis.\n\nOfereça um diagnóstico gratuito de 30 minutos das redes sociais atuais.`,
        closing: `Sugestões para "${client.companyName}" no Fechamento:\n\nColete todos os acessos às redes sociais nas próximas 48h.\n\nCrie um documento de onboarding personalizado com as cores e tom da marca.\n\nAgende uma reunião de kick-off para alinhar expectativas.`,
        production: `Sugestões para "${client.companyName}" na Produção:\n\nPublique conteúdo 5x por semana para máximo alcance.\n\nCrie vídeos curtos (Reels/TikTok) mostrando os bastidores do negócio.\n\nEnvie relatório semanal nas primeiras 4 semanas para mostrar progresso.`,
        campaigns: `Sugestões para "${client.companyName}" em Campanhas:\n\nInicie campanhas de tráfego pago com orçamento teste de 500MT.\n\nTeste pelo menos 3 criativos diferentes.\n\nMonitore ROAS diariamente na primeira semana.`,
        retention: `Sugestões para "${client.companyName}" na Fidelização:\n\nSolicite um depoimento em vídeo de 30 segundos sobre os resultados.\n\nPeça indicação de 3 parceiros comerciais que poderiam se beneficiar.\n\nProponha upgrade para gestão completa (Instagram + TikTok + Tráfego).`
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
      {/* Paused Banner */}
      {isPaused && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <Pause className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Cliente Pausado</p>
            <p className="text-sm text-muted-foreground">Todas as atividades estão bloqueadas. Apenas administradores podem reativar.</p>
          </div>
        </div>
      )}

      {/* Current Stage Badge */}
      <div className="flex items-center gap-3">
        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${currentStage?.color} ${currentStage?.borderColor} border-2`}>
          {currentStage?.name}
        </div>
        {isPaused && <Badge variant="destructive" className="gap-1"><Pause className="h-3 w-3" /> Pausado</Badge>}
      </div>

      {/* All Client Info */}
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
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Website</p>
            <p className="text-sm font-medium truncate">{client.website || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Endereço</p>
            <p className="text-sm font-medium truncate">{client.address || 'N/A'}</p>
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

      {/* Action Buttons */}
      <div className="flex gap-2">
        <AIButton onClick={handleAIAnalysis} isLoading={isLoadingAi} className="flex-1" disabled={isPaused}>
          Sugestões para esta fase
        </AIButton>
        
        {/* Contract Button - Only visible in closing stage for sales/admin */}
        {canSeeContract && (
          <>
            <Button 
              variant="outline" 
              className="gap-2" 
              disabled={isPaused}
              onClick={() => setContractDialogOpen(true)}
            >
              <FileText className="h-4 w-4" />
              {contractUrl ? 'Ver Contrato' : 'Adicionar Contrato'}
            </Button>
            <ContractModal
              open={contractDialogOpen}
              onOpenChange={setContractDialogOpen}
              clientId={client.id}
              contractUrl={contractUrl}
              contractName={contractName}
              onContractUpdated={handleContractUpdated}
            />
          </>
        )}

        {/* Pause Button - Only for Admins */}
        {isAdmin && (
          <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
            <DialogTrigger asChild>
              <Button variant={isPaused ? "default" : "destructive"} className="gap-2">
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {isPaused ? 'Reativar' : 'Pausar'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isPaused ? 'Reativar Cliente' : 'Pausar Cliente'}</DialogTitle>
                <DialogDescription>
                  {isPaused 
                    ? 'Deseja reativar este cliente? Todas as atividades serão desbloqueadas.'
                    : 'Tem certeza que deseja pausar este cliente? Todas as atividades serão bloqueadas até que um administrador o reative.'
                  }
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPauseDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  variant={isPaused ? "default" : "destructive"} 
                  onClick={handleTogglePause}
                  disabled={isPausing}
                >
                  {isPausing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    isPaused ? 'Reativar' : 'Pausar Cliente'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

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
                className={`flex items-start gap-3 p-3 bg-card border border-border rounded-lg cursor-pointer transition-all ${isLoading ? 'opacity-70' : 'hover:border-primary/50'} ${isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isLoading && !isPaused && handleTaskToggle(item.id)}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mt-0.5 animate-spin text-primary" />
                ) : (
                  <Checkbox 
                    checked={isCompleted}
                    className="mt-0.5 pointer-events-none"
                    disabled={isPaused}
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
              <Button variant="outline" className="w-full gap-2" disabled={isPaused}>
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
            disabled={isLoadingStage !== null || isPaused}
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
            disabled={!allRequiredCompleted || isLoadingStage !== null || isPaused}
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
