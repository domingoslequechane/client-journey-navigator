import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SALES_FUNNEL_STAGES, Client, TEMPERATURE_LABELS, SOURCE_LABELS } from '@/types';
import { mapDbClientToUiClient } from '@/lib/client-utils';
import { ClientDetailSheet } from '@/components/clients/ClientDetailSheet';
import { Button } from '@/components/ui/button';
import { Plus, Search, Target, FileCheck, Phone, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const stageIcons = { prospecting: Search, qualification: Target, closing: FileCheck };

// Map UI stages to DB stages
const uiToDbStageMap: Record<string, string> = {
  prospecting: 'prospeccao',
  qualification: 'reuniao',
  closing: 'contratacao',
};

export default function SalesFunnel() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Fetch clients from Supabase
  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ['sales-funnel-clients'],
    queryFn: async () => {
      // Fetch clients in sales funnel stages
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .in('current_stage', ['prospeccao', 'reuniao', 'contratacao'])
        .order('updated_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Fetch checklist items for all clients
      const clientIds = clientsData?.map(c => c.id) || [];
      const { data: checklistItems, error: checklistError } = await supabase
        .from('checklist_items')
        .select('*')
        .in('client_id', clientIds);

      if (checklistError) throw checklistError;

      // Map DB clients to UI clients
      return (clientsData || []).map(dbClient => {
        const clientChecklist = checklistItems?.filter(item => item.client_id === dbClient.id) || [];
        return mapDbClientToUiClient(dbClient, clientChecklist);
      });
    }
  });

  const getClientsByStage = (stageId: string) => clients.filter(client => client.stage === stageId);

  const handleUpdateClient = async (updatedClient: Client) => {
    // Refetch data after update
    await refetch();
    // Update selected client with fresh data
    const freshClient = clients.find(c => c.id === updatedClient.id);
    if (freshClient) {
      setSelectedClient(freshClient);
    }
  };

  const handleCloseSheet = () => {
    setSelectedClient(null);
    refetch(); // Refresh data when sheet closes
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Funil de Vendas</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Acompanhe os clientes nas fases de prospecção, qualificação e fechamento</p>
        </div>
        <Link to="/app/new-client">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex gap-3 md:gap-4 pb-4 min-w-max">
            {SALES_FUNNEL_STAGES.map((stage) => {
              const stageClients = getClientsByStage(stage.id);
              const StageIcon = stageIcons[stage.id as keyof typeof stageIcons];
              return (
                <div key={stage.id} className="w-72 md:w-80 flex flex-col">
                  <div className={cn('p-4 rounded-t-xl border-t-4', stage.color, stage.borderColor)}>
                    <div className="flex items-center gap-2 mb-1">
                      <StageIcon className="h-5 w-5" />
                      <h3 className="font-semibold">{stage.name}</h3>
                      <Badge variant="secondary" className="ml-auto">{stageClients.length}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{stage.description}</p>
                  </div>
                  
                  <div className="flex-1 bg-muted/30 rounded-b-xl p-3 space-y-3 min-h-[400px]">
                    {stageClients.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground mb-3">Nenhum cliente nesta fase</p>
                        {/* Only show Add button for prospecting stage */}
                        {stage.id === 'prospecting' && (
                          <Link to="/app/new-client">
                            <Button variant="outline" size="sm" className="gap-1">
                              <Plus className="h-4 w-4" /> Adicionar
                            </Button>
                          </Link>
                        )}
                      </div>
                    ) : (
                      stageClients.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-primary font-semibold">{client.companyName.charAt(0)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{client.companyName}</p>
                              <p className="text-sm text-muted-foreground">{client.contactName}</p>
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {client.phone}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant={client.temperature === 'hot' ? 'default' : 'secondary'} className="text-xs">
                              {TEMPERATURE_LABELS[client.temperature]}
                            </Badge>
                            <Badge variant="outline" className="text-xs">{SOURCE_LABELS[client.source]}</Badge>
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Progresso</span>
                              <span>{client.progress}/9</span>
                            </div>
                            <Progress value={(client.progress / 9) * 100} className="h-1.5" />
                          </div>
                          <div className="flex justify-between mt-2 text-xs">
                            <span className="text-muted-foreground">Orçamento Mensal</span>
                            <span className="font-medium text-primary">{client.monthlyBudget.toLocaleString()} MT</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ClientDetailSheet client={selectedClient} onClose={handleCloseSheet} onUpdate={handleUpdateClient} />
    </div>
  );
}
