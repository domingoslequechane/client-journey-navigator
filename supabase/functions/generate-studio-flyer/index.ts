import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Gemini API base
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Model IDs
const AI_MODELS = {
  "gemini-flash": "gemini-2.5-flash-image",
  "gemini-pro": "gemini-3-pro-image-preview",
} as const;

// Size configuration
const SIZE_CONFIG: Record<string, { aspectRatio: string; orientation: string; width: number; height: number }> = {
  "1080x1080": { aspectRatio: "1:1", orientation: "Quadrado", width: 1080, height: 1080 },
  "1080x1920": { aspectRatio: "9:16", orientation: "Retrato (Stories)", width: 1080, height: 1920 },
  "1920x1080": { aspectRatio: "16:9", orientation: "Paisagem (Banner)", width: 1920, height: 1080 },
  "1080x1350": { aspectRatio: "4:5", orientation: "Retrato (Carrossel)", width: 1080, height: 1350 },
  "1280x720": { aspectRatio: "16:9", orientation: "YouTube Thumbnail", width: 1280, height: 720 },
};

// Niche-specific product suggestions
const NICHE_PRODUCTS: Record<string, string> = {
  'Construção': 'construction materials like cement bags (Votoran, Cauê), red bricks, orange ceramic tiles, concrete blocks, steel rebars, wheelbarrows, safety helmets',
  'Mobiliário': 'elegant furniture pieces like sofas, dining tables, wooden chairs, wardrobes, beds with premium fabrics and wood textures',
  'Automóvel': 'cars, motorcycles, tires, car parts, engine components, polished chrome details, automotive paint finishes',
  'Imobiliário': 'modern houses, apartments, buildings, real estate keys, house models, property blueprints',
  'Restaurante': 'gourmet dishes, fresh ingredients, professional plating, steam rising from food, elegant table settings',
  'Beleza': 'cosmetic products, makeup brushes, skincare bottles, salon equipment, hair styling tools',
  'Saúde': 'medical equipment, stethoscopes, pills, healthcare symbols, clean clinical environments',
  'Tecnologia': 'smartphones, laptops, circuit boards, glowing screens, modern gadgets',
  'Moda': 'clothing items, fabric textures, fashion accessories, mannequins, runway elements',
  'Fitness': 'gym equipment, dumbbells, protein supplements, athletic wear, exercise machines',
  'Pet Shop': 'pet food bags, dog toys, cat accessories, animal grooming tools, pet beds',
  'Agricultura': 'tractors, seeds, crops, farming tools, harvest products, green fields',
  'Ótica': 'eyeglasses, sunglasses, contact lens cases, eye charts, optical equipment',
  'Farmácia': 'medicine bottles, pharmacy symbols, health products, pharmaceutical packaging',
  'Joalharia': 'gold rings, diamond necklaces, luxury watches, gemstones, jewelry boxes',
  'Eventos': 'event decorations, balloons, party supplies, stage lighting, banquet tables',
  'Educação': 'books, notebooks, pencils, graduation caps, classroom elements, educational materials',
};

