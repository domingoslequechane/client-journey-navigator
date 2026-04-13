import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: getCorsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
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
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      });
    }

    // Verificar se é proprietário/admin interno
    const isInternalAdmin = user.email?.toLowerCase().includes('qfy-admin');
    
    let isAdminUser = isInternalAdmin;
    if (!isAdminUser) {
      const { data: roleData } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'proprietor')
        .single();
        
      if (roleData) {
        isAdminUser = true;
      }
    }

    if (!isAdminUser) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem aceder a este assistente." }), {
        status: 403,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave do OpenAI (Chat GPT) não está configurada no Supabase." }), {
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
      .limit(20); // Limitar a 20 para não sobrecarregar o prompt inicial

    // 3. Obter contexto da B.D. (estatísticas rápidas para injetar no bot)
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

    const systemPromptText = `
Você é o Assistente Executivo e Especialista de IA para o painel de Administração da nossa própria plataforma SaaS: o Qualify.
Você é um especialista absoluto na ferramenta Qualify, conhecendo todas as suas funcionalidades, arquitetura e potenciais casos de uso.
Além disso, você é um especialista de alto nível em SaaS, Finanças, Marketing e Growth.
Sua missão principal é ajudar os administradores e proprietários do Qualify a:
1. Entender os dados da plataforma e tirar insights acionáveis.
2. Traçar estratégias altamente eficientes de marketing, divulgação e crescimento para adquirir mais agências e utilizadores.
3. Solucionar problemas (troubleshooting) e atuar como um conselheiro estratégico para melhorar a retenção.

[CONTEXTO DE DADOS ATUAL - PLATAFORMA]
- Total de Agências cadastradas: ${totalAgencies || 0}
- Agências com Plano Ativo/Trial: ${activeAgencies || 0}
- Total de Utilizadores na plataforma: ${totalUsers || 0}
- Subscrições Ativas e Pagas: ${activeSubscriptions || 0}

Regras:
1. Responda num tom direto, consultivo e profissional, em português de Portugal (PT-PT).
2. Assuma sempre o papel de Especialista Maior do Qualify. Sempre associe as suas ideias de marketing ao valor que entregamos (SaaS B2B).
3. Seja proativo ao sugerir táticas práticas de divulgação ou melhorias de produto.
4. Formate com markdown rico e estruturado:
   - Use Títulos (###) para separar secções.
   - Use Listas com Marcadores para clareza.
   - Use **Negrito** para destacar áreas cruciais.
5. O utilizador com quem está a falar é a equipa criadora / proprietária / CEO do Qualify.
6. Você tem acesso ao histórico de conversas dos últimos 3 meses para manter contexto em longas sessões.
`;

    // Preparar mensagens para OpenAI com o histórico da BD
    const openAiMessages = [
      { role: "system", content: systemPromptText },
      ...(history || []).map((h: any) => ({
        role: h.role,
        content: h.content
      }))
    ];

    // Se a última mensagem do prompt (vinda do front) não for igual à última do histórico, adicionamos
    // (Pode acontecer se o insert falhou ou se o front enviou algo diferente)
    if (history && history.length > 0 && history[history.length - 1].content !== lastUserMessage.content) {
       openAiMessages.push({ role: "user", content: lastUserMessage.content });
    } else if (!history || history.length === 0) {
       openAiMessages.push({ role: "user", content: lastUserMessage.content });
    }

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openAiMessages,
        temperature: 0.7,
        stream: true
      }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error("OpenAI API error:", errorData);
        return new Response(JSON.stringify({ error: "Erro de IA (OpenAI)." }), {
            status: 500,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
        });
    }

    // Processar o stream e guardar a resposta final na B.D. de forma assíncrona
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    (async () => {
      let fullAssistantContent = "";
      try {
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") {
                await writer.write(encoder.encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const data = JSON.parse(dataStr);
                const text = data.choices?.[0]?.delta?.content;
                if (text) {
                  fullAssistantContent += text;
                  await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                }
              } catch (e) { /* ignore */ }
            }
          }
        }
        
        // Guardar a resposta da IA na BD
        if (fullAssistantContent) {
          await supabaseClient.from('admin_chat_messages').insert({
            user_id: user.id,
            role: 'assistant',
            content: fullAssistantContent
          });
        }
      } catch (err) {
        console.error("[admin-chat] Stream processing error:", err);
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...getCorsHeaders(req), "Content-Type": "text/event-stream" },
    });

  } catch (err: any) {
    console.error("Request error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor." }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
    });
  }
});

