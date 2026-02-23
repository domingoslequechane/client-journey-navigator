import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RequestSchema = z.object({
  email: z.string().email("Email inválido"),
  organizationName: z.string().min(1, "Nome da organização é obrigatório"),
});

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    const validationResult = RequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { organizationName } = validationResult.data;
    // Always use the authenticated user's email for consistency
    const email = user.email!;

    // Verify user is admin of the organization
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem apagar a agência" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify organization ownership
    const { data: org } = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", profile.organization_id)
      .single();

    if (!org || org.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Apenas o proprietário pode apagar a agência" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this email
    await supabase.from("email_otps").delete().eq("email", email);

    // Store new OTP
    const { error: insertError } = await supabase.from("email_otps").insert({
      email,
      otp_code: otp,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Falha ao gerar código" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Qualify <noreply@onixagence.com>",
      to: [email],
      subject: "Código de confirmação para apagar agência - Qualify",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 500px; margin: 0 auto; padding: 40px 20px; }
            .logo { text-align: center; margin-bottom: 30px; }
            .logo-box { display: inline-block; width: 50px; height: 50px; background: #dc2626; border-radius: 10px; line-height: 50px; }
            .logo-text { color: white; font-size: 28px; font-weight: bold; }
            h1 { text-align: center; color: #dc2626; font-size: 24px; margin-bottom: 10px; }
            .warning { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
            .warning p { color: #dc2626; margin: 0; font-weight: 500; text-align: center; }
            .otp-box { background: #f3f4f6; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px; }
            .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #dc2626; }
            .expiry { text-align: center; color: #9ca3af; font-size: 14px; }
            .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <div class="logo-box">
                <span class="logo-text">!</span>
              </div>
            </div>
            <h1>Confirmação de Exclusão</h1>
            <div class="warning">
              <p>⚠️ Você está prestes a apagar permanentemente a agência "${organizationName}"</p>
            </div>
            <p style="text-align: center; color: #6b7280;">Use o código abaixo para confirmar a exclusão:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p class="expiry">Este código expira em 10 minutos.</p>
            <div class="footer">
              <p><strong>Atenção:</strong> Esta ação é irreversível. Todos os dados serão apagados permanentemente.</p>
              <p>Se você não solicitou esta ação, ignore este e-mail e altere sua senha.</p>
              <p>© ${new Date().getFullYear()} Qualify. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      return new Response(
        JSON.stringify({ error: "Falha ao enviar e-mail" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Delete agency OTP email sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-delete-agency-otp:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
