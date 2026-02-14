import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Plus, Filter, CheckCircle2, Clock, Circle, Trash2, Pencil, X, ListTodo } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import { useEditorialTasks, type PeriodFilter, type EditorialTask } from '@/hooks/useEditorialTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Circle; color: string }> = {
  pending: { label: 'Pendente', icon: Circle, color: 'text-muted-foreground' },
  in_progress: { label: 'Em andamento', icon: Clock, color: 'text-warning' },
  done: { label: 'Concluído', icon: CheckCircle2, color: 'text-green-500' },
};

const CONTENT_TYPES = [
  'Post Feed', 'Story', 'Reels', 'Carrossel', 'Blog', 'Email', 'Vídeo', 'Podcast', 'Newsletter', 'Outro'
];

const PLATFORMS = [
  'Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube', 'Twitter/X', 'Blog', 'Email', 'WhatsApp', 'Outro'
];

export default function Editorial() {
  const { t } = useTranslation('common');
  const { organizationId } = useOrganizationCurrency();

  // Filters
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('week');
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Clients list for filter
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<EditorialTask | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formContentType, setFormContentType] = useState('');
  const [formPlatform, setFormPlatform] = useState('');
  const [formStatus, setFormStatus] = useState('pending');

  const { tasks, loading, createTask, updateTask, deleteTask } = useEditorialTasks({
    periodFilter,
    clientFilter,
    statusFilter,
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

  // Group tasks by date
  const groupedTasks = useMemo(() => {
    const groups: Record<string, EditorialTask[]> = {};
    tasks.forEach(task => {
      const key = task.scheduled_date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    return groups;
  }, [tasks]);

  const formatDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setFormTime('');
    setFormClientId(clientFilter || '');
    setFormContentType('');
    setFormPlatform('');
    setFormStatus('pending');
    setModalOpen(true);
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
    setModalOpen(true);
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
    setModalOpen(false);
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

  // Stats
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Linha Editorial
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie as atividades de conteúdo dos seus clientes
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Circle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">Em andamento</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{doneCount}</p>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="all">Tudo</SelectItem>
          </SelectContent>
        </Select>

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

        <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? null : v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="done">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ListTodo className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Nenhuma tarefa encontrada</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Crie tarefas para organizar o conteúdo dos seus clientes.
            </p>
            <Button onClick={openCreateModal} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Criar primeira tarefa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([dateStr, dateTasks]) => {
            const dateObj = parseISO(dateStr);
            const isOverdue = isPast(dateObj) && !isToday(dateObj);

            return (
              <div key={dateStr}>
                <h3 className={cn(
                  "text-sm font-semibold mb-3 capitalize",
                  isOverdue ? "text-destructive" : "text-muted-foreground"
                )}>
                  {formatDateLabel(dateStr)}
                  {isOverdue && ' (atrasado)'}
                </h3>
                <div className="space-y-2">
                  {dateTasks.map(task => {
                    const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusCfg.icon;

                    return (
                      <Card key={task.id} className={cn(
                        "transition-colors",
                        task.status === 'done' && "opacity-60"
                      )}>
                        <CardContent className="p-4 flex items-start gap-3">
                          <button
                            onClick={() => handleStatusToggle(task)}
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
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(task)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirmId(task.id)}>
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
                                <Badge variant="secondary" className="text-xs">
                                  {task.content_type}
                                </Badge>
                              )}
                              {task.platform && (
                                <Badge variant="secondary" className="text-xs">
                                  {task.platform}
                                </Badge>
                              )}
                              {task.scheduled_time && (
                                <span className="text-xs text-muted-foreground">
                                  🕐 {task.scheduled_time}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Título *</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Ex: Post sobre promoção" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Detalhes da tarefa..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
              <div>
                <Label>Hora</Label>
                <Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Cliente *</Label>
              <Select value={formClientId} onValueChange={setFormClientId}>
                <SelectTrigger>
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
                  <SelectTrigger>
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
                  <SelectTrigger>
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
                <SelectTrigger>
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
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formTitle.trim() || !formClientId}>
              {editingTask ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
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