// ==========================================
// MODO 1: CRIAÇÃO ORIGINAL
// ==========================================
function buildOriginalCreationPrompt(params: {
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
}): string {
  const { 
    prompt, sizeConfig, clientName, niche, mood, colors, elements,
    primaryColor, secondaryColor, fontFamily, aiInstructions, 
    aiRestrictions, aiMemoryContext 
  } = params;

  const nicheProducts = niche ? NICHE_PRODUCTS[niche] || '' : '';

  let p = `You are a BRAZILIAN PROFESSIONAL GRAPHIC DESIGNER from a top São Paulo marketing agency.

=== CRITICAL: BRAZILIAN COMMERCIAL FLYER STYLE ===
Create a PHOTOREALISTIC commercial flyer exactly like those made by Brazilian design agencies.

STUDY THESE BRAZILIAN FLYER CHARACTERISTICS:
1. **PHOTOREALISTIC 3D PRODUCTS** - The main product MUST look like a real photograph
   - Cement bags with visible brand labels
   - Ceramic bricks with realistic texture and holes
   - Roof tiles with accurate shadows
   - Construction materials with studio lighting

2. **BOLD GEOMETRIC BACKGROUNDS**
   - Large colored circles and semicircles
   - Rounded rectangle cards/panels
   - Diagonal color blocks
   - Overlapping geometric shapes

3. **VIBRANT COLOR PALETTES**
   - Orange + Gray (construction)
   - Blue + Orange (commercial)
   - Red + Black + White (retail)
   - Yellow + Dark Blue (industrial)

4. **TYPOGRAPHY HIERARCHY**
   - Main headline: Bold, large, impactful
   - Subheadline: Medium weight
   - Price/details: Clear, prominent
   - Contact info: WhatsApp icon + phone number

5. **PROFESSIONAL ELEMENTS**
   - Company logo placement (corner)
   - Quality badges/seals
   - Social media handles
   - WhatsApp contact with icon

=== DESIGN SPECIFICATIONS ===
- Aspect ratio: ${sizeConfig.aspectRatio}
- Dimensions: ${sizeConfig.width}x${sizeConfig.height}px
${clientName ? `- Brand: ${clientName}` : ''}
${niche ? `- Industry: ${niche}` : ''}
${mood ? `- Visual mood: ${mood}` : ''}
${elements ? `- Main element: ${elements}` : ''}
${primaryColor ? `- Primary brand color: ${primaryColor}` : ''}
${secondaryColor ? `- Secondary brand color: ${secondaryColor}` : ''}
${colors ? `- Color style: ${colors}` : ''}
${fontFamily ? `- Preferred font: ${fontFamily}` : ''}
${nicheProducts ? `- INCLUDE REALISTIC 3D RENDERS OF: ${nicheProducts}` : ''}

=== PRODUCT RENDERING REQUIREMENTS ===
The product in the flyer MUST be:
- PHOTOREALISTIC 3D render (not illustration, not cartoon)
- Professional product photography quality
- Studio lighting with soft shadows
- Accurate textures and materials
- Positioned as the HERO element (large, prominent)
- Slightly angled for dynamic composition`;

  if (aiInstructions) {
    p += `

=== ADDITIONAL INSTRUCTIONS ===
${aiInstructions}`;
  }

  if (aiMemoryContext) {
    p += `

=== LEARNED PREFERENCES ===
${aiMemoryContext}`;
  }

  if (aiRestrictions) {
    p += `

=== RESTRICTIONS ===
${aiRestrictions}`;
  }

  p += `

=== PROHIBITED ===
- Cartoon or illustrated products (must be photorealistic)
- Flat design without 3D elements
- Generic stock photo aesthetics
- Cluttered layouts without clear hierarchy
- Low-quality or pixelated elements
- Text that is cut off or illegible

=== QUALITY REQUIREMENTS ===
- 8K ultra-high definition
- Photorealistic 3D product renders
- Professional studio lighting
- Magazine-quality commercial design
- Sharp, crisp typography
- Perfect color grading

════════════════════════════════════════════════════════════════
FLYER TEXT CONTENT (ONLY this text should appear on the flyer):
════════════════════════════════════════════════════════════════

${prompt}

════════════════════════════════════════════════════════════════

Generate a BRAZILIAN-STYLE commercial marketing flyer.
The product MUST be a PHOTOREALISTIC 3D RENDER that looks like a real studio photograph.
Include bold geometric shapes and vibrant colors typical of Brazilian social media marketing.`;

  return p;
}

