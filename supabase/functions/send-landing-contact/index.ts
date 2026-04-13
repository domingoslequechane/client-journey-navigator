import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LandingContactRequest {
  name: string;
  email: string;
  company?: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, company, subject, message }: LandingContactRequest = await req.json();

    if (!email || !name || !message) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios ausentes" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #f97316; margin: 0; font-size: 24px;">Novo Contato Qualify</h1>
          <p style="color: #64748b; margin: 4px 0 0;">Recebido via formulário da Landing Page</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Detalhes do Remetente</h2>
          
          <p style="margin: 10px 0;">
            <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Nome:</strong><br/>
            <span style="color: #1e293b; font-weight: 500;">${name}</span>
          </p>
          
          <p style="margin: 10px 0;">
            <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">E-mail:</strong><br/>
            <a href="mailto:${email}" style="color: #f97316; text-decoration: none; font-weight: 500;">${email}</a>
          </p>
          
          ${company ? `
          <p style="margin: 10px 0;">
            <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Agência / Empresa:</strong><br/>
            <span style="color: #1e293b; font-weight: 500;">${company}</span>
          </p>
          ` : ''}

          <p style="margin: 10px 0;">
            <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Assunto:</strong><br/>
            <span style="color: #1e293b; font-weight: 500;">${subject}</span>
          </p>
        </div>
        
        <div style="background-color: #fff7ed; padding: 20px; border-radius: 8px; border: 1px solid #fed7aa;">
          <h2 style="color: #c2410c; font-size: 18px; margin: 0 0 16px; border-bottom: 1px solid #fed7aa; padding-bottom: 8px;">Mensagem</h2>
          <p style="color: #431407; white-space: pre-wrap; margin: 0; line-height: 1.6;">${message}</p>
        </div>
        
        <div style="margin-top: 24px; text-align: center; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">Este email foi enviado automaticamente pelo sistema Qualify Marketing.</p>
        </div>
      </div>
    `;

    // 1. Enviar notificação para a equipa Qualify
    const teamEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Qualify Web <noreply@qualify.marketing>",
        to: ["comercial@qualify.marketing"],
        bcc: ["domingosf.lequechane@gmail.com", "onixagence.geral@gmail.com"],
        subject: `[Contato Web] ${subject} - ${name}`,
        html: emailHtml,
        reply_to: email,
      }),
    });

    if (!teamEmailResponse.ok) {
      console.error("[send-landing-contact] Team email failed");
    }

    // 2. Enviar confirmação para o Utilizador
    const userConfirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; width: 50px; height: 50px; background-color: #f97316; color: #ffffff; border-radius: 12px; line-height: 50px; font-size: 24px; font-weight: bold; margin-bottom: 16px;">Q</div>
          <h1 style="color: #1e293b; margin: 0; font-size: 22px;">Olá, ${name}!</h1>
          <p style="color: #64748b; margin: 8px 0 0;">Recebemos a tua mensagem com sucesso.</p>
        </div>
        
        <div style="color: #334155; line-height: 1.6; font-size: 16px;">
          <p>Obrigado por entrares em contacto com a <strong>Qualify Marketing</strong>.</p>
          <p>Este e-mail serve para confirmar que a tua mensagem sobre "<strong>${subject}</strong>" já está com a nossa equipa de atendimento.</p>
          <p>Um dos nossos especialistas irá analisar o teu pedido e responderá para este endereço de e-mail o mais breve possível (normalmente em menos de 24 horas úteis).</p>
        </div>

        <div style="margin: 30px 0; padding: 20px; border-left: 4px solid #f97316; background-color: #f8fafc; font-style: italic; color: #475569;">
          "${message.length > 150 ? message.substring(0, 150) + '...' : message}"
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 14px; margin-bottom: 8px;">Atenciosamente,</p>
          <p style="color: #f97316; font-weight: bold; margin: 0;">Equipa Qualify</p>
          <div style="margin-top: 16px;">
            <a href="https://qualify.marketing" style="color: #64748b; text-decoration: none; font-size: 12px; margin: 0 10px;">Website</a>
            <a href="https://qualify.marketing/about" style="color: #64748b; text-decoration: none; font-size: 12px; margin: 0 10px;">Sobre Nós</a>
          </div>
        </div>
      </div>
    `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Qualify Marketing <suporte@qualify.marketing>",
        to: [email],
        subject: `Recebemos o teu contacto: ${subject}`,
        html: userConfirmationHtml,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[send-landing-contact] Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
