import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, getDay, startOfWeek, endOfWeek, addMonths, subMonths, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Plus, ChevronLeft, ChevronRight, Sparkles, CheckCircle2, Clock, Circle, Pencil, Trash2, ListTodo, Loader2, ExternalLink, Image as ImageIcon, Calendar, User, Monitor, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useEditorialTasks, type EditorialTask } from '@/hooks/useEditorialTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';



const STATUS_CONFIG: Record<string, { label: string; icon: typeof Circle; color: string }> = {
  pending: { label: 'Pendente', icon: Circle, color: 'text-muted-foreground' },
  in_progress: { label: 'Em andamento', icon: Clock, color: 'text-yellow-500' },
  done: { label: 'Concluído', icon: CheckCircle2, color: 'text-green-500' },
};

const CONTENT_TYPES = [
  'Post Feed', 'Story', 'Reels', 'Carrossel', 'Blog', 'Email', 'Vídeo', 'Podcast', 'Newsletter', 'Outro'
];

const PLATFORMS = [
  'Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube', 'Twitter/X', 'Blog', 'Email', 'WhatsApp', 'Outro'
];

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Editorial() {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);

  // Clients list
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);

  // Task modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<EditorialTask | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Day sheet state
  const [daySheetOpen, setDaySheetOpen] = useState(false);

  // Task detail modal
  const [detailTask, setDetailTask] = useState<EditorialTask | null>(null);

  // AI generation modal
  const [aiModalStep, setAiModalStep] = useState<'client' | 'config' | null>(null);
  const [aiClientId, setAiClientId] = useState('');
  const [aiWeeks, setAiWeeks] = useState(1);
  const [aiStartDate, setAiStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [aiGenerating, setAiGenerating] = useState(false);

  // Task form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formContentType, setFormContentType] = useState('');
  const [formPlatform, setFormPlatform] = useState('');
  const [formStatus, setFormStatus] = useState('pending');

  const { tasks, loading, createTask, updateTask, deleteTask, refetch } = useEditorialTasks({
    periodFilter: 'month',
    clientFilter,
  });

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      if (!organizationId) return;
      const { data } = await supabase
        .from('clients')
        .select('id, company_name')
        .eq('organization_id', organizationId)
        .order('company_name');
      if (data) setClients(data);
    };
    fetchClients();
  }, [organizationId]);

  // Build calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Tasks by date
  const tasksByDate = useMemo(() => {
    const map: Record<string, EditorialTask[]> = {};
    tasks.forEach(task => {
      const key = task.scheduled_date;
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [tasks]);

  // Tasks for selected date
  const selectedDayTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasksByDate[selectedDate] || [];
  }, [selectedDate, tasksByDate]);

  const openDaySheet = (dateStr: string) => {
    setSelectedDate(dateStr);
    setDaySheetOpen(true);
  };

  const openCreateModal = (dateStr?: string) => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormDate(dateStr || format(new Date(), 'yyyy-MM-dd'));
    setFormTime('');
    setFormClientId(clientFilter || '');
    setFormContentType('');
    setFormPlatform('');
    setFormStatus('pending');
    setTaskModalOpen(true);
  };

  const openEditModal = (task: EditorialTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormDate(task.scheduled_date);
    setFormTime(task.scheduled_time || '');
    setFormClientId(task.client_id);
    setFormContentType(task.content_type || '');
    setFormPlatform(task.platform || '');
    setFormStatus(task.status);
    setTaskModalOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formClientId) return;

    if (editingTask) {
      await updateTask(editingTask.id, {
        title: formTitle,
        description: formDescription || null,
        scheduled_date: formDate,
        scheduled_time: formTime || null,
        client_id: formClientId,
        content_type: formContentType || null,
        platform: formPlatform || null,
        status: formStatus,
      });
    } else {
      await createTask({
        title: formTitle,
        description: formDescription || undefined,
        scheduled_date: formDate,
        scheduled_time: formTime || undefined,
        client_id: formClientId,
        content_type: formContentType || undefined,
        platform: formPlatform || undefined,
        status: formStatus,
      });
    }
    setTaskModalOpen(false);
  };

  const handleStatusToggle = async (task: EditorialTask) => {
    const nextStatus = task.status === 'done' ? 'pending' : task.status === 'pending' ? 'in_progress' : 'done';
    await updateTask(task.id, { status: nextStatus });
  };



  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteTask(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiClientId || !organizationId) return;
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-editorial', {
        body: {
          clientId: aiClientId,
          organizationId,
          weeks: aiWeeks,
          startDate: aiStartDate,
          userId: user?.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: `${data.count} tarefas geradas com sucesso!`,
        description: `Linha editorial criada para ${aiWeeks} semana(s).`,
      });
      setAiModalStep(null);
      refetch();
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar linha editorial',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setAiGenerating(false);
    }
  };

  // Stats
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  const selectedDateObj = selectedDate ? parseISO(selectedDate) : null;
  const selectedDateLabel = selectedDateObj
    ? format(selectedDateObj, "EEEE, dd 'de' MMMM", { locale: ptBR })
    : '';

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Linha Editorial
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Clique em um dia para ver e gerenciar as tarefas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setAiModalStep('client')}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Gerar com IA
          </Button>
          <Button onClick={() => openCreateModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">Em andamento</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{doneCount}</p>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Month Nav */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold capitalize min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-muted-foreground text-xs">
            Hoje
          </Button>
        </div>

        <Select value={clientFilter || 'all'} onValueChange={(v) => setClientFilter(v === 'all' ? null : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Week day headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEK_DAYS.map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayTasks = tasksByDate[dateStr] || [];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate === dateStr;
                const todayFlag = isToday(day);
                const overdue = isPast(day) && !todayFlag && dayTasks.some(t => t.status !== 'done');

                const doneTasks = dayTasks.filter(t => t.status === 'done').length;
                const totalTasks = dayTasks.length;

                return (
                  <button
                    key={dateStr}
                    onClick={() => openDaySheet(dateStr)}
                    className={cn(
                      "min-h-[72px] rounded-lg p-2 text-left transition-all border",
                      "hover:border-primary/50 hover:bg-accent/50",
                      isCurrentMonth ? "bg-card" : "bg-muted/30 opacity-50",
                      todayFlag && "border-primary bg-primary/5",
                      isSelected && "border-primary ring-1 ring-primary",
                      !todayFlag && !isSelected && "border-border/50",
                      overdue && "border-destructive/40 bg-destructive/5",
                    )}
                  >
                    <div className={cn(
                      "text-xs font-semibold mb-1.5",
                      todayFlag && "text-primary",
                      !isCurrentMonth && "text-muted-foreground",
                      overdue && "text-destructive",
                    )}>
                      {format(day, 'd')}
                      {todayFlag && (
                        <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </div>

                    {totalTasks > 0 && (
                      <div className="space-y-0.5">
                        {dayTasks.slice(0, 2).map(task => (
                          <div
                            key={task.id}
                            className={cn(
                              "text-[10px] leading-tight truncate px-1 py-0.5 rounded",
                              task.status === 'done' && "bg-green-500/15 text-green-700 dark:text-green-400",
                              task.status === 'in_progress' && "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
                              task.status === 'pending' && "bg-muted text-muted-foreground",
                            )}
                          >
                            {task.title}
                          </div>
                        ))}
                        {totalTasks > 2 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{totalTasks - 2} mais
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Tasks Sheet */}
      <Sheet open={daySheetOpen} onOpenChange={setDaySheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="capitalize">{selectedDateLabel}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                setDaySheetOpen(false);
                openCreateModal(selectedDate || undefined);
              }}
            >
              <Plus className="h-4 w-4" />
              Adicionar tarefa neste dia
            </Button>

            {selectedDayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ListTodo className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma tarefa para este dia</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayTasks.map(task => {
                  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <Card key={task.id} className={cn(
                      "transition-colors cursor-pointer hover:border-primary/50",
                      task.status === 'done' && "opacity-60"
                    )}
                      onClick={() => setDetailTask(task)}
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStatusToggle(task); }}
                          className={cn("mt-0.5 shrink-0", statusCfg.color)}
                        >
                          <StatusIcon className="h-5 w-5" />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              "font-medium text-sm",
                              task.status === 'done' && "line-through text-muted-foreground"
                            )}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditModal(task); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(task.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {task.clients && (
                              <Badge variant="outline" className="text-xs">
                                {task.clients.company_name}
                              </Badge>
                            )}
                            {task.content_type && (
                              <Badge variant="secondary" className="text-xs">{task.content_type}</Badge>
                            )}
                            {task.platform && (
                              <Badge variant="secondary" className="text-xs">{task.platform}</Badge>
                            )}
                            {task.scheduled_time && (
                              <span className="text-xs text-muted-foreground">🕐 {task.scheduled_time}</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Create/Edit Task Modal */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Título *</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Ex: Post sobre promoção" className="mt-1" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Detalhes da tarefa..." rows={3} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Hora</Label>
                <Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Cliente *</Label>
              <Select value={formClientId} onValueChange={setFormClientId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de conteúdo</Label>
                <Select value={formContentType} onValueChange={setFormContentType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(ct => (
                      <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plataforma</Label>
                <Select value={formPlatform} onValueChange={setFormPlatform}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="done">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formTitle.trim() || !formClientId}>
              {editingTask ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Modal - Step 1: Select Client */}
      <Dialog open={aiModalStep === 'client'} onOpenChange={() => setAiModalStep(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Gerar Linha Editorial com IA
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione o cliente para quem deseja gerar a linha editorial automaticamente.
            </p>
            <div>
              <Label>Cliente *</Label>
              <Select value={aiClientId} onValueChange={setAiClientId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiModalStep(null)}>Cancelar</Button>
            <Button onClick={() => setAiModalStep('config')} disabled={!aiClientId}>
              Próximo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Modal - Step 2: Config */}
      <Dialog open={aiModalStep === 'config'} onOpenChange={() => setAiModalStep(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Configurar Geração
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <span className="font-medium">Cliente: </span>
              {clients.find(c => c.id === aiClientId)?.company_name}
            </div>

            <div>
              <Label>Data de início</Label>
              <Input
                type="date"
                value={aiStartDate}
                onChange={e => setAiStartDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Quantidade de semanas</Label>
              <Select value={String(aiWeeks)} onValueChange={v => setAiWeeks(Number(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 semana (7 tarefas)</SelectItem>
                  <SelectItem value="2">2 semanas (14 tarefas)</SelectItem>
                  <SelectItem value="3">3 semanas (21 tarefas)</SelectItem>
                  <SelectItem value="4">4 semanas (28 tarefas)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              A IA irá gerar tarefas diárias com tipos de conteúdo, plataformas e descrições variados, com base no perfil do cliente.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAiModalStep('client')} disabled={aiGenerating}>
              Voltar
            </Button>
            <Button onClick={handleAIGenerate} disabled={aiGenerating} className="gap-2">
              {aiGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Modal */}
      <Dialog open={!!detailTask} onOpenChange={(open) => !open && setDetailTask(null)}>
        {detailTask && (() => {
          const statusCfg = STATUS_CONFIG[detailTask.status] || STATUS_CONFIG.pending;
          const StatusIcon = statusCfg.icon;
          const dateLabel = (() => {
            try { return format(parseISO(detailTask.scheduled_date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }); }
            catch { return detailTask.scheduled_date; }
          })();
          return (
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
              <DialogHeader className="px-5 pt-5 pb-4 shrink-0 border-b">
                <DialogTitle className="flex items-center gap-2 pr-6">
                  <StatusIcon className={cn("h-5 w-5 shrink-0", statusCfg.color)} />
                  <span className="line-clamp-2 leading-snug">{detailTask.title}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Meta info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span className="capitalize truncate">{dateLabel}{detailTask.scheduled_time ? ` • ${detailTask.scheduled_time}` : ''}</span>
                  </div>
                  {detailTask.clients && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4 shrink-0" />
                      <span className="truncate">{detailTask.clients.company_name}</span>
                    </div>
                  )}
                  {detailTask.content_type && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span>{detailTask.content_type}</span>
                    </div>
                  )}
                  {detailTask.platform && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Monitor className="h-4 w-4 shrink-0" />
                      <span>{detailTask.platform}</span>
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant={detailTask.status === 'done' ? 'default' : 'secondary'}
                    className={cn(
                      "capitalize",
                      detailTask.status === 'done' && "bg-green-500",
                      detailTask.status === 'in_progress' && "bg-yellow-500 text-white border-0",
                    )}
                  >
                    {statusCfg.label}
                  </Badge>
                </div>

                {/* Description */}
                {detailTask.description && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Descrição</p>
                    <p className="text-sm whitespace-pre-wrap break-words">{detailTask.description}</p>
                  </div>
                )}

                {/* Notes */}
                {detailTask.notes && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Notas</p>
                    <p className="text-sm whitespace-pre-wrap break-words">{detailTask.notes}</p>
                  </div>
                )}


              </div>

              <DialogFooter className="px-5 py-4 border-t shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => { setDetailTask(null); openEditModal(detailTask); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDetailTask(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          );
        })()}
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover tarefa?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

