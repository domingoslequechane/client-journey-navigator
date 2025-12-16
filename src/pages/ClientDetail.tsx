import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { mapDbClientToUiClient } from '@/lib/client-utils';
import { ClientDetailContent } from '@/components/clients/ClientDetailContent';
import { useAuth } from '@/contexts/AuthContext';

// Function to fetch client data and checklist items
const fetchClientData = async (clientId: string) => {
  // 1. Fetch Client
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (clientError) throw clientError;
  if (!clientData) throw new Error('Client not found');

  // 2. Fetch Checklist Items for this client
  const { data: checklistData, error: checklistError } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('client_id', clientId);

  if (checklistError) throw checklistError;

  // 3. Map to UI Client type
  return mapDbClientToUiClient(clientData, checklistData || []);
};

export default function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState('sales');

  // Handle back navigation - go to previous page or fallback to clients
  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/app/clients');
    }
  };

  const { data: client, isLoading, error, refetch } = useQuery<Client, Error>({
    queryKey: ['client', clientId],
    queryFn: () => fetchClientData(clientId!),
    enabled: !!clientId,
  });

  useEffect(() => {
    if (error) {
      toast({ title: 'Erro ao carregar cliente', description: error.message, variant: 'destructive' });
    }
  }, [error]);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (data) {
        setUserRole(data.role);
        setIsAdmin(data.role === 'admin');
      }
    };
    checkUserRole();
  }, [user]);

  const handleUpdateClient = async (updatedClient: Client) => {
    // This function handles updates to the DB (stage and checklist items)
    
    // Helper map for DB stage names
    const dbStageMap: Record<string, string> = {
      prospecting: 'prospeccao',
      qualification: 'reuniao',
      closing: 'contratacao',
      production: 'producao',
      campaigns: 'trafego',
      retention: 'retencao',
    };
    
    const newDbStage = dbStageMap[updatedClient.stage];
    
    if (client && dbStageMap[client.stage] !== newDbStage) {
      const { error: stageError } = await supabase
        .from('clients')
        .update({ current_stage: newDbStage as any })
        .eq('id', updatedClient.id);
      
      if (stageError) {
        toast({ title: 'Erro ao atualizar fase', description: stageError.message, variant: 'destructive' });
        return;
      }
    }

    // Update Checklist Items (tasks)
    for (const task of updatedClient.tasks) {
      const stageDbName = dbStageMap[task.stageId];
      
      // Check if the task exists in the DB for this client/stage/title combination
      const { data: existingItem } = await supabase
        .from('checklist_items')
        .select('id, completed')
        .eq('client_id', updatedClient.id)
        .eq('stage', stageDbName as any)
        .eq('title', task.title)
        .single();

      if (existingItem) {
        if (existingItem.completed !== task.completed) {
          // Update existing item
          const { error: updateError } = await supabase
            .from('checklist_items')
            .update({ 
              completed: task.completed,
              completed_at: task.completed ? new Date().toISOString() : null,
            })
            .eq('id', existingItem.id);
          
          if (updateError) {
            toast({ title: 'Erro ao atualizar tarefa', description: updateError.message, variant: 'destructive' });
            return;
          }
        }
      } else if (task.completed) {
        // Insert new item if completed and doesn't exist
        const { error: insertError } = await supabase
          .from('checklist_items')
          .insert({
            client_id: updatedClient.id,
            stage: stageDbName as any,
            title: task.title,
            completed: true,
            completed_at: new Date().toISOString(),
          });
        
        if (insertError) {
          toast({ title: 'Erro ao inserir tarefa', description: insertError.message, variant: 'destructive' });
          return;
        }
      }
    }

    toast({ title: 'Sucesso!', description: 'Detalhes do cliente atualizados.' });
    refetch(); // Refetch data to ensure UI consistency
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={handleBack}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-3xl font-bold">Cliente Não Encontrado</h1>
        </div>
        <p className="text-muted-foreground">O ID do cliente é inválido ou o cliente foi removido.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
        <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl font-bold truncate">{client.companyName}</h1>
          <p className="text-sm md:text-base text-muted-foreground">Detalhes e acompanhamento da jornada</p>
        </div>
      </div>
      
      <ClientDetailContent client={client} onUpdate={handleUpdateClient} isAdmin={isAdmin} userRole={userRole} userId={user?.id} />
    </div>
  );
}