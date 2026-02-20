// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { clientId, organizationId, weeks = 1, startDate, userId } = await req.json();

    if (!clientId || !organizationId) {
      return new Response(JSON.stringify({ error: "clientId and organizationId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch client info
    const { data: client } = await supabase
      .from("clients")
      .select("company_name, services, notes")
      .eq("id", clientId)
      .single();

    if (!client) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch org info
    const { data: org } = await supabase
      .from("organizations")
      .select("name, knowledge_base_text")
      .eq("id", organizationId)
      .single();

    const baseDate = startDate ? new Date(startDate) : new Date();
    const totalDays = weeks * 7;

    const systemPrompt = `Você é um estrategista de marketing de conteúdo especializado em criação de linhas editoriais para redes sociais.
Sua tarefa é gerar um calendário editorial detalhado e estratégico.
Retorne APENAS um JSON válido, sem markdown, sem explicações extras.`;

    const userPrompt = `Crie uma linha editorial para ${totalDays} dias (${weeks} semana(s)) para o cliente abaixo.

Cliente: ${client.company_name}
Serviços: ${(client.services || []).join(", ") || "Não especificado"}
Notas: ${client.notes || "Sem notas"}
Agência: ${org?.name || ""}
${org?.knowledge_base_text ? `Contexto da agência: ${org.knowledge_base_text}` : ""}

Data de início: ${baseDate.toISOString().split("T")[0]}

Gere exatamente ${totalDays} tarefas, uma por dia, começando na data de início.

Retorne APENAS este JSON:
{
  "tasks": [
    {
      "title": "Título curto e objetivo da publicação",
      "description": "Descrição detalhada do conteúdo a ser produzido",
      "scheduled_date": "YYYY-MM-DD",
      "content_type": "Post Feed|Story|Reels|Carrossel|Blog|Email|Vídeo|Newsletter",
      "platform": "Instagram|Facebook|LinkedIn|TikTok|YouTube|Twitter/X|Blog|Email|WhatsApp",
      "status": "pending"
    }
  ]
}

Regras:
- Varie os tipos de conteúdo e plataformas ao longo dos dias
- Títulos devem ser criativos e específicos para o negócio do cliente
- Misture conteúdo educativo, promocional, engajamento e storytelling
- Considere os dias da semana (fins de semana podem ter conteúdo mais leve)
- Total obrigatório: exatamente ${totalDays} tarefas`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso da IA atingido. Tente novamente em breve." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao chamar IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    let parsed: { tasks: any[] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Parse error:", e, "Content:", content);
      return new Response(JSON.stringify({ error: "Falha ao processar resposta da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      return new Response(JSON.stringify({ error: "Resposta inválida da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert tasks into database
    const tasksToInsert = parsed.tasks.map((task: any) => ({
      title: task.title || "Tarefa sem título",
      description: task.description || null,
      scheduled_date: task.scheduled_date,
      scheduled_time: null,
      content_type: task.content_type || null,
      platform: task.platform || null,
      status: "pending",
      client_id: clientId,
      organization_id: organizationId,
      created_by: userId || null,
    }));

    const { data: insertedTasks, error: insertError } = await supabase
      .from("editorial_tasks")
      .insert(tasksToInsert)
      .select("*, clients(id, company_name)");

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Erro ao salvar tarefas: " + insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      count: insertedTasks?.length || 0,
      tasks: insertedTasks,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("generate-editorial error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
