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
 import { supabase } from '@/integrations/supabase/client';
 import { useOrganization } from '@/hooks/useOrganization';
 import { toast } from 'sonner';
 
 const schema = z.object({
   company_name: z.string().min(1, 'Nome da empresa é obrigatório'),
   contact_name: z.string().min(1, 'Nome do contacto é obrigatório'),
   phone: z.string().optional(),
   email: z.string().email('Email inválido').optional().or(z.literal('')),
 });
 
 interface QuickClientModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onClientCreated: (clientId: string) => void;
 }
 
 export function QuickClientModal({
   open,
   onOpenChange,
   onClientCreated,
 }: QuickClientModalProps) {
   const [loading, setLoading] = useState(false);
   const { organizationId } = useOrganization();
 
   const form = useForm<z.infer<typeof schema>>({
     resolver: zodResolver(schema),
     defaultValues: {
       company_name: '',
       contact_name: '',
       phone: '',
       email: '',
     },
   });
 
   const handleSubmit = async (values: z.infer<typeof schema>) => {
     if (!organizationId) {
       toast.error('Organização não encontrada');
       return;
     }
 
     setLoading(true);
     try {
       const { data: userData } = await supabase.auth.getUser();
       
       const { data, error } = await supabase
         .from('clients')
         .insert({
           company_name: values.company_name,
           contact_name: values.contact_name,
           phone: values.phone || null,
           email: values.email || null,
           organization_id: organizationId,
           user_id: userData.user?.id,
         })
         .select('id')
         .single();
 
       if (error) throw error;
 
       toast.success('Cliente criado com sucesso');
       onClientCreated(data.id);
       onOpenChange(false);
       form.reset();
     } catch (error) {
       console.error('Error creating client:', error);
       toast.error('Erro ao criar cliente');
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle>Novo Cliente</DialogTitle>
         </DialogHeader>
 
         <Form {...form}>
           <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
             <FormField
               control={form.control}
               name="company_name"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Nome da Empresa <span className="text-destructive">*</span></FormLabel>
                   <FormControl>
                     <Input placeholder="Nome da empresa" {...field} />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
             <FormField
               control={form.control}
               name="contact_name"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Nome do Contacto <span className="text-destructive">*</span></FormLabel>
                   <FormControl>
                     <Input placeholder="Nome do contacto" {...field} />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
 
             <div className="grid grid-cols-2 gap-4">
               <FormField
                 control={form.control}
                 name="phone"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Telefone</FormLabel>
                     <FormControl>
                       <Input placeholder="+258..." {...field} />
                     </FormControl>
                   </FormItem>
                 )}
               />
 
               <FormField
                 control={form.control}
                 name="email"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Email</FormLabel>
                     <FormControl>
                       <Input type="email" placeholder="email@exemplo.com" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
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
                 {loading ? 'Criando...' : 'Criar Cliente'}
               </Button>
             </div>
           </form>
         </Form>
       </DialogContent>
     </Dialog>
   );
 }
