import { Client, ALL_STAGES, SOURCE_LABELS } from '@/types';
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
  Loader2,
  Globe,
  MapPin,
  FileText,
  Pause,
  Play,
  Lock,
  Pencil,
  User,
  ClipboardList
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ContractModal } from './ContractModal';
import { EditClientModal } from './EditClientModal';
import { GenerateContractModal } from './GenerateContractModal';
import { ReportModal } from './ReportModal';


interface ClientDetailContentProps {
  client: Client;
  onUpdate: (client: Client) => Promise<void>;
  isAdmin?: boolean;
  userRole?: string;
  userId?: string;
}

interface ChecklistReport {
  itemId: string;
  report: string | null;
  completedAt: string | null;
}

export function ClientDetailContent({ client, onUpdate, isAdmin = false, userRole = 'sales', userId }: ClientDetailContentProps) {
  // Permission checks
  const canEditClient = userRole === 'admin' || userRole === 'sales' || isAdmin;
  const canSeeContracts = userRole === 'admin' || userRole === 'sales' || isAdmin;
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [isLoadingStage, setIsLoadingStage] = useState<'next' | 'prev' | null>(null);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [generateContractOpen, setGenerateContractOpen] = useState(false);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [contractUrl, setContractUrl] = useState<string | null>(null);
  const [contractName, setContractName] = useState<string | null>(null);
  
  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedChecklistItem, setSelectedChecklistItem] = useState<{
    id: string;
    title: string;
    description?: string;
    required?: boolean;
  } | null>(null);
  const [checklistReports, setChecklistReports] = useState<ChecklistReport[]>([]);

  const currentStage = ALL_STAGES.find(s => s.id === client.stage);
  const currentStageIndex = ALL_STAGES.findIndex(s => s.id === client.stage);
  const nextStage = ALL_STAGES[currentStageIndex + 1];
  const prevStage = currentStageIndex > 0 ? ALL_STAGES[currentStageIndex - 1] : null;

  // Check if client is paused/suspended
  const isPaused = client.paused;

  // Fetch contract, activities and checklist reports on mount
  useEffect(() => {
    const fetchData = async () => {
      // Fetch contract
      const { data: contractData } = await supabase
        .from('clients')
        .select('contract_url, contract_name')
        .eq('id', client.id)
        .single();
      
      if (contractData) {
        setContractUrl(contractData.contract_url);
        setContractName(contractData.contract_name);
      }


      // Fetch checklist reports
      const { data: checklistData } = await supabase
        .from('checklist_items')
        .select('title, report, completed_at')
        .eq('client_id', client.id);

      if (checklistData) {
        setChecklistReports(checklistData.map(item => ({
          itemId: item.title,
          report: item.report,
          completedAt: item.completed_at,
        })));
      }
    };
    fetchData();
  }, [client.id]);

  // Check if all required checklist items are completed
  const requiredItems = currentStage?.checklist.filter(item => item.required) || [];
  const completedRequiredItems = requiredItems.filter(item => {
    const task = client.tasks.find(t => t.id === item.id);
    return task?.completed;
  });
  const allRequiredCompleted = completedRequiredItems.length === requiredItems.length;

  // Check if user can see contract button (closing stage or later, only for sales and admin)
  const closingAndLaterStages = ['closing', 'production', 'campaigns', 'retention', 'loyalty'];
  const canSeeContract = closingAndLaterStages.includes(client.stage) && canSeeContracts;

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

  const handleOpenReportModal = (item: { id: string; title: string; description?: string; required?: boolean }) => {
    if (isPaused) {
      toast({ title: 'Cliente suspenso', description: 'Este cliente está suspenso. Contacte um administrador.', variant: 'destructive' });
      return;
    }
    setSelectedChecklistItem(item);
    setReportModalOpen(true);
  };

  const handleSaveReport = async (report: string) => {
    if (!selectedChecklistItem) return;

    setLoadingTaskId(selectedChecklistItem.id);
    
    const existingTask = client.tasks.find(t => t.id === selectedChecklistItem.id);
    let updatedTasks;
    
    if (existingTask) {
      updatedTasks = client.tasks.map(task =>
        task.id === selectedChecklistItem.id ? { ...task, completed: true } : task
      );
    } else {
      updatedTasks = [...client.tasks, { id: selectedChecklistItem.id, title: selectedChecklistItem.title, completed: true, stageId: client.stage }];
    }

    // Save report to checklist_items
    const stageDbMap: Record<string, string> = {
      prospecting: 'prospeccao',
      qualification: 'reuniao',
      closing: 'contratacao',
      production: 'producao',
      campaigns: 'trafego',
      retention: 'retencao',
    };
    const stageDbName = stageDbMap[client.stage];

    // Check if checklist item exists
    const { data: existingItem } = await supabase
      .from('checklist_items')
      .select('id')
      .eq('client_id', client.id)
      .eq('stage', stageDbName as any)
      .eq('title', selectedChecklistItem.title)
      .maybeSingle();

    if (existingItem) {
      // Update existing
      await supabase
        .from('checklist_items')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          report: report,
        })
        .eq('id', existingItem.id);
    } else {
      // Insert new
      await supabase
        .from('checklist_items')
        .insert({
          client_id: client.id,
          stage: stageDbName as any,
          title: selectedChecklistItem.title,
          completed: true,
          completed_at: new Date().toISOString(),
          report: report,
        });
    }

    // Update local state
    setChecklistReports(prev => {
      const existing = prev.find(r => r.itemId === selectedChecklistItem.title);
      if (existing) {
        return prev.map(r => 
          r.itemId === selectedChecklistItem.title 
            ? { ...r, report, completedAt: new Date().toISOString() } 
            : r
        );
      }
      return [...prev, { itemId: selectedChecklistItem.title, report, completedAt: new Date().toISOString() }];
    });

    try {
      await onUpdate({ ...client, tasks: updatedTasks });
      toast({ title: 'Tarefa concluída!', description: 'O relatório foi salvo com sucesso.' });
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleUncompleteTask = async () => {
    if (!selectedChecklistItem) return;

    setLoadingTaskId(selectedChecklistItem.id);
    
    const updatedTasks = client.tasks.map(task =>
      task.id === selectedChecklistItem.id ? { ...task, completed: false } : task
    );

    // Update checklist_items in DB
    const stageDbMap: Record<string, string> = {
      prospecting: 'prospeccao',
      qualification: 'reuniao',
      closing: 'contratacao',
      production: 'producao',
      campaigns: 'trafego',
      retention: 'retencao',
    };
    const stageDbName = stageDbMap[client.stage];

    await supabase
      .from('checklist_items')
      .update({
        completed: false,
        completed_at: null,
      })
      .eq('client_id', client.id)
      .eq('stage', stageDbName as any)
      .eq('title', selectedChecklistItem.title);

    try {
      await onUpdate({ ...client, tasks: updatedTasks });
      toast({ title: 'Tarefa reaberta', description: 'A tarefa foi desmarcada como concluída.' });
    } finally {
      setLoadingTaskId(null);
    }
  };

  const getReportForItem = (itemTitle: string) => {
    return checklistReports.find(r => r.itemId === itemTitle);
  };

  const handleMoveToNextStage = async () => {
    if (isPaused) {
      toast({ title: 'Cliente suspenso', description: 'Este cliente está suspenso. Contacte um administrador.', variant: 'destructive' });
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
      toast({ title: 'Cliente suspenso', description: 'Este cliente está suspenso. Contacte um administrador.', variant: 'destructive' });
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
      const { error } = await supabase
        .from('clients')
        .update({
          paused: !isPaused,
          paused_at: !isPaused ? new Date().toISOString() : null,
          paused_by: !isPaused ? userId : null,
        })
        .eq('id', client.id);

      if (error) throw error;

      toast({ 
        title: isPaused ? 'Cliente reativado!' : 'Cliente suspenso!', 
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
      {/* Suspended Banner */}
      {isPaused && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <Pause className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Cliente Suspenso</p>
            <p className="text-sm text-muted-foreground">Todas as atividades estão bloqueadas. Apenas administradores podem reativar.</p>
          </div>
        </div>
      )}

      {/* Current Stage Badge */}
      <div className="flex items-center gap-3">
        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${currentStage?.color} ${currentStage?.borderColor} border-2`}>
        {isPaused && <Lock className="h-3 w-3 mr-1.5" />}
        {currentStage?.name}
      </div>
      {isPaused && <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> Suspenso</Badge>}
      </div>

      {/* All Client Info */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">Informações do Cliente</h4>
        {canEditClient && (
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2" 
            disabled={isPaused}
            onClick={() => setEditClientOpen(true)}
          >
            {isPaused ? <Lock className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
            Editar
          </Button>
        )}
      </div>
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 ${isPaused ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg relative">
          {isPaused && <Lock className="h-3 w-3 text-destructive absolute top-2 right-2" />}
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Fonte</p>
            <p className="text-sm font-medium truncate">{client.source ? SOURCE_LABELS[client.source] : 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg relative">
          {isPaused && <Lock className="h-3 w-3 text-destructive absolute top-2 right-2" />}
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium truncate">{client.email || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg relative">
          {isPaused && <Lock className="h-3 w-3 text-destructive absolute top-2 right-2" />}
          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Telefone</p>
            <p className="text-sm font-medium">{client.phone || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg relative">
          {isPaused && <Lock className="h-3 w-3 text-destructive absolute top-2 right-2" />}
          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Website</p>
            <p className="text-sm font-medium truncate">{client.website || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg relative">
          {isPaused && <Lock className="h-3 w-3 text-destructive absolute top-2 right-2" />}
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Endereço</p>
            <p className="text-sm font-medium truncate">{client.address || 'N/A'}</p>
          </div>
        </div>
        {/* Paid Traffic Budget - Only visible after closing stage */}
        {closingAndLaterStages.includes(client.stage) && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg relative">
            {isPaused && <Lock className="h-3 w-3 text-destructive absolute top-2 right-2" />}
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Orçamento de Tráfego Pago</p>
              <p className="text-sm font-medium">{client.trafficBudget ? `$ ${Number(client.trafficBudget).toLocaleString()}` : 'N/A'}</p>
            </div>
          </div>
        )}
      </div>

      {/* BANT Score */}
      <div className={`bg-muted/50 rounded-lg p-3 md:p-4 relative ${isPaused ? 'opacity-60' : ''}`}>
        {isPaused && <Lock className="h-4 w-4 text-destructive absolute top-3 right-3" />}
        <h4 className="font-semibold text-sm mb-3">Qualificação BANT</h4>
        <div className="grid grid-cols-4 gap-2 md:gap-4">
          {[
            { label: 'Budget', value: client.bant.budget },
            { label: 'Authority', value: client.bant.authority },
            { label: 'Need', value: client.bant.need },
            { label: 'Timeline', value: client.bant.timeline }
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-lg md:text-2xl font-bold text-primary">{item.value}</div>
              <div className="text-[10px] md:text-xs text-muted-foreground">{item.label}</div>
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
      <div className="flex flex-wrap gap-2">
        <AIButton onClick={handleAIAnalysis} isLoading={isLoadingAi} className="flex-1 min-w-[150px]" disabled={isPaused}>
          {isPaused && <Lock className="h-4 w-4 mr-1" />}
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
              {isPaused ? <Lock className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              {contractUrl ? 'Ver Contrato' : 'Adicionar Contrato'}
            </Button>
            {/* Show Generate Contract button only in contratacao stage and when no contract exists */}
            {client.stage === 'closing' && !contractUrl && (
              <Button 
                variant="outline" 
                className="gap-2" 
                disabled={isPaused}
                onClick={() => setGenerateContractOpen(true)}
              >
                {isPaused ? <Lock className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                Gerar Contrato
              </Button>
            )}
            <ContractModal
              open={contractDialogOpen}
              onOpenChange={setContractDialogOpen}
              clientId={client.id}
              contractUrl={contractUrl}
              contractName={contractName}
              onContractUpdated={handleContractUpdated}
            />
            <GenerateContractModal
              open={generateContractOpen}
              onOpenChange={setGenerateContractOpen}
              client={{
                id: client.id,
                company_name: client.companyName,
                contact_name: client.contactName,
                email: client.email,
                phone: client.phone,
                address: client.address || null,
                services: client.services,
                monthly_budget: client.monthlyBudget,
                paid_traffic_budget: client.trafficBudget || null,
              }}
            />
          </>
        )}

        {/* Suspend Button - Only for Admins */}
        {isAdmin && (
          <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant={isPaused ? "outline" : "destructive"} 
                className={`gap-2 ${isPaused ? 'border-success text-success hover:bg-success hover:text-success-foreground' : ''}`}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {isPaused ? 'Reativar' : 'Suspender'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isPaused ? 'Reativar Cliente' : 'Suspender Cliente'}</DialogTitle>
                <DialogDescription>
                  {isPaused 
                    ? 'Deseja reativar este cliente? Todas as atividades serão desbloqueadas.'
                    : 'Tem certeza que deseja suspender este cliente? Todas as atividades serão bloqueadas até que um administrador o reative.'
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
                    isPaused ? 'Reativar' : 'Suspender Cliente'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Client Modal */}
        <EditClientModal
          open={editClientOpen}
          onOpenChange={setEditClientOpen}
          client={client}
          onClientUpdated={() => onUpdate({ ...client, stage: client.stage })}
        />
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
          <TabsTrigger value="checklist" className="flex-1 gap-2" disabled={isPaused}>
            {isPaused ? <Lock className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
            Checklist
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 gap-2">
            <MessageSquare className="h-4 w-4" />
            Notas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className={`mt-4 space-y-3 ${isPaused ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Progress indicator */}
          <div className="flex items-center justify-between text-sm mb-2">
            {isPaused && <Lock className="h-4 w-4 text-destructive mr-2" />}
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
            const reportData = getReportForItem(item.title);
            const hasReport = !!reportData?.report;
            
            return (
              <div 
                key={item.id}
                className={`flex items-start gap-3 p-3 bg-card border border-border rounded-lg cursor-pointer transition-all relative ${isLoading ? 'opacity-70' : 'hover:border-primary/50'} ${isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isLoading && !isPaused && handleOpenReportModal({ 
                  id: item.id, 
                  title: item.title, 
                  description: item.description,
                  required: item.required 
                })}
              >
                {isPaused && <Lock className="h-3 w-3 text-destructive absolute top-2 right-2" />}
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mt-0.5 animate-spin text-primary" />
                ) : isPaused ? (
                  <Lock className="h-4 w-4 mt-0.5 text-destructive" />
                ) : (
                  <Checkbox 
                    checked={isCompleted}
                    className="mt-0.5 pointer-events-none"
                    disabled={isPaused}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                      {item.title}
                      {item.required && <span className="text-destructive ml-1">*</span>}
                    </p>
                    {isCompleted && hasReport && (
                      <ClipboardList className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  {isCompleted && hasReport && reportData?.report && (
                    <p className="text-xs text-primary/80 mt-2 line-clamp-2 italic">
                      "{reportData.report}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Report Modal */}
          {selectedChecklistItem && (
            <ReportModal
              open={reportModalOpen}
              onOpenChange={setReportModalOpen}
              itemTitle={selectedChecklistItem.title}
              itemDescription={selectedChecklistItem.description}
              isRequired={selectedChecklistItem.required}
              isCompleted={client.tasks.find(t => t.id === selectedChecklistItem.id)?.completed || false}
              existingReport={getReportForItem(selectedChecklistItem.title)?.report}
              completedAt={getReportForItem(selectedChecklistItem.title)?.completedAt}
              onSave={handleSaveReport}
              onUncomplete={handleUncompleteTask}
            />
          )}
        </TabsContent>


        <TabsContent value="notes" className="mt-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">{client.notes || 'Nenhuma nota registrada.'}</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Stage Navigation Buttons */}
      <div className={`flex gap-2 ${isPaused ? 'opacity-50' : ''}`}>
        {prevStage && (
          <Button 
            variant="outline"
            onClick={handleMoveToPrevStage}
            disabled={isLoadingStage !== null || isPaused}
            className="flex-1 gap-2"
          >
            {isPaused ? (
              <Lock className="h-4 w-4" />
            ) : isLoadingStage === 'prev' ? (
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
            title={isPaused ? 'Cliente bloqueado' : !allRequiredCompleted ? 'Complete todos os itens obrigatórios (*) para avançar' : ''}
          >
            {isPaused ? (
              <>
                <Lock className="h-4 w-4" />
                Bloqueado
              </>
            ) : isLoadingStage === 'next' ? (
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
      {isPaused ? (
        <p className="text-xs text-destructive text-center flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" /> Cliente bloqueado - Contacte um administrador para reativar
        </p>
      ) : nextStage && !allRequiredCompleted && (
        <p className="text-xs text-muted-foreground text-center">
          Complete todos os itens obrigatórios (*) para avançar para a próxima fase
        </p>
      )}
    </div>
  );
}
