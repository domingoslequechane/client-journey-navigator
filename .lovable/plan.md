

# Achieving Competitor-Level Precision in COPY Mode

## Analysis: What the Competitor Does

Looking at the 6 flyers you shared, the competitor achieves near-pixel-perfect consistency because they use a **template-based system** (similar to Canva), NOT pure AI generation. Here is what stays identical across ALL flyers:

- Two orange decorative bars + two dots (top-left)
- Headline position: "Pendente" in bold black + product name in bold orange below
- 3 descriptor lines in gray below the headline
- Product photo on the right side (~50% of canvas)
- Background: blurred luxury interior photo
- Footer: 3 columns (Logo badge | Phone icon + number | Location icon + address)
- Color scheme: orange + black + cream/white

The ONLY things that change are: the product photo and the text words. Everything else (layout grid, decorative elements, typography positions, footer structure) is frozen.

## The Honest Reality

Pure AI image generation (Gemini) is fundamentally stochastic -- every generation creates a slightly different layout. We cannot achieve TRUE pixel-perfect template replication (that requires a canvas/SVG rendering engine, not AI generation).

**However**, we CAN get to approximately **85-90% consistency** by dramatically improving how we instruct the AI. The current COPY mode prompt says "copy pixel-perfect" but gives the AI vague guidance. The key is replacing vague instructions with an **ultra-precise zone map** system.

## The Strategy: Zone Map System for COPY Mode

Instead of telling the AI "copy the layout", we will:

1. Have the Art Director (Layer 1) extract a **precise zone map** -- dividing the canvas into a strict grid and mapping every single element to exact percentage zones
2. Give the Designer (Layer 2) these positions as **absolute coordinates** instead of vague descriptions
3. Make QC (Layer 3) specifically compare element positions zone-by-zone
4. Always use the Pro model for COPY mode (higher precision)

## Technical Changes

### File: `supabase/functions/generate-studio-flyer/index.ts`

**1. Enhanced Art Director prompt for COPY mode**

The current Art Director prompt asks for generic layout descriptions. For COPY mode, we need a much more structured extraction that maps every element to canvas percentage zones:

```text
COPY MODE ANALYSIS -- Extract EXACT element positions as percentage zones:

Divide the canvas into a precise coordinate system (0%=left/top, 100%=right/bottom).

For EACH element, provide:
- Element name
- Position: x_start%, y_start%, x_end%, y_end%
- Style details (color hex, font weight, size relative to canvas)

Example format for template_layout:
"ZONE MAP:
- Decorative bars: x:3-12%, y:8-9% (orange #F59E0B, 2 lines + 2 dots)
- Logo: x:3-20%, y:85-97% (dark badge with company logo)
- Headline line 1: x:3-50%, y:15-22% (bold black, ~5% canvas height)
- Headline line 2: x:3-50%, y:22-30% (bold orange #F59E0B, ~5% canvas height)
- Description lines: x:3-50%, y:32-45% (regular gray, 3 lines, ~2.5% height each)
- Product photo: x:45-95%, y:5-80% (centered, dominant, photorealistic)
- Footer strip: x:0-100%, y:85-100% (3 equal columns, light cream bg)
- Footer col 1: Logo badge (dark bg, company logo)
- Footer col 2: Phone icon + number (centered)
- Footer col 3: Location icon + address (centered)"
```

This is dramatically more precise than the current generic "layout_description" field.

**2. New DesignBrief interface with zone map**

Add a dedicated `zone_map` field to the DesignBrief interface:

```typescript
interface DesignBrief {
  layout_description: string;
  color_plan: string;
  typography_plan: string;
  background_treatment: string;
  geometric_elements: string;
  logo_placement: string;
  quality_notes: string;
  template_layout?: string;
  zone_map?: string; // NEW: Precise percentage-based element positions
  decorative_elements?: string; // NEW: Exact decorative element catalog
  footer_structure?: string; // NEW: Exact footer column layout
}
```

**3. Completely rewritten `buildCopyPrompt` function**

The current copy prompt is 10 lines. The new version will be much more structured, injecting the zone map as strict positional rules:

