import { Client, ALL_STAGES, SOURCE_LABELS, DocumentType, SERVICE_LABELS } from '@/types';
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
  FileCheck,
  DollarSign,
  Link,
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  Target,
  Zap,
  CheckCircle2,
  NotebookPen
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ContractModal } from './ContractModal';
import { GenerateContractModal } from './GenerateContractModal';
import { GenerateDocumentModal } from './GenerateDocumentModal';
import { ServiceInvoiceModal } from './ServiceInvoiceModal';
import { ReportModal } from './ReportModal';
import { DeleteClientModal } from './DeleteClientModal';
import { ClientHistoryTab } from './ClientHistoryTab';
import { formatPhoneNumber } from '@/lib/phone-utils';
import { useNavigate } from 'react-router-dom';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { usePermissions } from '@/hooks/usePermissions';
import { useSubscription } from '@/hooks/useSubscription';
import { FaWhatsapp } from 'react-icons/fa';
import { cn } from '@/lib/utils';


interface ClientDetailContentProps {
  client: Client;
  onUpdate: (client: Client) => Promise<void>;
  userId?: string;
  onBack?: () => void;
}

interface ChecklistReport {
  itemId: string;
  report: string | null;
  completedAt: string | null;
}

export function ClientDetailContent({ client, onUpdate, userId, onBack }: ClientDetailContentProps) {
  const navigate = useNavigate();
  const { limits, usage } = usePlanLimits();
  const { hasPrivilege, isAdmin, isOwner } = usePermissions();
  const { isActive, isTrialing } = useSubscription();

  const hasActivePlan = isActive || isTrialing;

  // Permission checks
  const canEditClient = hasPrivilege('sales');
  const canSeeContracts = hasPrivilege('sales');
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [isLoadingStage, setIsLoadingStage] = useState<'next' | 'prev' | null>(null);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [generateContractOpen, setGenerateContractOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
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
      {/* Header with Name and Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6 mb-2">
        <div className="flex items-center gap-4 min-w-0 flex-1 flex-wrap">

          {/* Current Stage Badge with High-Intensity Pulse Effect */}
          <div className="relative shrink-0 ml-2">
            {/* Custom Animation for the "Color Loop" pulse */}
            <style>
              {`
                @keyframes journey-pulse {
                  0% { box-shadow: 0 0 0 0 var(--pulse-color); opacity: 0.8; }
                  70% { box-shadow: 0 0 0 10px rgba(0, 0, 0, 0); opacity: 0.4; }
                  100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); opacity: 0.8; }
                }
              `}
            </style>
            <div 
              className={`absolute -inset-1 rounded-full opacity-60`}
              style={{ 
                backgroundColor: 'currentColor',
                animation: 'journey-pulse 2s infinite',
                color: currentStage?.id === 'prospecting' ? '#0ea5e9' : 
                       currentStage?.id === 'qualification' ? '#f59e0b' :
                       currentStage?.id === 'closing' ? '#10b981' :
                       currentStage?.id === 'production' ? '#a855f7' :
                       currentStage?.id === 'campaigns' ? '#f97316' :
                       currentStage?.id === 'retention' ? '#f43f5e' : '#10b981',
                '--pulse-color': currentStage?.id === 'prospecting' ? 'rgba(14, 165, 233, 0.4)' : 
                                 currentStage?.id === 'qualification' ? 'rgba(245, 158, 11, 0.4)' :
                                 currentStage?.id === 'closing' ? 'rgba(16, 185, 129, 0.4)' :
                                 currentStage?.id === 'production' ? 'rgba(168, 85, 247, 0.4)' :
                                 currentStage?.id === 'campaigns' ? 'rgba(249, 115, 22, 0.4)' :
                                 currentStage?.id === 'retention' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(16, 185, 129, 0.4)'
              } as any}
            ></div>
            
            <div 
              className={`relative inline-flex items-center h-9 px-4 rounded-full text-sm font-bold shadow-md transition-all hover:scale-105 active:scale-95 text-white`}
              style={{ 
                backgroundColor: currentStage?.id === 'prospecting' ? '#0ea5e9' : 
                                 currentStage?.id === 'qualification' ? '#f59e0b' :
                                 currentStage?.id === 'closing' ? '#10b981' :
                                 currentStage?.id === 'production' ? '#a855f7' :
                                 currentStage?.id === 'campaigns' ? '#f97316' :
                                 currentStage?.id === 'retention' ? '#f43f5e' : '#10b981',
              }}
            >
              {isPaused && <Lock className="h-4 w-4 mr-2" />}
              <span className="relative flex h-2.5 w-2.5 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
              {currentStage?.name}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">


          {/* Link Tree Button */}
          {hasPrivilege('link23') && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 flex-1 sm:flex-none h-9 px-4"
              onClick={() => navigate(`/app/clients/${client.slug || client.id}/links`)}
            >
              <Link className="h-3.5 w-3.5" />
              Links
            </Button>
          )}

          {canEditClient && (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-2 flex-1 sm:flex-none h-9 px-4",
                !hasActivePlan && "border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400"
              )}
              disabled={isPaused || !hasActivePlan}
              onClick={() => navigate(`/app/clients/edit/${client.slug || client.id}`)}
              title={!hasActivePlan ? 'O seu plano expirou. Renove para continuar a editar.' : ''}
            >
              {isPaused || !hasActivePlan ? <Lock className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              Editar
            </Button>
          )}

          {/* Suspend Button - Only for Admins and Owners */}
          {isOwner && (
            <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant={isPaused ? "outline" : "secondary"}
                  size="sm"
                  className={`gap-2 flex-1 sm:flex-none h-9 px-4 ${isPaused ? 'border-green-500 text-green-500 hover:bg-green-500 hover:text-white' : ''}`}
                >
                  {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  <span>{isPaused ? 'Reativar' : 'Suspender'}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-[#1c1c1e] text-white">
                <div className={cn(
                  "p-8 text-center relative overflow-hidden",
                  isPaused 
                    ? "bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600"
                    : "bg-gradient-to-br from-orange-500 via-red-500 to-red-600"
                )}>
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
                  <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-black/10 blur-xl" />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-black/10 border border-white/20">
                      {isPaused ? <Play className="h-8 w-8 text-white ml-1" /> : <Pause className="h-8 w-8 text-white" />}
                    </div>
                    <DialogTitle className="text-2xl font-bold text-white mb-2">
                      {isPaused ? 'Reativar Cliente' : 'Suspender Cliente'}
                    </DialogTitle>
                    <DialogDescription className="text-white/90 text-sm max-w-sm mx-auto">
                      {isPaused
                        ? 'O cliente voltará a estar ativo. A equipa poderá retomar o trabalho, editar dados e interagir normalmente.'
                        : 'Ao suspender este cliente, todas as atividades, edições e interações serão bloqueadas até que decida reativá-lo.'
                      }
                    </DialogDescription>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex flex-col gap-3">
                    <Button
                      className={cn(
                        "w-full text-white border-0 py-6 text-base font-semibold shadow-lg disabled:opacity-50",
                        isPaused 
                          ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-500/20"
                          : "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-orange-500/20"
                      )}
                      onClick={handleTogglePause}
                      disabled={isPausing}
                    >
                      {isPausing ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        isPaused ? 'Sim, Reativar Cliente' : 'Sim, Suspender Cliente'
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="text-zinc-400 hover:text-white hover:bg-white/5 h-12" 
                      onClick={() => setPauseDialogOpen(false)}
                    >
                      {isPaused ? 'Manter suspenso' : 'Cancelar'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Delete Button - Only for Admins and Owners */}
          {isOwner && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 flex-1 sm:flex-none h-9 px-4"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Eliminar</span>
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

      <div className="space-y-4">
        {/* Two-column layout wrapper */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* ── LEFT COLUMN ── */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-4">
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



      {/* All Client Info Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 ${isPaused ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg relative">
          {isPaused && <Lock className="h-3 w-3 text-destructive absolute top-2 right-2" />}
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Contacto principal</p>
            <p className="text-sm font-medium truncate">{client.contactName || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg relative">
          {isPaused && <Lock className="h-3 w-3 text-destructive absolute top-2 right-2" />}
          <BrainCircuit className="h-4 w-4 text-muted-foreground shrink-0" />
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
        {/* Monthly Budget - Only visible for sales and admin */}
        {hasPrivilege('sales') && Boolean(client.monthlyBudget) && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg relative">
            {isPaused && <Lock className="h-3 w-3 text-destructive absolute top-2 right-2" />}
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Orçamento Mensal</p>
              <p className="text-sm font-medium">{Number(client.monthlyBudget).toLocaleString()} MZN</p>
            </div>
          </div>
        )}
        {/* Services of Interest */}
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg relative col-span-1 sm:col-span-2">
          {isPaused && <Lock className="h-3 w-3 text-destructive absolute top-2 right-2" />}
          <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground mb-1.5">Serviços de interesse</p>
            <div className="flex flex-wrap gap-1.5">
              {client.services && client.services.length > 0 ? (
                client.services.map((service) => (
                  <Badge key={service} variant="secondary" className="text-[10px] py-0 px-2 h-5 bg-primary/10 text-primary border-primary/20">
                    {SERVICE_LABELS[service]}
                  </Badge>
                ))
              ) : (
                <span className="text-sm font-medium text-muted-foreground">Nenhum serviço selecionado</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Qualificação / BANT Score */}
      <div className={`space-y-2 ${isPaused ? 'opacity-60' : ''}`}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Qualificação</p>
        <div className={`flex items-center gap-4 p-3 bg-muted/50 rounded-lg relative`}>
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
      </div>

      {/* Observações */}
      <div className={`space-y-2 ${isPaused ? 'opacity-60' : ''}`}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observações</p>
        <div className="p-4 bg-muted/30 border border-border/50 rounded-lg relative min-h-[100px]">
          {isPaused && <Lock className="h-3 w-3 text-destructive absolute top-2 right-2" />}
          <div className="flex gap-3">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap italic">
              {client.notes || 'Nenhuma observação adicionada para este cliente.'}
            </p>
          </div>
        </div>
      </div>

      {/* Inteligência IA */}
      {client.ai_intelligence && (
        <div className={`space-y-2 ${isPaused ? 'opacity-60' : ''}`}>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
            <BrainCircuit className="h-3.5 w-3.5" />
            Resumo de Prospecção IA
          </p>
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg relative">
            <div className="space-y-4">
              {client.ai_intelligence.pitchIdeal && (
                <div>
                  <p className="text-xs font-medium text-primary/80 mb-1">Pitch Ideal</p>
                  <p className="text-sm text-foreground leading-relaxed font-medium">
                    {client.ai_intelligence.pitchIdeal}
                  </p>
                </div>
              )}
              {client.ai_intelligence.impactEstimate && (
                <div>
                  <p className="text-xs font-medium text-primary/80 mb-2">Impacto Estimado</p>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="bg-background/80 p-3 rounded-md border border-border/50 shadow-sm">
                      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Receita Adicional</p>
                      <p className="text-sm font-bold text-foreground">{client.ai_intelligence.impactEstimate.additionalRevenue}</p>
                    </div>
                    <div className="bg-background/80 p-3 rounded-md border border-border/50 shadow-sm">
                      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Novos Clientes</p>
                      <p className="text-sm font-bold text-foreground">{client.ai_intelligence.impactEstimate.newClientsPerMonth}</p>
                    </div>
                    <div className="bg-background/80 p-3 rounded-md border border-border/50 shadow-sm">
                      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Ticket Médio</p>
                      <p className="text-sm font-bold text-foreground">{client.ai_intelligence.impactEstimate.averageTicket}</p>
                    </div>
                    <div className="bg-background/80 p-3 rounded-md border border-border/50 shadow-sm">
                      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Payback</p>
                      <p className="text-sm font-bold text-foreground">{client.ai_intelligence.impactEstimate.paybackEstimate}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons - Contract, Documents, and Invoices */}
      {canSeeContract && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {/* Invoice Button - Outside dropdown */}
            <Button
              variant="outline"
              className="gap-2"
              disabled={isPaused}
              onClick={() => setInvoiceModalOpen(true)}
            >
              {isPaused ? <Lock className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
              Facturas
              <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                Dev
              </Badge>
            </Button>

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
          </div>
          {limits.maxContractsPerMonth !== null && (
            <div className="text-xs text-muted-foreground pt-1">
              Uso de contratos este mês: <strong>{usage.contractsThisMonth} de {limits.maxContractsPerMonth}</strong>
            </div>
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

      {/* Service Invoice Modal */}
      <ServiceInvoiceModal
        open={invoiceModalOpen}
        onOpenChange={setInvoiceModalOpen}
        client={{
          id: client.id,
          companyName: client.companyName,
          contactName: client.contactName,
          email: client.email,
          phone: client.phone,
          address: client.address || undefined,
          services: client.services,
          monthlyBudget: client.monthlyBudget,
        }}
      />

      </div> {/* end LEFT COLUMN */}

      {/* ── RIGHT COLUMN ── */}
      <div className="min-w-0">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="checklist" className="flex-1 gap-1 sm:gap-2 text-xs sm:text-sm min-w-0 px-2 sm:px-3" disabled={isPaused}>
            {isPaused ? <Lock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" /> : <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />}
            <span className="truncate">Checklist</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex-1 gap-1 sm:gap-2 text-xs sm:text-sm min-w-0 px-2 sm:px-3">
            <FaWhatsapp className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-green-500" />
            <span className="truncate">Chat</span>
            <Badge variant="outline" className="hidden xl:flex text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
              Dev
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex-1 gap-1 sm:gap-2 text-xs sm:text-sm min-w-0 px-2 sm:px-3">
            <Mail className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">Email</span>
            <Badge variant="outline" className="hidden xl:flex text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
              Dev
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 gap-1 sm:gap-2 text-xs sm:text-sm min-w-0 px-2 sm:px-3">
            <NotebookPen className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">Notas</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-1 sm:gap-2 text-xs sm:text-sm min-w-0 px-2 sm:px-3">
            <History className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">Histórico</span>
          </TabsTrigger>
          {(client as any).ai_intelligence && (
            <TabsTrigger value="qia" className="flex-1 gap-1 sm:gap-2 text-xs sm:text-sm min-w-0 px-2 sm:px-3">
              <BrainCircuit className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-purple-400" />
              <span className="truncate">QIA</span>
            </TabsTrigger>
          )}
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
                className="flex-1 gap-1 sm:gap-2 text-xs sm:text-sm min-w-0 px-2 sm:px-4"
              >
                {isPaused ? (
                  <Lock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                ) : isLoadingStage === 'prev' ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin shrink-0" />
                ) : (
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                )}
                <span className="truncate">{prevStage.name}</span>
              </Button>
            )}

            {nextStage && (
              <Button
                onClick={handleMoveToNextStage}
                disabled={!allRequiredCompleted || isLoadingStage !== null || isPaused}
                className="flex-1 gap-1 sm:gap-2 text-xs sm:text-sm min-w-0 px-2 sm:px-4"
                title={isPaused ? 'Cliente bloqueado' : !allRequiredCompleted ? 'Complete todos os itens obrigatórios (*) para avançar' : ''}
              >
                {isPaused ? (
                  <>
                    <Lock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">Bloqueado</span>
                  </>
                ) : isLoadingStage === 'next' ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin shrink-0" />
                    <span className="hidden sm:inline truncate">Processando...</span>
                  </>
                ) : (
                  <>
                    <span className="truncate">{nextStage.name}</span>
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
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

        <TabsContent value="chat" className="mt-4">
          <div className="flex flex-col items-center justify-center p-12 bg-muted/30 rounded-xl border border-dashed border-border text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <FaWhatsapp className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold mb-2">Chat Integrado (WhatsApp)</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Esta funcionalidade está em desenvolvimento. Em breve poderá enviar e receber mensagens do WhatsApp diretamente por aqui.
            </p>
            <Badge className="mt-4 bg-amber-500 text-white border-none hover:bg-amber-600">Em Desenvolvimento</Badge>
          </div>
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <div className="flex flex-col items-center justify-center p-12 bg-muted/30 rounded-xl border border-dashed border-border text-center">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold mb-2">Email Marketing & CRM</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Em breve poderá sincronizar as suas contas de email e gerir toda a comunicação escrita com o cliente num só lugar.
            </p>
            <Badge className="mt-4 bg-amber-500 text-white border-none hover:bg-amber-600">Em Desenvolvimento</Badge>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">{client.notes || 'Nenhuma nota registrada.'}</p>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <ClientHistoryTab clientId={client.id} />
        </TabsContent>

        {/* QIA Intelligence Tab */}
        {(client as any).ai_intelligence && (
          <TabsContent value="qia" className="mt-4 space-y-4">
            {(() => {
              const qi = (client as any).ai_intelligence;
              return (
                <div className="space-y-4">
                  {/* Score Banner */}
                  {qi.opportunityData && (
                    <div className="bg-gradient-to-br from-purple-500/10 via-primary/5 to-blue-500/10 p-4 rounded-xl border border-purple-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="h-5 w-5 text-purple-400" />
                          <span className="font-bold text-sm">Inteligência QIA</span>
                          <span className="text-[10px] text-muted-foreground">Prospecção de {new Date(qi.prospectedAt).toLocaleDateString('pt-PT')}</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500/10 to-red-500/10 px-3 py-1.5 rounded-lg border border-orange-500/30">
                          <span className="text-xs font-bold text-orange-500 uppercase">🔥 Pontuação:</span>
                          <span className="text-lg font-black">{qi.opportunityData.score}/100</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] uppercase font-bold text-muted-foreground">
                        <span>💰 Financeiro: <span className="text-emerald-500">{qi.opportunityData.breakdown?.financialPotential}/25</span></span>
                        <span>📊 Digital: <span className="text-blue-500">{qi.opportunityData.breakdown?.digitalMaturity}/20</span></span>
                        <span>⚠️ Dor: <span className="text-orange-500">{qi.opportunityData.breakdown?.need}/20</span></span>
                        <span>🎯 Fit: <span className="text-primary">{qi.opportunityData.breakdown?.fit}/20</span></span>
                        <span>⏱️ Fecho: <span className="text-amber-500">{qi.opportunityData.breakdown?.closingEase}/15</span></span>
                      </div>
                    </div>
                  )}

                  {/* Impact Estimate */}
                  {qi.impactEstimate && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">💰 Receita Adicional Est.</p>
                        <p className="text-sm font-bold">{qi.impactEstimate.additionalRevenue}</p>
                        <p className="text-xs text-muted-foreground">{qi.impactEstimate.newClientsPerMonth} clientes/mês</p>
                      </div>
                      <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                        <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">🎯 Ticket Médio <span className="normal-case font-normal text-muted-foreground">(valor por cliente)</span></p>
                        <p className="text-sm font-bold">{qi.impactEstimate.averageTicket}</p>
                        <p className="text-xs text-muted-foreground">Payback: {qi.impactEstimate.paybackEstimate}</p>
                      </div>
                    </div>
                  )}

                  {/* Pitch */}
                  {(qi.dynamicScript || qi.pitchIdeal) && (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-blue-500" /> Script de Abordagem
                      </h4>
                      <p className="text-sm text-foreground/90 italic leading-relaxed border-l-2 border-blue-500/50 pl-3">
                        "{qi.dynamicScript || qi.pitchIdeal}"
                      </p>
                    </div>
                  )}

                  {/* Gap Analysis */}
                  {qi.gapAnalysis && qi.gapAnalysis.length > 0 && (
                    <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/20">
                      <h4 className="text-xs font-bold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" /> O que está a perder
                      </h4>
                      <ul className="space-y-1.5">
                        {qi.gapAnalysis.map((gap: string, i: number) => (
                          <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                            <span className="text-destructive font-bold mt-0.5 shrink-0">•</span> {gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Decision Profile */}
                  {qi.decisionProfile && (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <BrainCircuit className="h-4 w-4 text-primary" /> Perfil de Decisão
                      </h4>
                      {typeof qi.decisionProfile === 'object' && !Array.isArray(qi.decisionProfile) ? (
                        <div className="space-y-2">
                          {[['⚡ Velocidade', qi.decisionProfile.speed], ['🎯 Foco', qi.decisionProfile.focus], ['🧠 Mindset', qi.decisionProfile.mindset], ['🎭 Sensibilidade', qi.decisionProfile.sensitivity]].map(([label, val]) => val && (
                            <div key={label} className="flex gap-2 text-sm">
                              <span className="text-muted-foreground shrink-0 w-32 text-xs">{label}:</span>
                              <span className="font-medium">{val}</span>
                            </div>
                          ))}
                          {qi.decisionProfile.bestApproach && (
                            <div className="mt-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                              <p className="text-[10px] font-bold text-primary uppercase mb-1">💡 Melhor Abordagem</p>
                              <p className="text-sm">{qi.decisionProfile.bestApproach}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <ul className="space-y-1">{(qi.decisionProfile as string[]).map((p: string, i: number) => <li key={i} className="text-sm flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />{p}</li>)}</ul>
                      )}
                    </div>
                  )}

                  {/* Next Best Action */}
                  {qi.nextBestAction && (
                    <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Target className="h-4 w-4" /> Próxima Melhor Ação
                      </h4>
                      <p className="text-sm font-medium">{qi.nextBestAction}</p>
                    </div>
                  )}

                  {/* Campaign Ideas */}
                  {qi.campaignIdeas && qi.campaignIdeas.length > 0 && (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-amber-500" /> Ideias de Campanha
                      </h4>
                      <div className="space-y-2">
                        {qi.campaignIdeas.map((idea: any, i: number) => (
                          <div key={i} className="bg-secondary/20 rounded-lg p-3 border border-border/40">
                            {typeof idea === 'object' ? (
                              <>
                                <p className="text-sm font-bold">{idea.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{idea.description}</p>
                                <p className="text-xs text-emerald-500 font-medium mt-1">✅ {idea.expectedResult}</p>
                              </>
                            ) : <p className="text-sm">{idea}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up */}
                  {qi.smartFollowUp && qi.smartFollowUp.length > 0 && (
                    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-emerald-500" /> Plano de Follow-up
                      </h4>
                      <ol className="space-y-2">
                        {qi.smartFollowUp.map((step: string, i: number) => (
                          <li key={i} className="flex gap-3 text-sm">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-[10px] font-bold text-emerald-500 shrink-0 mt-0.5">{i + 1}</span>
                            <span className="text-foreground/80">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })()}
          </TabsContent>
        )}
      </Tabs>
      </div> {/* end RIGHT COLUMN */}
      </div> {/* end two-column grid */}
      </div> {/* end content wrapper */}
    </div>
  );
}
