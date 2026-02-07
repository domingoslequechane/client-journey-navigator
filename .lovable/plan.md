

# Fix: Logo Always Included, Real-Time Project Updates, and Stronger Configuration Enforcement

## Problems Identified

### 1. Company Logo is NEVER sent to the AI
The project stores `logo_images` (uploaded logos), but the edge function **completely ignores them**. There is zero code in `generate-studio-flyer/index.ts` that reads or sends `logo_images` to Gemini. The AI has no way to include the company logo because it never receives it.

### 2. Project updates are not applied in real-time
When you edit a project (colors, references, instructions, etc.) and save, the `updateProject` mutation invalidates query key `['studio-projects']` (the list), but **not** `['studio-project', projectId]` (the individual project used by the editor). React Query serves stale cached data, so the generation uses old settings until you do a full page refresh.

### 3. AI ignores configurations (colors, font, 3D style, instructions)
The prompt includes settings like `Font: Inter` and `Brand colors: primary=#FF0000` as optional hints, but there is no mandatory enforcement. The AI treats them as suggestions and often ignores them in favor of its own aesthetic choices.

---

## Solution

### Fix 1: Always include logo images in every generation

**File:** `supabase/functions/generate-studio-flyer/index.ts`

- Read `project.logo_images` from the fetched project data
- Add logo images as reference images in ALL modes (not just specific modes)
- Add explicit prompt instructions: "The attached images include the company LOGO. You MUST place the logo prominently on the flyer (typically top-left or top-center). Never omit it."
- Logo images are sent AFTER the primary reference/product images, but are always present

Changes:
- In the image collection section (around line 674), add logo images for all modes
- In `buildCoreInstructions()`, add a mandatory rule about logo placement when logos are available
- Pass a `hasLogos` flag to prompt builders

### Fix 2: Invalidate the correct query key after project updates

**File:** `src/hooks/useStudioProjects.ts`

The `updateProject` mutation's `onSuccess` currently only invalidates `['studio-projects']`. It must also invalidate `['studio-project', id]` so the editor page immediately receives the updated data.

Changes:
- In `updateProject.onSuccess`, also invalidate the specific project query key using the project ID from the mutation variables
- This ensures that when you navigate back to the editor after editing, React Query fetches fresh project data

### Fix 3: Enforce configurations as mandatory rules, not suggestions

**File:** `supabase/functions/generate-studio-flyer/index.ts`

Change how brand settings are injected into the prompt. Instead of soft hints like `Font: Inter`, use mandatory directives:

- Colors: "MANDATORY BRAND COLORS: Primary #FF0000 and Secondary #00FF00. These MUST be the dominant colors. Do NOT use other color schemes."
- Font: "MANDATORY TYPOGRAPHY: Use [font] style. Headlines must reflect this font weight and personality."
- AI Instructions: Move from optional append to a "CREATIVE DIRECTOR ORDERS" section that the AI must follow
- AI Restrictions: Frame as "ABSOLUTE PROHIBITIONS" that cannot be violated

Also add a "configuration summary checkpoint" at the end of every prompt:
```
CHECKLIST — your output MUST include ALL of these:
[ ] Company logo visible and prominent
[ ] Primary color (#XX) is dominant
[ ] Secondary color (#XX) is accent
[ ] [Font] typography style used
[ ] 3D photorealistic product rendering (not flat)
[ ] [Any AI instructions]
```

---

## Technical Details

### Edge Function Changes (`supabase/functions/generate-studio-flyer/index.ts`)

**1. Logo injection in image collection (after line ~693):**
```typescript
// ALWAYS include logo images — in ALL modes
if (project.logo_images && project.logo_images.length > 0) {
  const maxLogos = 2;
  const logosToAdd = project.logo_images.slice(0, maxLogos);
  allReferenceImages.push(...logosToAdd);
  console.log(`Added ${logosToAdd.length} logo image(s)`);
}
```

Adjust `maxImages` to accommodate logos (increase limit by number of logos added).

**2. Update `buildCoreInstructions` to enforce logos:**
```typescript
function buildCoreInstructions(sizeConfig, hasReferences, hasLogos) {
  // ... existing rules ...
  if (hasLogos) {
    core += `\n8. COMPANY LOGO: One of the attached images is the company LOGO. You MUST place it prominently on the flyer (top-left or top-center, ~10-15% of canvas width). The logo must be clearly visible, never cropped, never distorted, never omitted.`;
  }
}
```

**3. Enforce brand configurations as mandatory:**

Update all prompt builders to frame colors, font, and instructions as mandatory:
```typescript
// Instead of: if (primaryColor) p += `\nPrimary color: ${primaryColor}`;
// Use:
if (colors === 'Cores do Cliente' && (primaryColor || secondaryColor)) {
  p += `\n\nMANDATORY BRAND COLORS (non-negotiable):
- Primary: ${primaryColor} — use as the DOMINANT color (backgrounds, shapes, accents)
- Secondary: ${secondaryColor} — use as SUPPORTING color (badges, highlights, contrast elements)
Do NOT invent other color schemes. These brand colors define the visual identity.`;
}

if (fontFamily) {
  p += `\nMANDATORY FONT STYLE: ${fontFamily}. All text must reflect this typeface personality and weight.`;
}

if (aiInstructions) {
  p += `\n\nCREATIVE DIRECTOR ORDERS (must follow exactly):\n${aiInstructions}`;
}

if (aiRestrictions) {
  p += `\n\nABSOLUTE PROHIBITIONS (violating these = failure):\n${aiRestrictions}`;
}
```

**4. Add configuration checklist at end of every prompt:**
```typescript
// Before returning the prompt, append a mandatory checklist
let checklist = '\n\nFINAL CHECKLIST — your output MUST satisfy ALL:';
if (hasLogos) checklist += '\n- Company logo placed prominently';
if (primaryColor) checklist += `\n- Primary color ${primaryColor} is dominant`;
if (secondaryColor) checklist += `\n- Secondary color ${secondaryColor} is visible`;
if (fontFamily) checklist += `\n- ${fontFamily} typography style`;
checklist += '\n- Photorealistic 3D rendering (NOT flat/cartoon)';
if (aiInstructions) checklist += '\n- Creative director orders followed';
p += checklist;
```

### Hook Changes (`src/hooks/useStudioProjects.ts`)

**In `updateProject` mutation's `onSuccess`:**
```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ['studio-projects'] });
  queryClient.invalidateQueries({ queryKey: ['studio-project', data.id] });
  toast.success('Projeto atualizado!');
},
```

---

## Files Modified
1. `supabase/functions/generate-studio-flyer/index.ts` — Logo injection, mandatory config enforcement, checklist
2. `src/hooks/useStudioProjects.ts` — Cache invalidation fix for real-time updates