```typescript
function buildCopyPrompt(params) {
  let p = `You are replicating a FIXED TEMPLATE. This is NOT creative work -- 
  it is STRICT LAYOUT REPRODUCTION with different content.

  CANVAS: ${sizeConfig.width}x${sizeConfig.height}px

  CRITICAL RULES FOR TEMPLATE REPLICATION:
  1. The reference image IS the template. Your output must have 
     IDENTICAL element positions, sizes, colors, and decorative elements.
  2. You change ONLY: the product/hero image and text words.
  3. Every decorative element (lines, dots, shapes, badges) must be 
     reproduced EXACTLY in the same position.
  4. The footer structure must be IDENTICAL -- same columns, same icons, 
     same layout.
  5. Background treatment must be the same TYPE (if blurred photo, use 
     similar blurred photo; if solid, use same color).
  6. Typography hierarchy must be IDENTICAL -- same weights, same 
     relative sizes, same alignment, same colors.`;

  // Inject the zone map from Art Director
  if (designBrief?.zone_map) {
    p += `\n\nEXACT ELEMENT POSITIONS (follow these coordinates precisely):
    ${designBrief.zone_map}`;
  }
  if (designBrief?.decorative_elements) {
    p += `\n\nDECORATIVE ELEMENTS TO REPRODUCE EXACTLY:
    ${designBrief.decorative_elements}`;
  }
  if (designBrief?.footer_structure) {
    p += `\n\nFOOTER TEMPLATE (reproduce exactly):
    ${designBrief.footer_structure}`;
  }

  p += `\n\nNEW TEXT CONTENT TO USE:\n${prompt}`;
  p += `\n\nGenerate the flyer with IDENTICAL layout to the template. 
  Only the product image and text content should differ.`;
  
  return p;
}
```

**4. Art Director Layer 1: Enhanced analysis prompt for COPY mode**

The analysis prompt for COPY mode will be completely rewritten to extract:
- Exact percentage-based zone map for every element
- Decorative element catalog with colors and positions
- Footer column structure with content types
- Background type classification
- Typography scale (relative sizes as percentages of canvas height)

Key changes to `analyzeReferencesAndBuildBrief`:
- In COPY mode, request 3 additional JSON fields: `zone_map`, `decorative_elements`, `footer_structure`
- Increase `maxOutputTokens` to 3072 for COPY mode (more detail needed)
- Add specific instructions to measure element positions as percentages

**5. Force Pro model for COPY mode**

In the model selection logic (around line 1259), add COPY mode to the list that forces Pro model:

```typescript
const selectedModel = (finalMode === 'product' || finalMode === 'template' 
  || finalMode === 'copy' || model === 'gemini-pro')
  ? AI_MODELS["gemini-pro"]
  : AI_MODELS["gemini-flash"];
```

Pro model produces more precise, higher-quality outputs that better follow structured instructions.

**6. QC Layer 3: Stricter layout fidelity check for COPY mode**

For COPY mode, the QC review prompt will include zone-by-zone comparison:
- Compare each element position against the zone map
- Lower the pass threshold from 8 to 9 for COPY mode (higher bar)
- Add a `layout_fidelity_score` to the review that specifically scores position accuracy

**7. Layer 4 Retoucher: Layout-focused refinement for COPY mode**

When the QC fails for COPY mode, the refinement prompt will focus specifically on repositioning misaligned elements rather than general quality improvements.

### Summary of changes

All changes are in a single file: `supabase/functions/generate-studio-flyer/index.ts`

1. Extended `DesignBrief` interface with `zone_map`, `decorative_elements`, `footer_structure`
2. Rewritten `analyzeReferencesAndBuildBrief` with COPY-specific ultra-detailed extraction
3. Completely rewritten `buildCopyPrompt` with zone map injection
4. Updated `buildDesignBriefSection` to include new fields
5. Force Pro model for COPY mode
6. Stricter QC for COPY mode with zone-by-zone comparison
7. Layout-focused refinement in Layer 4 for COPY mode

### What to expect after this change

- **COPY mode accuracy**: Should improve from ~50-60% layout consistency to ~85-90%
- **There will still be variation**: AI generation is inherently non-deterministic. Small differences in exact pixel positions are expected
- **Best results**: When the reference image has a clear, structured layout (like the competitor examples) rather than organic/free-form designs
- **Generation time**: Slightly longer for COPY mode due to more detailed analysis, but within the 150s timeout

