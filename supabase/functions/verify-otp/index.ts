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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validate input with Zod
    const validationResult = VerifyOTPSchema.safeParse(body);
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

    const { email, otp, password, fullName } = validationResult.data;

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from("email_otps")
      .select("*")
      .eq("email", email)
      .eq("otp_code", otp)
      .single();

    if (fetchError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "Código inválido" }),
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

    // Mark OTP as verified
    await supabase.from("email_otps").update({ verified: true }).eq("email", email);

    // Create user with confirmed email - all signup users are admins (agency owners)
    const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        // Note: The trigger now ignores this role field for security, 
        // so we explicitly set it in the profile update below.
        role: 'admin',
      },
    });

    if (signUpError) {
      console.error("Error creating user:", signUpError);
      
      // If user already exists, try to sign them in
      if (signUpError.message.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "Este e-mail já está cadastrado. Faça login." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao criar conta. Tente novamente." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = userData.user?.id;
    
    if (userId) {
      // Create organization for the new user (without trial - will be set by LemonSqueezy checkout)
      const orgName = fullName ? `${fullName}'s Agency` : `Agency`;
      
      // Generate a unique slug
      const { data: slugData } = await supabase.rpc('generate_slug', { name: orgName });
      const slug = slugData || `agency-${Date.now()}`;
      
      // Create the organization with a placeholder trial_ends_at (will be updated by webhook)
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: orgName,
          slug: slug,
          owner_id: userId,
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Temporary placeholder
        })
        .select()
        .single();
      
      if (orgError) {
        console.error("Error creating organization:", orgError);
      } else if (orgData) {
        console.log("Organization created:", orgData.id);
        
        // Update profile with organization_id and explicitly set role to admin
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ 
            organization_id: orgData.id,
            role: 'admin' // Explicitly set admin role for the agency owner
          })
          .eq('id', userId);
        
        if (profileError) {
          console.error("Error updating profile with org and role:", profileError);
        }
        
        // Note: No subscription created here - will be created by LemonSqueezy webhook after checkout
        console.log("Organization created, user will complete checkout to start trial");
      }
    }

    // Delete OTP record
    await supabase.from("email_otps").delete().eq("email", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email verified and account created",
        user: userData.user 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-otp function:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);