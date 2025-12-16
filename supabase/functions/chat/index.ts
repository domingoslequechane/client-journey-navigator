import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Detailed stage context for the AI assistant
const STAGE_CONTEXT: Record<string, string> = {
  prospeccao: `
FASE: Prospecção de Leads
OBJETIVO: Identificar e fazer o primeiro contato com potenciais clientes.

TAREFAS TÍPICAS:
- Análise de perfil ideal de cliente (ICP)
- Pesquisar empresa no Google Maps
- Analisar redes sociais do prospect
- Identificar pontos fracos no marketing atual
- Coletar informações de contato
- Realizar primeira ligação de qualificação
- Fazer visita presencial (se aplicável)
- Agendar reunião de apresentação com decisor

DICAS PARA ESTA FASE:
- Foque em entender o negócio do cliente antes de vender
- Identifique as dores mais urgentes
- Prepare-se com dados sobre o setor
- Seja consultivo, não agressivo na abordagem
`,
  reuniao: `
FASE: Qualificação e Proposta
OBJETIVO: Entender profundamente as necessidades e apresentar uma solução personalizada.

TAREFAS TÍPICAS:
- Preparar apresentação personalizada
- Aplicar questionário BANT (Budget, Authority, Need, Timeline)
- Identificar dores, desafios e objetivos
- Apresentar cases de sucesso relevantes
- Preencher score BANT detalhado
- Definir serviços de interesse e escopo
- Elaborar proposta comercial completa
- Enviar proposta e agendar follow-up

DICAS PARA ESTA FASE:
- Use perguntas abertas para descobrir necessidades
- Mostre ROI e resultados mensuráveis
- Personalize a proposta para o cliente
- Defina próximos passos claros
`,
  contratacao: `
FASE: Fechamento e Onboarding
OBJETIVO: Formalizar o contrato e preparar para o início do projeto.

TAREFAS TÍPICAS:
- Follow-up da proposta e negociação final
- Elaborar contrato de prestação de serviços
- Obter assinatura do contrato
- Coletar dados fiscais (NUIT, endereço)
- Solicitar acessos a plataformas
- Receber logotipo e materiais de marca
- Coletar fotos e vídeos de produtos/serviços
- Reunião de kick-off com o cliente

DICAS PARA ESTA FASE:
- Seja transparente sobre prazos e entregas
- Documente tudo no contrato
- Prepare um checklist de onboarding
- Alinhe expectativas claramente
`,
  producao: `
FASE: Produção Contínua
OBJETIVO: Executar e gerenciar projetos em ciclos recorrentes.

TAREFAS TÍPICAS:
- Planejamento trimestral de conteúdo
- Reuniões mensais de performance
- Criação e agendamento de posts
- Produção de vídeos curtos e reels
- Criação de artigos e email marketing
- Monitoramento de tendências

DICAS PARA ESTA FASE:
- Mantenha um calendário editorial atualizado
- Use ferramentas de agendamento
- Analise métricas semanalmente
- Adapte conteúdo às tendências
`,
  trafego: `
FASE: Gestão de Campanhas
OBJETIVO: Planejar, executar e otimizar campanhas de marketing pago.

TAREFAS TÍPICAS:
- Definir objetivos e orçamento
- Pesquisa de público-alvo e segmentação
- Criar criativos e copies persuasivas
- Configurar pixels e eventos de conversão
- Lançar campanhas (Facebook, Google, TikTok)
- Monitoramento diário de performance
- Testes A/B para otimização
- Relatório mensal de performance

DICAS PARA ESTA FASE:
- Comece com orçamentos pequenos para testar
- Foque em CPA e ROAS
- Faça testes A/B constantes
- Documente aprendizados de cada campanha
`,
  retencao: `
FASE: Fidelização e Sucesso
OBJETIVO: Garantir satisfação do cliente e buscar novas oportunidades.

TAREFAS TÍPICAS:
- Reuniões trimestrais de resultados
- Coleta de feedback (NPS)
- Identificar oportunidades de upsell
- Solicitar depoimentos e cases
- Incentivar indicações
- Análise de risco de churn
- Proposta de renovação de contrato
- Celebração de marcos e conquistas

DICAS PARA ESTA FASE:
- Seja proativo na comunicação
- Antecipe problemas antes que escalem
- Mostre valor constantemente
- Cultive o relacionamento a longo prazo
`
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, clientData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client to fetch agency settings
    let agencyContext = "";
    let knowledgeBaseContext = "";
    
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Fetch agency settings
      const { data: agencyData } = await supabase
        .from('agency_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (agencyData) {
        agencyContext = `
INFORMAÇÕES DA AGÊNCIA PRESTADORA DE SERVIÇOS:
- Nome da Agência: ${agencyData.agency_name || 'Não informado'}
- Sede Social: ${agencyData.headquarters || 'Não informado'}
- NUIT: ${agencyData.nuit || 'Não informado'}
- Representante: ${agencyData.representative_name || 'Não informado'}
- Cargo do Representante: ${agencyData.representative_position || 'Não informado'}
`;
        
        if (agencyData.knowledge_base_text) {
          knowledgeBaseContext = `
BASE DE CONHECIMENTO DA AGÊNCIA:
${agencyData.knowledge_base_text}
`;
        }
      }

      // If client has a contract, mention it
      if (clientData?.id) {
        const { data: clientWithContract } = await supabase
          .from('clients')
          .select('contract_url, contract_name')
          .eq('id', clientData.id)
          .single();
        
        if (clientWithContract?.contract_url) {
          clientData.has_contract = true;
          clientData.contract_name = clientWithContract.contract_name;
        }
      }
    }

    // Build detailed context
    let detailedContext = "";
    
    if (clientData) {
      detailedContext = `
CLIENTE EM DISCUSSÃO:
- Empresa: ${clientData.company_name || 'N/A'}
- Contato: ${clientData.contact_name || 'N/A'}
- Telefone: ${clientData.phone || 'N/A'}
- Email: ${clientData.email || 'N/A'}
- Fase atual: ${clientData.current_stage || 'N/A'}
- Qualificação: ${clientData.qualification || 'N/A'}
- Orçamento mensal: ${clientData.monthly_budget ? clientData.monthly_budget + ' MT' : 'Não definido'}
- Orçamento de tráfego: ${clientData.paid_traffic_budget ? clientData.paid_traffic_budget + ' MT' : 'Não definido'}
- Serviços: ${clientData.services?.join(', ') || 'Não definidos'}
- Notas: ${clientData.notes || 'Nenhuma nota'}
- BANT Score: Budget(${clientData.bant_budget || 0}/10) Authority(${clientData.bant_authority || 0}/10) Need(${clientData.bant_need || 0}/10) Timeline(${clientData.bant_timeline || 0}/10)
- Contrato: ${clientData.has_contract ? `Sim (${clientData.contract_name})` : 'Não tem contrato anexado'}

${STAGE_CONTEXT[clientData.current_stage] || ''}
`;
    } else if (context) {
      detailedContext = `Contexto da conversa: ${context}`;
    }

    const systemPrompt = `Você é o Qualify AI, um assistente de marketing experiente com mais de 20 anos de experiência em agências de marketing digital.

${agencyContext}

${knowledgeBaseContext}

Suas especialidades incluem:
- Estratégias de marketing digital e social media
- Gestão de campanhas de tráfego pago (Facebook Ads, Instagram Ads, TikTok Ads)
- Criação de conteúdo e calendário editorial
- Técnicas de vendas consultivas e qualificação de leads (BANT)
- Onboarding e retenção de clientes
- Análise de métricas e KPIs de marketing

${detailedContext}

DIRETRIZES IMPORTANTES:
- Responda sempre em português de Portugal/Moçambique
- Seja prático e dê exemplos concretos aplicáveis ao contexto do cliente
- Use formatação markdown quando apropriado
- Mantenha as respostas focadas e acionáveis
- Quando discutir um cliente específico, personalize suas sugestões com base nos dados fornecidos
- Sugira próximos passos específicos baseados na fase atual do cliente
- Se o cliente tem baixo score BANT, sugira como melhorar a qualificação
- Se está em fase de prospecção, foque em técnicas de primeiro contato
- Se está em produção/campanhas, foque em otimização e resultados
- Se está em retenção, foque em satisfação e upsell
- Se o cliente já tem contrato, você pode fazer referência a isso nas suas sugestões
- Use as informações da agência e da base de conhecimento para personalizar suas respostas`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos à sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao comunicar com o serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
