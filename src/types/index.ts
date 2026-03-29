// ============= Journey & Stage Types =============
export type SalesFunnelStage = 'prospecting' | 'qualification' | 'closing';
export type OperationalStage = 'production' | 'campaigns' | 'retention' | 'loyalty';
export type JourneyStage = SalesFunnelStage | OperationalStage;

export type LeadSource = 'google_maps' | 'social_media' | 'referral' | 'visit' | 'inbound' | 'other';
export type LeadTemperature = 'cold' | 'warm' | 'hot';
export type ClientStatus = 'lead' | 'prospect' | 'active' | 'churned';

export interface Client {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  address?: string;
  industry: string;
  stage: JourneyStage;
  score: number;
  createdAt: string;
  lastContact: string;
  logoUrl?: string;
  notes: string;
  bant: BANTScore;
  tasks: Task[];
  source: LeadSource;
  temperature: LeadTemperature;
  monthlyBudget: number;
  trafficBudget?: number;
  services: ServiceType[];
  status: ClientStatus;
  progress: number; // 0-9 for checklist progress
  paused: boolean;
  pausedAt?: string;
  pausedBy?: string;
}

export type ServiceType = 
  | 'social_management' 
  | 'content_creation' 
  | 'video_production'
  | 'facebook_ads' 
  | 'instagram_ads' 
  | 'tiktok_ads'
  | 'graphic_design'
  | 'marketing_consulting';

export interface BANTScore {
  budget: number;
  authority: number;
  need: number;
  timeline: number;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  stageId: JourneyStage;
}

export interface StageConfig {
  id: JourneyStage;
  name: string;
  description: string;
  color: string;
  borderColor: string;
  icon: string;
  checklist: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'sales' | 'operations' | 'content';
  roleLabel: string;
  avatar?: string;
  createdAt: string;
  isActive: boolean;
}

