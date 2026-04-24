import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { segment, location, radius = '5km' } = await req.json();

    if (!segment || !location) {
      return new Response(JSON.stringify({ error: 'segment e location são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada.');
    }

    const prompt = `
Você é um estrategista de negócios premium e especialista em vendas B2B para agências de marketing digital em Moçambique.
A sua missão é gerar inteligência de vendas acionável — focada em dinheiro, decisão e fechamento.

Gere uma lista REALISTA de 4 a 6 empresas do segmento "${segment}" localizadas em "${location}" (raio de ${radius}).

REGRAS DE SCORING (calcule com rigor):
O opportunityData.score vai de 0 a 100, soma de 5 pilares:

1. Potencial financeiro (0–25):
   Banco / hospital / empresa grande / imóveis = 25
   Clínica média / hotel / supermercado = 18
   Restaurante / loja / serviço médio = 13
   Negócio pequeno / informal = 8
   Extra: +5 se público-alvo for "alta renda", +3 se zona central/turística

2. Maturidade digital — INVERSO (0–20):
   Sem qualquer presença digital = 20
   Só WhatsApp ou Facebook básico = 15
   Instagram + Facebook sem estratégia = 10
   Website + redes ativas = 5
   Presença digital forte + ads = 0

3. Dor / Necessidade (0–20):
   Não possui website → +8
   Sem campanhas pagas → +5
   Baixa prova social (reviews/fotos fracas) → +4
   Sem posicionamento de marca → +3
   Máximo: 20

4. Fit com serviços de marketing digital (0–20):
   Restaurantes, hotéis, clínicas, educação, finanças, beleza = 20
   Varejo geral, serviços médios = 15
   Indústria pesada, empresas B2B complexas = 8

5. Facilidade de fecho (0–15):
   Negócio do dono / decisão rápida = 15
   Empresa familiar / gerente decide = 10
   Corporativo / banco / multinacional = 4
   Extra: +3 se tiver WhatsApp direto

Classificação final:
80–100 = "🔥 Quente"
60–79 = "🟡 Morno"
40–59 = "❄️ Frio"
< 40 = "🚫 Ruim"

Para cada empresa, retorne JSON com TODA esta estrutura. Seja específico e realista para "${location}":

{
  "prospects": [
    {
      "id": "uuid-unico",
      "name": "Nome real e específico da empresa",
      "rating": 4.2,
      "type": "Tipo específico (ex: Restaurante de cozinha europeia)",
      "status": "Aberto",
      "address": "Endereço plausível em ${location}",
      "phone": "+258 8X XXX XXXX",
      "positioning": "médio-alto",
      "positioningLabel": "Boa reputação local mas com lacuna digital significativa",
      "services": ["Serviço principal 1", "Serviço 2"],
      "targetAudience": ["Público-alvo 1", "Público-alvo 2"],
      "digitalPresence": ["Facebook básico", "WhatsApp"],
      "opportunities": ["Oportunidade de marketing 1", "Oportunidade 2"],
      "pitchIdeal": "Frase persuasiva genérica (fallback)",
      "conversionPotential": "alto",
      "estimatedBudget": "médio",
      "lat": -19.84,
      "lng": 34.84,
      "opportunityData": {
        "score": 78,
        "classification": "🟡 Morno",
        "breakdown": {
          "financialPotential": 18,
          "digitalMaturity": 15,
          "need": 17,
          "fit": 20,
          "closingEase": 8
        },
        "explanations": [
          "💰 Potencial financeiro: Alto (público de alta renda, zona central)",
          "⚠️ Grande lacuna digital (apenas Facebook sem estratégia)",
          "⏱️ Fecho moderado (gerente decide, mas não o dono)"
        ]
      },
      "impactEstimate": {
        "newClientsPerMonth": "+80 a +200 clientes/mês",
        "averageTicket": "500 a 800 MZN",
        "additionalRevenue": "+40.000 a 160.000 MZN/mês",
        "paybackEstimate": "2 a 4 semanas"
      },
      "gapAnalysis": [
        "❌ Não possui website — perde clientes que pesquisam online",
        "❌ Sem campanhas pagas — concorrência está a captar esse tráfego",
        "❌ Perfil Google Maps não otimizado — baixa visibilidade local",
        "❌ Sem estratégia de conteúdo visual"
      ],
      "decisionProfile": {
        "speed": "Rápida",
        "focus": "Resultado imediato no caixa",
        "mindset": "Prático — quer ver números rápido",
        "sensitivity": "Sensível a preço, mas responde bem a provas sociais",
        "bestApproach": "Abordagem direta com números simples e exemplo real"
      },
      "benchmark": {
        "digitalPresence": "Abaixo da média",
        "content": "Baixo",
        "ads": "Inexistente",
        "summary": "Concorrentes com Google Maps otimizado já estão a captar tráfego que este negócio perde"
      },
      "urgencyLevel": "ALTA",
      "urgencyReasons": [
        "Negócio depende de fluxo diário de clientes",
        "Cada dia sem marketing é receita perdida",
        "Concorrência já a investir digitalmente"
      ],
      "whyNow": [
        "Clientes pesquisam online antes de sair de casa",
        "Quem domina Google Maps captura o mercado local",
        "Pequenas melhorias têm impacto imediato no caixa"
      ],
      "clientArchetype": "Negócio local dependente de fluxo",
      "closingProbability": 72,
      "closingFactors": [
        "✅ Necessidade clara e urgente",
        "✅ Decisão rápida (negócio local)",
        "⚠️ Pode comparar com freelancers baratos"
      ],
      "campaignIdeas": [
        {
          "name": "Domínio Google Maps",
          "description": "Fotos profissionais + reviews incentivadas + SEO local",
          "expectedResult": "Mais clientes próximos em 2 semanas"
        },
        {
          "name": "Reels de Alto Impacto",
          "description": "Vídeos curtos dos serviços/produtos para Instagram",
          "expectedResult": "Alcance orgânico + partilhas"
        },
        {
          "name": "Campanha de Entrada",
          "description": "Oferta especial para atrair novos clientes nos dias fracos",
          "expectedResult": "Aumento imediato de fluxo"
        }
      ],
      "dynamicScript": "Frase personalizada e específica para este negócio, mencionando a dor principal e o resultado que a agência pode entregar em dias.",
      "nextBestAction": "Descrição específica da melhor forma de abordar este prospect (WhatsApp, visita presencial, email etc.)",
      "smartFollowUp": [
        "1º Contacto: mensagem curta e direta com gancho de resultado",
        "2º: Enviar exemplo visual (antes/depois ou case de sucesso similar)",
        "3º: Proposta de teste de 7 dias com métricas claras"
      ],
      "recommended": false,
      "recommendedReason": "",
      "compatibilityScore": 0
    }
  ],
  "marketInsights": {
    "totalEstimatedBusinesses": 120,
    "averageDigitalMaturity": "baixo",
    "topOpportunities": ["Oportunidade 1", "Oportunidade 2", "Oportunidade 3"],
    "threatAnalysis": ["Ameaça 1", "Ameaça 2"],
    "recommendedApproach": "Estratégia de abordagem recomendada para o mercado local.",
    "estimatedConversionRate": "15-25%",
    "bestContactTime": "Manhã (9h-12h) ou Final da tarde (16h-18h)",
    "segmentTrend": "crescente"
  }
}

REGRAS CRÍTICAS:
- Use coordenadas geográficas REAIS e coerentes com "${location}"
- Nomes de empresas PLAUSÍVEIS e específicos para a região
- dynamicScript deve mencionar o nome da empresa e dor específica
- nextBestAction deve ser concreto (WhatsApp, visita, etc.)
- campaignIdeas devem ser específicas para o tipo de negócio
- impactEstimate deve ser realista para o mercado moçambicano
- Nos recommended, marque o(s) de maior score como true e preencha recommendedReason
- Responda APENAS com JSON válido, sem texto adicional, sem markdown.
`;

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um estrategista de negócios premium especialista em JSON. Deve retornar EXATAMENTE e APENAS o JSON requisitado, sem formatações Markdown (sem ```json), sem texto adicional.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });

    if (!openAiResponse.ok) {
      const err = await openAiResponse.text();
      throw new Error(`OpenAI API error: ${err}`);
    }

    const openAiData = await openAiResponse.json();
    const rawText = openAiData.choices?.[0]?.message?.content;

    if (!rawText) {
      throw new Error('Resposta vazia da IA (OpenAI).');
    }

    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('prospect-companies error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
