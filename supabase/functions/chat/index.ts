import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.any(),
  file_url: z.string().optional().nullable(),
  file_type: z.string().optional().nullable(),
});

const ClientDataSchema = z.object({
  id: z.string().uuid().optional(),
  company_name: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  current_stage: z.string().optional().nullable(),
  qualification: z.string().optional().nullable(),
  monthly_budget: z.number().optional().nullable(),
  paid_traffic_budget: z.number().optional().nullable(),
  services: z.array(z.string()).optional().nullable(),
  notes: z.string().optional().nullable(),
  bant_budget: z.number().optional().nullable(),
  bant_authority: z.number().optional().nullable(),
  bant_need: z.number().optional().nullable(),
  bant_timeline: z.number().optional().nullable(),
  has_contract: z.boolean().optional().nullable(),
  contract_name: z.string().optional().nullable(),
}).optional();

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema),
  clientData: ClientDataSchema,
});

const STAGE_LABELS: Record<string, string> = {
  prospeccao: "Prospecção",
  reuniao: "Qualificação",
  contratacao: "Fechamento",
  producao: "Configuração",
  trafego: "Produção",
  retencao: "Campanhas",
  fidelizacao: "Fidelização",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Configuração de IA ausente (LOVABLE_API_KEY)" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { messages, clientData } = ChatRequestSchema.parse(body);

    // Build client context for the system prompt
    let clientContext = "";
    if (clientData) {
      clientContext = `
DADOS DO CLIENTE ATUAL:
Empresa: ${clientData.company_name || 'N/A'}
Fase: ${STAGE_LABELS[clientData.current_stage || ''] || 'N/A'}
Qualificação: ${clientData.qualification || 'N/A'}
Orçamento: ${clientData.monthly_budget || '0'} MT
Serviços: ${clientData.services?.join(', ') || 'N/A'}
Notas: ${clientData.notes || 'N/A'}
BANT: B${clientData.bant_budget}/A${clientData.bant_authority}/N${clientData.bant_need}/T${clientData.bant_timeline}
Contrato: ${clientData.has_contract ? clientData.contract_name : 'Não possui'}
`;
    }

    const systemPrompt = `Sou a QIA, a assistente inteligente de marketing digital de elite.
Minhas especialidades incluem social media, tráfego pago, vendas e estratégia de negócios.
Tenho a capacidade avançada de ver e analisar imagens e documentos que me enviares com precisão cirúrgica.
${clientContext}

REGRAS DE RESPOSTA:
- Respondo sempre em português de Portugal (PT-PT).
- Sou extremamente profissional, estratégica e direta ao ponto.
- Analiso arquivos (imagens/PDFs) com profundidade técnica, identificando oportunidades de marketing.
- Sugiro ações práticas e imediatas baseadas na fase atual do cliente no funil.`;

    // Convert messages to OpenAI-compatible format (Lovable AI Gateway)
    const apiMessages = messages.map((m: any) => {
      // If content is already an array (multimodal), pass it through
      if (Array.isArray(m.content)) {
        return { role: m.role, content: m.content };
      }
      return { role: m.role, content: m.content };
    });

    console.log("Calling Lovable AI Gateway with google/gemini-2.5-flash...");

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
          ...apiMessages,
        ],
        stream: true,
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Contacte o suporte." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "O modelo de IA não respondeu corretamente." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Stream the response directly
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error: unknown) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno no servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
