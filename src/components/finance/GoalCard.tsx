import { MoreVertical, Pencil, Trash2, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/hooks/useOrganization';
import type { FinanceGoal } from '@/types/finance';
import { GOAL_TYPE_LABELS } from '@/types/finance';

interface GoalCardProps {
  goal: FinanceGoal;
  onEdit: (goal: FinanceGoal) => void;
  onDelete: (id: string) => void;
  canManage?: boolean;
}

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function GoalCard({
  goal,
  onEdit,
  onDelete,
  canManage = true,
}: GoalCardProps) {
  const { currencySymbol } = useOrganization();
  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const isAchieved = goal.currentAmount >= goal.targetAmount;

  const getPeriodLabel = () => {
    if (goal.goalType === 'monthly' && goal.month) {
      return `${months[goal.month - 1]} ${goal.year}`;
    }
    if (goal.goalType === 'quarterly') {
      return `${goal.year}`;
    }
    return goal.year.toString();
  };

  return (
    <Card className={cn(
      'hover:shadow-md transition-shadow',
      isAchieved && 'border-emerald-500/50 bg-emerald-500/5'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-full',
              isAchieved ? 'bg-emerald-500/20' : 'bg-primary/10'
            )}>
              <Target className={cn(
                'h-5 w-5',
                isAchieved ? 'text-emerald-500' : 'text-primary'
              )} />
            </div>
            <div>
              <h3 className="font-semibold">{goal.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {GOAL_TYPE_LABELS[goal.goalType]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {getPeriodLabel()}
                </span>
              </div>
            </div>
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(goal)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(goal.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className={cn(
              'font-medium',
              isAchieved ? 'text-emerald-500' : 'text-foreground'
            )}>
              {progress.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={progress} 
            className={cn(
              'h-2',
              isAchieved && '[&>div]:bg-emerald-500'
            )} 
          />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {currencySymbol} {goal.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="font-medium">
              {currencySymbol} {goal.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {isAchieved && (
          <Badge className="mt-3 bg-emerald-500 hover:bg-emerald-600">
            Meta atingida! 🎉
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

