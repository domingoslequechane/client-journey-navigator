import { Client, ALL_STAGES, SOURCE_LABELS, DocumentType } from '@/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Trash2,
  Play,
  Lock,
  Pencil,
  User,
  ClipboardList,
  History,
  ChevronDown,
  Receipt,
  Calculator,
  FileCheck
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ContractModal } from './ContractModal';
import { EditClientModal } from './EditClientModal';
import { GenerateContractModal } from './GenerateContractModal';
import { GenerateDocumentModal } from './GenerateDocumentModal';
import { ReportModal } from './ReportModal';
import { DeleteClientModal } from './DeleteClientModal';
import { ClientHistoryTab } from './ClientHistoryTab';
import { formatPhoneNumber } from '@/lib/phone-utils';
import { useNavigate } from 'react-router-dom';


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
  const navigate = useNavigate();
  // Permission checks
  const canEditClient = userRole === 'admin' || userRole === 'sales' || isAdmin;
  const canSeeContracts = userRole === 'admin' || userRole === 'sales' || isAdmin;
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [isLoadingStage, setIsLoadingStage] = useState<'next' | 'prev' | null>(null);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [generateContractOpen, setGenerateContractOpen] = useState(false);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractUrl, setContractUrl] = useState<string | null>(null);
  const [contractName, setContractName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('checklist');
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>('proforma_invoice');
  
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

    // Log task completion to activity history
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        
        await supabase.from('activities').insert({
          client_id: client.id,
          type: 'task_completed' as const,
          title: `Completou tarefa: ${selectedChecklistItem.title}`,
          description: `Etapa: ${currentStage?.name}`,
          organization_id: profile?.organization_id || null,
          changed_by: user.id,
          field_name: 'checklist_item',
          old_value: 'incompleto',
          new_value: 'completo',
        });
      }
    } catch (err) {
      console.error('Error logging task completion:', err);
    }

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

    // Log task uncomplete to activity history
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        
        await supabase.from('activities').insert({
          client_id: client.id,
          type: 'task_uncompleted' as const,
          title: `Reabriu tarefa: ${selectedChecklistItem.title}`,
          description: `Etapa: ${currentStage?.name}`,
          organization_id: profile?.organization_id || null,
          changed_by: user.id,
          field_name: 'checklist_item',
          old_value: 'completo',
          new_value: 'incompleto',
        });
      }
    } catch (err) {
      console.error('Error logging task uncomplete:', err);
    }

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
        // Log stage change
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();
          
          await supabase.from('activities').insert({
            client_id: client.id,
            type: 'stage_change' as const,
            title: 'Avançou de etapa',
            description: `De "${currentStage?.name}" para "${nextStage.name}"`,
            organization_id: profile?.organization_id || null,
            changed_by: user.id,
            field_name: 'current_stage',
            old_value: client.stage,
            new_value: nextStage.id,
          });
        }
        
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
        // Log stage change
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();
          
          await supabase.from('activities').insert({
            client_id: client.id,
            type: 'stage_change' as const,
            title: 'Retrocedeu de etapa',
            description: `De "${currentStage?.name}" para "${prevStage.name}"`,
            organization_id: profile?.organization_id || null,
            changed_by: user.id,
            field_name: 'current_stage',
            old_value: client.stage,
            new_value: prevStage.id,
          });
        }
        
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

  // Calculate BANT score
  const bantScore = (client.bant.budget + client.bant.authority + client.bant.need + client.bant.timeline) * 2.5;

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
        <div className="flex items-center gap-2">
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
          
          {/* Suspend Button - Only for Admins */}
          {isAdmin && (
            <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant={isPaused ? "outline" : "secondary"} 
                  size="sm"
                  className={`gap-2 ${isPaused ? 'border-green-500 text-green-500 hover:bg-green-500 hover:text-white' : ''}`}
                >
                  {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
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

          {/* Delete Button - Only for Admins */}
          {isAdmin && (
            <>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3 w-3" />
                Eliminar
              </Button>
              <DeleteClientModal
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                clientId={client.id}
                clientName={client.companyName}
                onDeleted={() => navigate('/app/clients')}
              />
            </>
          )}
        </div>
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
            <p className="text-sm font-medium font-mono">{formatPhoneNumber(client.phone) || 'N/A'}</p>
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

      {/* Compact BANT Score - integrated with client info */}
      <div className={`flex items-center gap-4 p-3 bg-muted/50 rounded-lg ${isPaused ? 'opacity-60' : ''}`}>
        {isPaused && <Lock className="h-3 w-3 text-destructive absolute top-2 right-2" />}
        <span className="text-xs text-muted-foreground font-medium">BANT:</span>
        <div className="flex gap-3 text-sm">
          <span className="font-medium">B: <span className="text-primary">{client.bant.budget}</span></span>
          <span className="font-medium">A: <span className="text-primary">{client.bant.authority}</span></span>
          <span className="font-medium">N: <span className="text-primary">{client.bant.need}</span></span>
          <span className="font-medium">T: <span className="text-primary">{client.bant.timeline}</span></span>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${bantScore}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{Math.round(bantScore)}/100</span>
        </div>
      </div>

      {/* Action Buttons - Contract and Documents */}
      {canSeeContract && (
        <div className="flex flex-wrap gap-2">
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
          
          {/* Documents Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={isPaused}>
                {isPaused ? <Lock className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                Documentos
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => {
                setSelectedDocumentType('proforma_invoice');
                setDocumentModalOpen(true);
              }}>
                <Receipt className="h-4 w-4 mr-2" />
                Factura Proforma
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSelectedDocumentType('budget');
                setDocumentModalOpen(true);
              }}>
                <Calculator className="h-4 w-4 mr-2" />
                Orçamento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSelectedDocumentType('commercial_proposal');
                setDocumentModalOpen(true);
              }}>
                <FileCheck className="h-4 w-4 mr-2" />
                Proposta Comercial
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
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
          <GenerateDocumentModal
            open={documentModalOpen}
            onOpenChange={setDocumentModalOpen}
            documentType={selectedDocumentType}
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
        </div>
      )}

      {/* Edit Client Modal */}
      <EditClientModal
        open={editClientOpen}
        onOpenChange={setEditClientOpen}
        client={client}
        onClientUpdated={() => onUpdate({ ...client, stage: client.stage })}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="checklist" className="flex-1 gap-2" disabled={isPaused}>
            {isPaused ? <Lock className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
            Checklist
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 gap-2">
            <MessageSquare className="h-4 w-4" />
            Notas
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-2">
            <History className="h-4 w-4" />
            Histórico
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

          {/* Stage Navigation Buttons - Only in Checklist tab */}
          <div className={`flex gap-2 mt-6 pt-4 border-t ${isPaused ? 'opacity-50' : ''}`}>
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
              <Lock className="h-3 w-3" />
              Cliente suspenso. Todas as atividades estão bloqueadas.
            </p>
          ) : !allRequiredCompleted && nextStage && (
            <p className="text-xs text-muted-foreground text-center">
              Complete todos os itens obrigatórios (*) para avançar para a próxima fase
            </p>
          )}
        </TabsContent>


        <TabsContent value="notes" className="mt-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">{client.notes || 'Nenhuma nota registrada.'}</p>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <ClientHistoryTab clientId={client.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
