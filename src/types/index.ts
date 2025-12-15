export type JourneyStage = 'discovery' | 'attraction' | 'consideration' | 'action' | 'advocacy';

export interface Client {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  industry: string;
  stage: JourneyStage;
  score: number;
  createdAt: string;
  lastContact: string;
  logoUrl?: string;
  notes: string;
  bant: BANTScore;
  tasks: Task[];
}

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
  icon: string;
  checklist: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
}

export const JOURNEY_STAGES: StageConfig[] = [
  {
    id: 'discovery',
    name: 'Descoberta',
    description: 'Consciência de marca e primeiro contato',
    color: 'bg-info',
    icon: 'Search',
    checklist: [
      { id: 'd1', title: 'Pesquisa inicial do lead', description: 'Verificar presença digital e qualidade do marketing atual', required: true },
      { id: 'd2', title: 'Primeiro contato realizado', description: 'Ligação, e-mail ou visita presencial', required: true },
      { id: 'd3', title: 'Interesse demonstrado', description: 'Lead respondeu positivamente ao contato', required: true },
      { id: 'd4', title: 'Reunião agendada', description: 'Data e hora confirmadas para apresentação', required: false },
    ]
  },
  {
    id: 'attraction',
    name: 'Atração',
    description: 'Geração de leads e engajamento',
    color: 'bg-chart-5',
    icon: 'Magnet',
    checklist: [
      { id: 'a1', title: 'Reunião de diagnóstico realizada', description: 'Entender dores e objetivos do cliente', required: true },
      { id: 'a2', title: 'Qualificação BANT completa', description: 'Orçamento, Autoridade, Necessidade e Timeline', required: true },
      { id: 'a3', title: 'Proposta comercial enviada', description: 'Documento detalhado com escopo e valores', required: true },
      { id: 'a4', title: 'Follow-up pós-proposta', description: 'Contato para esclarecer dúvidas', required: false },
    ]
  },
  {
    id: 'consideration',
    name: 'Consideração',
    description: 'Qualificação e prova social',
    color: 'bg-warning',
    icon: 'Scale',
    checklist: [
      { id: 'c1', title: 'Contrato assinado', description: 'Termos e condições aceitos pelo cliente', required: true },
      { id: 'c2', title: 'Onboarding iniciado', description: 'Coleta de informações e acessos', required: true },
      { id: 'c3', title: 'Redes sociais configuradas', description: 'Acesso ou criação de perfis', required: true },
      { id: 'c4', title: 'Materiais coletados', description: 'Logo, fotos, informações de contato', required: true },
    ]
  },
  {
    id: 'action',
    name: 'Ação',
    description: 'Conversão e entrega de valor',
    color: 'bg-primary',
    icon: 'Rocket',
    checklist: [
      { id: 'ac1', title: 'Primeira entrega realizada', description: 'Conteúdo inicial publicado', required: true },
      { id: 'ac2', title: 'Calendário editorial definido', description: 'Planejamento de conteúdo mensal', required: true },
      { id: 'ac3', title: 'Campanha de tráfego pago ativa', description: 'Anúncios configurados e veiculando', required: false },
      { id: 'ac4', title: 'Relatório mensal enviado', description: 'Métricas e resultados do período', required: true },
    ]
  },
  {
    id: 'advocacy',
    name: 'Apologia',
    description: 'Fidelização e indicação',
    color: 'bg-success',
    icon: 'Heart',
    checklist: [
      { id: 'ad1', title: 'Resultados mensuráveis alcançados', description: 'KPIs atingidos conforme proposta', required: true },
      { id: 'ad2', title: 'Depoimento coletado', description: 'Feedback positivo documentado', required: false },
      { id: 'ad3', title: 'Indicações solicitadas', description: 'Pedido de referências a parceiros', required: true },
      { id: 'ad4', title: 'Upsell/Cross-sell proposto', description: 'Novos serviços oferecidos', required: false },
    ]
  }
];
