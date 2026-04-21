// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const AI_MODELS = {
    "gemini-flash": "gemini-3-flash",
    "gemini-pro":   "gemini-3-pro-image-preview", 
} as const;

async function fetchImageAsBase64(url: string): Promise<string | null> {
    try {
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const buffer = await resp.arrayBuffer();
        const uint8 = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < uint8.byteLength; i++) {
            binary += String.fromCharCode(uint8[i]);
        }
        return btoa(binary);
    } catch (e) {
        console.error("Error fetching image:", e);
        return null;
    }
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("Unauthorized");

        const {
            organizationId,
            toolId,
            prompt,
            size = "1080x1080",
            style = "vivid",
            model = "gemini-flash",
            inputImage
        } = await req.json();

        if (!organizationId || !toolId || !prompt) throw new Error("Missing parameters");

        // ── Per-tool expert prompts ─────────────────────────────────────────
        const TOOL_PROMPTS: Record<string, string> = {
            'upscale': `You are a master photo retoucher and upscaling AI. The attached image needs to be highly enhanced and upscaled for high-quality printing. Task: "${prompt}". (1) Increase the perceived resolution, sharpness, and clarity. (2) Strictly maintain original object shapes, colors, and layout without ANY distortion. (3) Remove noise, artifacts, and pixelation. Output: an ultra-high definition, photorealistic, premium print-ready image.`,

            'recolor': `You are a professional photo retoucher. The attached image shows a product or object. Your ONLY task is to change its color to: "${prompt}". Rules: (1) Keep the object's shape, texture, reflections and proportions 100% identical. (2) Apply the new color realistically — respect existing highlights, shadows and material properties. (3) Do NOT alter the background or any other element. Output: high-resolution, photorealistic edited image.`,

            'product-beautifier': `You are a world-class commercial product photographer. The attached image is a product photo that needs enhancement. Task: "${prompt}". Create a stunning, magazine-quality hero shot: (1) Place the product in a premium studio environment fitting the description. (2) Apply 3-point professional lighting (key, fill, rim). (3) Add realistic drop shadows and subtle reflections. (4) Keep the product itself 100% identical — only enhance lighting, background, and environment. Output: ultra-high-definition, photorealistic product image.`,

            'virtual-model': `You are a fashion photography AI. The attached image shows a clothing item or accessory. Task: "${prompt}". (1) Place the garment on a realistic human model in a professional fashion photography setting. (2) The model should look natural and professional. (3) The clothing must look as if it is physically being worn — no floating or distortion. (4) Professional studio or lifestyle background. Output: high-fashion, photorealistic editorial image.`,

            'product-staging': `You are an expert product lifestyle photographer. The attached image shows a product. Task: "${prompt}". (1) Integrate this exact product into a beautiful, realistic lifestyle scene. (2) Match lighting between product and environment perfectly. (3) The product must look like it physically belongs in the scene. (4) Premium magazine-quality composition. Output: photorealistic lifestyle product image.`,

            'edit-with-ai': `You are an expert photo editor with Photoshop-level skills. The attached image is the source. Task: "${prompt}". Apply the requested changes precisely and professionally. Maintain photographic realism in all edits. Output: a flawlessly edited, photorealistic result.`,

            'ghost-mannequin': `You are an expert fashion retoucher. The attached image shows clothing on a mannequin. Task: remove the mannequin completely using the ghost mannequin technique. (1) The interior of the garment (collar, sleeves, torso) must be visible and realistic. (2) Fill in any missing fabric areas to make the garment look complete. (3) Clean white/neutral background. Details from user: "${prompt}". Output: professional ghost mannequin product photo.`,

            'flat-lay': `You are a professional flat-lay product photographer. The attached image shows a product. Task: "${prompt}". (1) Arrange the product in a beautiful overhead flat-lay composition. (2) Add complementary props, textures and surfaces that match the description. (3) Perfect overhead lighting with zero harsh shadows. (4) Styled, magazine-quality composition. Output: stunning editorial flat-lay product photo.`,

            'logo': `You are a world-class brand designer. Create a professional logo based on: "${prompt}". Requirements: (1) Clean, scalable vector-style design. (2) Memorable and unique. (3) Works in black & white and color. (4) Include wordmark and symbol/icon if applicable. (5) Professional typography. (6) Transparent or white background. Output: high-resolution professional logo design.`,

            'create-any-image': `You are a world-class AI artist and creative director. Create an extraordinary, highly detailed image based on this description: "${prompt}". Apply cinematic lighting, perfect composition, ultra-high detail, and professional post-processing. Make it visually stunning and portfolio-worthy. Output: breathtaking, photorealistic or stylized image.`,

            'instagram-story': `You are a top social media creative director specializing in Instagram Stories (9:16 vertical format). Create a stunning, scroll-stopping Story visual for: "${prompt}". Requirements: (1) Optimized for 1080x1920 (9:16) vertical format. (2) Bold, eye-catching design with strong visual hierarchy. (3) Premium aesthetic suitable for a professional brand. (4) Engaging composition that captures attention instantly. Output: high-quality Instagram Story image.`,

            'product-photography': `You are a world-class commercial product photographer. The attached image shows a product. Task: "${prompt}". Create professional product photography: (1) Studio-quality lighting setup. (2) Perfect focus and minimal depth of field where appropriate. (3) Clean, premium background. (4) Commercial-grade post-processing. Output: professional e-commerce or editorial product photo.`,

            'product-packaging': `You are an expert packaging designer and 3D mockup artist. Create a stunning packaging mockup based on: "${prompt}". Requirements: (1) Photorealistic 3D render of the packaging. (2) Premium materials and finishes. (3) Professional studio lighting with reflections. (4) Lifestyle or plain background as appropriate. Output: high-quality packaging design mockup.`,

            'flyer': `You are a world-class graphic designer at a top advertising agency. Create a premium advertising flyer based on: "${prompt}". Requirements: (1) Ultra-professional commercial design. (2) Bold, impactful typography. (3) Stunning visuals and color composition. (4) Clear hierarchy and CTA. (5) Print-ready quality. Output: magazine-quality advertising flyer.`,

            'ai-backgrounds': `You are an expert compositing artist and background designer. The attached image shows a subject. Task: "${prompt}". (1) Remove the existing background completely. (2) Replace with the described environment, perfectly matching lighting and perspective. (3) Seamless integration — no edge artifacts. Output: photorealistic composited image with new background.`,

            'ai-expand': `You are an expert AI inpainting artist. The attached image needs to be expanded/outpainted. Task: "${prompt}". (1) Extend the image beyond its current borders. (2) Generate new content that perfectly matches the existing image's style, lighting, and content. (3) No visible seams or transitions. Output: seamlessly expanded photorealistic image.`,

            'ai-images': `You are a world-class AI artist. Generate a stunning, highly detailed image based on: "${prompt}". Apply the highest quality: cinematic lighting, perfect composition, rich textures, and professional post-processing. Make it extraordinary. Output: breathtaking AI-generated image.`,

            'ai-shadows': `You are a professional photo retoucher specializing in lighting and shadows. The attached image shows a product or object. Task: "${prompt}". (1) Add realistic, physically accurate shadows to the object. (2) Match the shadow direction and softness to the existing lighting. (3) The shadow must look natural and photographically real. Output: photorealistic image with professional shadow added.`,

            'background-remover': `You are an expert masking and extraction artist. The attached image shows a subject with a background. Task: remove the background completely and cleanly. (1) Create a perfect, pixel-accurate cutout of the subject. (2) Preserve fine details like hair, fur, or transparent edges. (3) Output on a transparent/white background. Details: "${prompt}". Output: clean, professional background-removed image.`,

            'resize': `You are a professional image compositor. The attached image needs to be adapted to a new format. Task: "${prompt}". (1) Resize/reformat the image as requested. (2) If necessary, intelligently fill or crop edges to maintain composition quality. (3) Preserve the original quality. Output: professionally reformatted image.`,

            'retouch': `You are a world-class photo retoucher. The attached image needs professional retouching. Task: "${prompt}". Apply: (1) Skin smoothing and texture preservation. (2) Color grading and correction. (3) Lighting enhancement. (4) Any other requested retouches. Keep all results looking natural and photorealistic — not over-processed. Output: professionally retouched photograph.`,
        };

        const SIZE_TO_ASPECT_RATIO: Record<string, string> = {
            "1080x1080": "1:1",
            "1080x1920": "9:16",
            "1920x1080": "16:9",
            "1080x1350": "4:5",
            "1280x720": "16:9",
            "original": "SAME_AS_INPUT"
        };

        const isOriginalSize = size === "original";
        const currentAspectRatio = SIZE_TO_ASPECT_RATIO[size] || "1:1";
        const orientationLabel = isOriginalSize ? "Original" : 
            currentAspectRatio === "1:1" ? "Quadrado (1:1)" :
            currentAspectRatio === "16:9" ? "Paisagem (16:9)" :
                currentAspectRatio === "9:16" ? "Vertical (9:16)" :
                    currentAspectRatio === "4:5" ? "Retrato (4:5)" : currentAspectRatio;

        const systemPrompt = (TOOL_PROMPTS[toolId] ??
            `You are a professional creative director. Generate a high-end, commercial image. Tool: ${toolId}. Request: "${prompt}". Style: ${style}. Make it premium, photorealistic, and visually stunning.`) +
            (isOriginalSize ? ` MANDATORY: Maintain the EXACT original aspect ratio and proportions of the input image.` : ` MANDATORY: Generate the image in ${orientationLabel} orientation. Ensure the entire composition fills the frame.`);


        const geminiKey = Deno.env.get("GEMINI_API_KEY");
        if (!geminiKey) throw new Error("GEMINI_API_KEY is not configured");

        const aiModel = AI_MODELS[model] || AI_MODELS["gemini-flash"];

        const parts: any[] = [];
        if (inputImage) {
            let base64 = null;
            let mimeType = "image/png";

            if (inputImage.startsWith('data:')) {
                const matches = inputImage.match(/^data:([^;]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    mimeType = matches[1];
                    base64 = matches[2];
                }
            } else {
                base64 = await fetchImageAsBase64(inputImage);
            }

            if (base64) {
                parts.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: base64
                    }
                });
            }
        }

        // Add instructions ALWAYS LAST to ensure high attention
        // Use extremely aggressive constraints as Gemini API often ignores imageGenerationConfig.aspectRatio in image-to-image
        const instructionPart = `${systemPrompt}
MANDATORY QUALITY: Generate this image in ULTRA-HIGH DEFINITION (300 DPI print quality, 4096px+ detail). 
Maintain razor-sharp edges, hyper-realistic textures, zero noise, and master-level clarity.

=========================================
${isOriginalSize ? 
`STRICT ASPECT RATIO CONSTRAINT:
DO NOT CHANGE THE RATIO. KEEP THE IMAGE PROPORTIONS EXACTLY AS THEY ARE IN THE INPUT.
NO CROPPING, NO PADDING, NO STRETCHING.` :
`EXTREME MANDATORY CONSTRAINT:
YOU MUST OUTPUT THIS IMAGE IN EXACTLY THE **${currentAspectRatio}** ASPECT RATIO (${orientationLabel}).
DO NOT KEEP THE ORIGINAL IMAGE'S ASPECT RATIO.
IF YOU IGNORE THIS, THE SYSTEM WILL CRASH.
CROP, OUTPAINT, OR FILL THE BACKGROUND AS NECESSARY TO ACHIEVE EXACTLY A ${currentAspectRatio} CANVAS.`}
=========================================`;
        parts.push({ text: instructionPart });

        console.log(`Calling Gemini with model: ${aiModel} | Size: ${size} | AspectRatio: ${currentAspectRatio}`);

        // 2. Call Gemini Direct API
        const geminiUrl = `${GEMINI_API_BASE}/models/${aiModel}:generateContent?key=${geminiKey}`;

        const requestBody: any = {
            contents: [{ role: "user", parts }],
            generationConfig: {
                responseModalities: ["IMAGE", "TEXT"],
            }
        };

        if (!isOriginalSize) {
            requestBody.generationConfig.imageConfig = {
                aspectRatio: currentAspectRatio
            };
        }

        const geminiResp = await fetch(
            geminiUrl,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            }
        );

        if (!geminiResp.ok) {
            const errText = await geminiResp.text();
            console.error(`Gemini API Error (${geminiResp.status}):`, errText);

            let errDetail = errText;
            try {
                const errJson = JSON.parse(errText);
                errDetail = errJson.error?.message || JSON.stringify(errJson);
            } catch (e) { }

            throw new Error(`AI Error: ${errDetail}`);
        }

        const data = await geminiResp.json();

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
            console.error("No image data in Gemini response. Full data:", JSON.stringify(data));
            throw new Error("No image data returned from AI. This functionality might be blocked or not available for your API key/region.");
        }

        // 3. Upload to Storage
        const fileName = `${organizationId}/${toolId}/${Date.now()}.png`;
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        const { error: uploadError } = await supabase.storage
            .from("studio-assets")
            .upload(fileName, imageBuffer, { contentType: "image/png" });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from("studio-assets")
            .getPublicUrl(fileName);

        // 4. Save to Database
        const { data: dbRecord, error: dbError } = await supabase
            .from("studio_images")
            .insert({
                organization_id: organizationId,
                created_by: user.id,
                tool_id: toolId,
                prompt: prompt,
                image_url: publicUrl,
                size: size,
                style: style,
                model: aiModel
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return new Response(JSON.stringify({
            success: true,
            imageUrl: publicUrl,
            imageId: dbRecord.id
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Edge Function Error:", error);
        return new Response(JSON.stringify({ error: error.message, details: "Este erro geralmente acontece quando a API da IA falha ou a chave API não está configurada corretamente no Supabase." }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
