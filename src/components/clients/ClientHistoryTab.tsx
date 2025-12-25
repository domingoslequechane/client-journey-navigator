import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Pencil, ArrowRight, Pause, FileText, CheckCircle, Clock, Square, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  created_at: string;
  changed_by: string | null;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
}

interface Profile {
  full_name: string | null;
}

interface ClientHistoryTabProps {
  clientId: string;
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

const TYPE_ICONS: Record<string, { icon: typeof Pencil; color: string }> = {
  field_change: { icon: Pencil, color: 'text-blue-500' },
  stage_change: { icon: ArrowRight, color: 'text-green-500' },
  status_change: { icon: Pause, color: 'text-yellow-500' },
  task: { icon: CheckCircle, color: 'text-primary' },
  task_completed: { icon: CheckCircle2, color: 'text-green-500' },
  task_uncompleted: { icon: Square, color: 'text-muted-foreground' },
  milestone: { icon: FileText, color: 'text-purple-500' },
};

export function ClientHistoryTab({ clientId }: ClientHistoryTabProps) {
  const [activities, setActivities] = useState<(Activity & { profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [clientId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Fetch activities
      const { data: activitiesData, error } = await supabase
        .from('activities')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for changed_by users
      const changedByIds = [...new Set(activitiesData?.filter(a => a.changed_by).map(a => a.changed_by))] as string[];
      
      let profilesMap: Record<string, Profile> = {};
      
      if (changedByIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', changedByIds);
        
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = { full_name: p.full_name };
            return acc;
          }, {} as Record<string, Profile>);
        }
      }

      // Merge profiles with activities
      const activitiesWithProfiles = activitiesData?.map(activity => ({
        ...activity,
        profile: activity.changed_by ? profilesMap[activity.changed_by] : undefined,
      })) || [];

      setActivities(activitiesWithProfiles);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    const config = TYPE_ICONS[type] || TYPE_ICONS.task;
    const IconComponent = config.icon;
    return <IconComponent className={`h-4 w-4 ${config.color}`} />;
  };

  const formatValue = (value: string | null, fieldName: string | null): string => {
    if (!value) return 'vazio';
    
    // Handle specific field formatting
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhuma alteração registrada ainda.</p>
        <p className="text-sm mt-1">O histórico será atualizado automaticamente quando houver alterações.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, index) => (
        <div key={activity.id} className="relative">
          {/* Timeline line */}
          {index < activities.length - 1 && (
            <div className="absolute left-[18px] top-10 bottom-0 w-px bg-border" />
          )}
          
          <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            {/* Icon */}
            <div className="shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              {getIcon(activity.type)}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {activity.profile?.full_name || 'Sistema'}
                    <span className="font-normal text-muted-foreground ml-1">
                      {activity.title.toLowerCase()}
                    </span>
                  </p>
                  
                  {/* Show old -> new value for field changes */}
                  {activity.type === 'field_change' && activity.field_name && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      <span className="text-foreground/60">
                        {FIELD_LABELS[activity.field_name] || activity.field_name}:
                      </span>{' '}
                      <span className="line-through text-destructive/70">
                        {formatValue(activity.old_value, activity.field_name)}
                      </span>
                      {' → '}
                      <span className="text-success">
                        {formatValue(activity.new_value, activity.field_name)}
                      </span>
                    </p>
                  )}
                  
                  {/* Show description for stage changes */}
                  {activity.type === 'stage_change' && activity.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {activity.description}
                    </p>
                  )}
                  
                  {/* Show description for task changes */}
                  {['task_completed', 'task_uncompleted'].includes(activity.type) && activity.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {activity.description}
                    </p>
                  )}
                  
                  {/* Show description for other types */}
                  {!['field_change', 'stage_change', 'task_completed', 'task_uncompleted'].includes(activity.type) && activity.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {activity.description}
                    </p>
                  )}
                </div>
                
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  {formatDistanceToNow(new Date(activity.created_at), { 
                    addSuffix: true, 
                    locale: pt 
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
