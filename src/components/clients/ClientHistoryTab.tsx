import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Pencil, ArrowRight, Pause, FileText, CheckCircle, Clock, Square, CheckCircle2, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { HistoryChangesModal } from './HistoryChangesModal';

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

interface GroupedActivity {
  id: string;
  changed_by: string | null;
  profile?: Profile;
  created_at: string;
  activities: Activity[];
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
  grouped: { icon: Layers, color: 'text-blue-500' },
};

const ITEMS_PER_PAGE = 5;

export function ClientHistoryTab({ clientId }: ClientHistoryTabProps) {
  const [activities, setActivities] = useState<(Activity & { profile?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState<GroupedActivity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [clientId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data: activitiesData, error } = await supabase
        .from('activities')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

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

  // Group activities by user and timestamp (within 5 seconds)
  const groupActivities = (): GroupedActivity[] => {
    const groups: GroupedActivity[] = [];
    
    activities.forEach((activity) => {
      const activityTime = new Date(activity.created_at).getTime();
      
      // Check if this activity can be added to an existing group
      const existingGroup = groups.find(group => {
        const groupTime = new Date(group.created_at).getTime();
        const timeDiff = Math.abs(activityTime - groupTime);
        return group.changed_by === activity.changed_by && timeDiff < 5000; // 5 seconds
      });
      
      if (existingGroup) {
        existingGroup.activities.push(activity);
      } else {
        groups.push({
          id: activity.id,
          changed_by: activity.changed_by,
          profile: activity.profile,
          created_at: activity.created_at,
          activities: [activity],
        });
      }
    });
    
    return groups;
  };

  const groupedActivities = groupActivities();
  const totalPages = Math.ceil(groupedActivities.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = groupedActivities.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getIcon = (type: string) => {
    const config = TYPE_ICONS[type] || TYPE_ICONS.task;
    const IconComponent = config.icon;
    return <IconComponent className={`h-4 w-4 ${config.color}`} />;
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

  const handleGroupClick = (group: GroupedActivity) => {
    if (group.activities.length > 1) {
      setSelectedGroup(group);
      setModalOpen(true);
    }
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
      {currentItems.map((group, index) => {
        const isGrouped = group.activities.length > 1;
        const firstActivity = group.activities[0];
        
        return (
          <div key={group.id} className="relative">
            {/* Timeline line */}
            {index < currentItems.length - 1 && (
              <div className="absolute left-[18px] top-10 bottom-0 w-px bg-border" />
            )}
            
            <div 
              className={`flex gap-3 p-3 rounded-lg transition-colors ${isGrouped ? 'cursor-pointer hover:bg-muted' : 'hover:bg-muted/50'}`}
              onClick={() => handleGroupClick(group)}
            >
              {/* Icon */}
              <div className="shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                {isGrouped ? getIcon('grouped') : getIcon(firstActivity.type)}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {group.profile?.full_name || 'Sistema'}
                      <span className="font-normal text-muted-foreground ml-1">
                        {isGrouped 
                          ? `alterou ${group.activities.length} campos`
                          : firstActivity.title.toLowerCase()
                        }
                      </span>
                    </p>
                    
                    {/* Show single change details inline */}
                    {!isGrouped && firstActivity.type === 'field_change' && firstActivity.field_name && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        <span className="text-foreground/60">
                          {FIELD_LABELS[firstActivity.field_name] || firstActivity.field_name}:
                        </span>{' '}
                        <span className="line-through text-destructive/70">
                          {formatValue(firstActivity.old_value, firstActivity.field_name)}
                        </span>
                        {' → '}
                        <span className="text-success">
                          {formatValue(firstActivity.new_value, firstActivity.field_name)}
                        </span>
                      </p>
                    )}
                    
                    {/* Show description for stage changes */}
                    {!isGrouped && firstActivity.type === 'stage_change' && firstActivity.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {firstActivity.description}
                      </p>
                    )}
                    
                    {/* Show description for task changes */}
                    {!isGrouped && ['task_completed', 'task_uncompleted'].includes(firstActivity.type) && firstActivity.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {firstActivity.description}
                      </p>
                    )}
                    
                    {/* Show description for other types */}
                    {!isGrouped && !['field_change', 'stage_change', 'task_completed', 'task_uncompleted'].includes(firstActivity.type) && firstActivity.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {firstActivity.description}
                      </p>
                    )}

                    {/* Grouped indicator */}
                    {isGrouped && (
                      <p className="text-xs text-primary mt-0.5">
                        Clique para ver detalhes
                      </p>
                    )}
                  </div>
                  
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(group.created_at), { 
                      addSuffix: true, 
                      locale: pt 
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Mais recentes
          </Button>
          
          <span className="text-xs text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="gap-1"
          >
            Mais antigos
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Changes Modal */}
      {selectedGroup && (
        <HistoryChangesModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          userName={selectedGroup.profile?.full_name || 'Sistema'}
          timestamp={selectedGroup.created_at}
          changes={selectedGroup.activities.map(a => ({
            field_name: a.field_name,
            old_value: a.old_value,
            new_value: a.new_value,
            title: a.title,
            type: a.type,
            description: a.description,
          }))}
        />
      )}
    </div>
  );
}
