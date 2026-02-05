import { useState, useMemo } from 'react';
import { Plus, Search, FolderKanban, Activity, Wallet } from 'lucide-react';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import { useUserRole } from '@/hooks/useUserRole';
import { useFinanceProjects } from '@/hooks/finance';
import {
  FinanceSidebar,
  FinanceStatsCard,
  ProjectCard,
  ProjectModal,
} from '@/components/finance';
import type { FinanceProject, ProjectFormData, ProjectFilters, ProjectStatus } from '@/types/finance';
import { PROJECT_STATUS_LABELS } from '@/types/finance';

export default function FinanceProjects() {
  const { currencySymbol } = useOrganizationCurrency();
  const { canManageFinance } = useUserRole();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<FinanceProject | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters: ProjectFilters = useMemo(() => ({
    status: statusFilter,
    search: search || undefined,
  }), [statusFilter, search]);

  const { 
    projects, 
    loading, 
    stats, 
    createProject, 
    updateProject, 
    deleteProject 
  } = useFinanceProjects(filters);

  const formatCurrency = (value: number) => {
    return `${currencySymbol} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const handleSaveProject = async (data: ProjectFormData): Promise<boolean> => {
    if (editingProject) {
      return await updateProject(editingProject.id, data);
    }
    const result = await createProject(data);
    return result !== null;
  };

  const handleEditProject = (project: FinanceProject) => {
    setEditingProject(project);
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await deleteProject(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <AnimatedContainer animation="fade-in">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Projetos</h1>
            <p className="text-muted-foreground">Gerencie orçamentos e projetos</p>
          </div>
          {canManageFinance && (
            <Button onClick={() => { setEditingProject(undefined); setModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          )}
        </div>

        <FinanceSidebar />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <FinanceStatsCard
            title="Total de Projetos"
            value={stats.total.toString()}
            icon={FolderKanban}
          />
          <FinanceStatsCard
            title="Projetos Activos"
            value={stats.active.toString()}
            icon={Activity}
            variant="income"
          />
          <FinanceStatsCard
            title="Orçamento Total"
            value={formatCurrency(stats.totalBudget)}
            icon={Wallet}
            variant="balance"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar projetos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {PROJECT_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum projeto encontrado</p>
            {canManageFinance && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => { setEditingProject(undefined); setModalOpen(true); }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro projeto
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleEditProject}
                onDelete={(id) => setDeleteId(id)}
                canManage={canManageFinance}
              />
            ))}
          </div>
        )}

        <ProjectModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          project={editingProject}
          onSave={handleSaveProject}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Projeto</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AnimatedContainer>
  );
}
