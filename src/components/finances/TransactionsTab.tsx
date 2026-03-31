import { useState, useMemo, Fragment } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { FinanceTransaction, FinanceCategory } from '@/types/finance';
import { useOrganization } from '@/hooks/useOrganization';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Search, Filter, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';

import { 
  Popover, PopoverContent, PopoverTrigger 
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

interface TransactionsTabProps {
  transactions: FinanceTransaction[];
  onEdit: (t: FinanceTransaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionsTab({ transactions, onEdit, onDelete }: TransactionsTabProps) {
  const { currencySymbol } = useOrganization();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search text filter
      const matchesSearch = !search || 
        t.description.toLowerCase().includes(search.toLowerCase()) || 
        t.category?.name?.toLowerCase().includes(search.toLowerCase());
      
      // Type filter
      const matchesType = filterType === 'all' || t.type === filterType;
      
      // Status filter
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'paid' && t.is_paid) || 
        (filterStatus === 'pending' && !t.is_paid);
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [transactions, search, filterType, filterStatus]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, FinanceTransaction[]> = {};
    filteredTransactions.forEach(t => {
      // Create a key based on the day (YYYY-MM-DD)
      const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    // Sort dates in descending order
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  const formatValue = (v: number) => {
    return `${currencySymbol} ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  return (
    <div className="space-y-4">
      {/* Filters Area */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar por descrição ou categoria..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={`px-3 h-10 ${(filterType !== 'all' || filterStatus !== 'all') ? 'border-primary text-primary bg-primary/5' : ''}`}>
                <Filter className="h-4 w-4 mr-2" />
                Mais Filtros
                {(filterType !== 'all' || filterStatus !== 'all') && (
                  <Badge variant="secondary" className="ml-2 px-1 text-[10px] bg-primary text-white h-4 min-w-4 flex items-center justify-center border-none">
                    !
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-4" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground">Tipo de lançamento</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="RECEITA">Receitas</SelectItem>
                      <SelectItem value="DESPESA">Despesas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground">Status de pagamento</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="paid">Pago / Recebido</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs h-8 text-muted-foreground hover:text-primary"
                  onClick={() => { setFilterType('all'); setFilterStatus('all'); }}
                >
                  Limpar filtros
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[150px]">Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="min-w-[200px]">Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[100px] text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Nenhum lançamento encontrado para este período.
                </TableCell>
              </TableRow>
            ) : (
              groupedTransactions.map(([dateKey, items]) => (
                <Fragment key={dateKey}>
                  {/* Group Header */}
                  <TableRow className="bg-muted/20 hover:bg-muted/20 border-y">
                    <TableCell colSpan={5} className="py-2.5 px-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-zinc-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {getDateLabel(dateKey)}
                        <span className="ml-auto text-[10px] font-normal lowercase bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-600 dark:text-zinc-400">
                          {items.length} {items.length === 1 ? 'lançamento' : 'lançamentos'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Group Items */}
                  {items.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/30 transition-colors border-none group/row">
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            t.type === 'RECEITA' 
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                            : t.type === 'DESPESA' 
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' 
                            : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          }
                        >
                          {t.type.charAt(0) + t.type.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {t.category?.name || '-'}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {t.description}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${
                        t.type === 'RECEITA' ? 'text-emerald-600' : t.type === 'DESPESA' ? 'text-rose-600' : 'text-blue-600'
                      }`}>
                        {t.type === 'DESPESA' ? '-' : ''}{formatValue(t.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(t)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10" onClick={() => onDelete(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
