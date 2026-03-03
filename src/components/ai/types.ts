export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  created_at: string;
}

export interface ClientWithConversation {
  id: string;
  company_name: string;
  contact_name: string;
  current_stage: string;
  qualification: string;
  email: string | null;
  phone: string | null;
  monthly_budget: number | null;
  paid_traffic_budget: number | null;
  services: string[] | null;
  notes: string | null;
  bant_budget: number | null;
  bant_authority: number | null;
  bant_need: number | null;
  bant_timeline: number | null;
  conversation_id?: string;
}

export interface PendingFile {
  url: string;
  type: string;
  name: string;
  base64?: string;
}