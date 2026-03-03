import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ClientFilterSelect({ value, onChange, className }: ClientFilterSelectProps) {
  const { user } = useAuth();

  // Fetch clients and their social account status
  const { data: clientsData = { clients: [], configuredClientIds: new Set<string>() }, isLoading } = useQuery({
    queryKey: ['clients-with-social-status', user?.id],
    queryFn: async () => {
      if (!user) return { clients: [], configuredClientIds: new Set<string>() };
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.current_organization_id) return { clients: [], configuredClientIds: new Set<string>() };

      const orgId = profile.current_organization_id;

      // Fetch all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, company_name')
        .eq('organization_id', orgId)
        .order('company_name');

      if (clientsError) throw clientsError;

      // Fetch unique client IDs that have social accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('social_accounts' as any)
        .select('client_id')
        .eq('organization_id', orgId)
        .not('client_id', 'is', null);

      if (accountsError) throw accountsError;

      const configuredClientIds = new Set((accounts || []).map((a: any) => a.client_id));

      return {
        clients: clients || [],
        configuredClientIds
      };
    },
    enabled: !!user,
  });

  const { clients, configuredClientIds } = clientsData;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Todos os clientes" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os clientes</SelectItem>
        {clients.map(client => {
          const isConfigured = configuredClientIds.has(client.id);
          return (
            <SelectItem key={client.id} value={client.id}>
              <div className="flex items-center gap-2">
                <span 
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    isConfigured ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-muted-foreground/20"
                  )} 
                  title={isConfigured ? "Contas configuradas" : "Sem contas"}
                />
                <span className="truncate">{client.company_name}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}