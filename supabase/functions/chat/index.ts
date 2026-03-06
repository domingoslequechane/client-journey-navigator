import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

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
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Get user's organization_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, current_organization_id, role, privileges')
      .eq('id', user.id)
      .single();

    const userOrgId = profile?.current_organization_id || profile?.organization_id;

    if (!userOrgId) {
      return new Response(JSON.stringify({ error: "User organization not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Configuração de IA ausente (GEMINI_API_KEY)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const { messages, clientData } = ChatRequestSchema.parse(body);

    let clientContext = "";
    if (clientData?.id) {
      // SECURITY: Fetch client data from DB to verify ownership and get fresh data
      const { data: dbClient } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientData.id)
        .eq('organization_id', userOrgId)
        .single();

      if (dbClient) {
        clientContext = `
DADOS DO CLIENTE ATUAL:
Empresa: ${dbClient.company_name || 'N/A'}
Fase: ${STAGE_LABELS[dbClient.current_stage || ''] || 'N/A'}
Qualificação: ${dbClient.qualification || 'N/A'}
Orçamento: ${dbClient.monthly_budget || '0'} MT
Serviços: ${dbClient.services?.join(', ') || 'N/A'}
Notas: ${dbClient.notes || 'N/A'}
BANT: B${dbClient.bant_budget}/A${dbClient.bant_authority}/N${dbClient.bant_need}/T${dbClient.bant_timeline}
`;
      }
    }

    const userPrivileges = profile?.privileges || [];
    const userRole = profile?.role || 'member';
    const isAdmin = userRole === 'admin';

    const systemPrompt = `Sou a QIA, a assistente inteligente de marketing digital de elite (Versão 2.5 Flash).
Minhas especialidades incluem social media, tráfego pago, vendas e estratégia de negócios.
Tenho a capacidade avançada de ver e analisar imagens e documentos que me enviares com precisão cirúrgica.

REGRAS DE ACESSO (CRÍTICO):
Sou um agente consciente de permissão. O utilizador atual tem os seguintes privilégios: ${isAdmin ? 'ADMIN (ACESSO TOTAL)' : userPrivileges.join(', ') || 'NENHUM (ACESSO LIMITADO)'}.
SE o utilizador solicitar informações ou ações relacionadas a módulos que NÃO possui (ex: Finanças, Studio AI, etc.), devo recusar educadamente dizendo: "Não estou autorizado a lhe fornecer estas informações ou realizar esta ação com base nas tuas permissões atuais."

${clientContext}

REGRAS DE RESPOSTA:
- Respondo sempre em português de Portugal (PT-PT).
- Sou extremamente profissional, estratégica e direta ao ponto.
- Analiso arquivos (imagens/PDFs) com profundidade técnica, identificando oportunidades de marketing.
- Sugiro ações práticas e imediatas baseadas na fase atual do cliente no funil.`;

    // Convert messages to Gemini native format
    const contents = messages.map((m: any) => {
      const parts: any[] = [];

      if (Array.isArray(m.content)) {
        for (const part of m.content) {
          if (part.type === "text") {
            parts.push({ text: part.text });
          } else if (part.type === "image_url") {
            if (part.image_url.url.startsWith('data:')) {
              const [mimePart, data] = part.image_url.url.split(',');
              const mimeType = mimePart.split(':')[1].split(';')[0];
              parts.push({
                inline_data: {
                  mime_type: mimeType,
                  data: data
                }
              });
            } else {
              parts.push({ text: `[Imagem para análise: ${part.image_url.url}]` });
            }
          } else if (part.type === "file_attachment") {
            if (part.file && part.file.data && part.file.mimeType) {
              parts.push({
                inline_data: {
                  mime_type: part.file.mimeType,
                  data: part.file.data
                }
              });
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
      system_instruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        topP: 0.95,
        topK: 40
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      ]
    };

    // Usando Gemini 2.5 Flash conforme documentação oficial
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[chat] Gemini API error:", errorText);

      let friendlyError = "A IA encontrou um problema técnico.";
      try {
        const errObj = JSON.parse(errorText);
        if (errObj.error) {
          friendlyError = `Erro IA (${errObj.error.code || response.status}): ${errObj.error.message}`;
        }
      } catch {
        friendlyError = `Erro técnico (${response.status}): ${errorText.substring(0, 100)}`;
      }

      return new Response(JSON.stringify({ error: friendlyError }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
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
                  const openAiFormat = { choices: [{ delta: { content: text } }] };
                  await writer.write(encoder.encode(`data: ${JSON.stringify(openAiFormat)}\n\n`));
                }
              } catch { /* ignore partials */ }
            }
          }
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("[chat] Stream error:", err);
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error: unknown) {
    console.error("[chat] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno no servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});