import { Client, StageConfig } from '@/types';
import { ClientCard } from './ClientCard';
import { cn } from '@/lib/utils';
import { Search, Target, FileCheck, Cog, Megaphone, Heart } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Search,
  Target,
  FileCheck,
  Cog,
  Megaphone,
  Heart
};

interface PipelineColumnProps {
  stage: StageConfig;
  clients: Client[];
  onClientClick: (client: Client) => void;
}

export function PipelineColumn({ stage, clients, onClientClick }: PipelineColumnProps) {
  const Icon = iconMap[stage.icon as keyof typeof iconMap];
  
  return (
    <div className="flex-1 min-w-[280px] max-w-[350px]">
      <div className={cn(
        'rounded-t-xl px-4 py-3 flex items-center gap-2',
        stage.color
      )}>
        <Icon className="h-5 w-5 text-primary-foreground" />
        <h3 className="font-semibold text-primary-foreground">{stage.name}</h3>
        <span className="ml-auto bg-primary-foreground/20 text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
          {clients.length}
        </span>
      </div>
      
      <div className="bg-muted/50 rounded-b-xl p-3 min-h-[500px] space-y-3">
        {clients.map((client) => (
          <ClientCard 
            key={client.id} 
            client={client} 
            onClick={() => onClientClick(client)}
          />
        ))}
        
        {clients.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum cliente nesta fase
          </div>
        )}
      </div>
    </div>
  );
}
