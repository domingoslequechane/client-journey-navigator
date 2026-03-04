import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactFormRequest {
  linkPageId: string;
  blockId: string;
  senderName?: string;
  senderEmail: string;
  senderPhone?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { linkPageId, blockId, senderName, senderEmail, senderPhone, message }: ContactFormRequest = await req.json();

    if (!senderEmail) {
      return new Response(JSON.stringify({ error: "Email do remetente é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!linkPageId || !blockId) {
      return new Response(JSON.stringify({ error: "IDs de página e bloco são obrigatórios" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Initialize Supabase Admin client to fetch secure data
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch the block content to get the configured recipient email
    // We also join with link_pages to get the page name
    const { data: block, error: blockError } = await supabaseAdmin
      .from("link_blocks")
      .select("content, link_pages(name)")
      .eq("id", blockId)
      .eq("link_page_id", linkPageId)
      .single();

    if (blockError || !block) {
      console.error("[send-contact-form] Block not found or error:", blockError);
      return new Response(JSON.stringify({ error: "Configuração do formulário não encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const formConfig = (block.content as any)?.formConfig;
    const recipientEmail = formConfig?.recipientEmail;
    const pageName = (block.link_pages as any)?.name || "Página de Links";

    if (!recipientEmail) {
      console.error("[send-contact-form] Recipient email not configured in block content");
      return new Response(JSON.stringify({ error: "Destinatário não configurado para este formulário" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // SECURITY FIX: We ONLY send the email to the internal recipientEmail (the owner of the page).
    // We removed the confirmation email to the senderEmail to prevent the server from being used 
    // as a spam relay or phishing vector.

    const recipientEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
          Nova Mensagem de Contato
        </h1>
        <p style="color: #64748b; font-size: 14px;">
          Você recebeu uma nova mensagem através da sua página <strong>${pageName}</strong>
        </p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #334155; margin-top: 0;">Dados do Contato</h2>
          
          ${senderName ? `
          <p style="margin: 10px 0;">
            <strong style="color: #64748b;">Nome:</strong><br/>
            <span style="color: #334155;">${senderName}</span>
          </p>
          ` : ''}
          
          <p style="margin: 10px 0;">
            <strong style="color: #64748b;">Email:</strong><br/>
            <a href="mailto:${senderEmail}" style="color: #6366f1;">${senderEmail}</a>
          </p>
          
          ${senderPhone ? `
          <p style="margin: 10px 0;">
            <strong style="color: #64748b;">Telefone:</strong><br/>
            <a href="tel:${senderPhone}" style="color: #6366f1;">${senderPhone}</a>
          </p>
          ` : ''}
          
          ${message ? `
          <p style="margin: 10px 0;">
            <strong style="color: #64748b;">Mensagem:</strong><br/>
            <span style="color: #334155; white-space: pre-wrap;">${message}</span>
          </p>
          ` : ''}
        </div>
        
        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
          Esta mensagem foi enviada através do formulário de contato da sua página Link23 no Qualify.
        </p>
      </div>
    `;

    const recipientEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Link23 by Qualify <noreply@onixagence.com>",
        to: [recipientEmail],
        subject: `Nova mensagem de contato - ${pageName}`,
        html: recipientEmailHtml,
        reply_to: senderEmail,
      }),
    });

    if (!recipientEmailResponse.ok) {
      const errorData = await recipientEmailResponse.json();
      console.error("[send-contact-form] Resend API error (recipient):", errorData);
      return new Response(JSON.stringify({ error: "Falha ao enviar e-mail para o destinatário" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[send-contact-form] Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);