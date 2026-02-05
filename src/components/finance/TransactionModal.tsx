import { useState } from 'react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFinanceCategories } from '@/hooks/finance/useFinanceCategories';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import type { Transaction, TransactionFormData, TransactionType, PaymentMethod } from '@/types/finance';
import { PAYMENT_METHOD_LABELS } from '@/types/finance';

const schema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Valor deve ser positivo'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  date: z.string().min(1, 'Data é obrigatória'),
  categoryId: z.string().optional(),
  clientId: z.string().optional(),
  paymentMethod: z.enum(['transfer', 'mpesa', 'emola', 'cash', 'other']),
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
  const [clientSearch, setClientSearch] = useState('');
  const { categories, getCategoriesByType } = useFinanceCategories();
  const { organizationId } = useOrganizationCurrency();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: transaction?.type || 'income',
      amount: transaction?.amount || 0,
      description: transaction?.description || '',
      date: transaction?.date || format(new Date(), 'yyyy-MM-dd'),
      categoryId: transaction?.categoryId || '',
      clientId: transaction?.clientId || '',
      paymentMethod: transaction?.paymentMethod || 'transfer',
      notes: transaction?.notes || '',
    },
  });

  const transactionType = form.watch('type');
  const filteredCategories = getCategoriesByType(transactionType);

  const searchClients = async (search: string) => {
    if (!organizationId || search.length < 2) {
      setClients([]);
      return;
    }

    const { data } = await supabase
      .from('clients')
      .select('id, company_name')
      .eq('organization_id', organizationId)
      .ilike('company_name', `%${search}%`)
      .limit(10);

    setClients(data || []);
  };

  const handleSubmit = async (values: z.infer<typeof schema>) => {
    setLoading(true);
    const formData: TransactionFormData = {
      type: values.type,
      amount: values.amount,
      description: values.description,
      date: values.date,
      paymentMethod: values.paymentMethod,
      categoryId: values.categoryId || undefined,
      clientId: values.clientId || undefined,
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
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <FormControl>
                    <Tabs value={field.value} onValueChange={field.onChange}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="income" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                          Receita
                        </TabsTrigger>
                        <TabsTrigger value="expense" className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
                          Despesa
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Descrição do lançamento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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

            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pesquisar cliente..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Digite para pesquisar..."
                          value={clientSearch}
                          onChange={(e) => {
                            setClientSearch(e.target.value);
                            searchClients(e.target.value);
                          }}
                        />
                      </div>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pagamento</FormLabel>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações adicionais..." {...field} />
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
      </DialogContent>
    </Dialog>
  );
}
