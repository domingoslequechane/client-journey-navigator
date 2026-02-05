 import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFinanceCategories } from '@/hooks/finance/useFinanceCategories';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import type { Transaction, TransactionFormData, TransactionType, PaymentMethod } from '@/types/finance';
import { PAYMENT_METHOD_LABELS } from '@/types/finance';
import { Plus } from 'lucide-react';
import { QuickClientModal } from './QuickClientModal';

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Receita',
  expense: 'Despesa',
};

const NONE_VALUE = '__none__';

const schema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Valor deve ser positivo'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  date: z.string().min(1, 'Data é obrigatória'),
  categoryId: z.string().optional(),
  clientId: z.string().optional(),
  paymentMethod: z.enum(['transfer', 'mpesa', 'emola', 'cash', 'cheque', 'other']),
  notes: z.string().optional(),
});

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction;
  onSave: (data: TransactionFormData) => Promise<boolean>;
}

export function TransactionModal({
  open,
  onOpenChange,
  transaction,
  onSave,
}: TransactionModalProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const { categories, getCategoriesByType } = useFinanceCategories();
  const { organizationId } = useOrganizationCurrency();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: transaction?.type || 'income',
      amount: transaction?.amount || 0,
      description: transaction?.description || '',
      date: transaction?.date || format(new Date(), 'yyyy-MM-dd'),
      categoryId: transaction?.categoryId || undefined,
      clientId: transaction?.clientId || undefined,
      paymentMethod: transaction?.paymentMethod || 'transfer',
      notes: transaction?.notes || '',
    },
  });

  const transactionType = form.watch('type');
  const filteredCategories = getCategoriesByType(transactionType);

   // Reset form when modal opens or transaction changes
   useEffect(() => {
     if (open) {
       form.reset({
         type: transaction?.type || 'income',
         amount: transaction?.amount || 0,
         description: transaction?.description || '',
         date: transaction?.date || format(new Date(), 'yyyy-MM-dd'),
         categoryId: transaction?.categoryId || undefined,
         clientId: transaction?.clientId || undefined,
         paymentMethod: transaction?.paymentMethod || 'transfer',
         notes: transaction?.notes || '',
       });
     }
   }, [open, transaction, form]);
 
  // Load clients
  const loadClients = async () => {
    if (!organizationId) return;
    const { data } = await supabase
      .from('clients')
      .select('id, company_name')
      .eq('organization_id', organizationId)
      .order('company_name')
      .limit(100);
    setClients(data || []);
  };

  useEffect(() => {
    if (open) loadClients();
  }, [organizationId, open]);

  const handleClientCreated = (clientId: string) => {
    loadClients();
    form.setValue('clientId', clientId);
  };

  const handleSubmit = async (values: z.infer<typeof schema>) => {
    setLoading(true);
    const formData: TransactionFormData = {
      type: values.type,
      amount: values.amount,
      description: values.description,
      date: values.date,
      paymentMethod: values.paymentMethod,
      categoryId: values.categoryId === NONE_VALUE ? undefined : values.categoryId,
      clientId: values.clientId === NONE_VALUE ? undefined : values.clientId,
      notes: values.notes || undefined,
    };
    const success = await onSave(formData);
    setLoading(false);
    if (success) {
      onOpenChange(false);
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {transaction ? 'Editar Lançamento' : 'Novo Lançamento'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Row 1: Tipo + Valor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {TRANSACTION_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Descrição do lançamento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row 3: Data + Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || NONE_VALUE}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sem categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Sem categoria</SelectItem>
                        {filteredCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Row 4: Método de Pagamento + Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pagamento <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                          <SelectItem key={method} value={method}>
                            {PAYMENT_METHOD_LABELS[method]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value || NONE_VALUE}>
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Nenhum" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>Nenhum</SelectItem>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={() => setQuickClientOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Row 5: Notas */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações adicionais..." rows={2} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>

        <QuickClientModal
          open={quickClientOpen}
          onOpenChange={setQuickClientOpen}
          onClientCreated={handleClientCreated}
        />
      </DialogContent>
    </Dialog>
  );
}
