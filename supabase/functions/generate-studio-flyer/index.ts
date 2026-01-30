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
    const enhancedPrompt = buildEnhancedPrompt(project, prompt, style, size);

    // Get Gemini API key for image generation
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Gemini API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating image with Google Imagen 3 API");
    console.log("Enhanced prompt:", enhancedPrompt.substring(0, 200) + "...");

    // Call Imagen 3 API for image generation
    const imagenResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: enhancedPrompt
            }
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: size === "1080x1920" ? "9:16" : size === "1920x1080" ? "16:9" : "1:1",
            outputOptions: {
              mimeType: "image/png"
            }
          }
        }),
      }
    );

    if (!imagenResponse.ok) {
      const errorText = await imagenResponse.text();
      console.error("Imagen API error:", imagenResponse.status, errorText);
      
      // Handle rate limiting
      if (imagenResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment.",
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: "Failed to generate image",
        details: errorText 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imagenData = await imagenResponse.json();
    console.log("Imagen API response received");

    // Extract image from Imagen response
    let imageUrl = null;

    // Imagen returns images in predictions[].bytesBase64Encoded
    if (imagenData.predictions?.[0]?.bytesBase64Encoded) {
      const base64Data = imagenData.predictions[0].bytesBase64Encoded;
      imageUrl = `data:image/png;base64,${base64Data}`;
    }

    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(imagenData).substring(0, 1000));
      return new Response(JSON.stringify({ 
        error: "No image generated. The AI may not have understood the request.",
        response: imagenData 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If it's a base64 data URL, upload to storage
    let publicUrl = imageUrl;
    
    if (imageUrl.startsWith("data:image/")) {
      // Extract base64 data and mime type
      const matches = imageUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const extension = mimeType.split("/")[1] || "png";
        
        // Convert base64 to binary
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const fileName = `flyers/${projectId}/${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("studio-assets")
          .upload(fileName, imageBuffer, {
            contentType: mimeType,
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
        const { data: { publicUrl: storageUrl } } = supabase.storage
          .from("studio-assets")
          .getPublicUrl(fileName);
        
        publicUrl = storageUrl;
      }
    }

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
        model: "imagen-3.0-generate-002",
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

function buildEnhancedPrompt(project: any, userPrompt: string, style: string, size: string): string {
  const [width, height] = (size || "1080x1080").split("x").map(Number);
  
  const parts: string[] = [];
  
  parts.push("Create a professional marketing flyer image with the following specifications:");
  parts.push("");

  // Brand context
  parts.push(`BRAND NAME: ${project.name}`);
  
  if (project.niche) {
    parts.push(`INDUSTRY/NICHE: ${project.niche}`);
  }

  // Colors
  parts.push(`PRIMARY BRAND COLOR: ${project.primary_color}`);
  parts.push(`SECONDARY BRAND COLOR: ${project.secondary_color}`);
  
  if (project.font_family) {
    parts.push(`FONT STYLE: ${project.font_family}`);
  }

  parts.push("");
  parts.push(`IMAGE SIZE: ${width}x${height} pixels`);
  parts.push(`STYLE: ${style === 'vivid' ? 'Vibrant, eye-catching, bold colors' : 'Natural, professional, subtle tones'}`);
  
  parts.push("");
  parts.push("DESIGN REQUEST:");
  parts.push(userPrompt);

  // AI instructions from project
  if (project.ai_instructions) {
    parts.push("");
    parts.push("BRAND GUIDELINES:");
    parts.push(project.ai_instructions);
  }

  // Restrictions
  if (project.ai_restrictions) {
    parts.push("");
    parts.push("RESTRICTIONS (DO NOT INCLUDE):");
    parts.push(project.ai_restrictions);
  }

  parts.push("");
  parts.push("IMPORTANT REQUIREMENTS:");
  parts.push("- Create a visually stunning, professional flyer design");
  parts.push("- Use the brand colors prominently");
  parts.push("- Ensure text is readable with good contrast");
  parts.push("- Make the design suitable for social media marketing");
  parts.push("- Output only the image, no additional text");

  return parts.join("\n");
}
