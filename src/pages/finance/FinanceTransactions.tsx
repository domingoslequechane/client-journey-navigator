import { useState, useMemo } from 'react';
import { Plus, Search, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useTransactions } from '@/hooks/finance';
import {
  FinanceSidebar,
  FinanceStatsCard,
  TransactionCard,
  TransactionModal,
} from '@/components/finance';
import type { Transaction, TransactionFormData, TransactionFilters } from '@/types/finance';

export default function FinanceTransactions() {
  const { currencySymbol } = useOrganizationCurrency();
  const { canManageFinance, canDeleteFinanceRecords } = useUserRole();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters: TransactionFilters = useMemo(() => ({
    type: typeFilter,
    search: search || undefined,
  }), [typeFilter, search]);

  const { 
    transactions, 
    loading, 
    totals, 
    createTransaction, 
    updateTransaction, 
    deleteTransaction 
  } = useTransactions(filters);

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

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await deleteTransaction(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <AnimatedContainer animation="fade-in">
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Lançamentos</h1>
            <p className="text-muted-foreground">Gerencie receitas e despesas</p>
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
        <div className="grid gap-4 md:grid-cols-3">
          <FinanceStatsCard
            title="Receitas"
            value={formatCurrency(totals.income)}
            icon={TrendingUp}
            variant="income"
          />
          <FinanceStatsCard
            title="Despesas"
            value={formatCurrency(totals.expense)}
            icon={TrendingDown}
            variant="expense"
          />
          <FinanceStatsCard
            title="Saldo"
            value={formatCurrency(totals.balance)}
            icon={Wallet}
            variant="balance"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar lançamentos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="income">Receitas</TabsTrigger>
              <TabsTrigger value="expense">Despesas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Transactions List */}
        <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
          {loading ? (
            [...Array(6)].map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : transactions.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">Nenhum lançamento encontrado</p>
              {canManageFinance && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => { setEditingTransaction(undefined); setModalOpen(true); }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro lançamento
                </Button>
              )}
            </div>
          ) : (
            transactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onEdit={handleEditTransaction}
                onDelete={(id) => setDeleteId(id)}
                canManage={canManageFinance}
              />
            ))
          )}
        </div>

        <TransactionModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          transaction={editingTransaction}
          onSave={handleSaveTransaction}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
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
