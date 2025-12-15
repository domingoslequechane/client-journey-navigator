import { useState } from 'react';
import { mockClients } from '@/data/mockData';
import { OPERATIONAL_FLOW_STAGES, Client, TEMPERATURE_LABELS } from '@/types';
import { ClientDetailSheet } from '@/components/clients/ClientDetailSheet';
import { Button } from '@/components/ui/button';
import { Plus, Cog, Megaphone, Heart, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const stageIcons = { production: Cog, campaigns: Megaphone, retention: Heart };

export default function OperationalFlow() {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const operationalClients = clients.filter(c => ['production', 'campaigns', 'retention'].includes(c.stage));
  const getClientsByStage = (stageId: string) => operationalClients.filter(client => client.stage === stageId);

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    setSelectedClient(updatedClient);
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Fluxo Operacional</h1>
          <p className="text-muted-foreground mt-1">Acompanhe os clientes nas fases de execução, gestão de campanhas e retenção</p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 pb-4 min-w-max">
          {OPERATIONAL_FLOW_STAGES.map((stage) => {
            const stageClients = getClientsByStage(stage.id);
            const StageIcon = stageIcons[stage.id as keyof typeof stageIcons];
            return (
              <div key={stage.id} className="w-80 flex flex-col">
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
                      <Link to="/app/new-client">
                        <Button variant="outline" size="sm" className="gap-1">
                          <Plus className="h-4 w-4" /> Adicionar
                        </Button>
                      </Link>
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

      <ClientDetailSheet client={selectedClient} onClose={() => setSelectedClient(null)} onUpdate={handleUpdateClient} />
    </div>
  );
}
