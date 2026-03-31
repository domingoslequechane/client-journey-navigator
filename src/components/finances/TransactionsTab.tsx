import { useState, useMemo } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { FinanceTransaction, FinanceCategory } from '@/types/finance';
import { useOrganization } from '@/hooks/useOrganization';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface TransactionsTabProps {
  transactions: FinanceTransaction[];
  onEdit: (t: FinanceTransaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionsTab({ transactions, onEdit, onDelete }: TransactionsTabProps) {
  const { currencySymbol } = useOrganization();
  const [search, setSearch] = useState('');
  
  const filteredTransactions = useMemo(() => {
    if (!search) return transactions;
    const s = search.toLowerCase();
    return transactions.filter(t => 
      t.description.toLowerCase().includes(s) || 
      t.category?.name?.toLowerCase().includes(s)
    );
  }, [transactions, search]);

  const formatValue = (v: number) => {
    return `${currencySymbol} ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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
          <Button variant="outline" size="sm" className="px-3">
            <Filter className="h-4 w-4 mr-2" />
            Mais Filtros
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[120px]">Data</TableHead>
              <TableHead className="w-[150px]">Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="min-w-[200px]">Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[100px] text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Nenhum lançamento encontrado para este período.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    {format(new Date(t.date), 'dd/MM/yyyy')}
                  </TableCell>
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
                      {t.type}
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
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(t)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10" onClick={() => onDelete(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
