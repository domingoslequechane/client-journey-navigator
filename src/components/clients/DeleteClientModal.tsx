import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DeleteClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onDeleted: () => void;
}

export function DeleteClientModal({
  open,
  onOpenChange,
  clientId,
  clientName,
  onDeleted,
}: DeleteClientModalProps) {
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmValid = confirmName.trim().toLowerCase() === clientName.trim().toLowerCase();

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);

    try {
      // 1. Get all conversations for this client
      const { data: conversations } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('client_id', clientId);

      const conversationIds = conversations?.map(c => c.id) || [];

      if (conversationIds.length > 0) {
        // 2. Get all messages from those conversations
        const { data: messages } = await supabase
          .from('ai_messages')
          .select('id')
          .in('conversation_id', conversationIds);

        const messageIds = messages?.map(m => m.id) || [];

        // 3. Delete favorites for those messages
        if (messageIds.length > 0) {
          await supabase
            .from('ai_message_favorites')
            .delete()
            .in('message_id', messageIds);
        }

        // 4. Delete messages
        await supabase
          .from('ai_messages')
          .delete()
          .in('conversation_id', conversationIds);

        // 5. Delete conversations
        await supabase
          .from('ai_conversations')
          .delete()
          .eq('client_id', clientId);
      }

      // 6. Delete activities
      await supabase
        .from('activities')
        .delete()
        .eq('client_id', clientId);

      // 7. Delete checklist items
      await supabase
        .from('checklist_items')
        .delete()
        .eq('client_id', clientId);

      // 8. Delete the client
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: 'Cliente eliminado',
        description: 'Todos os dados foram removidos permanentemente.',
      });

      onOpenChange(false);
      setConfirmName('');
      onDeleted();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Erro ao eliminar',
        description: 'Não foi possível eliminar o cliente. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setConfirmName('');
      }
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Eliminar Cliente Permanentemente</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-4 space-y-3">
            <p>
              Esta acção é <strong className="text-foreground">irreversível</strong> e irá eliminar:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Todas as informações do cliente</li>
              <li>Histórico de conversas com a IA</li>
              <li>Checklist e relatórios de tarefas</li>
              <li>Todas as atividades registadas</li>
            </ul>
            <div className="pt-2">
              <p className="text-sm mb-2">
                Para confirmar, escreva o nome da empresa:{' '}
                <strong className="text-foreground">"{clientName}"</strong>
              </p>
              <Input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="Nome da empresa"
                disabled={isDeleting}
                className="mt-2"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Eliminar Permanentemente
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