// ==========================================
// MODO 2: CÓPIA DE TEMPLATE
// ==========================================
function buildCopyTemplatePrompt(params: {
  prompt: string;
  sizeConfig: typeof SIZE_CONFIG[string];
  niche?: string;
}): string {
  const { prompt, sizeConfig, niche } = params;
  const nicheProducts = niche ? NICHE_PRODUCTS[niche] || '' : '';

  return `You are a BRAZILIAN PROFESSIONAL GRAPHIC DESIGNER specializing in social media marketing flyers.

=== CRITICAL: BRAZILIAN COMMERCIAL FLYER STYLE ===
Create a PHOTOREALISTIC commercial flyer like those made by Brazilian design agencies.

The flyer MUST include:
- REAL 3D PRODUCT PHOTOGRAPHY or photorealistic product renders
- Bold geometric shapes (circles, rectangles with rounded corners)
- Vibrant contrasting color blocks (orange/gray, blue/orange, red/black combinations)
- Professional Brazilian social media aesthetic
- Product should be the HERO element, large and prominent
- Clean typography with impact fonts
${nicheProducts ? `- INCLUDE REALISTIC 3D RENDERS OF: ${nicheProducts}` : ''}

=== DESIGN SPECIFICATIONS ===
- Aspect ratio: ${sizeConfig.aspectRatio}
- Dimensions: ${sizeConfig.width}x${sizeConfig.height}px
${niche ? `- Industry: ${niche}` : ''}

=== MODE: TEMPLATE REPLICATION ===
The FIRST IMAGE provided is the TEMPLATE you MUST COPY.

COPY EXACTLY:
- Layout and positioning of ALL elements
- EXACT color palette
- Typography style and hierarchy
- The realistic 3D product photography style
- Geometric background shapes
- Logo placement and contact info positioning

=== QUALITY REQUIREMENTS ===
- PHOTOREALISTIC product renders (like professional product photography)
- 8K ultra-high definition
- Studio lighting on products
- Crisp shadows and reflections
- Magazine-quality commercial design

════════════════════════════════════════════════════════════════
FLYER TEXT CONTENT (ONLY this text should appear on the flyer):
════════════════════════════════════════════════════════════════

${prompt}

════════════════════════════════════════════════════════════════

Generate a BRAZILIAN-STYLE commercial flyer with PHOTOREALISTIC 3D product renders.
The product should look like a real photograph, not an illustration.`;
}

// ==========================================
// MODO 3: INSPIRAÇÃO
// ==========================================
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
  referenceCount: number;
}): string {
  const { 
    prompt, sizeConfig, clientName, niche, mood, colors,
    primaryColor, secondaryColor, fontFamily, aiInstructions, 
    aiMemoryContext, referenceCount 
  } = params;

  const nicheProducts = niche ? NICHE_PRODUCTS[niche] || '' : '';

  let p = `You are a BRAZILIAN PROFESSIONAL GRAPHIC DESIGNER from a top São Paulo design agency.

=== CRITICAL: BRAZILIAN COMMERCIAL FLYER STYLE ===
Create a PHOTOREALISTIC commercial flyer like those made by Brazilian design agencies (like Designi, DesignBR).

MANDATORY ELEMENTS FOR BRAZILIAN FLYERS:
1. PHOTOREALISTIC 3D PRODUCT RENDERS - Products must look like real photographs
2. BOLD GEOMETRIC SHAPES - Large colored blocks, circles, rounded rectangles
3. VIBRANT COLOR COMBINATIONS - Orange/Gray, Blue/Orange, Red/Black, Yellow/Purple
4. PROFESSIONAL TYPOGRAPHY - Bold impact fonts, clear hierarchy
5. SOCIAL MEDIA ELEMENTS - WhatsApp icon, Instagram handle, phone numbers
6. QUALITY BADGES - "Qualidade", stars, certification seals
${nicheProducts ? `7. REALISTIC PRODUCTS: ${nicheProducts}` : ''}

=== DESIGN SPECIFICATIONS ===
- Aspect ratio: ${sizeConfig.aspectRatio}
- Dimensions: ${sizeConfig.width}x${sizeConfig.height}px
${clientName ? `- Brand: ${clientName}` : ''}
${niche ? `- Industry: ${niche}` : ''}
${mood ? `- Visual mood: ${mood}` : ''}
${primaryColor ? `- Primary brand color: ${primaryColor}` : ''}
${secondaryColor ? `- Secondary brand color: ${secondaryColor}` : ''}
${colors ? `- Color style: ${colors}` : ''}
${fontFamily ? `- Preferred font: ${fontFamily}` : ''}

=== MODE: CREATIVE INSPIRATION ===
You received ${referenceCount} REFERENCE/INSPIRATION image(s).

BE INSPIRED BY:
- The photorealistic product photography style
- The bold color blocking technique
- The geometric shape overlays
- The professional commercial aesthetic
- How products are positioned as hero elements

CREATE SOMETHING ORIGINAL but maintaining the BRAZILIAN COMMERCIAL FLYER AESTHETIC.`;

  if (aiInstructions) {
    p += `

=== ADDITIONAL INSTRUCTIONS ===
${aiInstructions}`;
  }

  if (aiMemoryContext) {
    p += `

=== LEARNED PREFERENCES ===
${aiMemoryContext}`;
  }

  p += `

=== QUALITY REQUIREMENTS ===
- PHOTOREALISTIC 3D product renders (like professional product photography)
- Studio-quality lighting with soft shadows
- 8K ultra-high definition rendering
- Products should look REAL, not illustrated
- Professional Brazilian social media marketing quality

════════════════════════════════════════════════════════════════
FLYER TEXT CONTENT (ONLY this text should appear on the flyer):
════════════════════════════════════════════════════════════════

${prompt}

════════════════════════════════════════════════════════════════

Generate a BRAZILIAN-STYLE commercial flyer with PHOTOREALISTIC 3D product photography.
Products must look like real studio photographs, not cartoons or illustrations.`;

  return p;
}

