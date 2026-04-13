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
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) return new Response("Unauthorized", { status: 401 });

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

    const { messages } = await req.json();
    const lastUserMessage = messages[messages.length - 1];
    if (!lastUserMessage?.content) throw new Error("Mensagem vazia.");

    // 1. Guardar a mensagem do utilizador
    await supabaseClient.from('admin_chat_messages').insert({
      user_id: user.id,
      role: 'user',
      content: lastUserMessage.content
    });

    // --- PROTOCOLO DE LIMPEZA (Máximo 100 mensagens) ---
    try {
      // Buscar ID da 100ª mensagem mais recente
      const { data: cutoffMsg } = await supabaseClient
        .from('admin_chat_messages')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(100, 100)
        .maybeSingle();

      if (cutoffMsg) {
        // Apagar tudo o que for mais antigo que a 100ª mensagem
        await supabaseClient
          .from('admin_chat_messages')
          .delete()
          .eq('user_id', user.id)
          .lt('created_at', cutoffMsg.created_at);
      }
    } catch (e) {
      console.error("Erro na limpeza de histórico:", e);
    }

    // 2. Obter Estatísticas
    const stats = await Promise.all([
      supabaseClient.from('organizations').select('*', { count: 'exact', head: true }),
      supabaseClient.from('subscriptions').select('*', { count: 'exact', head: true }).in('status', ['active', 'trialing']),
      supabaseClient.from('profiles').select('*', { count: 'exact', head: true })
    ]);
    const dataContext = `DADOS REAIS: Agências: ${stats[0].count}, Ativas: ${stats[1].count}, Utilizadores: ${stats[2].count}.`;

    // 3. Obter histórico RECENTE
    const { data: recentHistory } = await supabaseClient
      .from('admin_chat_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    const historyForAi = (recentHistory || []).reverse().map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    // --- AGENTE 1: O ESTRATEGISTA ---
    const strategistResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `Você é o Estrategista Principal do Qualify. Foco: Negócios e Growth. ${dataContext}` },
          ...historyForAi
        ],
        temperature: 0.7
      }),
    });

    const strategistData = await strategistResponse.json();
    const rawContent = strategistData.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("Erro ao gerar resposta.");

    // --- AGENTE 2: O EDITOR ---
    const editorResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Você é o Editor Profissional do Qualify. Formate o texto em PT-PT impecável, estruturado em Markdown e com espaçamento generoso. Entregue apenas o texto revisado." },
          { role: "user", content: `Revisa este texto:\n\n${rawContent}` }
        ],
        stream: true
      }),
    });

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = editorResponse.body?.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    (async () => {
      let fullContent = "";
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            const line = part.trim();
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.substring(6));
                const text = data.choices?.[0]?.delta?.content;
                if (text) {
                  fullContent += text;
                  await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                }
              } catch (e) {}
            }
          }
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        if (fullContent) {
          await supabaseClient.from('admin_chat_messages').insert({
            user_id: user.id,
            role: 'assistant',
            content: fullContent
          });
        }
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...getCorsHeaders(req), "Content-Type": "text/event-stream" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
    });
  }
});
