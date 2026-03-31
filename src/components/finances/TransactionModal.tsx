import { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { FinanceTransaction, FinanceCategory, TransactionType, ExpenseClassification } from '@/types/finance';
import { useFinances } from '@/hooks/useFinances';
import { useOrganization } from '@/hooks/useOrganization';
import { Plus, Check, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: FinanceTransaction;
}

export function TransactionModal({ open, onOpenChange, transaction }: TransactionModalProps) {
  const { organizationId, currencySymbol } = useOrganization();
  const { categories, createTransaction, updateTransaction, createCategory } = useFinances();
  
  const [type, setType] = useState<TransactionType>(transaction?.type || 'RECEITA');
  const [description, setDescription] = useState(transaction?.description || '');
  const [amount, setAmount] = useState(transaction?.amount.toString() || '');
  const [date, setDate] = useState(transaction?.date || new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState(transaction?.category_id || '');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [classification, setClassification] = useState<ExpenseClassification>(transaction?.classification || 'UNICA');
  const [isPaid, setIsPaid] = useState(transaction?.is_paid ?? true);
  const [dueDate, setDueDate] = useState(transaction?.due_date || new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setDescription(transaction.description);
      setAmount(transaction.amount.toString());
      setDate(transaction.date);
      setCategoryId(transaction.category_id || '');
      setClassification(transaction.classification || 'UNICA');
      setIsPaid(transaction.is_paid);
      setDueDate(transaction.due_date || transaction.date);
    } else {
      setType('RECEITA');
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategoryId('');
      setClassification('UNICA');
      setIsPaid(true);
      setDueDate(new Date().toISOString().split('T')[0]);
    }
  }, [transaction, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;

    const payload = {
      organization_id: organizationId,
      type,
      description,
      amount: parseFloat(amount),
      date,
      category_id: categoryId || null,
      classification: type === 'DESPESA' ? classification : null,
      is_paid: isPaid,
      due_date: isPaid ? date : dueDate
    };

    if (transaction) {
      await updateTransaction.mutateAsync({ id: transaction.id, updates: payload as any });
    } else {
      await createTransaction.mutateAsync(payload as any);
    }
    onOpenChange(false);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName || !organizationId) return;
    const cat = (await createCategory.mutateAsync({
      organization_id: organizationId,
      name: newCategoryName,
      type: type === 'SALDO INICIAL' ? 'RECEITA' : type as 'RECEITA' | 'DESPESA'
    })) as any;
    setCategoryId(cat.id);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{transaction ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo de Lançamento <span className="text-primary">*</span></Label>
              <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEITA">RECEITA (+)</SelectItem>
                  <SelectItem value="DESPESA">DESPESA (-)</SelectItem>
                  <SelectItem value="SALDO INICIAL">SALDO INICIAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === 'DESPESA' && (
              <div className="grid gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label htmlFor="classification">Classificação da Despesa <span className="text-primary">*</span></Label>
                <Select value={classification} onValueChange={(v) => setClassification(v as ExpenseClassification)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a classificação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXA">FIXA (Recorrente)</SelectItem>
                    <SelectItem value="VARIAVEL">VARIÁVEL</SelectItem>
                    <SelectItem value="UNICA">ÚNICA (Eventual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/20">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">Status do Pagamento</Label>
                <p className="text-xs text-muted-foreground">
                  {isPaid ? "Lançamento concluído (afeta o saldo)" : "Conta a pagar (previsão futura)"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isPaid ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                  {isPaid ? 'Pago' : 'Pendente'}
                </span>
                <Switch 
                  checked={isPaid} 
                  onCheckedChange={setIsPaid}
                />
              </div>
            </div>

            {!isPaid && (
              <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label htmlFor="due_date" className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Prazo de Pagamento (Vencimento) <span className="text-primary">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(new Date(dueDate + 'T00:00:00'), "dd/MM/yyyy") : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate ? new Date(dueDate + 'T00:00:00') : undefined}
                      onSelect={(date) => setDueDate(date ? format(date, 'yyyy-MM-dd') : '')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="date">Data do Pagamento/Recebimento <span className="text-primary">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(new Date(date + 'T00:00:00'), "dd/MM/yyyy") : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date ? new Date(date + 'T00:00:00') : undefined}
                    onSelect={(d) => setDate(d ? format(d, 'yyyy-MM-dd') : '')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Categoria <span className="text-primary">*</span></Label>
              {isAddingCategory ? (
                <div className="flex gap-2">
                  <Input 
                    value={newCategoryName} 
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nome da categoria"
                    autoFocus
                  />
                  <Button type="button" onClick={handleAddCategory} size="sm">OK</Button>
                  <Button type="button" variant="ghost" onClick={() => setIsAddingCategory(false)} size="sm">X</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.type === (type === 'SALDO INICIAL' ? 'RECEITA' : type)).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setIsAddingCategory(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição <span className="text-primary">*</span></Label>
              <Input 
                id="description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Ex: Venda de Website" 
                required 
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Valor <span className="text-primary">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
                <Input 
                  id="amount" 
                  type="number" 
                  step="0.01" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  className="pl-12" 
                  placeholder="0,00"
                  required 
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createTransaction.isPending || updateTransaction.isPending}>
              {transaction ? 'Salvar Alterações' : 'Confirmar Lançamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
