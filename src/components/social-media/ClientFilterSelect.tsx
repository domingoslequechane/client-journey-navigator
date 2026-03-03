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

      // Fetch unique client IDs that have ACTIVE social accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('social_accounts')
        .select('client_id')
        .eq('organization_id', orgId)
        .eq('is_connected', true)
        .not('client_id', 'is', null);

      if (accountsError) throw accountsError;

      // Create a set of client IDs that have at least one connected account
      const configuredClientIds = new Set<string>();
      if (accounts && accounts.length > 0) {
        accounts.forEach((a: any) => {
          if (a.client_id) configuredClientIds.add(a.client_id);
        });
      }

      return {
        clients: clients || [],
        configuredClientIds
      };
    },
    enabled: !!user,
    staleTime: 0,
  });

  const { clients, configuredClientIds } = clientsData;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Todos os clientes" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Todos os clientes</span>
          </div>
        </SelectItem>
        {clients.map(client => {
          const isConfigured = configuredClientIds.has(client.id);
          return (
            <SelectItem key={client.id} value={client.id}>
              <div className="flex items-center gap-2">
                <span 
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0 transition-all duration-300",
                    isConfigured 
                      ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" 
                      : "bg-muted-foreground/20"
                  )} 
                  title={isConfigured ? "Canais conectados" : "Sem canais conectados"}
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