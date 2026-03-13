"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Building2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ClientWithConversation } from './types';

interface ClientSidebarProps {
  clients: ClientWithConversation[];
  loadingClients: boolean;
  selectedClientId: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterStage: string;
  setFilterStage: (value: string) => void;
  onSelectClient: (id: string) => void;
  getStageLabel: (stage: string) => string;
  stageOptions: { value: string; label: string }[];
  collapsed?: boolean;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const ClientSidebar = ({
  clients,
  loadingClients,
  selectedClientId,
  searchTerm,
  setSearchTerm,
  filterStage,
  setFilterStage,
  onSelectClient,
  getStageLabel,
  stageOptions,
  collapsed = false
}: ClientSidebarProps) => {
  const { t } = useTranslation(['ai', 'common']);
  return (
    <>
      {!collapsed && (
        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('actions.search', 'Buscar cliente...', { ns: 'common' })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="h-9">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder={t('filterByStage', 'Filtrar por fase', { ns: 'ai' })} />
            </SelectTrigger>
            <SelectContent>
              {stageOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <ScrollArea className="flex-1">
        {loadingClients ? (
          <div className="p-4 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {t('noClientsFound', 'Nenhum cliente encontrado', { ns: 'ai' })}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {clients.map(client => (
              <div
                key={client.id}
                onClick={() => onSelectClient(client.id)}
                onKeyDown={(e) => e.key === 'Enter' && onSelectClient(client.id)}
                role="button"
                tabIndex={0}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors cursor-pointer",
                  selectedClientId === client.id 
                    ? "bg-primary/10 border border-primary/20" 
                    : "hover:bg-muted"
                )}
              >
                <div className={cn(
                  "flex items-start gap-2",
                  collapsed && "justify-center"
                )}>
                  {collapsed ? (
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors shadow-sm",
                      selectedClientId === client.id 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted-foreground/10 text-muted-foreground"
                    )}>
                      {getInitials(client.company_name)}
                    </div>
                  ) : (
                    <Building2 className={cn("h-4 w-4 mt-0.5 shrink-0", selectedClientId === client.id ? "text-primary" : "text-muted-foreground")} />
                  )}
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{client.company_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.contact_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {getStageLabel(client.current_stage)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );
};