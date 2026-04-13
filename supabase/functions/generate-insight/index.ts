import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const { action, topic, source_url, current_content } = await req.json();

    let prompt = "";

    if (action === "generate") {
      prompt = `
        Você é um estrategista de conteúdo SEO de elite. 
        Sua tarefa é criar um artigo de Insight curto e impactante (blog post) para a plataforma "Qualify".
        O público-alvo são donos de agências de marketing e operações digitais.
        
        TEMA/CONTEXTO: ${topic || "Escalabilidade de Agências com IA"}
        ${source_url ? `LINK DE INSPIRAÇÃO: ${source_url}` : ""}

        RETORNE ESTRITAMENTE UM JSON NO SEGUINTE FORMATO:
        {
          "title": "Título magnético focado em SEO",
          "slug": "url-amigavel-baseada-no-titulo",
          "excerpt": "Um resumo de 2 frases que instiga a curiosidade",
          "content": "Conteúdo em HTML puro (sem tags body/head), estruturado com h2, h3, p, strong, e ul/li. O texto deve ser profissional, visceral e prático.",
          "seo_title": "Título otimizado para Google (máx 60 chars)",
          "seo_description": "Meta description persuasiva para Google (máx 160 chars)",
          "seo_keywords": ["keyword1", "keyword2", "keyword3"]
        }

        REGRAS DE OURO:
        1. O conteúdo deve focar em como a Qualify (um CRM/ERP de agências) ajuda a resolver o problema citado.
        2. Use um tom de autoridade, mas humano.
        3. O HTML deve ser limpo, pronto para ser renderizado.
        4. O slug deve ser separado por hífens, sem caracteres especiais.
      `;
    } else if (action === "refine") {
      prompt = `
        Aprimore o conteúdo abaixo para torná-lo mais profissional, persuasivo e focado em SEO.
        Mantenha a estrutura HTML.
        
        CONTEÚDO ATUAL: ${current_content}

        RETORNE ESTRITAMENTE O JSON COM OS CAMPOS ATUALIZADOS:
        {
          "title": "Título aprimorado",
          "slug": "slug-aprimorado",
          "excerpt": "Resumo aprimorado",
          "content": "HTML aprimorado",
          "seo_title": "SEO Title",
          "seo_description": "SEO Description",
          "seo_keywords": []
        }
      `;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
        }
      }),
    });

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(resultText);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
