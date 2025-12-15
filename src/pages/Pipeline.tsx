import { useState } from 'react';
import { mockClients } from '@/data/mockData';
import { JOURNEY_STAGES, Client } from '@/types';
import { PipelineColumn } from '@/components/pipeline/PipelineColumn';
import { ClientDetailSheet } from '@/components/clients/ClientDetailSheet';
import { Button } from '@/components/ui/button';
import { Plus, Filter } from 'lucide-react';

export default function Pipeline() {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const getClientsByStage = (stageId: string) => {
    return clients.filter(client => client.stage === stageId);
  };

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    setSelectedClient(updatedClient);
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground mt-1">Acompanhe seus clientes através da jornada</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtrar
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 pb-4 min-w-max">
          {JOURNEY_STAGES.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              clients={getClientsByStage(stage.id)}
              onClientClick={setSelectedClient}
            />
          ))}
        </div>
      </div>

      <ClientDetailSheet
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onUpdate={handleUpdateClient}
      />
    </div>
  );
}
