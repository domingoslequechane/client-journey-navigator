

# Multi-Layer Collaborative Flyer Generation ("Creative Team" Strategy)

## The Problem

Currently, generation is a single shot: one prompt goes to Gemini and whatever comes back is the final result. The AI often ignores configurations, produces inconsistent quality, and has no self-correction mechanism.

## The Strategy: 4-Layer Creative Team

The idea is to simulate a professional design team workflow where multiple roles collaborate before delivering the final result:

```text
+-------------------+     +-------------------+     +-------------------+     +-------------------+
|  LAYER 1          |     |  LAYER 2          |     |  LAYER 3          |     |  LAYER 4          |
|  Art Director     | --> |  Designer         | --> |  Quality Control  | --> |  Retoucher        |
|                   |     |                   |     |                   |     |                   |
|  Analyzes refs,   |     |  Generates the    |     |  Reviews result   |     |  Applies fixes    |
|  brand config,    |     |  flyer using the  |     |  vs. the brief    |     |  and refinements  |
|  and writes a     |     |  structured brief |     |  and references,  |     |  to deliver the   |
|  detailed design  |     |  as a precise     |     |  lists concrete   |     |  polished final   |
|  brief            |     |  blueprint        |     |  fixes needed     |     |  flyer            |
+-------------------+     +-------------------+     +-------------------+     +-------------------+
   Text-only model           Image model             Text-only model           Image editing model
   (fast, cheap)             (current flow)           (fast, cheap)             (image refinement)
```

## How Each Layer Works

### Layer 1 -- Art Director (Text-only, Gemini Flash)
- **Input**: Reference images + logo + brand config (colors, font, instructions, restrictions)
- **Output**: A structured JSON design brief
- **What it does**: Deeply analyzes the reference images and project settings, then produces a precise blueprint with:
  - Exact layout description (where logo goes, where text goes, where product goes)
  - Color usage plan (which areas use primary, which use secondary)
  - Typography hierarchy (headline size, subhead, CTA positioning)
  - Background treatment description
  - Geometric elements to include
  - Quality benchmarks from the references

This layer uses a fast text model because it only needs to think and analyze, not generate images. It studies the references in much more detail than a single-shot prompt ever could.

### Layer 2 -- Designer (Image generation, Gemini Pro)
- **Input**: The Art Director's structured brief + reference images + logo
- **Output**: First draft of the flyer
- **What it does**: Takes the precise blueprint and generates the flyer. Because the brief is highly structured and specific (not vague like "make it professional"), the AI has much clearer instructions to follow.

### Layer 3 -- Quality Control (Text-only, Gemini Flash)
- **Input**: Generated flyer image + reference images + design brief + brand config
- **Output**: A structured review with specific fixes needed
- **What it does**: Compares the generated flyer against:
  - The original references (does it match the quality and style?)
  - The brand config (are the correct colors dominant? Is the logo present?)
  - The design brief (did the designer follow the art director's plan?)
  - Returns a pass/fail verdict and specific improvements needed

If the result passes quality control (score above threshold), skip Layer 4 and return immediately (saves time and cost).

### Layer 4 -- Retoucher (Image editing, Gemini Pro)
- **Input**: Generated flyer + specific fixes from QC + reference images
- **Output**: Polished final flyer
- **What it does**: Takes the generated flyer and applies the specific improvements identified by quality control. This is an image editing task, not a full regeneration, so the core design is preserved while fixing issues.

## Smart Optimizations

1. **Early Exit**: If Layer 3 (QC) gives a high score (e.g., 9+/10), skip Layer 4 entirely and return the flyer as-is. This saves time when the first generation is already good.

2. **Parallel Processing**: Layer 1 (analysis) happens before generation but adds only 2-3 seconds since it uses the fast Flash model for text-only analysis.

3. **Cost Control**: Layers 1 and 3 use the cheaper Flash text model (no image generation). Only Layers 2 and 4 use the expensive Pro image model. Total cost is roughly 2x current (2 image calls instead of 1) for significantly better results.

4. **Product Mode Awareness**: In product preservation mode, the QC layer specifically checks if the product was preserved correctly. The refinement layer is told to never alter the product.

5. **Template Mode Shortcut**: In template/copy mode, the Art Director layer focuses specifically on extracting exact layout positions from the template image, making the copy more precise.

## Technical Implementation

### File: `supabase/functions/generate-studio-flyer/index.ts`

**New function: `analyzeReferencesAndBuildBrief()`**
- Makes a text-only API call to Gemini Flash
- Sends reference images + brand config
- Uses tool calling / structured output to get back a JSON brief with fields like:
  - `layout_description`: where each element goes
  - `color_plan`: which colors go where
  - `typography_plan`: font sizes, weights, positions
  - `background_treatment`: gradient/texture/solid description
  - `geometric_elements`: shapes to include
  - `quality_notes`: specific quality benchmarks from references

**New function: `reviewGeneratedFlyer()`**
- Makes a text-only API call to Gemini Flash
- Sends: generated image + references + brief + brand config
- Returns structured review:
  - `score`: 1-10
  - `logo_present`: boolean
  - `colors_correct`: boolean
  - `improvements`: string[] (specific actionable fixes)
  - `pass`: boolean (score >= 8)

**New function: `refineFlyer()`**
- Makes an image editing API call to Gemini Pro
- Sends: generated image + specific improvements list
- Returns the refined image

**Updated main flow:**
```text
1. Receive request (same as today)
2. Fetch project, client, learnings (same as today)
3. NEW: Call analyzeReferencesAndBuildBrief() -- Layer 1
4. Build enhanced prompt using the structured brief instead of raw config
5. Generate flyer with Gemini (existing callGeminiWithRetry) -- Layer 2
6. NEW: Call reviewGeneratedFlyer() -- Layer 3
7. IF review.pass === true: return flyer (early exit, save cost)
8. IF review.pass === false: Call refineFlyer() with improvements -- Layer 4
9. Upload and save the final image (same as today)
```

**Model usage per layer:**
- Layer 1 (Art Director): `gemini-2.5-flash` (text-only, fast, cheap)
- Layer 2 (Designer): `gemini-3-pro-image-preview` or `gemini-2.5-flash-image` (current logic)
- Layer 3 (Quality Control): `gemini-2.5-flash` (text-only, fast, cheap)
- Layer 4 (Retoucher): `gemini-3-pro-image-preview` (image editing, only when needed)

**Timeout considerations:**
- Edge functions have a 150-second timeout
- Layer 1 (text): ~3-5 seconds
- Layer 2 (image gen): ~15-30 seconds
- Layer 3 (text review): ~3-5 seconds
- Layer 4 (image refine): ~15-30 seconds (only if needed)
- Total worst case: ~70 seconds -- well within limits

### No frontend changes needed

The frontend already shows a loading state during generation. The only difference is that generation will take slightly longer (30-60 seconds instead of 15-30 seconds) but the quality will be significantly better. The same API contract (request/response) is preserved.

## Files Modified
1. `supabase/functions/generate-studio-flyer/index.ts` -- Add 3 new functions (analyzeReferences, reviewFlyer, refineFlyer) and update the main handler flow to use the 4-layer pipeline

