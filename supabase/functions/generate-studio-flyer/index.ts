import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;

    const { projectId, prompt, size, style, mode, model } = await req.json();

    if (!projectId || !prompt) {
      return new Response(JSON.stringify({ error: "projectId and prompt are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("studio_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("Project error:", projectError);
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt with project context
    const enhancedPrompt = buildEnhancedPrompt(project, prompt, style);

    // Get Gemini API key
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse size
    const [width, height] = (size || "1080x1080").split("x").map(Number);
    
    // Choose Gemini model
    const geminiModel = model === "gemini-pro" 
      ? "gemini-2.0-flash-exp" 
      : "gemini-2.0-flash-exp";

    console.log("Generating with model:", geminiModel);
    console.log("Enhanced prompt:", enhancedPrompt.substring(0, 200) + "...");

    // Call Gemini API for image generation
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate a professional marketing flyer image with the following specifications:

${enhancedPrompt}

IMPORTANT INSTRUCTIONS:
- Create a visually stunning, professional flyer design
- Use the brand colors specified
- Make text readable and well-positioned
- Ensure high contrast for legibility
- Create a design suitable for social media marketing
- The image should be ${width}x${height} pixels
- Style: ${style === 'vivid' ? 'vibrant and eye-catching colors' : 'natural and professional tones'}`
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ["image", "text"],
            responseMimeType: "image/png"
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: "Failed to generate image",
        details: errorText 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiResponse.json();
    console.log("Gemini response received");

    // Extract image from response
    let imageBase64 = null;
    let imageMimeType = "image/png";

    if (geminiData.candidates?.[0]?.content?.parts) {
      for (const part of geminiData.candidates[0].content.parts) {
        if (part.inlineData) {
          imageBase64 = part.inlineData.data;
          imageMimeType = part.inlineData.mimeType || "image/png";
          break;
        }
      }
    }

    if (!imageBase64) {
      console.error("No image in response:", JSON.stringify(geminiData).substring(0, 500));
      return new Response(JSON.stringify({ 
        error: "No image generated",
        response: geminiData 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload image to Supabase Storage
    const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const fileName = `flyers/${projectId}/${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("studio-assets")
      .upload(fileName, imageBuffer, {
        contentType: imageMimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to save image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("studio-assets")
      .getPublicUrl(fileName);

    // Save flyer to database
    const { data: flyer, error: flyerError } = await supabase
      .from("studio_flyers")
      .insert({
        project_id: projectId,
        organization_id: project.organization_id,
        created_by: userId,
        prompt,
        image_url: publicUrl,
        size: size || "1080x1080",
        style: style || "vivid",
        niche: project.niche,
        model: model || "gemini-flash",
        generation_mode: mode || "original",
      })
      .select()
      .single();

    if (flyerError) {
      console.error("Flyer save error:", flyerError);
      return new Response(JSON.stringify({ error: "Failed to save flyer record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Flyer generated successfully:", flyer.id);

    return new Response(JSON.stringify({ 
      success: true, 
      flyer,
      imageUrl: publicUrl 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Generate flyer error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildEnhancedPrompt(project: any, userPrompt: string, style: string): string {
  const parts: string[] = [];

  // Brand context
  parts.push(`BRAND: ${project.name}`);
  
  if (project.niche) {
    parts.push(`INDUSTRY: ${project.niche}`);
  }

  // Colors
  parts.push(`PRIMARY COLOR: ${project.primary_color}`);
  parts.push(`SECONDARY COLOR: ${project.secondary_color}`);
  
  if (project.font_family) {
    parts.push(`FONT STYLE: ${project.font_family}`);
  }

  // User request
  parts.push(`\nUSER REQUEST: ${userPrompt}`);

  // AI instructions from project
  if (project.ai_instructions) {
    parts.push(`\nBRAND GUIDELINES: ${project.ai_instructions}`);
  }

  // Restrictions
  if (project.ai_restrictions) {
    parts.push(`\nRESTRICTIONS: ${project.ai_restrictions}`);
  }

  return parts.join("\n");
}
