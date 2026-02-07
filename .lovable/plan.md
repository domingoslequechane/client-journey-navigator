
# Fix: Product Image Not Being Sent to AI

## Problem
When "Preservar Produto Exato" is enabled and a product image is uploaded, the image is completely ignored by the edge function. The variable `productImage` is never extracted from the request body, so Gemini receives a prompt asking to "preserve the product" but has no actual product image to reference. This causes the AI to hallucinate a random product (e.g., tires instead of teflon tape).

## Root Cause
In `supabase/functions/generate-studio-flyer/index.ts`, line 489-494:
- `productImage` is not destructured from the request body
- In the image collection logic (lines 632-645), the product image is never added to `allReferenceImages`
- For `product` mode, `maxImages = 1`, but since `productImage` is not in the array, it either sends nothing or an unrelated project reference image

## Solution

### 1. Edge Function - Extract and prioritize the product image
**File:** `supabase/functions/generate-studio-flyer/index.ts`

- Add `productImage` to the destructured request body parameters
- In the image collection logic, when `finalMode === 'product'` and `productImage` exists, insert it as the FIRST image (highest priority)
- Ensure it is the ONLY image sent in product mode (no other references that could confuse the AI)

### 2. Edge Function - Strengthen the product preservation prompt
**File:** `supabase/functions/generate-studio-flyer/index.ts`

Update `buildProductPreservationPrompt()` to use Gemini's image editing approach:
- Frame the instruction as an image editing task: "The attached image contains the product. Extract it and build the flyer AROUND it"
- Add explicit instructions: "Do NOT replace, substitute, reinterpret, or reimagine the product. The product in the image is the ONLY product that should appear"
- Specify what the product IS (using the user's prompt text) to avoid confusion

### 3. Edge Function - Improve retry logic for product mode
**File:** `supabase/functions/generate-studio-flyer/index.ts`

In `callGeminiWithRetry`, when in product mode:
- NEVER drop the product image on retry (current logic removes all images on attempt 3, which defeats the purpose)
- The product image must always be present -- if all retries fail with the image, return a meaningful error rather than generating without the product

## Technical Details

Changes to the request body destructuring:
```
const {
  projectId, prompt, size, style, mode, model, niche, mood,
  colors, elements, preserveProduct = false,
  productImage,                                    // <-- ADD THIS
  layoutReferences = [], additionalReferences = [],
} = await req.json();
```

Changes to image collection logic:
```
const allReferenceImages: string[] = [];

// Product image gets ABSOLUTE PRIORITY in product mode
if (finalMode === 'product' && productImage) {
  allReferenceImages.push(productImage);
}
// ... rest of reference image logic
```

Changes to product preservation prompt -- use image editing framing:
```
p += `\n\nMODE: Product preservation (IMAGE EDITING)
CRITICAL RULE: The attached image contains the EXACT product to advertise.
You MUST keep this product 100% IDENTICAL — same shape, color, texture, labels, and logos.
Do NOT substitute it with any other product. Do NOT reinterpret it.
Your task: Extract the product from the image and design a professional flyer AROUND it.
Only create/modify: background, geometric shapes, text layout, lighting effects.
The product itself is UNTOUCHABLE.`;
```

Changes to retry logic for product mode:
```
// In callGeminiWithRetry, on final retry:
// If product mode, keep the product image even in simplified prompt
if (isProductMode) {
  // Keep image parts, only simplify text
  currentParts = [simplifiedTextPart, ...imageParts];
}
```

## Files Modified
1. `supabase/functions/generate-studio-flyer/index.ts` -- all changes in this single file
