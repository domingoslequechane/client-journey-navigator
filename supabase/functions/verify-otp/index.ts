import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const VerifyOTPSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  otp: z.string().regex(/^\d{6}$/, "OTP deve ter 6 dígitos"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(128, "Senha muito longa"),
  fullName: z.string().min(2, "Nome muito curto").max(100, "Nome muito longo").trim(),
});

const MAX_ATTEMPTS = 5;

// In-memory IP rate limiting (per instance)
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_IP = 15; // 15 verify attempts per IP per minute
const IP_WINDOW_MS = 60 * 1000;

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);
  
  if (!record || now > record.resetAt) {
    ipRequestCounts.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS_PER_IP) {
    return false;
  }
  
  record.count++;
  return true;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // IP-based rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkIpRateLimit(clientIp)) {
      console.warn(`IP rate limit exceeded for verify-otp: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();

    // Validate input with Zod
    const validationResult = VerifyOTPSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("[verify-otp] Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Dados inválidos", 
          details: validationResult.error.errors.map(e => e.message) 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, otp, password, fullName } = validationResult.data;

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get OTP record by email first to check attempts
    const { data: otpRecord, error: fetchError } = await supabase
      .from("email_otps")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (fetchError || !otpRecord) {
      // Generic error to prevent enumeration
      console.error("[verify-otp] OTP record not found for:", email);
      return new Response(
        JSON.stringify({ error: "Código inválido ou expirado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from("email_otps").delete().eq("email", email);
      return new Response(
        JSON.stringify({ error: "Código expirado. Solicite um novo." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already verified
    if (otpRecord.verified) {
      return new Response(
        JSON.stringify({ error: "Este código já foi utilizado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if too many attempts
    if ((otpRecord.attempts || 0) >= MAX_ATTEMPTS) {
      await supabase.from("email_otps").delete().eq("email", email);
      return new Response(
        JSON.stringify({ error: "Muitas tentativas incorretas. Solicite um novo código." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the code
    if (otpRecord.otp_code !== otp) {
      const newAttempts = (otpRecord.attempts || 0) + 1;
      
      if (newAttempts >= MAX_ATTEMPTS) {
        await supabase.from("email_otps").delete().eq("email", email);
        return new Response(
          JSON.stringify({ error: "Muitas tentativas incorretas. Solicite um novo código." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } else {
        await supabase
          .from("email_otps")
          .update({ attempts: newAttempts })
          .eq("id", otpRecord.id);
          
        return new Response(
          JSON.stringify({ error: "Código inválido ou expirado" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Mark OTP as verified
    await supabase.from("email_otps").update({ verified: true }).eq("email", email);

    // Create user with confirmed email - all signup users are admins (agency owners)
    const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'admin',
      },
    });

    if (signUpError) {
      console.error("[verify-otp] Error creating user:", signUpError);
      
      // Generic error for all cases to prevent enumeration
      return new Response(
        JSON.stringify({ error: "Erro ao criar conta. Tente novamente." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = userData.user?.id;
    
    if (userId) {
      const orgName = fullName ? `${fullName}'s Agency` : `Agency`;
      const { data: slugData } = await supabase.rpc('generate_slug', { name: orgName });
      const slug = slugData || `agency-${Date.now()}`;
      
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: orgName,
          slug: slug,
          owner_id: userId,
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();
      
      if (orgError) {
        console.error("[verify-otp] Error creating organization:", orgError);
      } else if (orgData) {
        await supabase
          .from("profiles")
          .update({ 
            organization_id: orgData.id,
            role: 'admin'
          })
          .eq('id', userId);
      }
    }

    // Delete OTP record after successful verification
    await supabase.from("email_otps").delete().eq("email", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email verified and account created",
        user: userData.user 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[verify-otp] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
