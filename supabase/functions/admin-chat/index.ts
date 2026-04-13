import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: getCorsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Autenticação para validar admin
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      });
    }

    // Verificar se é proprietário/admin interno
    const emailLower = user.email?.toLowerCase() || '';
    const isInternalAdminEmail =
      emailLower.includes('qfy-admin') ||
      (emailLower.startsWith('admin@') && emailLower.includes('onixagence.com'));
    
    let isAdminUser = isInternalAdminEmail;
    
    if (!isAdminUser) {
      const { data: roleData } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'qfy-admin')
        .maybeSingle();
        
      if (roleData) {
        isAdminUser = true;
      }
    }

    if (!isAdminUser) {
      console.error(`[admin-chat] Acesso negado para o utilizador: ${user.email} (${user.id})`);
      return new Response(JSON.stringify({ error: "Apenas administradores podem aceder a este assistente." }), {
        status: 403,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave do Claude AI não está configurada no Supabase." }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Mensagens inválidas." }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const lastUserMessage = messages[messages.length - 1];
    
    // 1. Guardar a mensagem do utilizador na B.D.
    if (lastUserMessage && lastUserMessage.role === 'user') {
      await supabaseClient.from('admin_chat_messages').insert({
        user_id: user.id,
        role: 'user',
        content: lastUserMessage.content
      });
    }

    // 2. Obter histórico dos últimos 3 meses para contexto
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: history } = await supabaseClient
      .from('admin_chat_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .gte('created_at', threeMonthsAgo.toISOString())
      .order('created_at', { ascending: true })
      .limit(30);

    // 3. Obter contexto da B.D.
    const [
      { count: totalAgencies },
      { count: activeAgencies },
      { count: totalUsers },
      { count: activeSubscriptions }
    ] = await Promise.all([
      supabaseClient.from('organizations').select('*', { count: 'exact', head: true }),
      supabaseClient.from('subscriptions').select('*', { count: 'exact', head: true }).in('status', ['active', 'trialing']),
      supabaseClient.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseClient.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active')
    ]);

    const systemPromptText = `Você é o Especialista Qualify & Growth, o braço direito estratégico do CEO.
Sua missão é ajudar a gerir o SaaS Qualify com inteligência competitiva e estratégias de marketing B2B.

DADOS DA PLATAFORMA ATUALIZADOS:
- Agências: ${totalAgencies || 0} (Ativas/Trial: ${activeAgencies || 0})
- Utilizadores Totais: ${totalUsers || 0}
- Subscrições Pagas: ${activeSubscriptions || 0}

REGRAS DE OURO:
1. IDIOMA: Responda SEMPRE em Português de Portugal (PT-PT) impecável.
2. TOM: Consultivo, estratégico e focado em resultados.
3. ESTILO: Evite marcações excessivas (como **). Use negrito apenas para conceitos cruciais. Mantenha o texto limpo e legível.
4. PROIBIÇÃO ABSOLUTA: Nunca entregue "pensamentos" ou rascunhos. Entregue apenas a resposta final pronta.
`;

    // PASSO 1: Gerar o rascunho (Draft)
    const draftResponse = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1500,
        system: systemPromptText,
        messages: [
          ...(history || []).map((h: any) => ({
            role: h.role,
            content: h.content
          })),
          { role: "user", content: lastUserMessage.content }
        ],
      }),
    });

    if (!draftResponse.ok) throw new Error("Erro na geração do rascunho com Claude.");
    const draftData = await draftResponse.json();
    const draftText = draftData.content[0].text;

    // PASSO 2: Auto-Revisão e Refinamento Silencioso
    const finalResponse = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1500,
        system: "Você é um revisor de elite. Sua tarefa é pegar a resposta abaixo e melhorá-la. Remova redundâncias, corrija a gramática para PT-PT, elimine marcações desnecessárias e garanta um tom profissional. ENTREGUE APENAS O TEXTO FINAL REFINADO. NADA DE COMENTÁRIOS.",
        messages: [{ role: "user", content: `Refine e corrija esta resposta para o CEO do Qualify:\n\n${draftText}` }],
      }),
    });

    if (!finalResponse.ok) throw new Error("Erro na revisão com Claude.");
    const finalData = await finalResponse.json();
    const cleanContent = finalData.content[0].text;

    // 4. Guardar a resposta final e retornar
    await supabaseClient.from('admin_chat_messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: cleanContent
    });

    return new Response(JSON.stringify({ choices: [{ delta: { content: cleanContent } }] }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Request error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor ou falha na API do Claude." }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
    });
  }
});
