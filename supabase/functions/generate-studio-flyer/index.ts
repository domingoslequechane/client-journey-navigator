import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const AI_MODELS = {
  "gemini-flash": "gemini-2.5-flash-image",
  "gemini-pro": "gemini-3-pro-image-preview",
} as const;

const SIZE_CONFIG: Record<string, { aspectRatio: string; orientation: string; width: number; height: number }> = {
  "1080x1080": { aspectRatio: "1:1", orientation: "Quadrado", width: 1080, height: 1080 },
  "1080x1920": { aspectRatio: "9:16", orientation: "Retrato (Stories)", width: 1080, height: 1920 },
  "1920x1080": { aspectRatio: "16:9", orientation: "Paisagem (Banner)", width: 1920, height: 1080 },
  "1080x1350": { aspectRatio: "4:5", orientation: "Retrato (Carrossel)", width: 1080, height: 1350 },
  "1280x720": { aspectRatio: "16:9", orientation: "YouTube Thumbnail", width: 1280, height: 720 },
};

// Compact niche intelligence - focused keywords only
const NICHE_STYLE: Record<string, string> = {
  'Construção': 'Industrial: 3D cement bags, bricks, steel rebars. Orange+Charcoal palette. Strong dramatic lighting.',
  'Mobiliário': 'Luxury furniture: wood grain, velvet sofas, warm ambient lighting. Brown+Gold+Cream palette.',
  'Automóvel': 'Automotive: metallic paint, chrome rims, motion blur. Black+Orange/Red palette.',
  'Imobiliário': 'Real estate: modern buildings, luxury interiors, golden keys. Navy+Gold+White palette.',
  'Restaurante': 'Food: gourmet dishes with steam, dark moody backgrounds. Red+Gold+Dark Wood palette.',
  'Beleza': 'Beauty: cosmetics, skincare bottles with droplets, soft lighting. Rose Gold+Pink+White palette.',
  'Saúde': 'Medical: clean clinical look, stethoscopes, trustworthy. Blue+White+Green palette.',
  'Tecnologia': 'Tech: smartphones, neon reflections, dark environments. Black+Electric Blue/Purple palette.',
  'Moda': 'Fashion: editorial style, fabric textures, dramatic lighting. Black+White+bold accent palette.',
  'Fitness': 'Sports: gym equipment, high contrast, dynamic angles. Black+Red/Orange palette.',
  'Pet Shop': 'Pet: colorful toys, warm friendly photography. Orange+Blue+Green palette.',
  'Agricultura': 'Agriculture: tractors, golden fields, natural sunlight. Green+Brown+Gold palette.',
  'Ótica': 'Optical: designer eyeglasses, lens reflections, sharp focus. Navy+Silver+White palette.',
  'Farmácia': 'Pharmacy: clean packaging, health supplements, bright whites. Green+White+Blue palette.',
  'Joalharia': 'Jewelry: gold rings, diamonds, dramatic spotlighting. Black+Gold+White palette.',
  'Eventos': 'Events: elegant decorations, bokeh lights, celebration mood. Gold+Black+White palette.',
  'Educação': 'Education: books, graduation caps, warm library lighting. Navy+Gold+White palette.',
};

// Concise design system core - optimized for token efficiency
function buildCoreInstructions(sizeConfig: typeof SIZE_CONFIG[string]): string {
  return `You are an elite graphic designer creating a professional commercial flyer (${sizeConfig.width}×${sizeConfig.height}px, ${sizeConfig.aspectRatio}).

DESIGN RULES:
- Create DEPTH with 3-5 layers: textured background → geometric shapes → hero product → text overlay → accent effects
- Hero product/subject: photorealistic 3D, 40-60% of canvas, studio-lit (key+fill+rim light), slightly angled
- Bold geometric elements: large circles, rounded rectangles, diagonal color blocks (inspired by top Brazilian design agencies)
- Typography hierarchy: ultra-bold headline → medium subhead → bold CTA/price badge → clean contact info with icons
- Max 3-4 colors: primary, secondary, accent, neutral. High contrast text. Dark backgrounds for premium feel
- Professional finishing: subtle grain texture, vignette, light effects, consistent shadow direction
- The result must be indistinguishable from premium human agency work — NO AI artifacts, NO cartoon/illustration style
- All text must be sharp, readable, correctly spelled, and never cut off`;
}

