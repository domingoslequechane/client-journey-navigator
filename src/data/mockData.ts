import { Client, JourneyStage } from '@/types';

export const mockClients: Client[] = [
  {
    id: '1',
    companyName: 'Restaurante Sabor da Terra',
    contactName: 'Maria Silva',
    email: 'maria@sabordaterra.co.mz',
    phone: '+258 84 123 4567',
    industry: 'Restauração',
    stage: 'discovery',
    score: 45,
    createdAt: '2024-12-01',
    lastContact: '2024-12-14',
    notes: 'Interessada em aumentar presença no Instagram',
    bant: { budget: 3, authority: 4, need: 5, timeline: 4 },
    tasks: [
      { id: 't1', title: 'Pesquisa inicial do lead', completed: true, stageId: 'discovery' },
      { id: 't2', title: 'Primeiro contato realizado', completed: true, stageId: 'discovery' },
    ]
  },
  {
    id: '2',
    companyName: 'Clínica Vida Saudável',
    contactName: 'Dr. João Fernandes',
    email: 'joao@vidasaudavel.co.mz',
    phone: '+258 82 987 6543',
    industry: 'Saúde',
    stage: 'attraction',
    score: 72,
    createdAt: '2024-11-15',
    lastContact: '2024-12-13',
    notes: 'Precisa de website e gestão de redes sociais',
    bant: { budget: 4, authority: 5, need: 5, timeline: 3 },
    tasks: [
      { id: 't3', title: 'Reunião de diagnóstico realizada', completed: true, stageId: 'attraction' },
      { id: 't4', title: 'Qualificação BANT completa', completed: true, stageId: 'attraction' },
      { id: 't5', title: 'Proposta comercial enviada', completed: false, stageId: 'attraction' },
    ]
  },
  {
    id: '3',
    companyName: 'Auto Peças Maputo',
    contactName: 'Carlos Nhaca',
    email: 'carlos@autopecas.co.mz',
    phone: '+258 86 555 7890',
    industry: 'Comércio',
    stage: 'consideration',
    score: 85,
    createdAt: '2024-10-20',
    lastContact: '2024-12-12',
    notes: 'Contrato assinado, aguardando materiais',
    bant: { budget: 5, authority: 5, need: 4, timeline: 5 },
    tasks: [
      { id: 't6', title: 'Contrato assinado', completed: true, stageId: 'consideration' },
      { id: 't7', title: 'Onboarding iniciado', completed: true, stageId: 'consideration' },
      { id: 't8', title: 'Redes sociais configuradas', completed: false, stageId: 'consideration' },
    ]
  },
  {
    id: '4',
    companyName: 'Hotel Praia Dourada',
    contactName: 'Ana Lopes',
    email: 'ana@praiadourada.co.mz',
    phone: '+258 84 222 3333',
    industry: 'Turismo',
    stage: 'action',
    score: 92,
    createdAt: '2024-09-10',
    lastContact: '2024-12-10',
    notes: 'Campanhas de tráfego gerando resultados excelentes',
    bant: { budget: 5, authority: 5, need: 5, timeline: 5 },
    tasks: [
      { id: 't9', title: 'Primeira entrega realizada', completed: true, stageId: 'action' },
      { id: 't10', title: 'Calendário editorial definido', completed: true, stageId: 'action' },
      { id: 't11', title: 'Campanha de tráfego pago ativa', completed: true, stageId: 'action' },
    ]
  },
  {
    id: '5',
    companyName: 'Farmácia Central',
    contactName: 'Roberto Machava',
    email: 'roberto@farmaciacentral.co.mz',
    phone: '+258 82 444 5555',
    industry: 'Saúde',
    stage: 'advocacy',
    score: 98,
    createdAt: '2024-06-01',
    lastContact: '2024-12-08',
    notes: 'Cliente satisfeito, já indicou 2 novos leads',
    bant: { budget: 5, authority: 5, need: 5, timeline: 5 },
    tasks: [
      { id: 't12', title: 'Resultados mensuráveis alcançados', completed: true, stageId: 'advocacy' },
      { id: 't13', title: 'Depoimento coletado', completed: true, stageId: 'advocacy' },
      { id: 't14', title: 'Indicações solicitadas', completed: true, stageId: 'advocacy' },
    ]
  },
  {
    id: '6',
    companyName: 'Escritório de Advocacia Moçambique',
    contactName: 'Dra. Teresa Matsinhe',
    email: 'teresa@advocaciamz.co.mz',
    phone: '+258 84 777 8888',
    industry: 'Serviços',
    stage: 'discovery',
    score: 35,
    createdAt: '2024-12-10',
    lastContact: '2024-12-14',
    notes: 'Lead frio, precisa de mais nurturing',
    bant: { budget: 2, authority: 4, need: 3, timeline: 2 },
    tasks: [
      { id: 't15', title: 'Pesquisa inicial do lead', completed: true, stageId: 'discovery' },
    ]
  },
  {
    id: '7',
    companyName: 'Supermercado Bom Preço',
    contactName: 'Manuel Sitoe',
    email: 'manuel@bompreco.co.mz',
    phone: '+258 86 999 1111',
    industry: 'Comércio',
    stage: 'attraction',
    score: 68,
    createdAt: '2024-11-25',
    lastContact: '2024-12-11',
    notes: 'Proposta enviada, aguardando retorno',
    bant: { budget: 4, authority: 4, need: 4, timeline: 3 },
    tasks: [
      { id: 't16', title: 'Reunião de diagnóstico realizada', completed: true, stageId: 'attraction' },
      { id: 't17', title: 'Qualificação BANT completa', completed: true, stageId: 'attraction' },
      { id: 't18', title: 'Proposta comercial enviada', completed: true, stageId: 'attraction' },
    ]
  },
  {
    id: '8',
    companyName: 'Academia Fitness Pro',
    contactName: 'Pedro Cossa',
    email: 'pedro@fitnesspro.co.mz',
    phone: '+258 82 333 4444',
    industry: 'Fitness',
    stage: 'action',
    score: 88,
    createdAt: '2024-08-15',
    lastContact: '2024-12-09',
    notes: 'Conteúdo viral no TikTok, +500 novos seguidores',
    bant: { budget: 4, authority: 5, need: 5, timeline: 4 },
    tasks: [
      { id: 't19', title: 'Primeira entrega realizada', completed: true, stageId: 'action' },
      { id: 't20', title: 'Calendário editorial definido', completed: true, stageId: 'action' },
    ]
  }
];

export const dashboardStats = {
  totalClients: 8,
  activeClients: 5,
  totalRevenue: 125000,
  conversionRate: 62.5,
  averageScore: 73,
  clientsByStage: {
    discovery: 2,
    attraction: 2,
    consideration: 1,
    action: 2,
    advocacy: 1
  }
};
