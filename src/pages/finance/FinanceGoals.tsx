import { useState } from 'react';
import { Plus, Target, Trophy } from 'lucide-react';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Button } from '@/components/ui/button';
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
import { useUserRole } from '@/hooks/useUserRole';
import { useFinanceGoals } from '@/hooks/finance';
import {
  FinanceSidebar,
  FinanceStatsCard,
  GoalCard,
  GoalModal,
} from '@/components/finance';
import type { FinanceGoal, GoalFormData } from '@/types/finance';

export default function FinanceGoals() {
  const { canManageFinance } = useUserRole();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinanceGoal | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { 
    goals, 
    loading, 
    stats, 
    createGoal, 
    updateGoal, 
    deleteGoal 
  } = useFinanceGoals(year);

  const handleSaveGoal = async (data: GoalFormData): Promise<boolean> => {
    if (editingGoal) {
      return await updateGoal(editingGoal.id, data);
    }
    const result = await createGoal(data);
    return result !== null;
  };

  const handleEditGoal = (goal: FinanceGoal) => {
    setEditingGoal(goal);
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await deleteGoal(deleteId);
      setDeleteId(null);
    }
  };

  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <AnimatedContainer animation="fade-in">
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Metas & OKRs</h1>
            <p className="text-muted-foreground">Defina e acompanhe suas metas financeiras</p>
          </div>
          {canManageFinance && (
            <Button onClick={() => { setEditingGoal(undefined); setModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </Button>
          )}
        </div>

        <FinanceSidebar />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <FinanceStatsCard
            title="Total de Metas"
            value={stats.total.toString()}
            icon={Target}
          />
          <FinanceStatsCard
            title="Metas Atingidas"
            value={stats.achieved.toString()}
            icon={Trophy}
            variant="income"
          />
          <div className="flex items-center justify-center">
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Goals List */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma meta definida para {year}</p>
            {canManageFinance && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => { setEditingGoal(undefined); setModalOpen(true); }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira meta
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={handleEditGoal}
                onDelete={(id) => setDeleteId(id)}
                canManage={canManageFinance}
              />
            ))}
          </div>
        )}

        <GoalModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          goal={editingGoal}
          onSave={handleSaveGoal}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Meta</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.
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