// Mode-specific prompt builders (concise versions)
function buildOriginalPrompt(params: {
  prompt: string;
  sizeConfig: typeof SIZE_CONFIG[string];
  clientName?: string;
  niche?: string;
  mood?: string;
  colors?: string;
  elements?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  aiInstructions?: string;
  aiRestrictions?: string;
  aiMemoryContext?: string;
  clientContext?: string;
}): string {
  const { prompt, sizeConfig, clientName, niche, mood, colors, elements,
    primaryColor, secondaryColor, fontFamily, aiInstructions, 
    aiRestrictions, aiMemoryContext, clientContext } = params;

  let p = buildCoreInstructions(sizeConfig);

  p += `\n\nMODE: Original creation — 100% unique, bold, innovative design.`;
  
  if (clientName) p += `\nBrand: ${clientName}`;
  if (niche && NICHE_STYLE[niche]) p += `\nIndustry style: ${NICHE_STYLE[niche]}`;
  if (mood) p += `\nMood: ${mood}`;
  if (elements) p += `\nHero element: ${elements}`;
  if (fontFamily) p += `\nFont: ${fontFamily}`;

  if (colors === 'Cores do Cliente' && (primaryColor || secondaryColor)) {
    p += `\nBrand colors: primary=${primaryColor || 'auto'}, secondary=${secondaryColor || 'auto'}`;
  } else if (colors === 'Aleatórias (IA escolhe)') {
    p += `\nColors: Choose a harmonious high-impact palette for this industry.`;
  }

  if (clientContext) p += `\nClient info: ${clientContext}`;
  if (aiInstructions) p += `\nCreative direction: ${aiInstructions}`;
  if (aiMemoryContext) p += `\nLearned preferences: ${aiMemoryContext}`;
  if (aiRestrictions) p += `\nRestrictions: ${aiRestrictions}`;

  p += `\n\nFLYER TEXT CONTENT (render ONLY this on the flyer):\n${prompt}`;
  p += `\n\nCreate a jaw-dropping, scroll-stopping, high-conversion commercial flyer. Premium agency quality.`;

  return p;
}

function buildCopyPrompt(params: {
  prompt: string;
  sizeConfig: typeof SIZE_CONFIG[string];
  niche?: string;
  clientContext?: string;
}): string {
  const { prompt, sizeConfig, niche, clientContext } = params;

  let p = buildCoreInstructions(sizeConfig);

  p += `\n\nMODE: Template replication — COPY the first reference image EXACTLY.
Copy pixel-perfect: layout grid, spacing, colors, typography style, geometric shapes, decorative elements.
Replace ONLY: product/subject image and text content with what's specified below.`;

  if (niche && NICHE_STYLE[niche]) p += `\nIndustry: ${NICHE_STYLE[niche]}`;
  if (clientContext) p += `\nClient: ${clientContext}`;

  p += `\n\nFLYER TEXT CONTENT:\n${prompt}`;
  p += `\n\nReplicate the template EXACTLY. Only differences: product image and text. Photorealistic quality.`;

  return p;
}

