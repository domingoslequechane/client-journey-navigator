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
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Get user's organization_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, current_organization_id')
      .eq('id', user.id)
      .single();

    const userOrgId = profile?.current_organization_id || profile?.organization_id;

    if (!userOrgId) {
      return new Response(JSON.stringify({ error: "User organization not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { clientId, organizationId, weeks = 1, startDate, userId } = await req.json();

    // SECURITY: Verify organizationId matches user's organization
    if (organizationId !== userOrgId) {
      return new Response(JSON.stringify({ error: "Access denied to this organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!clientId || !organizationId) {
      return new Response(JSON.stringify({ error: "clientId and organizationId are required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Fetch full client profile and verify ownership
    const { data: client } = await supabase
      .from("clients")
      .select("company_name, services, notes, address, website, source, monthly_budget, email, phone")
      .eq("id", clientId)
      .eq("organization_id", userOrgId)
      .single();

    if (!client) {
      return new Response(JSON.stringify({ error: "Client not found or access denied" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch org info
    const { data: org } = await supabase
      .from("organizations")
      .select("name, knowledge_base_text")
      .eq("id", organizationId)
      .single();

    // Fetch Studio AI project linked to this client for richer niche/description context
    const { data: studioProjects } = await supabase
      .from("studio_projects")
      .select("niche, description, ai_instructions, ai_restrictions")
      .eq("organization_id", organizationId)
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(1);

    const studioProject = studioProjects?.[0] || null;

    const baseDate = startDate ? new Date(startDate) : new Date();
    const totalDays = weeks * 7;

    // Build a rich business context from all available data sources
    const servicesText = Array.isArray(client.services) && client.services.length > 0
      ? client.services.join(", ")
      : null;

    // Compose the business context block
    const businessContextLines = [
      studioProject?.niche ? `Nicho/Setor: ${studioProject.niche}` : null,
      studioProject?.description ? `Descrição do negócio: ${studioProject.description}` : null,
      servicesText ? `Produtos/Serviços que vende: ${servicesText}` : null,
      client.notes ? `Notas sobre o cliente: ${client.notes}` : null,
      studioProject?.ai_instructions ? `Instruções de comunicação: ${studioProject.ai_instructions}` : null,
      studioProject?.ai_restrictions ? `O que evitar: ${studioProject.ai_restrictions}` : null,
      client.address ? `Localização: ${client.address}` : null,
      client.website ? `Website: ${client.website}` : null,
    ].filter(Boolean);

    const businessContext = businessContextLines.length > 0
      ? businessContextLines.join("\n")
      : "Infira o sector de actividade pelo nome da empresa";

    const systemPrompt = `Você é um estrategista sénior de marketing de conteúdo com 10+ anos de experiência em criação de linhas editoriais para redes sociais em diferentes sectores de negócio em Moçambique e África.

REGRA ABSOLUTA E INVIOLÁVEL: Analise o perfil do cliente com atenção máxima. Todo o conteúdo que criar DEVE ser 100% relevante para o sector real de actividade desta empresa — os seus produtos, serviços e público-alvo concretos. É PROIBIDO criar conteúdo de outros sectores. Se a empresa vende materiais de construção, não pode criar posts sobre restaurantes. Se é clínica médica, não pode criar posts sobre moda.

Retorne APENAS JSON válido, sem markdown, sem texto adicional.`;

    const userPrompt = `Crie uma linha editorial estratégica e específica para este cliente.

═══════════════════════════════════════════════
PERFIL COMPLETO DO CLIENTE
═══════════════════════════════════════════════
Empresa: ${client.company_name}
${businessContext}

Agência: ${org?.name || "Não especificada"}
${org?.knowledge_base_text ? `Conhecimento da agência: ${org.knowledge_base_text.substring(0, 400)}` : ""}

═══════════════════════════════════════════════
PROCESSO DE ANÁLISE OBRIGATÓRIO
═══════════════════════════════════════════════

PASSO 1 — ANÁLISE DO NEGÓCIO (faça isso mentalmente antes de criar qualquer conteúdo):
Responda internamente:
• Qual é o sector REAL desta empresa? (ex: comércio de materiais de construção e canalização, restauração, clínica, imobiliária, etc.)
• O que exactamente esta empresa vende? (produtos físicos? serviços? ambos?)
• Quem são os clientes desta empresa? (construtores, famílias, empresas, etc.)
• Quais são as dores e motivações desse público?
• Qual é o objectivo de marketing mais relevante? (vender produtos, gerar leads, construir autoridade, fidelizar clientes)

PASSO 2 — ESTRATÉGIA DE CONTEÚDO:
Distribua o conteúdo entre estes pilares:
1. EDUCATIVO — ensinar sobre os produtos/serviços da empresa (ex: "como escolher o cano certo para sua canalização")
2. PRODUTO EM DESTAQUE — mostrar e promover um produto/serviço específico com call-to-action de compra
3. PROVA SOCIAL — depoimentos, obras realizadas, projectos entregues, clientes satisfeitos
4. AUTORIDADE — dicas profissionais do sector, tendências, novidades do mercado
5. ENGAJAMENTO — perguntas, enquetes, conteúdo que gera interacção
6. PROMOCIONAL — ofertas, preços especiais, campanhas

PASSO 3 — CRIAR ${totalDays} TAREFAS:
Data de início: ${baseDate.toISOString().split("T")[0]}
• Uma tarefa por dia, distribuídas estrategicamente
• Fins de semana: conteúdo mais leve ou promocional
• Início de semana: conteúdo educativo ou de autoridade
• Títulos criativos e específicos (mencionar produtos/serviços reais desta empresa)
• Descrições detalhadas com a mensagem principal e call-to-action

═══════════════════════════════════════════════
FORMATO JSON OBRIGATÓRIO
═══════════════════════════════════════════════
{
  "businessAnalysis": "Síntese em 2 frases do que este negócio faz, para quem e qual a estratégia adoptada",
  "tasks": [
    {
      "title": "Título criativo e específico para este negócio (máx 80 caracteres)",
      "description": "Descrição estratégica: mensagem principal, abordagem, call-to-action e porquê esta publicação é relevante para este negócio",
      "scheduled_date": "YYYY-MM-DD",
      "content_type": "Post Feed|Story|Reels|Carrossel|Blog|Email|Vídeo|Newsletter",
      "platform": "Instagram|Facebook|LinkedIn|TikTok|YouTube|Twitter/X|Blog|Email|WhatsApp",
      "status": "pending"
    }
  ]
}

TOTAL OBRIGATÓRIO: exactamente ${totalDays} tarefas, começando em ${baseDate.toISOString().split("T")[0]}.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        system_instruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          response_mime_type: "application/json",
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso da IA atingido. Tente novamente em breve." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const errText = await response.text();
      console.error("Gemini API Error:", response.status, errText);
      return new Response(JSON.stringify({ 
        error: `Erro ao chamar IA: ${response.status}`,
        details: errText.substring(0, 200)
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const rawContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from AI response
    let parsed: { businessAnalysis?: string; tasks: any[] };
    try {
      // More robust JSON extraction
      const startIdx = rawContent.indexOf('{');
      const endIdx = rawContent.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1) {
        throw new Error("No JSON found in AI response");
      }
      const jsonStr = rawContent.substring(startIdx, endIdx + 1);
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Parse error:", e, "Content:", rawContent);
      return new Response(JSON.stringify({ 
        error: "Falha ao processar comercial da IA",
        details: "A IA retornou um formato inesperado. Tente novamente.",
        debug: rawContent.substring(0, 100)
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      return new Response(JSON.stringify({ error: "Resposta inválida da IA" }), {
        status: 200,
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
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      count: insertedTasks?.length || 0,
      tasks: insertedTasks,
      businessAnalysis: parsed.businessAnalysis || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("generate-editorial error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno", details: "Este erro pode ocorrer devido a falhas na IA ou falta de chaves API no Supabase." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});