import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FinanceGoal, GoalFormData, GoalType } from '@/types/finance';
import { GOAL_TYPE_LABELS } from '@/types/finance';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  targetAmount: z.number().positive('Valor deve ser positivo'),
  goalType: z.enum(['monthly', 'quarterly', 'yearly']),
  year: z.number().min(2020).max(2100),
  month: z.number().min(1).max(12).optional(),
});

interface GoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: FinanceGoal;
  onSave: (data: GoalFormData) => Promise<boolean>;
}

export function GoalModal({
  open,
  onOpenChange,
  goal,
  onSave,
}: GoalModalProps) {
  const [loading, setLoading] = useState(false);
  const currentYear = new Date().getFullYear();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: goal?.name || '',
      targetAmount: goal?.targetAmount || 0,
      goalType: goal?.goalType || 'monthly',
      year: goal?.year || currentYear,
      month: goal?.month || new Date().getMonth() + 1,
    },
  });

  const goalType = form.watch('goalType');

  const handleSubmit = async (values: z.infer<typeof schema>) => {
    setLoading(true);
    const formData: GoalFormData = {
      name: values.name,
      targetAmount: values.targetAmount,
      goalType: values.goalType,
      year: values.year,
      month: values.goalType === 'monthly' ? values.month : undefined,
    };
    const success = await onSave(formData);
    setLoading(false);
    if (success) {
      onOpenChange(false);
      form.reset();
    }
  };

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
    { value: 12, label: 'Dezembro' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {goal ? 'Editar Meta' : 'Nova Meta'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
             <FormField
               control={form.control}
               name="name"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Nome <span className="text-destructive">*</span></FormLabel>
                   <FormControl>
                     <Input placeholder="Nome da meta" {...field} />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
             <div className="grid grid-cols-2 gap-4">
               <FormField
                 control={form.control}
                 name="targetAmount"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Valor Alvo <span className="text-destructive">*</span></FormLabel>
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
                 name="goalType"
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
                         {(Object.keys(GOAL_TYPE_LABELS) as GoalType[]).map((type) => (
                           <SelectItem key={type} value={type}>
                             {GOAL_TYPE_LABELS[type]}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </FormItem>
                 )}
               />
             </div>
 
             <div className="grid grid-cols-2 gap-4">
               <FormField
                 control={form.control}
                 name="year"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Ano <span className="text-destructive">*</span></FormLabel>
                     <Select 
                       onValueChange={(v) => field.onChange(parseInt(v))} 
                       value={field.value.toString()}
                     >
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                       </FormControl>
                       <SelectContent>
                         {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                           <SelectItem key={year} value={year.toString()}>
                             {year}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </FormItem>
                 )}
               />
 
               {goalType === 'monthly' ? (
                 <FormField
                   control={form.control}
                   name="month"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Mês</FormLabel>
                       <Select 
                         onValueChange={(v) => field.onChange(parseInt(v))} 
                         value={field.value?.toString()}
                       >
                         <FormControl>
                           <SelectTrigger>
                             <SelectValue />
                           </SelectTrigger>
                         </FormControl>
                         <SelectContent>
                           {months.map((month) => (
                             <SelectItem key={month.value} value={month.value.toString()}>
                               {month.label}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </FormItem>
                   )}
                 />
               ) : (
                 <div /> 
               )}
             </div>

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
