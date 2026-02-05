import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import { useLocale } from '@/hooks/useLocale';
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
  const { dateLocale } = useLocale();
  const isIncome = transaction.type === 'income';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Ícone */}
          <div className={cn(
            'p-2 rounded-full shrink-0 mt-0.5',
            isIncome ? 'bg-emerald-500/10' : 'bg-destructive/10'
          )}>
            {isIncome ? (
              <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
            ) : (
              <ArrowUpRight className="h-5 w-5 text-destructive" />
            )}
          </div>

          {/* Conteúdo Principal */}
          <div className="flex-1 min-w-0">
            {/* Linha 1: Descrição */}
            <p className="font-medium text-foreground line-clamp-2">
              {transaction.description}
            </p>
            
            {/* Linha 2: Data + Cliente (destaque) + Método + Categoria */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-sm">
              <span className="text-muted-foreground">
                {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: dateLocale })}
              </span>
              
              {transaction.clientName && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-medium text-primary">
                    {transaction.clientName}
                  </span>
                </>
              )}
              
              <span>•</span>
              <span className="text-muted-foreground">
                {PAYMENT_METHOD_LABELS[transaction.paymentMethod]}
              </span>
              
              {transaction.categoryName && (
                <Badge 
                  variant="outline" 
                  className="ml-auto shrink-0"
                  style={{ 
                    borderColor: transaction.categoryColor,
                    color: transaction.categoryColor 
                  }}
                >
                  {transaction.categoryName}
                </Badge>
              )}
            </div>
          </div>

          {/* Valor */}
          <div className="text-right shrink-0">
            <p className={cn(
              'text-lg font-semibold whitespace-nowrap',
              isIncome ? 'text-emerald-500' : 'text-destructive'
            )}>
              {isIncome ? '+' : '-'}{transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} {currencySymbol}
            </p>
          </div>

          {/* Ações - Visíveis diretamente */}
          {canManage && (
            <div className="flex items-center gap-1 shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => onEdit(transaction)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(transaction.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
