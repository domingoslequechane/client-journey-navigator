// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const AI_MODELS = {
    "gemini-flash": "gemini-3.1-flash-image-preview",
    "gemini-pro": "gemini-3-pro-image-preview",
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
            model = "gemini-pro",
            inputImage
        } = await req.json();

        if (!organizationId || !toolId || !prompt) throw new Error("Missing parameters");

        let systemPrompt = `You are a professional Creative Director. Generate a high-end, commercial image for the tool: ${toolId}. 
    Aesthetic: Premium, high-fidelity, photorealistic. 
    User Request: ${prompt}
    Resolution Goal: ${size}. Style: ${style}.`;

        if (toolId === 'recolor') {
            systemPrompt = `Mude a cor da imagem sem distorcer ou fazer nenhuma alteração nela, apenas a cor do objeto para ${prompt}\nCor: ${prompt}`;
        }

        const geminiKey = Deno.env.get("GEMINI_API_KEY");
        const aiModel = AI_MODELS[model] || AI_MODELS["gemini-pro"];

        const parts = [{ text: systemPrompt }];
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
                    inline_data: {
                        mime_type: mimeType,
                        data: base64
                    }
                });
            } else if (!inputImage.startsWith('data:')) {
                console.error("Failed to fetch or convert input image:", inputImage);
            }
        }

        console.log(`Calling Gemini with model: ${aiModel}`);

        // 2. Call Gemini
        const geminiResp = await fetch(
            `${GEMINI_API_BASE}/models/${aiModel}:generateContent?key=${geminiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts }],
                    generationConfig: {
                        responseModalities: ["IMAGE"],
                    }
                }),
            }
        );

        if (!geminiResp.ok) {
            const errText = await geminiResp.text();
            let errDetail = errText;
            try {
                const errJson = JSON.parse(errText);
                errDetail = errJson.error?.message || JSON.stringify(errJson);
            } catch (e) { }

            console.error(`Gemini API Error (${geminiResp.status}):`, errDetail);
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
            throw new Error("No image data returned from AI");
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
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