function buildInspirationPrompt(params: {
  prompt: string;
  sizeConfig: typeof SIZE_CONFIG[string];
  clientName?: string;
  niche?: string;
  mood?: string;
  colors?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  aiInstructions?: string;
  aiMemoryContext?: string;
  clientContext?: string;
  referenceCount: number;
}): string {
  const { prompt, sizeConfig, clientName, niche, mood, colors,
    primaryColor, secondaryColor, fontFamily, aiInstructions, 
    aiMemoryContext, clientContext, referenceCount } = params;

  let p = buildCoreInstructions(sizeConfig);

  p += `\n\nMODE: Creative inspiration — Study the ${referenceCount} reference image(s), absorb their composition, colors, and style, then create something ORIGINAL that SURPASSES them.`;

  if (clientName) p += `\nBrand: ${clientName}`;
  if (niche && NICHE_STYLE[niche]) p += `\nIndustry: ${NICHE_STYLE[niche]}`;
  if (mood) p += `\nMood: ${mood}`;
  if (fontFamily) p += `\nFont: ${fontFamily}`;
  if (colors === 'Cores do Cliente' && (primaryColor || secondaryColor)) {
    p += `\nBrand colors: primary=${primaryColor || 'auto'}, secondary=${secondaryColor || 'auto'}`;
  }
  if (clientContext) p += `\nClient: ${clientContext}`;
  if (aiInstructions) p += `\nDirection: ${aiInstructions}`;
  if (aiMemoryContext) p += `\nPreferences: ${aiMemoryContext}`;

  p += `\n\nFLYER TEXT CONTENT:\n${prompt}`;
  p += `\n\nCreate an original masterpiece inspired by the references. Surpass them in quality and impact.`;

  return p;
}

function buildProductPreservationPrompt(params: {
  prompt: string;
  sizeConfig: typeof SIZE_CONFIG[string];
  clientName?: string;
  niche?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  aiInstructions?: string;
  aiMemoryContext?: string;
  clientContext?: string;
}): string {
  const { prompt, sizeConfig, clientName, niche,
    primaryColor, secondaryColor, fontFamily, aiInstructions, aiMemoryContext, clientContext } = params;

  let p = buildCoreInstructions(sizeConfig);

  p += `\n\nMODE: Product preservation — The reference image contains the EXACT product to advertise.
CRITICAL: The product MUST remain 100% IDENTICAL (shape, color, texture, logos). Do NOT redesign it.
Extract the product, place it as hero element (40-60% of canvas), and design ONLY the background, layout, and text around it.`;

  if (clientName) p += `\nBrand: ${clientName}`;
  if (niche && NICHE_STYLE[niche]) p += `\nIndustry: ${NICHE_STYLE[niche]}`;
  if (primaryColor) p += `\nPrimary color: ${primaryColor}`;
  if (secondaryColor) p += `\nSecondary color: ${secondaryColor}`;
  if (fontFamily) p += `\nFont: ${fontFamily}`;
  if (clientContext) p += `\nClient: ${clientContext}`;
  if (aiInstructions) p += `\nDirection: ${aiInstructions}`;
  if (aiMemoryContext) p += `\nPreferences: ${aiMemoryContext}`;

  p += `\n\nFLYER TEXT CONTENT:\n${prompt}`;
  p += `\n\nDesign a professional flyer around the PRESERVED product. Bold geometric background, premium quality.`;

  return p;
}

function buildTemplateMemoryPrompt(params: {
  prompt: string;
  sizeConfig: typeof SIZE_CONFIG[string];
  clientName?: string;
  niche?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  aiInstructions?: string;
  aiMemoryContext?: string;
  clientContext?: string;
  hasProductImage: boolean;
}): string {
  const { prompt, sizeConfig, clientName, niche,
    primaryColor, secondaryColor, fontFamily, 
    aiInstructions, aiMemoryContext, clientContext, hasProductImage } = params;

  let p = buildCoreInstructions(sizeConfig);

  p += `\n\nMODE: Strict template replication — The FIRST reference image is the approved template.
Copy pixel-perfect: logo position, typography, colors, geometric shapes, layout grid, footer structure.
Replace ONLY: product image${hasProductImage ? ' (use SECOND image)' : ''} and text content.`;

  if (clientName) p += `\nClient: ${clientName}`;
  if (niche && NICHE_STYLE[niche]) p += `\nIndustry: ${NICHE_STYLE[niche]}`;
  if (primaryColor) p += `\nPrimary: ${primaryColor}`;
  if (secondaryColor) p += `\nSecondary: ${secondaryColor}`;
  if (fontFamily) p += `\nFont: ${fontFamily}`;
  if (clientContext) p += `\nClient info: ${clientContext}`;
  if (aiInstructions) p += `\nInstructions: ${aiInstructions}`;
  if (aiMemoryContext) p += `\nPreferences: ${aiMemoryContext}`;

  p += `\n\nFLYER TEXT CONTENT:\n${prompt}`;
  p += `\n\nGenerate visually IDENTICAL to template. Only product and text differ.`;

  return p;
}

