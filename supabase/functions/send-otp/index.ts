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

// Input validation schema
const OTPRequestSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  fullName: z.string().min(2, "Nome muito curto").max(100, "Nome muito longo").trim(),
});

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_EMAIL = 3; // Max 3 OTP requests per email per minute

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validate input with Zod
    const validationResult = OTPRequestSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Dados inválidos", 
          details: validationResult.error.errors.map(e => e.message) 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, fullName } = validationResult.data;

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit for this email - count recent OTP requests
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { data: recentOtps, error: countError } = await supabase
      .from("email_otps")
      .select("created_at")
      .eq("email", email)
      .gte("created_at", windowStart);

    if (countError) {
      console.error("Error checking rate limit:", countError);
    }

    // If too many recent requests, reject
    if (recentOtps && recentOtps.length >= MAX_REQUESTS_PER_EMAIL) {
      console.warn(`Rate limit exceeded for email: ${email}`);
      return new Response(
        JSON.stringify({ 
          error: "Muitas tentativas. Aguarde 1 minuto antes de tentar novamente.",
          code: "RATE_LIMITED"
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this email (keeps only the newest)
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
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
