import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownLeft, ArrowUpRight, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import type { Transaction } from '@/types/finance';
import { PAYMENT_METHOD_LABELS } from '@/types/finance';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  canManage?: boolean;
}

export function TransactionCard({
  transaction,
  onEdit,
  onDelete,
  canManage = true,
}: TransactionCardProps) {
  const { currencySymbol } = useOrganizationCurrency();
  const isIncome = transaction.type === 'income';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={cn(
            'p-2 rounded-full shrink-0',
            isIncome ? 'bg-emerald-500/10' : 'bg-destructive/10'
          )}>
            {isIncome ? (
              <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
            ) : (
              <ArrowUpRight className="h-5 w-5 text-destructive" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{transaction.description}</p>
              {transaction.categoryName && (
                <Badge 
                  variant="outline" 
                  className="shrink-0"
                  style={{ 
                    borderColor: transaction.categoryColor,
                    color: transaction.categoryColor 
                  }}
                >
                  {transaction.categoryName}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{format(new Date(transaction.date), 'dd MMM yyyy', { locale: ptBR })}</span>
              {transaction.clientName && (
                <>
                  <span>•</span>
                  <span className="truncate">{transaction.clientName}</span>
                </>
              )}
              <span>•</span>
              <span>{PAYMENT_METHOD_LABELS[transaction.paymentMethod]}</span>
            </div>
          </div>

          {/* Amount */}
          <p className={cn(
            'text-lg font-semibold shrink-0',
            isIncome ? 'text-emerald-500' : 'text-destructive'
          )}>
            {isIncome ? '+' : '-'} {currencySymbol} {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>

          {/* Actions */}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(transaction)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(transaction.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
