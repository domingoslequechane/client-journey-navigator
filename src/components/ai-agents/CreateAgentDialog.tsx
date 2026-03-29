import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAIAgents } from '@/hooks/useAIAgents';
import { useAtendeAI } from '@/hooks/useAtendeAI';
import { useClients } from '@/hooks/useClients';
import { toast } from 'sonner';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAgentDialog({ open, onOpenChange }: CreateAgentDialogProps) {
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState<string>('');
  const { createAgent: createLegacyAgent } = useAIAgents();
  const { createAgent: createAtendeAgent } = useAtendeAI();
  const { data: clients } = useClients();
  const navigate = useNavigate();
  const location = useLocation();

  const isAtendeAI = location.pathname.includes('/app/atende-ai');

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('O nome do atendente é obrigatório');
      return;
    }

    if (!clientId) {
      toast.error('A associação a um cliente é obrigatória');
      return;
    }

    try {
      let result;
      if (isAtendeAI) {
        result = await createAtendeAgent.mutateAsync({ 
          name: name.trim(),
          client_id: clientId
        });
      } else {
        result = await createLegacyAgent.mutateAsync({ 
          name: name.trim(),
          client_id: clientId 
        });
      }

      onOpenChange(false);
      setName('');
      setClientId('');
      
      const basePath = isAtendeAI ? '/app/atende-ai' : '/app/ai-agents';
      // Navigate using the secure unique ID to prevent agent collisions
      navigate(`${basePath}/${result.id}`);
    } catch {
      // Error is already shown by the hook's onError handler
    }
  };

  const isPending = isAtendeAI ? createAtendeAgent.isPending : createLegacyAgent.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-md border-zinc-200 dark:border-zinc-800 shadow-xl",
        isAtendeAI ? "bg-white dark:bg-[#0c0c0c] text-zinc-900 dark:text-white" : ""
      )}>
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className={cn(
              "h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm",
              isAtendeAI ? "bg-[#ff7a00]/10 border border-[#ff7a00]/20" : "bg-primary/10"
            )}>
              <Bot className={cn("h-7 w-7", isAtendeAI ? "text-[#ff7a00]" : "text-primary")} />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-bold tracking-tight">
            {isAtendeAI ? 'Novo atendente digital' : 'Novo agente IA'}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-zinc-500">
            {isAtendeAI 
              ? 'Configure um novo atendente inteligente para o seu WhatsApp.' 
              : 'Crie um agente de atendimento inteligente para sua organização.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="agent-name" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 normal-case">
              Nome do atendente <span className="text-red-500">*</span>
            </Label>
            <Input
              id="agent-name"
              placeholder="Ex: Consultor de Vendas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-md border-zinc-200 dark:border-[#222] bg-zinc-50/50 dark:bg-[#121212] focus:ring-2 focus:ring-[#ff7a00]/20 focus:border-[#ff7a00]/40 transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-select" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 normal-case">
              Cliente <span className="text-red-500">*</span>
            </Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="client-select" className="h-10 rounded-md border-zinc-200 dark:border-[#222] bg-zinc-50/50 dark:bg-[#121212] font-medium transition-all focus:ring-2 focus:ring-[#ff7a00]/20">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#0c0c0c] border-zinc-200 dark:border-zinc-800">
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id} className="rounded-md">
                    {client.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-10 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isPending}
            className={cn(
              "flex-[1.5] h-10 rounded-md font-bold shadow-sm transition-all active:scale-[0.98]",
              isAtendeAI 
                ? "bg-[#ff7a00] hover:bg-[#e66e00] text-white" 
                : "bg-primary hover:bg-primary/90"
            )}
          >
            {isPending ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Criando...
              </div>
            ) : (
              'Criar agora'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
