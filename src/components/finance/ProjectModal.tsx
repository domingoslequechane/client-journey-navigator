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
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import type { FinanceProject, ProjectFormData, ProjectStatus } from '@/types/finance';
import { PROJECT_STATUS_LABELS } from '@/types/finance';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  clientId: z.string().optional(),
  budget: z.number().min(0, 'Orçamento deve ser positivo'),
  status: z.enum(['planning', 'in_progress', 'completed', 'cancelled']),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().optional(),
});

interface ProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: FinanceProject;
  onSave: (data: ProjectFormData) => Promise<boolean>;
}

export function ProjectModal({
  open,
  onOpenChange,
  project,
  onSave,
}: ProjectModalProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const { organizationId } = useOrganizationCurrency();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project?.name || '',
      description: project?.description || '',
      clientId: project?.clientId || '',
      budget: project?.budget || 0,
      status: project?.status || 'planning',
      startDate: project?.startDate || format(new Date(), 'yyyy-MM-dd'),
      endDate: project?.endDate || '',
    },
  });

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
    const formData: ProjectFormData = {
      name: values.name,
      budget: values.budget,
      status: values.status,
      startDate: values.startDate,
      description: values.description || undefined,
      clientId: values.clientId || undefined,
      endDate: values.endDate || undefined,
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
            {project ? 'Editar Projeto' : 'Novo Projeto'}
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
                    <Input placeholder="Nome do projeto" {...field} />
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
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descrição do projeto..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

             <div className="grid grid-cols-2 gap-4">
               <FormField
                 control={form.control}
                 name="budget"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Orçamento <span className="text-destructive">*</span></FormLabel>
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
                 name="status"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Status <span className="text-destructive">*</span></FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                       </FormControl>
                       <SelectContent>
                         {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((status) => (
                           <SelectItem key={status} value={status}>
                             {PROJECT_STATUS_LABELS[status]}
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
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                   <FormLabel>Data Início <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Fim</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
