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
      <AlertDialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-[#1c1c1e] text-white">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-br from-orange-500 via-red-500 to-red-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-black/10 blur-xl" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-black/10 border border-white/20">
              <Trash2 className="h-8 w-8 text-white" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-white mb-2">Eliminar Cliente</AlertDialogTitle>
            <AlertDialogDescription className="text-white/90 text-sm max-w-sm mx-auto">
              Esta ação é <strong className="text-white font-black">irreversível</strong>. Todos os dados associados a este cliente serão apagados e não poderão ser recuperados.
            </AlertDialogDescription>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-300">O que será eliminado:</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-zinc-400">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
                Todas as informações do cliente
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-400">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
                Histórico de conversas com a IA
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-400">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
                Checklist e relatórios de tarefas
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-400">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                </div>
                Todas as atividades registadas
              </li>
            </ul>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/5">
            <p className="text-sm text-zinc-400">
              Para confirmar, escreva: <strong className="text-white">"{clientName}"</strong>
            </p>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Nome da empresa"
              disabled={isDeleting}
              className="bg-[#2a2a2c] border-white/5 focus-visible:ring-red-500/50 text-white placeholder:text-zinc-500 h-11"
            />
          </div>

          <div className="flex flex-row-reverse gap-3 pt-2">
            <Button
              onClick={handleDelete}
              disabled={!isConfirmValid || isDeleting}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-0 py-6 text-sm font-semibold shadow-lg shadow-red-500/20 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ...
                </>
              ) : (
                'Eliminar'
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isDeleting}
              className="flex-1 text-zinc-400 hover:text-white hover:bg-white/5 h-auto py-4 text-sm"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