// ==========================================
// MODO 4: PRODUTO EXATO (ANTI-ALTERAÇÃO MÁXIMA)
// ==========================================
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
}): string {
  const { 
    prompt, sizeConfig, clientName, niche,
    primaryColor, secondaryColor, fontFamily, aiInstructions, aiMemoryContext 
  } = params;

  let p = `SYSTEM / TRAINING INSTRUCTION (DO NOT IGNORE):

╔══════════════════════════════════════════════════════════════╗
║  STRICT PRODUCT PRESERVATION MODE - LEGAL COMPLIANCE         ║
╚══════════════════════════════════════════════════════════════╝

You are NOT allowed to:
- Redesign the product
- Recreate the product
- Reinterpret the product
- Stylize the product
- Improve the product
- Replace the product
- Imagine a new product

The product in the reference image MUST remain 100% IDENTICAL.

PRODUCT ATTRIBUTES THAT CANNOT BE CHANGED:
- Shape (exactly as shown)
- Size (exactly as shown)
- Proportions (exactly as shown)
- Materials (exactly as shown)
- Colors (exactly as shown)
- Textures (exactly as shown)
- Light emission (exactly as shown)
- Design details (exactly as shown)
- Logos/labels on product (exactly as shown)
- Any visible text on product (exactly as shown)
- Brand markings (exactly as shown)
- Model numbers (exactly as shown)
- Product angle (keep similar)

STRICTLY FORBIDDEN ACTIONS:
- Generate a "similar" product
- Create a new version of the product
- Modernize or enhance the product
- Use generic/stock versions
- Create 3D interpretations or renders
- Create illustrated versions
- Adjust product aesthetics
- Remove or add parts
- Change product angle significantly
- Apply different lighting to product itself
- Remove logos, text, or labels from product
- Change product colors in any way
- "Improve" or "enhance" the product appearance

═══════════════════════════════════════════════════════════════
WHAT YOU MUST DO:
═══════════════════════════════════════════════════════════════

1. EXTRACT the exact product from the reference image
2. PLACE IT as the hero element in the flyer
3. The product must be PIXEL-PERFECT identical
4. ONLY design the BACKGROUND and LAYOUT around it

Think of this as a PHOTO CUTOUT operation:
- Cut the product from reference
- Paste it onto a new designed background
- Add text, colors, decorative elements AROUND it

═══════════════════════════════════════════════════════════════
DESIGN SPECIFICATIONS:
═══════════════════════════════════════════════════════════════

- Aspect ratio: ${sizeConfig.aspectRatio}
- Dimensions: ${sizeConfig.width}x${sizeConfig.height}px
${clientName ? `- Brand: ${clientName}` : ''}
${niche ? `- Industry: ${niche}` : ''}
${primaryColor ? `- Primary brand color: ${primaryColor}` : ''}
${secondaryColor ? `- Secondary brand color: ${secondaryColor}` : ''}
${fontFamily ? `- Preferred font: ${fontFamily}` : ''}

═══════════════════════════════════════════════════════════════
WHAT YOU CAN DESIGN FREELY:
═══════════════════════════════════════════════════════════════

- Background colors and gradients
- Geometric shapes and decorative elements
- Text layout and typography
- Icons and brand elements
- Logo placement
- Contact information layout
- Color blocks and visual hierarchy
- Where the product is positioned (left, right, center)

═══════════════════════════════════════════════════════════════
WHAT YOU ABSOLUTELY CANNOT CHANGE:
═══════════════════════════════════════════════════════════════

❌ THE PRODUCT ITSELF - It must remain 100% identical
❌ Product colors
❌ Product shape
❌ Product labels/logos
❌ Product details`;

  if (aiInstructions) {
    p += `

=== ADDITIONAL INSTRUCTIONS ===
${aiInstructions}`;
  }

  if (aiMemoryContext) {
    p += `

=== LEARNED PREFERENCES ===
${aiMemoryContext}`;
  }

  p += `

════════════════════════════════════════════════════════════════
FLYER TEXT CONTENT (ONLY this text should appear on the flyer):
════════════════════════════════════════════════════════════════

${prompt}

════════════════════════════════════════════════════════════════
⚠️ CRITICAL LEGAL REQUIREMENT - FAIL CONDITION:
════════════════════════════════════════════════════════════════

If the generated image does not use the EXACT SAME product from 
the reference image (including ALL details, proportions, colors, 
logos, labels, and textures), the result is LEGALLY INVALID.

This is required to avoid FALSE ADVERTISING LAWSUITS.

The reference image shows the REAL product that is being sold.
Any modification constitutes MISLEADING ADVERTISING which is 
ILLEGAL in most countries.

Extract the product EXACTLY as shown and place it in the flyer.
Design ONLY the background, layout, and text around it.`;

  return p;
}

