import { Client } from '@/types';
import { Building2, Mail, Phone, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientCardProps {
  client: Client;
  onClick: () => void;
}

export function ClientCard({ client, onClick }: ClientCardProps) {
  const bantAverage = (client.bant.budget + client.bant.authority + client.bant.need + client.bant.timeline) / 4;
  
  return (
    <div 
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-sm truncate">{client.companyName}</h4>
          <p className="text-xs text-muted-foreground truncate">{client.contactName}</p>
        </div>
      </div>
      
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          <span className="truncate">{client.email}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Phone className="h-3.5 w-3.5" />
          <span>{client.phone}</span>
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={cn(
            'h-2 w-2 rounded-full',
            client.score >= 80 ? 'bg-success' : client.score >= 50 ? 'bg-warning' : 'bg-destructive'
          )} />
          <span className="text-xs font-medium">Score: {client.score}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{new Date(client.lastContact).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
      
      <div className="mt-3">
        <div className="flex gap-1">
          {['B', 'A', 'N', 'T'].map((letter, i) => {
            const values = [client.bant.budget, client.bant.authority, client.bant.need, client.bant.timeline];
            return (
              <div key={letter} className="flex-1">
                <div className="text-[10px] text-center text-muted-foreground mb-0.5">{letter}</div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${values[i] * 20}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
