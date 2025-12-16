import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OTPRequest {
  email: string;
  fullName: string;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: OTPRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        JSON.stringify({ error: "Failed to generate OTP" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Qualify <onboarding@resend.dev>",
      to: [email],
      subject: "Código de verificação - Qualify",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 500px; margin: 0 auto; padding: 40px 20px; }
            .logo { text-align: center; margin-bottom: 30px; }
            .logo-box { display: inline-block; width: 50px; height: 50px; background: #7c3aed; border-radius: 10px; line-height: 50px; }
            .logo-text { color: white; font-size: 28px; font-weight: bold; }
            h1 { text-align: center; color: #1f2937; font-size: 24px; margin-bottom: 10px; }
            .greeting { text-align: center; color: #6b7280; margin-bottom: 30px; }
            .otp-box { background: #f3f4f6; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px; }
            .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #7c3aed; }
            .expiry { text-align: center; color: #9ca3af; font-size: 14px; }
            .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <div class="logo-box">
                <span class="logo-text">Q</span>
              </div>
            </div>
            <h1>Confirme seu e-mail</h1>
            <p class="greeting">Olá ${fullName || ""},</p>
            <p style="text-align: center; color: #6b7280;">Use o código abaixo para confirmar seu cadastro:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p class="expiry">Este código expira em 10 minutos.</p>
            <div class="footer">
              <p>Se você não solicitou este código, ignore este e-mail.</p>
              <p>© ${new Date().getFullYear()} Qualify. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("OTP email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
