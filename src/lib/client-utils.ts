import type { Tables, Enums } from '@/integrations/supabase/types';
import type { Client, JourneyStage, LeadSource, LeadTemperature, ServiceType, Task, ClientStatus } from '@/types';
import { ALL_STAGES } from '@/types';

type DbClient = Tables<'clients'>;
type DbChecklistItem = Tables<'checklist_items'>;

// Helper to map DB stage enum to UI stage string
const stageMap: Record<Enums<'journey_stage'>, JourneyStage> = {
  prospeccao: 'prospecting',
  reuniao: 'qualification',
  contratacao: 'closing',
  producao: 'production',
  trafego: 'campaigns',
  retencao: 'retention',
  fidelizacao: 'loyalty',
};

// Helper to map DB qualification enum to UI temperature string
const qualificationMap: Record<Enums<'lead_qualification'>, LeadTemperature> = {
    cold: 'cold',
    warm: 'warm',
    hot: 'hot',
    qualified: 'hot', // Assuming 'qualified' maps to 'hot' for temperature display
};

// Helper to determine client status based on stage
const getClientStatus = (stage: JourneyStage): ClientStatus => {
    if (['production', 'campaigns', 'retention', 'loyalty'].includes(stage)) return 'active';
    if (['prospecting', 'qualification', 'closing'].includes(stage)) return 'prospect';
    return 'lead'; // Default fallback
};

export function mapDbClientToUiClient(dbClient: DbClient, checklistItems: DbChecklistItem[] = []): Client {
    const stageId = stageMap[dbClient.current_stage] || 'prospecting';
    const bantScore = (dbClient.bant_budget || 0) + (dbClient.bant_authority || 0) + (dbClient.bant_need || 0) + (dbClient.bant_timeline || 0);
    const maxBantScore = 40;
    const scorePercentage = Math.round((bantScore / maxBantScore) * 100);

    const stageChecklist = ALL_STAGES.find(s => s.id === stageId)?.checklist || [];
    
    // Map DB checklist items to UI tasks
    const tasks: Task[] = stageChecklist.map(uiItem => {
        // Find the corresponding DB checklist item for the current stage and title
        const dbItem = checklistItems.find(db => db.title === uiItem.title && stageMap[db.stage] === stageId);
        return {
            id: uiItem.id, // Use UI defined ID for consistency in UI logic
            title: uiItem.title,
            completed: dbItem?.completed || false,
            stageId: stageId,
        };
    });

    const completedTasks = tasks.filter(t => t.completed).length;
    const totalTasks = stageChecklist.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 9) : 0; // Progress 0-9

    return {
        id: dbClient.id,
        companyName: dbClient.company_name,
        contactName: dbClient.contact_name,
        email: dbClient.email || '',
        phone: dbClient.phone || '',
        website: dbClient.website || undefined,
        address: dbClient.address || undefined,
        industry: 'N/A', // Industry is not stored in DB, defaulting
        stage: stageId,
        score: scorePercentage,
        createdAt: dbClient.created_at,
        lastContact: dbClient.updated_at, // Using updated_at as a proxy for last contact
        notes: dbClient.notes || '',
        bant: {
            budget: dbClient.bant_budget || 0,
            authority: dbClient.bant_authority || 0,
            need: dbClient.bant_need || 0,
            timeline: dbClient.bant_timeline || 0,
        },
        tasks: tasks,
        source: (dbClient.source as LeadSource) || 'other',
        temperature: qualificationMap[dbClient.qualification] || 'cold',
        monthlyBudget: dbClient.monthly_budget || 0,
        trafficBudget: dbClient.paid_traffic_budget || undefined,
        services: (dbClient.services as ServiceType[]) || [],
        status: getClientStatus(stageId),
        progress: progress,
        paused: dbClient.paused || false,
        pausedAt: dbClient.paused_at || undefined,
        pausedBy: dbClient.paused_by || undefined,
    };
}