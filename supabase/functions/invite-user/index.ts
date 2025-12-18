import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const InviteRequestSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  fullName: z.string().min(2, "Nome muito curto").max(100, "Nome muito longo").trim(),
  role: z.enum(["sales", "operations", "campaign_management"], {
    errorMap: () => ({ message: "Função inválida" })
  }),
  resend: z.boolean().optional(),
});

const ROLE_LABELS: Record<string, string> = {
  sales: "Vendas",
  operations: "Operações",
  campaign_management: "Gestão de Campanhas",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // SECURITY: Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error("Invalid authentication:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Autenticação inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Verify proprietor privileges using user_roles table
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "proprietor")
      .maybeSingle();

    // Also check profiles table for admin role (organization admin support)
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    const isAdmin = roleData?.role === "proprietor" || profileData?.role === "admin";

    if (!isAdmin) {
      console.error(`User ${user.id} attempted to invite without admin privileges`);
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem convidar novos membros" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the admin's organization_id to assign to the invited user
    const adminOrgId = profileData?.organization_id;
    if (!adminOrgId) {
      console.error(`Admin ${user.id} has no organization_id`);
      return new Response(
        JSON.stringify({ error: "Administrador não está associado a uma organização" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // Validate input with Zod
    const validationResult = InviteRequestSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Dados inválidos", 
          details: validationResult.error.errors.map(e => e.message) 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, fullName, role, resend: isResend } = validationResult.data;

    console.log(`Admin ${user.id} ${isResend ? 'resending invite to' : 'inviting user'}: ${email}, ${fullName}, ${role}`);

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const existingUserRecord = existingUser?.users?.find(u => u.email === email);
    
    if (existingUserRecord && !isResend) {
      return new Response(
        JSON.stringify({ error: "Este email já está cadastrado no sistema" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If resending but user doesn't exist, treat as new invite
    if (isResend && !existingUserRecord) {
      console.log("User doesn't exist, creating new invite");
    }

    // Use production URL - Lovable preview/deployed URL
    // Priority: origin header > deployed domain > lovable project domain
    const origin = req.headers.get("origin");
    let baseUrl: string;
    
    if (origin && !origin.includes('localhost')) {
      baseUrl = origin;
    } else {
      // Fallback to Lovable project domain
      baseUrl = "https://qualify.lovable.app";
    }
    
    const redirectUrl = `${baseUrl}/set-password`;

    console.log(`Using redirect URL: ${redirectUrl}`);

    // Generate invite link with token using Supabase admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
        redirectTo: redirectUrl,
      },
    });

    if (linkError) {
      console.error("Link generation error:", linkError);
      return new Response(
        JSON.stringify({ error: linkError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract the action link with token
    const inviteLink = linkData.properties?.action_link;
    
    if (!inviteLink) {
      console.error("No invite link generated");
      return new Response(
        JSON.stringify({ error: "Falha ao gerar link de convite" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Invite link generated for:", email);

    // Update the invited user's profile with the admin's organization_id
    if (linkData.user?.id) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          organization_id: adminOrgId,
          role: role as any,
          full_name: fullName,
        })
        .eq("id", linkData.user.id);

      if (profileUpdateError) {
        console.error("Error updating profile with organization_id:", profileUpdateError);
        // Continue anyway - the user was created, just without org assignment
      } else {
        console.log(`Profile updated with organization_id: ${adminOrgId}`);
      }
    }

    // Send welcome email via Resend with the actual invite link
    try {
      await resend.emails.send({
        from: "Qualify <no-reply@onixagence.com>",
        to: [email],
        subject: "Você foi convidado para o Qualify!",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
              .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
              .button { display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
              .role-badge { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">Bem-vindo ao Qualify!</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">Sistema de Gestão de Clientes</p>
              </div>
              <div class="content">
                <h2>Olá, ${fullName}!</h2>
                <p>Você foi convidado para fazer parte da equipe no Qualify como:</p>
                <p><span class="role-badge">${ROLE_LABELS[role]}</span></p>
                <p>Clique no botão abaixo para criar sua senha e acessar o sistema:</p>
                <p style="text-align: center;">
                  <a href="${inviteLink}" class="button">Criar Minha Senha</a>
                </p>
                <p style="color: #64748b; font-size: 14px;">Se o botão não funcionar, copie e cole este link no navegador:<br/>${inviteLink}</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Qualify - Onix Agency</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      console.log("Welcome email sent successfully via Resend");
    } catch (emailError) {
      console.error("Email error:", emailError);
      // Don't fail the invite if email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Convite enviado com sucesso!",
        user: linkData.user 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in invite-user function:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
