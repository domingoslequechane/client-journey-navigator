import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Trash2, 
  PowerOff, 
  RefreshCw,
  User,
  AlertTriangle
} from 'lucide-react';
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
import { useAtendeAI } from '@/hooks/useAtendeAI';
import { useAtendeAIDetail } from '@/hooks/useAtendeAIDetail';
import { AtendeTabs } from '@/components/atende-ai/AtendeAIParts';
import { DashboardTab } from '@/components/atende-ai/DashboardTab';
import { ConnectionTab } from '@/components/atende-ai/ConnectionTab';
import { AtendeChatTab } from '@/components/atende-ai/AtendeChatTab';
import { AtendeTrainingTab } from '@/components/atende-ai/AtendeTrainingTab';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AtendeAIDetail() {
  const { agentNameSlug } = useParams();
  const navigate = useNavigate();
  const { agents, isLoading, deleteAgent, refreshQR, syncInstance } = useAtendeAI();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Modal State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');

  const agent = agents.find(a => {
    const slug = encodeURIComponent(a.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''));
    return slug === agentNameSlug || a.id === agentNameSlug;
  });

  // Detail hook — provides conversations, messages, config update and connection actions
  const { instance, conversations, conversationsLoading, updateConfig, instanceAction, sendMessage } = useAtendeAIDetail(agent?.id);

  const effectiveAgent = instance || agent;

  // NOTE: We do NOT auto-sync here because it caused a race condition:
  // 1. Agent created locally with evolution_instance_id = null
  // 2. Page loads, auto-sync fires
  // 3. Sync sees no evolution_instance_id -> deletes the local record
  // 4. Page shows "Instância não encontrada"
  // Manual sync via the button is the safe approach.

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6 min-h-screen bg-white dark:bg-[#0c0c0c] text-zinc-900 dark:text-white overflow-hidden animate-in fade-in duration-700">
         <Skeleton className="h-12 w-1/3 bg-zinc-100 dark:bg-[#1a1a1a] rounded-md" />
         <div className="grid grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 bg-zinc-100 dark:bg-[#1a1a1a] rounded-md" />)}
         </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-900 dark:text-white p-10 bg-white dark:bg-[#0c0c0c]">
        <div className="p-10 border border-dashed border-zinc-200 dark:border-[#222] rounded-md text-center space-y-6">
           <PowerOff className="h-10 w-10 text-[#ff7a00]/40 mx-auto" />
           <p className="text-zinc-500 font-medium text-sm">Instância não encontrada</p>
           <Button variant="outline" onClick={() => navigate('/app/atende-ai')} className="rounded-md bg-zinc-50 dark:bg-[#1a1a1a] border-zinc-200 dark:border-[#333] hover:border-[#ff7a00] text-zinc-900 dark:text-white h-10 px-6">
             Voltar ao painel
           </Button>
        </div>
      </div>
    );
  }

  const handleDeleteClick = () => {
    setDeleteConfirmationName('');
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmationName !== agent.name) {
      toast.error('O nome digitado não confere. Digite exatamente o nome do atendente.');
      return;
    }

    try {
      await deleteAgent.mutateAsync(agent);
      toast.success("Atendente removido com sucesso!");
      setIsDeleteDialogOpen(false);
      navigate('/app/atende-ai');
    } catch (e: any) {
      console.error("[DeleteAgent] falhou:", e);
      toast.error(`Erro ao remover atendente: ${e.message || String(e)}`);
    }
  };

  const isOnline = effectiveAgent.status === 'active' || effectiveAgent.whatsapp_connected;
  const clientName = effectiveAgent.clients?.company_name || effectiveAgent.company_name || 'Agência principal';

  return (
    <div className="min-h-screen bg-white dark:bg-[#0c0c0c] text-zinc-900 dark:text-white selection:bg-[#ff7a00]/30 overflow-x-hidden pb-20 transition-colors duration-300">
      <div className="space-y-6 p-4 md:p-6 pt-6 md:pt-6 pb-12 animate-in fade-in duration-500">
        
        {/* Header navigation and actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/app/atende-ai')}
              className="h-9 w-9 rounded-md bg-zinc-50 dark:bg-[#1a1a1a] text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
               <div className="flex items-center gap-2">
                 <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                   {effectiveAgent.name}
                 </h1>
                 <span className={cn(
                    "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full",
                    effectiveAgent.whatsapp_connected 
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                      : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                 )}>
                   {effectiveAgent.whatsapp_connected ? 'Conectado' : 'Desconectado'}
                 </span>
               </div>
               <p className="text-sm text-zinc-500 font-medium flex items-center gap-2">
                  <User className="h-3 w-3" />
                  {clientName}
               </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {effectiveAgent.evolution_instance_id && (
               <Button 
                  onClick={() => instanceAction.mutate({ action: 'status' })}
                  disabled={instanceAction.isPending}
                  variant="outline" 
                  className="h-9 gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border-zinc-200 dark:border-zinc-800 rounded-md text-sm transition-colors"
               >
                 <RefreshCw className={cn("h-4 w-4", instanceAction.isPending && "animate-spin")} />
                 {instanceAction.isPending ? 'Sincronizando...' : 'Sincronizar'}
               </Button>
             )}

            <Button 
              onClick={handleDeleteClick}
              className="h-9 gap-2 bg-red-600 hover:bg-red-500 text-white border-none rounded-md text-sm font-bold shadow-sm transition-all"
            >
              <Trash2 className="h-4 w-4" />
              Apagar atendente
            </Button>

            <div className="flex items-center gap-3 pl-3 border-l border-zinc-100 dark:border-zinc-800 h-9">
               <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-2 w-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.1)]",
                    effectiveAgent.whatsapp_connected ? "bg-emerald-500 shadow-emerald-500/20" : "bg-zinc-400 shadow-zinc-400/20"
                  )} />
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-tight whitespace-nowrap">
                    {effectiveAgent.whatsapp_connected ? 'Sistema Operacional' : 'Aguardando Pareamento'}
                  </span>
               </div>
            </div>
          </div>
        </div>

        {/* Functional Tabs */}
        <AtendeTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Tab Content Rendering */}
        <article className="min-h-[500px]">
          {activeTab === 'dashboard' && <DashboardTab agent={effectiveAgent} />}
          {activeTab === 'connection' && effectiveAgent && (
            <ConnectionTab 
              agent={effectiveAgent} 
              instanceAction={instanceAction}
            />
          )}
          
          {activeTab === 'chat' && (
            <AtendeChatTab
              instance={effectiveAgent}
              conversations={conversations}
              isLoading={conversationsLoading}
              sendMessage={sendMessage}
            />
          )}

          {activeTab === 'training' && (
            <AtendeTrainingTab
              instance={effectiveAgent}
              updateConfig={updateConfig}
            />
          )}
        </article>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md border-red-500/30 dark:border-red-500/40 bg-white dark:bg-[#0c0c0c] text-zinc-900 dark:text-white shadow-xl shadow-red-500/5">
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-sm">
                  <AlertTriangle className="h-7 w-7 text-red-500" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl font-bold tracking-tight text-red-600 dark:text-red-500">
                Apagar Atendente
              </DialogTitle>
              <DialogDescription className="text-center text-sm text-zinc-500 mt-2">
                Esta ação apagará a instância <strong>{agent.name}</strong> definitivamente da plataforma e o desconectará do Whatsapp. Essa ação não poderá ser desfeita.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="confirm-name" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 normal-case">
                  Digite <span className="text-red-500 font-bold">"{agent.name}"</span> para confirmar
                </Label>
                <Input
                  id="confirm-name"
                  placeholder={agent.name}
                  value={deleteConfirmationName}
                  onChange={(e) => setDeleteConfirmationName(e.target.value)}
                  className="h-10 rounded-md border-zinc-200 dark:border-[#222] bg-zinc-50/50 dark:bg-[#121212] focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:border-red-500 transition-all font-medium"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2 pt-2">
               <Button
                variant="ghost"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="flex-1 h-10 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
               >
                 Cancelar
               </Button>
               <Button
                 onClick={handleConfirmDelete}
                 disabled={deleteConfirmationName !== agent.name || deleteAgent.isPending}
                 className="flex-[1.5] h-10 rounded-md font-bold bg-red-600 hover:bg-red-500 text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {deleteAgent.isPending ? 'Apagando...' : 'Excluir definitivamente'}
               </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
