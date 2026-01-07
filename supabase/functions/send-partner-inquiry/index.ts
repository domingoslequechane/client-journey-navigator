import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SocialMedia {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
  other?: string;
}

interface PartnerInquiryRequest {
  email: string;
  whatsapp: string;
  message?: string;
  socialMedia?: SocialMedia;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received partner inquiry request");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, whatsapp, message, socialMedia }: PartnerInquiryRequest = await req.json();

    console.log("Partner inquiry data:", { email, whatsapp, hasMessage: !!message, hasSocialMedia: !!socialMedia });

    // Validate required fields
    if (!email || !whatsapp) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Email e WhatsApp são obrigatórios" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Build social media section HTML
    const socialMediaItems: string[] = [];
    if (socialMedia?.facebook) socialMediaItems.push(`<li style="margin: 5px 0;"><strong>Facebook:</strong> <a href="${socialMedia.facebook}" style="color: #6366f1;">${socialMedia.facebook}</a></li>`);
    if (socialMedia?.instagram) socialMediaItems.push(`<li style="margin: 5px 0;"><strong>Instagram:</strong> <a href="${socialMedia.instagram}" style="color: #6366f1;">${socialMedia.instagram}</a></li>`);
    if (socialMedia?.linkedin) socialMediaItems.push(`<li style="margin: 5px 0;"><strong>LinkedIn:</strong> <a href="${socialMedia.linkedin}" style="color: #6366f1;">${socialMedia.linkedin}</a></li>`);
    if (socialMedia?.tiktok) socialMediaItems.push(`<li style="margin: 5px 0;"><strong>TikTok:</strong> <a href="${socialMedia.tiktok}" style="color: #6366f1;">${socialMedia.tiktok}</a></li>`);
    if (socialMedia?.youtube) socialMediaItems.push(`<li style="margin: 5px 0;"><strong>YouTube:</strong> <a href="${socialMedia.youtube}" style="color: #6366f1;">${socialMedia.youtube}</a></li>`);
    if (socialMedia?.other) socialMediaItems.push(`<li style="margin: 5px 0;"><strong>Outro:</strong> <a href="${socialMedia.other}" style="color: #6366f1;">${socialMedia.other}</a></li>`);

    const socialMediaHtml = socialMediaItems.length > 0 ? `
      <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #334155; margin-top: 0;">Mídias Sociais</h2>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${socialMediaItems.join('')}
        </ul>
      </div>
    ` : '';

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Qualify AI <parcerias-qualify@onixagence.com>",
        to: ["d.lequechane@onixagence.com"],
        subject: "Nova Solicitação de Parceria - Qualify AI",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
              Nova Solicitação de Parceria
            </h1>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #334155; margin-top: 0;">Dados do Interessado</h2>
              
              <p style="margin: 10px 0;">
                <strong style="color: #64748b;">Email:</strong><br/>
                <a href="mailto:${email}" style="color: #6366f1;">${email}</a>
              </p>
              
              <p style="margin: 10px 0;">
                <strong style="color: #64748b;">WhatsApp:</strong><br/>
                <a href="https://wa.me/${whatsapp.replace(/\D/g, '')}" style="color: #6366f1;">${whatsapp}</a>
              </p>
              
              <p style="margin: 10px 0;">
                <strong style="color: #64748b;">Mensagem:</strong><br/>
                <span style="color: #334155;">${message || "Nenhuma mensagem adicional"}</span>
              </p>
            </div>

            ${socialMediaHtml}
            
            <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
              Esta mensagem foi enviada automaticamente pelo formulário de parcerias do Qualify AI CRM.
            </p>
          </div>
        `,
      }),
    });

    const data = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", data);

      const message = data?.message || "Failed to send email";
      const status = data?.statusCode ?? emailResponse.status ?? 500;

      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-partner-inquiry function:", error);
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
