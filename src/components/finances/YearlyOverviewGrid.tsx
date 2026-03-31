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
}

export function YearlyOverviewGrid({ transactions, year }: YearlyOverviewGridProps) {
  const { currencySymbol } = useOrganization();

  const monthsData = useMemo(() => {
    const months = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    const results: MonthSummary[] = [];
    let carryOverBalance = 0;

    // First, find global SALDO INICIAL if any exists at the start of the year or before
    // In this model, we'll look at Jan's Saldo Inicial as the base.
    
    for (let i = 0; i < 12; i++) {
      const monthTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === i && d.getFullYear() === year;
      });

      let income = 0;
      let expense = 0;
      let monthInitialOverride = 0;

      monthTransactions.forEach(t => {
        if (t.type === 'RECEITA') income += Number(t.amount);
        else if (t.type === 'DESPESA') expense += Number(t.amount);
        else if (t.type === 'SALDO INICIAL') monthInitialOverride += Number(t.amount);
      });

      // Saldo inicial is carryOver + any specific initial balance added in this month
      // (usually only in the first month of the series)
      const currentMonthInitial = carryOverBalance + monthInitialOverride;
      const total = currentMonthInitial + income - expense;

      results.push({
        name: months[i],
        income,
        expense,
        initialBalance: currentMonthInitial,
        total
      });

      // Update carryOver for next month
      carryOverBalance = total;
    }

    return results;
  }, [transactions, year]);

  const formatValue = (v: number) => {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold tracking-tight">VISÃO GERAL MÊS A MÊS</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          preenchido automaticamente
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
        {monthsData.map((m, idx) => (
          <div key={m.name} className="flex flex-col">
            <div className="text-[10px] font-bold text-muted-foreground mb-1 tracking-wider">
              RESULTADO {m.name}
            </div>
            <div className="border-t-[1px] border-black/10 dark:border-white/10 pt-2 space-y-1">
              
              {/* Only show Despesa and Receita if they are not zero, or if it's a "busy" month like the example */}
              {(m.income > 0 || m.expense > 0) && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground uppercase font-medium">Despesa</span>
                    <span className="font-semibold text-rose-600">
                      -{currencySymbol} {formatValue(m.expense)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground uppercase font-medium">Receita</span>
                    <span className="font-semibold text-emerald-600">
                      {currencySymbol} {formatValue(m.income)}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground uppercase font-medium">Saldo Inicial</span>
                <span className="font-semibold">
                  {currencySymbol} {formatValue(m.initialBalance)}
                </span>
              </div>

              <div className="border-t border-black/5 dark:border-white/5 pt-1 mt-1 flex justify-between text-sm font-bold">
                <span className="uppercase tracking-tight">Total geral</span>
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