function buildClientContext(client: Record<string, unknown> | null): string {
  if (!client) return '';
  const parts: string[] = [];
  if (client.company_name) parts.push(`${client.company_name}`);
  if (client.services && Array.isArray(client.services) && client.services.length > 0) {
    parts.push(`Services: ${client.services.join(', ')}`);
  }
  if (client.notes) parts.push(`Notes: ${String(client.notes).substring(0, 150)}`);
  return parts.join(' | ');
}

// Safety settings to prevent overly cautious blocking
const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
];

// Fetch and encode an image URL to inline data
async function fetchImageAsInlineData(
  imgUrl: string,
  index: number
): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

  try {
    if (imgUrl.startsWith('data:')) {
      const matches = imgUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        return { inlineData: { mimeType: matches[1], data: matches[2] } };
      }
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const imgResp = await fetch(imgUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'image/png, image/jpeg, image/webp, image/gif, */*' }
      });
      clearTimeout(timeoutId);

      if (!imgResp.ok) return null;

      let contentType = imgResp.headers.get('content-type') || 'image/png';
      contentType = contentType.split(';')[0].trim().toLowerCase();

      if (!SUPPORTED_MIME_TYPES.includes(contentType)) {
        console.warn(`Image ${index + 1}: Unsupported MIME (${contentType}). Skipping.`);
        return null;
      }

      const imgBuffer = await imgResp.arrayBuffer();
      if (imgBuffer.byteLength > 4 * 1024 * 1024) {
        console.log(`Image ${index + 1}: Skipped - too large (${(imgBuffer.byteLength / 1024 / 1024).toFixed(1)}MB)`);
        return null;
      }

      const uint8Array = new Uint8Array(imgBuffer);
      let base64 = '';
      const chunkSize = 8192;
      for (let j = 0; j < uint8Array.length; j += chunkSize) {
        const chunk = uint8Array.slice(j, j + chunkSize);
        base64 += String.fromCharCode.apply(null, Array.from(chunk));
      }
      base64 = btoa(base64);

      console.log(`Image ${index + 1}: Added (${contentType}, ${(imgBuffer.byteLength / 1024).toFixed(0)}KB)`);
      return { inlineData: { mimeType: contentType, data: base64 } };
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      console.error(`Image ${index + 1}: Fetch error - ${fetchErr}`);
      return null;
    }
  } catch (e) {
    console.error(`Error processing image ${index + 1}:`, e);
    return null;
  }
}

