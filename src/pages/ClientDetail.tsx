import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { mapDbClientToUiClient } from '@/lib/client-utils';
import { ClientDetailContent } from '@/components/clients/ClientDetailContent';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useHeader } from '@/contexts/HeaderContext';

// Function to fetch client data and checklist items
const fetchClientData = async (identifier: string, organizationId: string) => {
  // Check if identifier is a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  // 1. Fetch Client using either ID or slug
  let query = supabase.from('clients').select('*');
  
  if (isUUID) {
    query = query.eq('id', identifier);
  } else {
    query = query.eq('slug', identifier);
  }

  const { data: clientData, error: clientError } = await query
    .eq('organization_id', organizationId)
    .single();

  if (clientError) throw clientError;
  if (!clientData) throw new Error('Client not found');

  // Use the actual client ID for subsequent queries
  const actualClientId = clientData.id;

  // 2. Fetch Checklist Items for this client
  const { data: checklistData, error: checklistError } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('client_id', actualClientId);

  if (checklistError) throw checklistError;

  // 3. Map to UI Client type
  return mapDbClientToUiClient(clientData, checklistData || []);
};

export default function ClientDetail() {
  const { clientIdOrSlug } = useParams<{ clientIdOrSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setBackAction, setCustomTitle } = useHeader();
  const { organizationId } = useOrganization();

  // Handle back navigation - go to previous page or fallback to clients
  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/app/clients');
    }
  };

  const { data: client, isLoading, error, refetch } = useQuery<Client, Error>({
    queryKey: ['client', organizationId, clientIdOrSlug],
    queryFn: () => fetchClientData(clientIdOrSlug!, organizationId!),
    enabled: !!clientIdOrSlug && !!organizationId,
  });

  useEffect(() => {
    if (error) {
      toast({ title: 'Erro ao carregar cliente', description: error.message, variant: 'destructive' });
    }
  }, [error]);

  useEffect(() => {
    if (client) {
      setCustomTitle(client.companyName);
      setBackAction(() => handleBack);
    }
    return () => {
      setCustomTitle(null);
      setBackAction(null);
    };
  }, [client, setCustomTitle, setBackAction]);

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
        .eq('id', updatedClient.id)
        .eq('organization_id', organizationId);

      if (stageError) {
        toast({ title: 'Erro ao atualizar fase', description: stageError.message, variant: 'destructive' });
        return;
      }

      // Automation: CRM -> Finance
      // When moving to operational stages, auto-generate a revenue entry
      const operationalDbStages = ['producao', 'trafego', 'retencao', 'fidelizacao'];
      if (operationalDbStages.includes(newDbStage) && dbStageMap[client.stage] !== newDbStage) {
        const { error: finError } = await (supabase.from('finances_transactions') as any).insert({
          organization_id: organizationId,
          type: 'RECEITA',
          amount: updatedClient.monthlyBudget,
          description: `Mensalidade Automática: ${updatedClient.companyName}`,
          date: new Date().toISOString(),
          is_paid: true,
          classification: 'VARIAVEL'
        });

        if (!finError) {
          toast({ 
            title: 'Financeiro Atualizado', 
            description: `Receita de MT ${updatedClient.monthlyBudget.toLocaleString()} gerada automaticamente.` 
          });
        }
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
    <div className="p-4 md:p-8 w-full">
      <AnimatedContainer animation="fade-up" delay={0.1}>
        <ClientDetailContent 
          client={client} 
          onUpdate={handleUpdateClient} 
          userId={user?.id} 
          onBack={handleBack}
        />
      </AnimatedContainer>
    </div>
  );
}