// ============= Sales Funnel Stages (Funil de Vendas) =============
export const SALES_FUNNEL_STAGES: StageConfig[] = [
  {
    id: 'prospecting',
    name: 'Prospecção de Leads',
    description: 'Identificação e primeiro contato com potenciais clientes.',
    color: 'bg-info/20',
    borderColor: 'border-info',
    icon: 'Search',
    checklist: [
      { id: 'p1', title: 'Análise de perfil ideal de cliente (ICP)', description: 'Definir critérios do cliente ideal', required: true },
      { id: 'p2', title: 'Pesquisar empresa no Google Maps', description: 'Verificar presença e avaliações', required: true },
      { id: 'p3', title: 'Analisar redes sociais do prospect', description: 'Verificar qualidade do marketing atual', required: true },
      { id: 'p4', title: 'Identificar pontos fracos no marketing', description: 'Encontrar oportunidades de melhoria', required: true },
      { id: 'p5', title: 'Coletar informações de contato', description: 'Telefone, email, endereço', required: true },
      { id: 'p6', title: 'Realizar primeira ligação de qualificação', description: 'Apresentar brevemente os serviços', required: true },
      { id: 'p7', title: 'Fazer visita presencial (se aplicável)', description: 'Visita para empresas locais', required: false },
      { id: 'p8', title: 'Agendar reunião de apresentação com decisor', description: 'Marcar data e hora com quem decide', required: true },
    ]
  },
  {
    id: 'qualification',
    name: 'Qualificação e Proposta',
    description: 'Entendimento das necessidades e apresentação da solução.',
    color: 'bg-warning/20',
    borderColor: 'border-warning',
    icon: 'Target',
    checklist: [
      { id: 'q1', title: 'Preparar apresentação personalizada', description: 'Slides com cases relevantes', required: true },
      { id: 'q2', title: 'Aplicar questionário de diagnóstico (BANT)', description: 'Budget, Authority, Need, Timeline', required: true },
      { id: 'q3', title: 'Identificar dores, desafios e objetivos do cliente', description: 'Entender profundamente as necessidades', required: true },
      { id: 'q4', title: 'Apresentar cases de sucesso relevantes', description: 'Mostrar resultados similares', required: true },
      { id: 'q5', title: 'Preencher score BANT detalhado', description: 'Pontuar cada critério de 0-10', required: true },
      { id: 'q6', title: 'Definir serviços de interesse e escopo', description: 'Listar serviços que o cliente precisa', required: true },
      { id: 'q7', title: 'Elaborar proposta comercial completa', description: 'Documento com valores e condições', required: true },
      { id: 'q8', title: 'Enviar proposta por email e agendar follow-up', description: 'Marcar data para retorno', required: true },
      { id: 'q9', title: 'Sessão de perguntas e respostas sobre a proposta', description: 'Esclarecer todas as dúvidas', required: false },
    ]
  },
  {
    id: 'closing',
    name: 'Fechamento e Onboarding',
    description: 'Formalização do contrato e preparação para o início do projeto.',
    color: 'bg-success/20',
    borderColor: 'border-success',
    icon: 'FileCheck',
    checklist: [
      { id: 'c1', title: 'Realizar follow-up da proposta e negociação final', description: 'Ajustes finais de valores e escopo', required: true },
      { id: 'c2', title: 'Negociar ajustes contratuais se necessário', description: 'Alinhar termos e condições', required: false },
      { id: 'c3', title: 'Elaborar contrato de prestação de serviços', description: 'Documento legal completo', required: true },
      { id: 'c4', title: 'Obter assinatura do contrato (digital ou físico)', description: 'Formalizar o acordo', required: true },
      { id: 'c5', title: 'Coletar dados fiscais do cliente (NUIT, endereço, etc.)', description: 'Informações para faturação', required: true },
      { id: 'c6', title: 'Solicitar acessos a plataformas (redes sociais, Google Analytics, etc.)', description: 'Acesso às ferramentas necessárias', required: true },
      { id: 'c7', title: 'Receber logotipo e materiais de marca em alta resolução', description: 'Arquivos para criação de conteúdo', required: true },
      { id: 'c8', title: 'Coletar fotos e vídeos de produtos/serviços', description: 'Material visual para campanhas', required: true },
      { id: 'c9', title: 'Criar pastas de arquivos e organização interna do cliente', description: 'Estrutura de pastas no Drive', required: true },
      { id: 'c10', title: 'Reunião de alinhamento de expectativas (Kick-off com cliente)', description: 'Primeira reunião oficial', required: true },
    ]
  }
];