// Call Gemini API with retry logic
async function callGeminiWithRetry(
  model: string,
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>,
  apiKey: string,
  maxRetries: number = 2
): Promise<{ imageData: string; mimeType: string } | { error: string; status: number; response?: unknown }> {
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const isRetry = attempt > 0;
    
    // On retry, simplify: remove images and use a shorter prompt
    let currentParts = parts;
    if (isRetry) {
      console.log(`Retry attempt ${attempt}: simplifying request...`);
      // Keep only the text part (first element) and simplify it
      const textPart = parts.find(p => 'text' in p) as { text: string } | undefined;
      if (textPart) {
        // On first retry, keep images but shorten text. On second retry, drop images entirely.
        if (attempt === 1) {
          currentParts = parts; // keep everything, just retry
        } else {
          // Drop all images, use simplified text
          const simplifiedText = textPart.text
            .replace(/DESIGN RULES:[\s\S]*?NO AI artifacts[^\n]*\n/g, 
              'Create a professional, photorealistic commercial flyer. Premium agency quality. Bold geometric design with depth.\n')
            .substring(0, 800);
          currentParts = [{ text: simplifiedText }];
          console.log("Retry with simplified prompt (no images), length:", simplifiedText.length);
        }
      }
    }

    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: currentParts }],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
              maxOutputTokens: 8192,
            },
            safetySettings: SAFETY_SETTINGS,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error (attempt ${attempt}):`, response.status, errorText);

        if (response.status === 429) {
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
            continue;
          }
          return { error: "Rate limit exceeded. Please try again in a moment.", status: 429 };
        }

        if (response.status === 403 || response.status === 401) {
          return { error: "API authentication error. Check API key.", status: 500 };
        }

        if (attempt < maxRetries) continue;
        return { error: "Failed to generate image", status: 500 };
      }

      const data = await response.json();
      console.log(`Gemini response (attempt ${attempt}):`, 
        JSON.stringify({
          blockReason: data?.promptFeedback?.blockReason,
          finishReason: data?.candidates?.[0]?.finishReason,
          hasContent: !!data?.candidates?.[0]?.content?.parts,
          partsCount: data?.candidates?.[0]?.content?.parts?.length,
        })
      );

      // Check for blocked response
      if (data?.promptFeedback?.blockReason) {
        console.warn(`Blocked (attempt ${attempt}): ${data.promptFeedback.blockReason}`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        return { error: "Image generation was blocked. Try a different prompt.", status: 500, response: data };
      }

      // Extract image
      const responseParts = data?.candidates?.[0]?.content?.parts;
      if (Array.isArray(responseParts)) {
        for (const part of responseParts) {
          const inline = part?.inlineData ?? part?.inline_data;
          if (inline?.data && (inline?.mimeType || inline?.mime_type)) {
            const mimeType = inline?.mimeType ?? inline?.mime_type;
            return { imageData: inline.data, mimeType };
          }
        }
      }

      // No image found
      console.warn(`No image in response (attempt ${attempt})`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      return { error: "No image generated. Try simplifying your prompt.", status: 500, response: data };
    } catch (fetchError) {
      console.error(`Fetch error (attempt ${attempt}):`, fetchError);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      return { error: "Network error communicating with AI", status: 500 };
    }
  }

  return { error: "All retry attempts failed", status: 500 };
}

// ==========================================
// API HANDLER
// ==========================================
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

    const {
      projectId, prompt, size = '1080x1080', style = 'vivid',
      mode = 'original', model = 'gemini-flash', niche, mood,
      colors, elements, preserveProduct = false,
      layoutReferences = [], additionalReferences = [],
    } = await req.json();

    if (!projectId || !prompt) {
      return new Response(JSON.stringify({ error: "projectId and prompt are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project
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

    // Fetch client context
    let clientContext = "";
    if (project.client_id) {
      try {
        const { data: clientData } = await supabase
          .from('clients')
          .select('company_name, contact_name, services, website, source, notes')
          .eq('id', project.client_id)
          .single();
        if (clientData) {
          clientContext = buildClientContext(clientData as Record<string, unknown>);
        }
      } catch (e) {
        console.error("Error fetching client:", e);
      }
    }

    // Fetch AI learning history
    let aiMemoryContext = "";
    try {
      const { data: learnings } = await supabase
        .from('studio_ai_learnings')
        .select('content, learning_type')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(15);

      if (learnings && learnings.length > 0) {
        aiMemoryContext = learnings.map(l => `[${l.learning_type}]: ${l.content}`).join('; ');
        // Keep memory context concise
        if (aiMemoryContext.length > 500) {
          aiMemoryContext = aiMemoryContext.substring(0, 500);
        }
      }
    } catch (e) {
      console.error("Error fetching learnings:", e);
    }

    const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG["1080x1080"];
    const finalMode = preserveProduct ? 'product' : mode;

    // Build prompt
    const baseParams = {
      prompt, sizeConfig,
      clientName: project.name,
      niche: niche || project.niche,
      primaryColor: project.primary_color,
      secondaryColor: project.secondary_color,
      fontFamily: project.font_family,
      aiInstructions: project.ai_instructions,
      aiMemoryContext,
      clientContext,
    };

    let enhancedPrompt: string;

    switch (finalMode) {
      case 'template':
        enhancedPrompt = buildTemplateMemoryPrompt({
          ...baseParams,
          hasProductImage: additionalReferences.length > 0 || (project.reference_images?.length || 0) > 1,
        });
        break;
      case 'copy':
        enhancedPrompt = buildCopyPrompt({
          prompt, sizeConfig,
          niche: niche || project.niche,
          clientContext,
        });
        break;
      case 'inspiration': {
        const allRefs = [...layoutReferences, ...additionalReferences, ...(project.reference_images || [])];
        enhancedPrompt = buildInspirationPrompt({
          ...baseParams,
          mood, colors,
          referenceCount: allRefs.length || 1,
        });
        break;
      }
      case 'product':
        enhancedPrompt = buildProductPreservationPrompt(baseParams);
        break;
      case 'original':
      default:
        enhancedPrompt = buildOriginalPrompt({
          ...baseParams,
          mood, colors, elements,
          aiRestrictions: project.ai_restrictions,
        });
        break;
    }

    // Select model
    const selectedModel = (finalMode === 'product' || finalMode === 'template' || model === 'gemini-pro')
      ? AI_MODELS["gemini-pro"]
      : AI_MODELS["gemini-flash"];

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Gemini API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("=== GENERATING FLYER ===");
    console.log("Mode:", finalMode, "| Model:", selectedModel, "| Client:", project.name);
    console.log("Size:", size, "| Prompt length:", enhancedPrompt.length, "chars");

    // Build content parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: enhancedPrompt }
    ];

    // Collect reference images
    const allReferenceImages: string[] = [];
    if (finalMode === 'template' && project.template_image) {
      allReferenceImages.push(project.template_image);
    }
    allReferenceImages.push(...layoutReferences);
    allReferenceImages.push(...additionalReferences);
    if (project.reference_images) {
      allReferenceImages.push(...project.reference_images);
    }

    // Limit images: fewer images = less likely to be blocked
    const maxImages = finalMode === 'product' ? 1 : (finalMode === 'template' ? 2 : 2);
    const imagesToProcess = allReferenceImages.slice(0, maxImages);

    console.log("Reference images:", imagesToProcess.length);

    // Fetch all images in parallel
    const imageResults = await Promise.all(
      imagesToProcess.map((url, i) => fetchImageAsInlineData(url, i))
    );

    for (const result of imageResults) {
      if (result) parts.push(result);
    }

    // Call Gemini with retry logic
    const result = await callGeminiWithRetry(selectedModel, parts, GEMINI_API_KEY);

    if ('error' in result) {
      return new Response(JSON.stringify({
        error: result.error,
        ...(result.response ? { response: result.response } : {}),
      }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to storage
    const { imageData, mimeType } = result;
    const extension = mimeType.split("/")[1] || "png";
    const imageBuffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
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

    const { data: { publicUrl } } = supabase.storage
      .from("studio-assets")
      .getPublicUrl(fileName);

    // Save flyer record
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
        niche: niche || project.niche,
        model: selectedModel,
        generation_mode: finalMode,
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
      imageUrl: publicUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Generate flyer error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
