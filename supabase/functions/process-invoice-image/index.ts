import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave API do Gemini não configurada" }), {
        status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const { image_data } = body;

    if (!image_data) {
      return new Response(JSON.stringify({ error: "Imagem não fornecida" }), {
        status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      });
    }

    const getBase64FromDataUrl = (dataUrl: string) => {
      const parts = dataUrl.split(',');
      return parts.length > 1 ? parts[1] : parts[0];
    };

    const getMimeTypeFromDataUrl = (dataUrl: string) => {
      const match = dataUrl.match(/^data:([^;]+);/);
      return match ? match[1] : 'image/jpeg';
    };

    const userContent = [
      {
        inlineData: {
          mimeType: getMimeTypeFromDataUrl(image_data),
          data: getBase64FromDataUrl(image_data)
        }
      },
      {
        text: `Você é um Arquiteto de Layout de Documentos profissional. Analise a imagem da factura fornecida e mapeie seus elementos visuais para um formato JSON estruturado.
O JSON deve conter:
1. "primaryColor": (string hex code identificada na imagem dominant color)
2. "sections": Um objeto onde cada chave é o tipo da seção com suas configurações booleanas.

ESTRUTURA ESPERADA NO JSON:
{
  "primaryColor": "#HEX",
  "layout": {
    "header": { "logoPosition": "left"|"center"|"right", "showNuit": bool, "showPhone": bool, "showAddress": bool, "showSlogan": bool, "showEmail": bool },
    "client": { "showClientEmail": bool, "showClientPhone": bool, "showClientAddress": bool, "showClientNuit": bool },
    "invoice_info": { "invoiceType": "proforma"|"factura"|"recibo"|"orcamento", "showDueDate": bool, "showValidity": bool, "showTotalInHeader": bool },
    "services": { "showQuantity": bool, "showUnitPrice": bool, "showRowNumbers": bool },
    "totals": { "showSubtotal": bool, "showTax": bool, "notesPosition": "left"|"bottom", "showNotes": bool },
    "payment": { "showPaymentProvider": bool, "showPaymentAccount": bool, "showPaymentRecipient": bool },
    "signatures": { "showClientSignature": bool, "showAgencySignature": bool },
    "footer": { "showThreeColumnFooter": bool }
  }
}

Regras:
- Analise cuidadosamente cada seção da imagem.
- Se um elemento não for visível, marque como false.
- Retorne APENAS o JSON puro. Sem blocos de código markdown.`
      }
    ];

    console.log(`[process-invoice-image] Calling Gemini...`);
    
    // Using gemini-1.5-flash for speed as layout detection doesn't need huge logic
    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: userContent }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          response_mime_type: "application/json"
        },
      }),
    });

    const aiData = await aiResponse.json();
    
    if (!aiResponse.ok) {
      console.error("[process-invoice-image] AI Error:", JSON.stringify(aiData));
      throw new Error("Erro na API do Gemini");
    }

    const result = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsedLayout = JSON.parse(result);

    return new Response(JSON.stringify(parsedLayout), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("[process-invoice-image] CRITICAL ERROR:", error);
    const msg = error instanceof Error ? error.message : "Erro interno";
    return new Response(JSON.stringify({ error: msg }), {
      status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
    });
  }
});
