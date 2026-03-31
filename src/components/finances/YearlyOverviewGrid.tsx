import { useMemo } from 'react';
import { FinanceTransaction } from '@/types/finance';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface YearlyOverviewGridProps {
  transactions: FinanceTransaction[];
  year: number;
}

interface MonthSummary {
  name: string;
  income: number;
  expense: number;
  initialBalance: number;
  total: number;
  isFuture: boolean;
  isCurrent: boolean;
}

export function YearlyOverviewGrid({ transactions, year }: YearlyOverviewGridProps) {
  const { currencySymbol } = useOrganization();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthsData = useMemo(() => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const results: MonthSummary[] = [];
    let carryOverBalance = 0;

    for (let i = 0; i < 12; i++) {
      const isFuture = year === currentYear && i > currentMonth || year > currentYear;

      const monthTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === i && d.getFullYear() === year;
      });

      let income = 0;
      let expense = 0;
      let monthInitialOverride = 0;

      // Só processamos valores se NÃO for futuro
      if (!isFuture) {
        monthTransactions.forEach(t => {
          if (t.type === 'RECEITA') income += Number(t.amount);
          else if (t.type === 'DESPESA') expense += Number(t.amount);
          else if (t.type === 'SALDO INICIAL') monthInitialOverride += Number(t.amount);
        });
      }

      // Saldo inicial é o acumulado + qualquer saldo inicial específico deste mês
      // Se for futuro, o saldo inicial exibido será zero
      const currentMonthInitial = isFuture ? 0 : (carryOverBalance + monthInitialOverride);
      const total = isFuture ? 0 : (currentMonthInitial + income - expense);

      results.push({
        name: months[i],
        income,
        expense,
        initialBalance: currentMonthInitial,
        total,
        isFuture,
        isCurrent: year === currentYear && i === currentMonth
      });

      // Atualiza o carryOver para o próximo mês (apenas se não for futuro)
      if (!isFuture) {
        carryOverBalance = total;
      }
    }

    return results;
  }, [transactions, year, currentMonth, currentYear]);

  const formatValue = (v: number) => {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6 select-none shadow-none hover:shadow-none bg-transparent">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold tracking-tight">Visão Geral Mês a Mês</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-normal">
          preenchido automaticamente
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
        {monthsData.map((m, idx) => (
          <div 
            key={m.name} 
            className={cn(
              "flex flex-col shadow-none hover:shadow-none",
              m.isFuture && "opacity-40 grayscale pointer-events-none"
            )}
          >
            <div className="text-[10px] font-bold text-muted-foreground mb-1 tracking-wider flex items-center gap-2">
              Resultado {m.name}
              {m.isCurrent && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse">
                  Actual
                </span>
              )}
              {m.isFuture && (
                <span className="text-[8px] font-normal px-1.5 py-0.5 rounded-full border border-muted-foreground/30 uppercase tracking-tighter">
                  Futuro
                </span>
              )}
            </div>
            <div className={cn(
              "border-t-[1px] pt-2 space-y-1 transition-all duration-500",
              m.isCurrent ? "border-emerald-500/40" : "border-black/10 dark:border-white/10"
            )}>
              
              {/* Only show Despesa and Receita if they are not zero, or if it's a "busy" month like the example */}
              {(m.income > 0 || m.expense > 0) && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Despesa</span>
                    <span className="font-semibold text-rose-600">
                      -{currencySymbol} {formatValue(m.expense)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Receita</span>
                    <span className="font-semibold text-emerald-600">
                      {currencySymbol} {formatValue(m.income)}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-medium">Saldo Inicial</span>
                <span className="font-semibold">
                  {currencySymbol} {formatValue(m.initialBalance)}
                </span>
              </div>

              <div className="border-t border-black/5 dark:border-white/5 pt-1 mt-1 flex justify-between text-sm font-bold">
                <span className="tracking-tight">Total Geral</span>
                <span className={cn(m.total < 0 ? "text-rose-600" : m.total > 0 ? "text-emerald-600" : "")}>
                  {currencySymbol} {formatValue(m.total)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