// ==========================================
// MODO 5: TEMPLATE MEMORY (STRICT REPLICATION)
// ==========================================
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
  hasProductImage: boolean;
}): string {
  const { 
    prompt, sizeConfig, clientName, niche,
    primaryColor, secondaryColor, fontFamily, 
    aiInstructions, aiMemoryContext, hasProductImage 
  } = params;

  let p = `SYSTEM / TRAINING INSTRUCTION (CRITICAL - DO NOT IGNORE):

╔══════════════════════════════════════════════════════════════╗
║  STRICT TEMPLATE REPLICATION MODE                             ║
║  CLIENT: ${clientName || 'Unknown'}                           ║
║  APPROVED TEMPLATE - MANDATORY LAYOUT COMPLIANCE              ║
╚══════════════════════════════════════════════════════════════╝

The FIRST REFERENCE IMAGE is the OFFICIAL APPROVED TEMPLATE.
This template represents the client's brand identity and has been 
APPROVED by the agency. You MUST follow it EXACTLY.

═══════════════════════════════════════════════════════════════
ELEMENTS TO COPY EXACTLY (PIXEL-PERFECT):
═══════════════════════════════════════════════════════════════

□ Logo position and size (EXACT same corner/placement)
□ Social media icons style and position
□ Title typography (font style, color, size, position)
□ Color palette (EXACT hex values - do not deviate)
□ Background geometric shapes (circles, rectangles, curves)
□ Footer structure with contacts layout
□ Overall layout grid and spacing
□ Visual style and mood
□ Decorative elements (lines, shapes, icons)
□ Text hierarchy and positioning

═══════════════════════════════════════════════════════════════
WHAT YOU MUST REPLACE:
═══════════════════════════════════════════════════════════════

□ Product image → Use the NEW product provided${hasProductImage ? ' (SECOND IMAGE)' : ''}
□ Text content → Use the NEW copy provided below
□ Specific product details (watts, prices, specs) → From new copy
□ Product name/title → From new copy

═══════════════════════════════════════════════════════════════
REPLICATION PROCESS:
═══════════════════════════════════════════════════════════════

1. ANALYZE the template structure completely
2. IDENTIFY every visual element position (logo, text blocks, shapes)
3. RECREATE the EXACT same layout structure
4. PLACE the new product in the SAME position as the original
5. MATCH colors pixel-by-pixel (use color picker values)
6. MATCH typography style exactly (bold, size, color)
7. KEEP all decorative elements in same positions
8. ONLY change: product image + text content

═══════════════════════════════════════════════════════════════
DESIGN SPECIFICATIONS:
═══════════════════════════════════════════════════════════════

- Aspect ratio: ${sizeConfig.aspectRatio}
- Dimensions: ${sizeConfig.width}x${sizeConfig.height}px
${clientName ? `- Client: ${clientName}` : ''}
${niche ? `- Industry: ${niche}` : ''}
${primaryColor ? `- Primary brand color: ${primaryColor}` : ''}
${secondaryColor ? `- Secondary brand color: ${secondaryColor}` : ''}
${fontFamily ? `- Preferred font: ${fontFamily}` : ''}

═══════════════════════════════════════════════════════════════
CRITICAL REQUIREMENTS:
═══════════════════════════════════════════════════════════════

⚠️ The template layout is LEGALLY APPROVED by the client
⚠️ Deviation from the template structure is NOT ALLOWED
⚠️ This is the client's established brand identity
⚠️ Consistency across all flyers is MANDATORY

PROHIBITED ACTIONS:
❌ Moving the logo to a different position
❌ Changing the background color scheme
❌ Altering the geometric shape layouts
❌ Modifying the text positioning grid
❌ Using different typography styles
❌ Changing the overall composition
❌ "Improving" or "modernizing" the design
❌ Adding elements not in the template
❌ Removing elements from the template`;

  if (aiInstructions) {
    p += `

═══════════════════════════════════════════════════════════════
ADDITIONAL CLIENT INSTRUCTIONS:
═══════════════════════════════════════════════════════════════
${aiInstructions}`;
  }

  if (aiMemoryContext) {
    p += `

═══════════════════════════════════════════════════════════════
LEARNED PREFERENCES (from past feedback):
═══════════════════════════════════════════════════════════════
${aiMemoryContext}`;
  }

  p += `

════════════════════════════════════════════════════════════════
FLYER TEXT CONTENT (ONLY this text should appear on the flyer):
════════════════════════════════════════════════════════════════

${prompt}

════════════════════════════════════════════════════════════════

Generate a flyer that is VISUALLY IDENTICAL to the template.
The ONLY differences should be the product and text content.
Think of this as a "find and replace" operation on the template.`;

  return p;
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
      projectId, 
      prompt, 
      size = '1080x1080', 
      style = 'vivid', 
      mode = 'original',
      model = 'gemini-flash',
      // Novos campos
      niche,
      mood,
      colors,
      elements,
      preserveProduct = false,
      layoutReferences = [],
      additionalReferences = [],
    } = await req.json();

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

    // Fetch AI learning history for memory context
    let aiMemoryContext = "";
    try {
      const { data: learnings } = await supabase
        .from('studio_ai_learnings')
        .select('content, learning_type')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(15);

      if (learnings && learnings.length > 0) {
        aiMemoryContext = learnings.map(l => `- [${l.learning_type.toUpperCase()}]: ${l.content}`).join('\n');
      }
    } catch (e) {
      console.error("Error fetching learning history:", e);
    }

    const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG["1080x1080"];

    // Determinar modo final
    const finalMode = preserveProduct ? 'product' : mode;

    // Build prompt based on generation mode
    let enhancedPrompt: string;

    const baseParams = {
      prompt,
      sizeConfig,
      clientName: project.name,
      niche: niche || project.niche,
      primaryColor: project.primary_color,
      secondaryColor: project.secondary_color,
      fontFamily: project.font_family,
      aiInstructions: project.ai_instructions,
      aiMemoryContext,
    };

    switch (finalMode) {
      case 'template':
        enhancedPrompt = buildTemplateMemoryPrompt({
          ...baseParams,
          hasProductImage: additionalReferences.length > 0 || (project.reference_images?.length || 0) > 1,
        });
        break;

      case 'copy':
        enhancedPrompt = buildCopyTemplatePrompt({ 
          prompt, 
          sizeConfig, 
          niche: niche || project.niche 
        });
        break;

      case 'inspiration':
        const allRefs = [...layoutReferences, ...additionalReferences, ...(project.reference_images || [])];
        enhancedPrompt = buildInspirationPrompt({
          ...baseParams,
          mood,
          colors,
          referenceCount: allRefs.length || 1,
        });
        break;

      case 'product':
        enhancedPrompt = buildProductPreservationPrompt(baseParams);
        break;

      case 'original':
      default:
        enhancedPrompt = buildOriginalCreationPrompt({
          ...baseParams,
          mood,
          colors,
          elements,
          aiRestrictions: project.ai_restrictions,
        });
        break;
    }

    // Select the appropriate model
    // For product and template modes, always use Pro for better accuracy
    const selectedModel = (finalMode === 'product' || finalMode === 'template' || model === 'gemini-pro')
      ? AI_MODELS["gemini-pro"] 
      : AI_MODELS["gemini-flash"];

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Gemini API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("=== GENERATING FLYER ===");
    console.log("Mode:", finalMode);
    console.log("Model:", selectedModel);
    console.log("Client:", project.name);
    console.log("Size:", size, "->", sizeConfig);
    console.log("Enhanced prompt preview:", enhancedPrompt.substring(0, 300) + "...");

    // Build the content parts - TEXT MUST COME BEFORE IMAGES
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: enhancedPrompt }
    ];

    // Collect all reference images
    const allReferenceImages: string[] = [];
    
    // For template mode, template image comes first
    if (finalMode === 'template' && project.template_image) {
      allReferenceImages.push(project.template_image);
    }
    
    // Add layout references
    allReferenceImages.push(...layoutReferences);
    
    // Add additional references
    allReferenceImages.push(...additionalReferences);
    
    // Add project reference images
    if (project.reference_images) {
      allReferenceImages.push(...project.reference_images);
    }

    // Limit images based on mode
    const maxImages = finalMode === 'product' ? 1 : (finalMode === 'template' ? 2 : 3);
    const imagesToProcess = allReferenceImages.slice(0, maxImages);

    console.log("Reference images count:", imagesToProcess.length);

    // Add reference images if provided
    const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

    for (let i = 0; i < imagesToProcess.length; i++) {
      const imgUrl = imagesToProcess[i];
      try {
        if (imgUrl.startsWith('data:')) {
          const matches = imgUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            parts.push({
              inlineData: { mimeType: matches[1], data: matches[2] }
            });
          }
        } else {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          try {
            const imgResp = await fetch(imgUrl, { 
              signal: controller.signal,
              headers: { 'Accept': 'image/png, image/jpeg, image/webp, image/gif, */*' }
            });
            clearTimeout(timeoutId);

            if (imgResp.ok) {
              let contentType = imgResp.headers.get('content-type') || 'image/png';
              contentType = contentType.split(';')[0].trim().toLowerCase();

              if (!SUPPORTED_MIME_TYPES.includes(contentType)) {
                console.warn(`Image ${i + 1}: Unsupported MIME type (${contentType}). Skipping.`);
                continue;
              }

              const imgBuffer = await imgResp.arrayBuffer();

              if (imgBuffer.byteLength > 4 * 1024 * 1024) {
                console.log(`Image ${i + 1}: Skipped - too large`);
                continue;
              }

              const uint8Array = new Uint8Array(imgBuffer);
              let base64 = '';
              const chunkSize = 8192;
              for (let j = 0; j < uint8Array.length; j += chunkSize) {
                const chunk = uint8Array.slice(j, j + chunkSize);
                base64 += String.fromCharCode.apply(null, Array.from(chunk));
              }
              base64 = btoa(base64);

              parts.push({
                inlineData: { mimeType: contentType, data: base64 }
              });
              console.log(`Image ${i + 1}: Added successfully`);
            }
          } catch (fetchErr) {
            clearTimeout(timeoutId);
            console.error(`Image ${i + 1}: Fetch error - ${fetchErr}`);
          }
        }
      } catch (e) {
        console.error(`Error processing reference image ${i + 1}:`, e);
      }
    }

    // Call Gemini Image API
    const geminiResponse = await fetch(
      `${GEMINI_API_BASE}/models/${selectedModel}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);

      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Failed to generate image",
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    console.log("Gemini API response received");

    // Extract image from Gemini response
    let imageUrl: string | null = null;

    const responseParts = geminiData?.candidates?.[0]?.content?.parts;
    if (Array.isArray(responseParts)) {
      for (const part of responseParts) {
        const inline = part?.inlineData ?? part?.inline_data;
        if (inline?.data && (inline?.mimeType || inline?.mime_type)) {
          const mimeType = inline?.mimeType ?? inline?.mime_type;
          imageUrl = `data:${mimeType};base64,${inline.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(geminiData).substring(0, 1000));
      return new Response(
        JSON.stringify({
          error: "No image generated. The AI may not have understood the request.",
          response: geminiData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If it's a base64 data URL, upload to storage
    let publicUrl = imageUrl;
    
    if (imageUrl.startsWith("data:image/")) {
      const matches = imageUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const extension = mimeType.split("/")[1] || "png";
        
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
