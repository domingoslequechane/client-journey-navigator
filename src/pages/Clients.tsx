import { useState } from 'react';
import { mockClients } from '@/data/mockData';
import { JOURNEY_STAGES, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ClientDetailSheet } from '@/components/clients/ClientDetailSheet';
import { 
  Search, 
  Plus, 
  Building2, 
  Mail, 
  Phone,
  Filter,
  ArrowUpDown
} from 'lucide-react';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string | null>(null);

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.contactName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = !filterStage || client.stage === filterStage;
    return matchesSearch && matchesStage;
  });

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    setSelectedClient(updatedClient);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gerencie todos os seus clientes</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa ou contato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterStage === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStage(null)}
          >
            Todos
          </Button>
          {JOURNEY_STAGES.map((stage) => (
            <Button
              key={stage.id}
              variant={filterStage === stage.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStage(stage.id)}
            >
              {stage.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-4 text-left text-sm font-semibold">Empresa</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Contato</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Indústria</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Fase</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Score</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Último Contato</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const stage = JOURNEY_STAGES.find(s => s.id === client.stage);
                return (
                  <tr 
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{client.companyName}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{client.contactName}</p>
                      <p className="text-xs text-muted-foreground">{client.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-sm">{client.industry}</td>
                    <td className="px-6 py-4">
                      <Badge className={`${stage?.color} text-primary-foreground`}>
                        {stage?.name}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${client.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{client.score}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(client.lastContact).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum cliente encontrado
          </div>
        )}
      </div>

      <ClientDetailSheet
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onUpdate={handleUpdateClient}
      />
    </div>
  );
}
