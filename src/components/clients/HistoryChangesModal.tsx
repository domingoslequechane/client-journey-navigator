import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { ArrowRight } from 'lucide-react';

interface GroupedChange {
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  title: string;
  type: string;
  description: string | null;
}

interface HistoryChangesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  timestamp: string;
  changes: GroupedChange[];
}

const FIELD_LABELS: Record<string, string> = {
  company_name: 'Nome da Empresa',
  contact_name: 'Nome do Contato',
  email: 'Email',
  phone: 'Telefone',
  website: 'Website',
  address: 'Endereço',
  source: 'Fonte',
  qualification: 'Qualificação',
  notes: 'Observações',
  monthly_budget: 'Orçamento Mensal',
  paid_traffic_budget: 'Orçamento Tráfego',
  bant_budget: 'BANT Budget',
  bant_authority: 'BANT Authority',
  bant_need: 'BANT Need',
  bant_timeline: 'BANT Timeline',
  current_stage: 'Etapa',
  paused: 'Estado',
  checklist_item: 'Tarefa',
};

const formatValue = (value: string | null, fieldName: string | null): string => {
  if (!value) return 'vazio';
  
  if (fieldName === 'paused') {
    return value === 'true' ? 'Suspenso' : 'Ativo';
  }
  if (fieldName === 'qualification') {
    const qualLabels: Record<string, string> = {
      cold: 'Frio',
      warm: 'Morno',
      hot: 'Quente',
      qualified: 'Qualificado',
    };
    return qualLabels[value] || value;
  }
  if (fieldName?.includes('budget')) {
    return `${Number(value).toLocaleString()}`;
  }
  if (fieldName?.startsWith('bant_')) {
    return `${value}/10`;
  }
  
  return value;
};

export function HistoryChangesModal({ 
  open, 
  onOpenChange, 
  userName, 
  timestamp, 
  changes 
}: HistoryChangesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Alterações por {userName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: pt })}
          </p>
        </DialogHeader>
        
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {changes.map((change, index) => (
            <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              {change.type === 'field_change' && change.field_name ? (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {FIELD_LABELS[change.field_name] || change.field_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-sm">
                    <span className="text-destructive/70 line-through truncate">
                      {formatValue(change.old_value, change.field_name)}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-success truncate">
                      {formatValue(change.new_value, change.field_name)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{change.title}</p>
                  {change.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {change.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
