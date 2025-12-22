import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pre-defined prompts for each section
const sectionPrompts: Record<string, string> = {
  problema: "Minimalist 2D illustration of a stressed marketing professional at night (23:00 on clock), overwhelmed by floating WhatsApp message bubbles and scattered spreadsheet icons, warm desk lamp lighting, muted colors with red accents showing stress, clean vector art style, 16:9 aspect ratio",
  custo: "Minimalist 2D illustration of dollar bills and coins floating away into a dark void, some bills burning with subtle flames, a broken hourglass with sand spilling, clean vector art style, red and orange warning tones, dramatic lighting, 16:9 aspect ratio",
  solucao: "Minimalist 2D illustration of a clean organized Kanban board with colorful cards moving smoothly from left to right, green checkmarks appearing, a happy professional looking at the organized system, bright optimistic colors, clean vector art style, 16:9 aspect ratio",
  esperanca: "Minimalist 2D illustration of a confident marketing professional opening laptop to see organized dashboard with green growth charts, morning sunshine through window, calm and organized workspace, bright hopeful colors with blue and green tones, clean vector art style, 16:9 aspect ratio"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { section } = await req.json();
    
    if (!section || !sectionPrompts[section]) {
      return new Response(
        JSON.stringify({ error: 'Invalid section. Use: problema, custo, solucao, esperanca' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating image for section: ${section}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: sectionPrompts[section]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to generate image" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "No image generated" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully generated image for section: ${section}`);

    return new Response(
      JSON.stringify({ imageUrl, section }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error generating image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
