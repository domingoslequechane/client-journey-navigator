import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Esquema de validação para mensagens
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
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: corsHeaders });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Configuração de IA ausente (API Key)" }), { status: 500, headers: corsHeaders });
    }

    const body = await req.json();
    const { messages, clientData } = ChatRequestSchema.parse(body);

    // Construção do contexto do cliente para o System Prompt
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

    // Converter mensagens para o formato nativo do Gemini
    const contents = messages.map((m: any) => {
      const parts = [];
      
      if (Array.isArray(m.content)) {
        for (const part of m.content) {
          if (part.type === "text") {
            parts.push({ text: part.text });
          } else if (part.type === "image_url") {
            if (part.image_url.url.startsWith('data:')) {
              const [mime, data] = part.image_url.url.split(',');
              parts.push({
                inline_data: {
                  mime_type: mime.split(':')[1].split(';')[0],
                  data: data
                }
              });
            } else {
              parts.push({ text: `[Imagem para análise: ${part.image_url.url}]` });
            }
          }
        }
      } else {
        parts.push({ text: m.content });
      }

      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: parts
      };
    });

    const payload = {
      contents: contents,
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        topP: 0.95,
        topK: 40
      }
    };

    console.log("Chamando Gemini 1.5 Pro API...");

    // Usando o modelo 1.5 Pro conforme solicitado
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro Gemini API:", errorText);
      return new Response(JSON.stringify({ error: "O modelo Gemini 1.5 Pro não respondeu corretamente. Verifique a cota da API." }), { status: 500, headers: corsHeaders });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  const openAiFormat = {
                    choices: [{ delta: { content: text } }]
                  };
                  await writer.write(encoder.encode(`data: ${JSON.stringify(openAiFormat)}\n\n`));
                }
              } catch (e) { /* ignore partials */ }
            }
          }
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("Stream error:", err);
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno no servidor" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});