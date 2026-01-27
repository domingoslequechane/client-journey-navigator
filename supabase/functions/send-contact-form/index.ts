import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactFormRequest {
  recipientEmail: string;
  pageName: string;
  senderName?: string;
  senderEmail: string;
  senderPhone?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received contact form request");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, pageName, senderName, senderEmail, senderPhone, message }: ContactFormRequest = await req.json();

    console.log("Contact form data:", { recipientEmail, pageName, senderEmail, hasSenderName: !!senderName });

    // Validate required fields
    if (!senderEmail) {
      console.error("Missing sender email");
      return new Response(
        JSON.stringify({ error: "Email do remetente é obrigatório" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!recipientEmail) {
      console.error("Missing recipient email");
      return new Response(
        JSON.stringify({ error: "Email do destinatário não está configurado" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Email 1: Send to recipient (page owner)
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

    const recipientData = await recipientEmailResponse.json();

    if (!recipientEmailResponse.ok) {
      console.error("Resend API error (recipient):", recipientData);
      const errorMessage = recipientData?.message || "Failed to send email to recipient";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: recipientEmailResponse.status || 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Email sent to recipient successfully:", recipientData);

    // Email 2: Send confirmation to sender
    const confirmationEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
          Mensagem Enviada com Sucesso! ✓
        </h1>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Olá${senderName ? ` ${senderName}` : ''},
        </p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Sua mensagem foi enviada com sucesso para <strong>${pageName}</strong>. 
          Agradecemos o seu contato!
        </p>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Entraremos em contato em breve através do seu email.
        </p>
        
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
          <h3 style="color: #334155; margin-top: 0;">Resumo da sua mensagem:</h3>
          ${message ? `<p style="color: #64748b; white-space: pre-wrap;">${message}</p>` : '<p style="color: #64748b; font-style: italic;">Nenhuma mensagem adicional</p>'}
        </div>
        
        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
          Este é um email automático de confirmação. Por favor, não responda diretamente a este email.
        </p>
        
        <p style="color: #94a3b8; font-size: 12px;">
          Enviado através do Qualify - Link23
        </p>
      </div>
    `;

    const confirmationEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Qualify <noreply@onixagence.com>",
        to: [senderEmail],
        subject: `Confirmação - Sua mensagem foi enviada para ${pageName}`,
        html: confirmationEmailHtml,
      }),
    });

    const confirmationData = await confirmationEmailResponse.json();

    if (!confirmationEmailResponse.ok) {
      console.warn("Failed to send confirmation email:", confirmationData);
      // Don't fail the request, as the main email was sent successfully
    } else {
      console.log("Confirmation email sent successfully:", confirmationData);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-form function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