// ============= Operational Flow Stages (Fluxo Operacional) =============
export const OPERATIONAL_FLOW_STAGES: StageConfig[] = [
  {
    id: 'production',
    name: 'Configurações Iniciais',
    description: 'Configuração de acessos, plataformas e preparação para início dos trabalhos.',
    color: 'bg-purple-500/20',
    borderColor: 'border-purple-500',
    icon: 'Cog',
    checklist: [
      { id: 'pr1', title: 'Configuração de acessos às redes sociais', description: 'Login e permissões das plataformas', required: true },
      { id: 'pr2', title: 'Configuração de ferramentas de gestão', description: 'Meta Business Suite, Google Analytics, etc', required: true },
      { id: 'pr3', title: 'Definição de identidade visual e tom de voz', description: 'Diretrizes de comunicação da marca', required: true },
      { id: 'pr4', title: 'Criação de calendário editorial inicial', description: 'Planejamento de conteúdo do primeiro mês', required: true },
      { id: 'pr5', title: 'Configuração de pixels e tracking', description: 'Facebook Pixel, Google Tag Manager', required: true },
      { id: 'pr6', title: 'Reunião de alinhamento de processos', description: 'Definir fluxos de aprovação e comunicação', required: true },
    ]
  },
  {
    id: 'campaigns',
    name: 'Produção Contínua',
    description: 'Execução e gestão de projetos em ciclos recorrentes.',
    color: 'bg-primary/20',
    borderColor: 'border-primary',
    icon: 'Megaphone',
    checklist: [
      { id: 'cm1', title: 'Planejamento trimestral de conteúdo e campanhas', description: 'Calendário editorial do período', required: true },
      { id: 'cm2', title: 'Reunião mensal de performance e ajustes estratégicos', description: 'Análise de métricas e otimização', required: true },
      { id: 'cm3', title: 'Criação e agendamento de posts para redes sociais', description: 'Conteúdo programado semanalmente', required: true },
      { id: 'cm4', title: 'Produção de vídeos curtos e reels', description: 'Conteúdo audiovisual dinâmico', required: true },
      { id: 'cm5', title: 'Criação de artigos para blog ou e-mail marketing', description: 'Conteúdo de valor agregado', required: false },
      { id: 'cm6', title: 'Monitoramento de tendências e adaptação de conteúdo', description: 'Acompanhar trends e viralizar', required: true },
    ]
  },
  {
    id: 'retention',
    name: 'Gestão de Campanhas',
    description: 'Planejamento, execução e otimização de campanhas de tráfego pago.',
    color: 'bg-rose-500/20',
    borderColor: 'border-rose-500',
    icon: 'Target',
    checklist: [
      { id: 'r1', title: 'Definição de objetivos e orçamento de campanha', description: 'Metas claras e investimento', required: true },
      { id: 'r2', title: 'Pesquisa de público-alvo e segmentação detalhada', description: 'Personas e audiências', required: true },
      { id: 'r3', title: 'Criação de criativos e copies persuasivas', description: 'Material para as campanhas', required: true },
      { id: 'r4', title: 'Lançamento das campanhas nas plataformas', description: 'Facebook Ads, Google Ads, TikTok Ads', required: true },
      { id: 'r5', title: 'Monitoramento diário de performance', description: 'Acompanhamento constante', required: true },
      { id: 'r6', title: 'Realização de testes A/B', description: 'Criativos, públicos e copies', required: true },
      { id: 'r7', title: 'Reunião de resultados com o cliente', description: 'Apresentação de métricas e KPIs', required: true },
      { id: 'r8', title: 'Otimização de campanhas para CPA/ROAS', description: 'Melhoria contínua de resultados', required: true },
    ]
  },
  {
    id: 'loyalty',
    name: 'Fidelização e Sucesso',
    description: 'Retenção do cliente, expansão de serviços e renovação de contratos.',
    color: 'bg-success/20',
    borderColor: 'border-success',
    icon: 'Heart',
    checklist: [
      { id: 'l1', title: 'Reunião trimestral de resultados', description: 'Apresentação consolidada de KPIs', required: true },
      { id: 'l2', title: 'Coleta de feedback e NPS', description: 'Medir satisfação do cliente', required: true },
      { id: 'l3', title: 'Identificação de oportunidades de upsell', description: 'Expandir escopo de serviços', required: true },
      { id: 'l4', title: 'Solicitar depoimento ou case de sucesso', description: 'Material para marketing da agência', required: false },
      { id: 'l5', title: 'Pedir indicações de novos clientes', description: 'Programa de referral', required: false },
      { id: 'l6', title: 'Proposta de renovação de contrato', description: 'Renovar parceria com novos objetivos', required: true },
    ]
  }
];

// ============= All Stages Combined =============
export const ALL_STAGES: StageConfig[] = [...SALES_FUNNEL_STAGES, ...OPERATIONAL_FLOW_STAGES];

// Legacy support
export const JOURNEY_STAGES = ALL_STAGES;

// ============= Service Labels =============
export const SERVICE_LABELS: Record<ServiceType, string> = {
  social_management: 'Gestão de Redes Sociais',
  content_creation: 'Criação de Conteúdo',
  video_production: 'Produção de Vídeo',
  facebook_ads: 'Tráfego Pago Facebook',
  instagram_ads: 'Tráfego Pago Instagram',
  tiktok_ads: 'Tráfego Pago TikTok',
  graphic_design: 'Design Gráfico',
  marketing_consulting: 'Consultoria de Marketing',
};

