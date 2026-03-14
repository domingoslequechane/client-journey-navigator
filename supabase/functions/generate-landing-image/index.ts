import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

// Pre-defined prompts for each section
const sectionPrompts: Record<string, string> = {
  problema: "Minimalist 2D illustration of a stressed marketing professional at night (23:00 on clock), overwhelmed by floating WhatsApp message bubbles and scattered spreadsheet icons, warm desk lamp lighting, muted colors with red accents showing stress, clean vector art style, 16:9 aspect ratio",
  custo: "Minimalist 2D illustration of dollar bills and coins floating away into a dark void, some bills burning with subtle flames, a broken hourglass with sand spilling, clean vector art style, red and orange warning tones, dramatic lighting, 16:9 aspect ratio",
  solucao: "Minimalist 2D illustration of a clean organized Kanban board with colorful cards moving smoothly from left to right, green checkmarks appearing, a happy professional looking at the organized system, bright optimistic colors, clean vector art style, 16:9 aspect ratio",
  esperanca: "Minimalist 2D illustration of a confident marketing professional opening laptop to see organized dashboard with green growth charts, morning sunshine through window, calm and organized workspace, bright hopeful colors with blue and green tones, clean vector art style, 16:9 aspect ratio"
};

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { section } = await req.json();

    if (!section || !sectionPrompts[section]) {
      return new Response(
        JSON.stringify({ error: 'Invalid section. Use: problema, custo, solucao, esperanca' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log(`Generating image for section: ${section}`);

    const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
    const geminiUrl = `${GEMINI_API_BASE}/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: sectionPrompts[section] }]
          }
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: {
            aspectRatio: "16:9"
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate image" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    let base64Data = null;
    if (data && data.candidates && data.candidates.length > 0) {
      const candidateParts = data.candidates[0].content?.parts || [];
      for (const part of candidateParts) {
        if (part.inlineData) {
          base64Data = part.inlineData.data;
          break;
        } else if (part.inline_data) {
          base64Data = part.inline_data.data;
          break;
        }
      }
    }

    if (!base64Data) {
      console.error("No image in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "No image generated" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageUrl = `data:image/png;base64,${base64Data}`;

    console.log(`Successfully generated image for section: ${section}`);

    return new Response(
      JSON.stringify({ imageUrl, section }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error generating image:", error);
    return new Response(
      JSON.stringify({ error: "Ocorreu um erro inesperado ao gerar a imagem.", details: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
