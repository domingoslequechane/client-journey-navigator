import { useState } from 'react';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Plus, LayoutDashboard, ListFilter, Settings2, Download, Wallet, Landmark 
} from 'lucide-react';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { OverviewTab } from '@/components/finances/OverviewTab';
import { TransactionsTab } from '@/components/finances/TransactionsTab';
import { CategoriesTab } from '@/components/finances/CategoriesTab';
import { DebtsTab } from '@/components/finances/DebtsTab';
import { TransactionModal } from '@/components/finances/TransactionModal';
import { useFinances } from '@/hooks/useFinances';
import { FinanceTransaction } from '@/types/finance';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

export default function Finances() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState('overview');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | undefined>();

  const { useTransactionsQuery, deleteTransaction } = useFinances();
  
  // Filter transactions by selected month/year
  const { data: transactions = [], isLoading } = useTransactionsQuery(month, year);

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const handleEdit = (t: FinanceTransaction) => {
    setEditingTransaction(t);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
      await deleteTransaction.mutateAsync(id);
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast({ title: 'Aviso', description: 'Nenhum lançamento para exportar neste período.', variant: 'destructive' });
      return;
    }

    const headers = ['Data', 'Tipo', 'Categoria', 'Descricao', 'Valor', 'Status', 'Classificacao'];
    const rows = transactions.map(t => [
      `"${new Date(t.date).toLocaleDateString('pt-BR')}"`,
      `"${t.type}"`,
      `"${t.category?.name || '-'}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      `"${t.is_paid ? 'Pago' : 'Pendente'}"`,
      `"${t.classification || '-'}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_financeiro_${months.find(m => m.value === month)?.label}_${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Sucesso', description: 'Relatório exportado com sucesso!' });
  };

  return (
    <AnimatedContainer animation="fade-in">
      <div className="p-4 md:p-8 pt-2 md:pt-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Módulo Financeiro</h1>
            </div>
            <p className="text-muted-foreground ml-11">Controle profissional de fluxo de caixa</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex gap-2 bg-muted/50 p-1 rounded-xl items-center">
              <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger className="w-[140px] border-none bg-transparent h-9 focus:ring-0">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="w-[1px] h-4 bg-border mx-1" />
              
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-[100px] border-none bg-transparent h-9 focus:ring-0">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => { setEditingTransaction(undefined); setModalOpen(true); }}
              className="shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Lançamento
            </Button>
          </div>
        </div>

        {/* Main Tabs Container */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between border-b pb-1 mb-6 overflow-x-auto overflow-y-hidden">
            <TabsList className="bg-transparent border-none p-0 h-auto gap-8">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 transition-none"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger 
                value="transactions" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 transition-none"
              >
                <ListFilter className="h-4 w-4 mr-2" />
                Lançamentos
              </TabsTrigger>
              <TabsTrigger 
                value="categories" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 transition-none"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Categorias
              </TabsTrigger>
              <TabsTrigger 
                value="debts" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 transition-none"
              >
                <Landmark className="h-4 w-4 mr-2" />
                Contas a Pagar
              </TabsTrigger>
            </TabsList>

            <div className="hidden md:block">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-primary transition-colors"
                onClick={handleExportCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Relatório Mensal
              </Button>
            </div>
          </div>

          <TabsContent value="overview">
            <OverviewTab transactions={transactions} year={year} />
          </TabsContent>
          
          <TabsContent value="transactions">
            <TransactionsTab 
              transactions={transactions} 
              onEdit={handleEdit} 
              onDelete={handleDelete} 
            />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesTab />
          </TabsContent>

          <TabsContent value="debts">
            <DebtsTab />
          </TabsContent>
        </Tabs>

        <TransactionModal 
          open={modalOpen} 
          onOpenChange={setModalOpen} 
          transaction={editingTransaction} 
        />
      </div>
    </AnimatedContainer>
  );
}