// ============= Source Labels =============
export const SOURCE_LABELS: Record<LeadSource, string> = {
  google_maps: 'Google Maps',
  social_media: 'Redes Sociais',
  referral: 'Indicação',
  visit: 'Visita Presencial',
  inbound: 'Inbound',
  other: 'Outro',
};

// ============= Temperature Labels =============
export const TEMPERATURE_LABELS: Record<LeadTemperature, string> = {
  cold: 'Frio',
  warm: 'Morno',
  hot: 'Quente',
};

// ============= Document Types =============
export type DocumentType = 'contract' | 'proforma_invoice' | 'budget' | 'commercial_proposal';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  contract: 'Contrato',
  proforma_invoice: 'Factura Proforma',
  budget: 'Orçamento',
  commercial_proposal: 'Proposta Comercial',
};

// ============= AI Agents Types =============
export type AIAgentStatus = 'active' | 'inactive' | 'paused';
export type AIConversationChannel = 'whatsapp' | 'instagram' | 'messenger' | 'webchat';

export interface AIAgent {
  id: string;
  organization_id: string;
  client_id: string | null;
  name: string;
  welcome_message: string | null;
  company_name: string | null;
  company_sector: string | null;
  company_description: string | null;
  business_hours: string | null;
  address: string | null;
  address_reference: string | null;
  instructions: string | null;
  extra_info: string | null;
  response_size: number;
  response_delay_seconds: number;
  show_typing: boolean;
  mark_as_read: boolean;
  status: AIAgentStatus;
  profile_picture: string | null;
  uazapi_instance_id: string | null;
  uazapi_instance_token: string | null;
  uazapi_webhook_secret: string | null;
  total_conversations: number;
  total_messages: number;
  last_activity_at: string | null;
  human_pause_duration: number;
  created_at: string;
  updated_at: string;
  // Joined from clients table (optional)
  clients?: { company_name: string } | null;
}

export interface AtendeAIInstance {
  id: string;
  organization_id: string;
  evolution_instance_id: string | null;
  client_id: string | null;
  name: string;
  instructions: string | null;
  welcome_message: string | null;
  company_name: string | null;
  company_sector: string | null;
  company_description: string | null;
  business_hours: string | null;
  address: string | null;
  address_reference: string | null;
  extra_info: string | null;
  response_size: number;
  response_delay_seconds: number;
  show_typing: boolean;
  mark_as_read: boolean;
  human_pause_duration: number;
  total_conversations: number;
  total_messages: number;
  last_activity_at: string | null;
  evolution_webhook_secret: string;
  clients?: { company_name: string } | null;
  status: 'active' | 'inactive';
  whatsapp_connected: boolean;
  connected_number: string | null;
  profile_picture: string | null;
  created_at: string;
  updated_at: string;
}

export interface AtendeAIConversation {
  id: string;
  instance_id: string;
  organization_id: string;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  channel: AIConversationChannel;
  status: 'open' | 'closed';
  message_count: number;
  last_message_at: string;
  last_presence_at: string | null;
  paused_until: string | null;
  waiting_human: boolean;
  created_at: string;
}

export interface AtendeAIMessage {
  id: string;
  conversation_id: string;
  organization_id: string;
  external_id: string | null;
  quoted_message_id: string | null;
  quoted_message_content: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_type: string;
  created_at: string;
}

export interface AIAgentConversation {
  id: string;
  agent_id: string;
  organization_id: string;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  channel: AIConversationChannel;
  status: 'open' | 'closed';
  message_count: number;
  last_message_at: string;
  paused_until: string | null;
  waiting_human: boolean;
  created_at: string;
}

export interface AIAgentMessage {
  id: string;
  conversation_id: string;
  organization_id: string;
  external_id: string | null;
  quoted_message_id: string | null;
  quoted_message_content: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_type: string;
  created_at: string;
}

export const AI_AGENT_STATUS_LABELS: Record<AIAgentStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  paused: 'Pausado',
};

export const AI_CHANNEL_LABELS: Record<AIConversationChannel, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  webchat: 'Webchat',
};
