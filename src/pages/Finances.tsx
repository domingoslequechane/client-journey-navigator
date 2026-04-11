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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Finances() {
  const currentYear = new Date().getFullYear();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [year, setYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState('overview');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { useTransactionsQuery, deleteTransaction } = useFinances();
  
  // Filter transactions by selected range
  const { data: transactions = [], isLoading } = useTransactionsQuery(
    dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
  );

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

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteTransaction.mutateAsync(deletingId);
      setDeletingId(null);
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
    const monthLabel = dateRange?.from ? months[dateRange.from.getMonth()].label : 'periodo';
    link.setAttribute('download', `relatorio_financeiro_${monthLabel}_${year}.csv`);
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
            <div className="flex gap-2 p-1 rounded-xl items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-[260px] justify-start text-left font-normal bg-muted/50 border-none h-10",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                          {format(dateRange.to, "dd/MM/yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy")
                      )
                    ) : (
                      <span>Filtrar por período</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              <div className="w-[1px] h-4 bg-border mx-1" />
              
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-[100px] border-none bg-muted/50 h-10 focus:ring-0">
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

        <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita e os dados serão removidos permanentemente do seu fluxo de caixa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Confirmar Exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AnimatedContainer>
  );
}
