import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';

interface ClientFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ClientFilterSelect({ value, onChange, className }: ClientFilterSelectProps) {
  const { user } = useAuth();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-filter', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.current_organization_id) return [];

      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name')
        .eq('organization_id', profile.current_organization_id)
        .order('company_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

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
        {clients.map(client => (
          <SelectItem key={client.id} value={client.id}>
            {client.company_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
