import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Wallet, Building2, FolderKanban, Plus } from 'lucide-react';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import { useUserRole } from '@/hooks/useUserRole';
import { useFinanceStats, useTransactions } from '@/hooks/finance';
import {
  FinanceSidebar,
  FinanceStatsCard,
  MonthlyEvolutionChart,
  ExpensesPieChart,
  MonthlyComparisonChart,
  TransactionCard,
  TransactionModal,
} from '@/components/finance';
import type { Transaction, TransactionFormData } from '@/types/finance';

export default function FinanceDashboard() {
  const { t } = useTranslation('finance');
  const { currencySymbol } = useOrganizationCurrency();
  const { canManageFinance } = useUserRole();
  const { stats, monthlyData, categoryData, loading: statsLoading } = useFinanceStats();
  const { transactions, loading: transactionsLoading, createTransaction, updateTransaction, deleteTransaction } = useTransactions();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();

  const formatCurrency = (value: number) => {
    return `${currencySymbol} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const handleSaveTransaction = async (data: TransactionFormData): Promise<boolean> => {
    if (editingTransaction) {
      return await updateTransaction(editingTransaction.id, data);
    }
    const result = await createTransaction(data);
    return result !== null;
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setModalOpen(true);
  };

  const recentTransactions = transactions.slice(0, 5);

  if (statsLoading) {
    return (
    <AnimatedContainer animation="fade-in">
        <div className="space-y-6">
          <FinanceSidebar />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[350px]" />
            <Skeleton className="h-[350px]" />
          </div>
        </div>
      </AnimatedContainer>
    );
  }

  return (
    <AnimatedContainer animation="fade-in">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Finanças</h1>
            <p className="text-muted-foreground">Gerencie o fluxo de caixa da sua agência</p>
          </div>
          {canManageFinance && (
            <Button onClick={() => { setEditingTransaction(undefined); setModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Lançamento
            </Button>
          )}
        </div>

        <FinanceSidebar />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <FinanceStatsCard
            title="Receita Total"
            value={formatCurrency(stats.totalIncome)}
            icon={TrendingUp}
            trend={stats.incomeGrowth}
            variant="income"
          />
          <FinanceStatsCard
            title="Despesas"
            value={formatCurrency(stats.totalExpenses)}
            icon={TrendingDown}
            trend={stats.expenseGrowth}
            variant="expense"
          />
          <FinanceStatsCard
            title="Saldo Líquido"
            value={formatCurrency(stats.netBalance)}
            icon={Wallet}
            variant="balance"
          />
          <FinanceStatsCard
            title="Clientes"
            value={stats.clientCount.toString()}
            subtitle={`${stats.projectCount} projetos activos`}
            icon={Building2}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <MonthlyEvolutionChart data={monthlyData} title="Evolução Anual" />
          <ExpensesPieChart data={categoryData} />
        </div>

        <MonthlyComparisonChart data={monthlyData} />

        {/* Recent Transactions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Últimos Lançamentos</h2>
            <Button variant="ghost" asChild>
              <a href="/app/finance/transactions">Ver todos</a>
            </Button>
          </div>
          <div className="space-y-2">
            {transactionsLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : recentTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum lançamento registrado
              </p>
            ) : (
              recentTransactions.map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  onEdit={handleEditTransaction}
                  onDelete={deleteTransaction}
                  canManage={canManageFinance}
                />
              ))
            )}
          </div>
        </div>

        <TransactionModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          transaction={editingTransaction}
          onSave={handleSaveTransaction}
        />
      </div>
    </AnimatedContainer>
  );
}
