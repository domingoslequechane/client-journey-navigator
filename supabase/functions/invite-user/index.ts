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
      .select("role, organization_id, full_name")
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

    // Fetch organization name for the email
    const { data: orgData } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", adminOrgId)
      .single();

    const organizationName = orgData?.name || "a equipe";
    const inviterName = profileData?.full_name || "Um administrador";

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
      // Check if user is already a member of THIS organization
      const { data: existingMember } = await supabaseAdmin
        .from("organization_members")
        .select("id, is_active")
        .eq("user_id", existingUserRecord.id)
        .eq("organization_id", adminOrgId)
        .single();
      
      if (existingMember?.is_active) {
        return new Response(
          JSON.stringify({ error: "Este usuário já faz parte desta organização" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // User exists but not in this org - add them directly
      console.log("User exists, adding to organization:", existingUserRecord.id);
      
      // Add to organization_members
      const { error: memberError } = await supabaseAdmin
        .from("organization_members")
        .upsert({ 
          user_id: existingUserRecord.id,
          organization_id: adminOrgId,
          role: role as any,
          is_active: true,
        }, {
          onConflict: 'user_id,organization_id'
        });

      if (memberError) {
        console.error("Error adding existing user to organization:", memberError);
        return new Response(
          JSON.stringify({ error: "Erro ao adicionar usuário à organização" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Existing user ${email} added to organization ${adminOrgId}`);

      // Send notification email to existing user about being added to a new organization
      const baseUrl = "https://qualify.onixagence.com";
      try {
        await resend.emails.send({
          from: "Qualify <no-reply@onixagence.com>",
          to: [email],
          subject: `Você foi adicionado à equipe ${organizationName}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; 
                  line-height: 1.6; 
                  color: #1e293b; 
                  background-color: #f1f5f9;
                  margin: 0;
                  padding: 20px;
                }
                .email-wrapper {
                  max-width: 600px; 
                  margin: 0 auto;
                  background: #ffffff;
                  border-radius: 16px;
                  overflow: hidden;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
                }
                .header { 
                  background: linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%); 
                  color: white; 
                  padding: 40px 30px;
                  text-align: center; 
                }
                .logo-container {
                  display: inline-block;
                  width: 64px;
                  height: 64px;
                  background: rgba(255, 255, 255, 0.2);
                  border-radius: 16px;
                  margin-bottom: 16px;
                  line-height: 64px;
                  font-size: 32px;
                  font-weight: 700;
                }
                .header h1 {
                  margin: 0;
                  font-size: 28px;
                  font-weight: 700;
                  letter-spacing: -0.5px;
                }
                .header p {
                  margin: 8px 0 0;
                  opacity: 0.9;
                  font-size: 15px;
                }
                .content { 
                  padding: 40px 30px; 
                }
                .greeting {
                  font-size: 22px;
                  font-weight: 600;
                  color: #1e293b;
                  margin: 0 0 20px;
                }
                .invite-text {
                  font-size: 16px;
                  color: #475569;
                  margin: 0 0 24px;
                }
                .invite-text strong {
                  color: #f97316;
                }
                .org-card {
                  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
                  border: 1px solid #fed7aa;
                  border-radius: 12px;
                  padding: 20px;
                  margin: 24px 0;
                  text-align: center;
                }
                .org-icon {
                  font-size: 32px;
                  margin-bottom: 8px;
                }
                .org-name { 
                  font-weight: 700; 
                  color: #c2410c;
                  font-size: 20px;
                  display: block;
                }
                .role-section {
                  text-align: center;
                  margin: 24px 0;
                }
                .role-label {
                  font-size: 14px;
                  color: #64748b;
                  margin-bottom: 8px;
                }
                .role-badge { 
                  display: inline-block; 
                  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); 
                  color: white; 
                  padding: 8px 20px; 
                  border-radius: 24px; 
                  font-size: 15px;
                  font-weight: 600;
                }
                .info-box {
                  background: #f0fdf4;
                  border: 1px solid #bbf7d0;
                  border-radius: 12px;
                  padding: 16px;
                  margin: 24px 0;
                  text-align: center;
                }
                .info-box p {
                  margin: 0;
                  color: #166534;
                  font-size: 14px;
                }
                .cta-section {
                  text-align: center;
                  margin: 32px 0;
                }
                .button { 
                  display: inline-block; 
                  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); 
                  color: white !important; 
                  padding: 16px 40px; 
                  border-radius: 12px; 
                  text-decoration: none;
                  font-weight: 600;
                  font-size: 16px;
                  box-shadow: 0 4px 14px 0 rgba(249, 115, 22, 0.4);
                }
                .footer { 
                  background: #f8fafc;
                  border-top: 1px solid #e2e8f0;
                  text-align: center; 
                  padding: 24px 30px; 
                  color: #94a3b8; 
                  font-size: 13px; 
                }
                .footer p {
                  margin: 0;
                }
                .footer a {
                  text-decoration: none;
                }
                .footer-logo {
                  font-weight: 700;
                  color: #f97316;
                }
                .footer-link {
                  color: #f97316;
                  font-weight: 500;
                }
              </style>
            </head>
            <body>
              <div class="email-wrapper">
                <div class="header">
                  <div class="logo-container">Q</div>
                  <h1>Qualify</h1>
                  <p>Gestão Inteligente de Clientes</p>
                </div>
                <div class="content">
                  <h2 class="greeting">Olá! 👋</h2>
                  <p class="invite-text">
                    <strong>${inviterName}</strong> adicionou você a uma nova equipe no Qualify.
                  </p>
                  
                  <div class="org-card">
                    <div class="org-icon">🏢</div>
                    <span class="org-name">${organizationName}</span>
                  </div>
                  
                  <div class="role-section">
                    <p class="role-label">Sua função nesta equipe:</p>
                    <span class="role-badge">✨ ${ROLE_LABELS[role]}</span>
                  </div>

                  <div class="info-box">
                    <p>✓ Você já possui uma conta no Qualify. Basta fazer login e selecionar a organização para começar.</p>
                  </div>
                  
                  <div class="cta-section">
                    <a href="${baseUrl}/select-organization" class="button">Acessar Qualify</a>
                  </div>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} <a href="https://qualify.onixagence.com" class="footer-logo">Qualify</a> - <a href="https://onixagence.com" class="footer-link">Onix Agence</a></p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
        console.log("Notification email sent to existing user:", email);
      } catch (emailError) {
        console.error("Error sending notification email to existing user:", emailError);
        // Don't fail the operation if email fails
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Usuário existente adicionado à organização com sucesso",
          userId: existingUserRecord.id,
          isExistingUser: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If resending but user doesn't exist, treat as new invite
    if (isResend && !existingUserRecord) {
      console.log("User doesn't exist, creating new invite");
    }

    // Use production domain
    const baseUrl = "https://qualify.onixagence.com";
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

    // Add user to organization_members and update profile
    if (linkData.user?.id) {
      // Insert into organization_members
      const { error: memberError } = await supabaseAdmin
        .from("organization_members")
        .upsert({ 
          user_id: linkData.user.id,
          organization_id: adminOrgId,
          role: role as any,
          is_active: true,
        }, {
          onConflict: 'user_id,organization_id'
        });

      if (memberError) {
        console.error("Error adding to organization_members:", memberError);
      } else {
        console.log(`User added to organization_members for org: ${adminOrgId}`);
      }

      // Update profile with current_organization_id and legacy organization_id
      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          organization_id: adminOrgId,
          current_organization_id: adminOrgId,
          role: role as any,
          full_name: fullName,
        })
        .eq("id", linkData.user.id);

      if (profileUpdateError) {
        console.error("Error updating profile:", profileUpdateError);
      } else {
        console.log(`Profile updated with organization_id: ${adminOrgId}`);
      }
    }

    // Send welcome email via Resend with the actual invite link
    try {
      await resend.emails.send({
        from: "Qualify <no-reply@onixagence.com>",
        to: [email],
        subject: `${inviterName} convidou você para ${organizationName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; 
                line-height: 1.6; 
                color: #1e293b; 
                background-color: #f1f5f9;
                margin: 0;
                padding: 20px;
              }
              .email-wrapper {
                max-width: 600px; 
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
              }
              .header { 
                background: linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%); 
                color: white; 
                padding: 40px 30px;
                text-align: center; 
              }
              .logo-container {
                display: inline-block;
                width: 64px;
                height: 64px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 16px;
                margin-bottom: 16px;
                line-height: 64px;
                font-size: 32px;
                font-weight: 700;
              }
              .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                letter-spacing: -0.5px;
              }
              .header p {
                margin: 8px 0 0;
                opacity: 0.9;
                font-size: 15px;
              }
              .content { 
                padding: 40px 30px; 
              }
              .greeting {
                font-size: 22px;
                font-weight: 600;
                color: #1e293b;
                margin: 0 0 20px;
              }
              .invite-text {
                font-size: 16px;
                color: #475569;
                margin: 0 0 24px;
              }
              .invite-text strong {
                color: #f97316;
              }
              .org-card {
                background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
                border: 1px solid #fed7aa;
                border-radius: 12px;
                padding: 20px;
                margin: 24px 0;
                text-align: center;
              }
              .org-icon {
                font-size: 32px;
                margin-bottom: 8px;
              }
              .org-name { 
                font-weight: 700; 
                color: #c2410c;
                font-size: 20px;
                display: block;
              }
              .role-section {
                text-align: center;
                margin: 24px 0;
              }
              .role-label {
                font-size: 14px;
                color: #64748b;
                margin-bottom: 8px;
              }
              .role-badge { 
                display: inline-block; 
                background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); 
                color: white; 
                padding: 8px 20px; 
                border-radius: 24px; 
                font-size: 15px;
                font-weight: 600;
              }
              .cta-section {
                text-align: center;
                margin: 32px 0;
              }
              .button { 
                display: inline-block; 
                background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); 
                color: white !important; 
                padding: 16px 40px; 
                border-radius: 12px; 
                text-decoration: none;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4);
                transition: transform 0.2s, box-shadow 0.2s;
              }
              .button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px 0 rgba(249, 115, 22, 0.5);
              }
              .link-fallback a {
                color: #f97316;
              }
              .link-fallback {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 16px;
                margin-top: 24px;
                font-size: 13px;
                color: #64748b;
                word-break: break-all;
              }
              .link-fallback strong {
                color: #475569;
                display: block;
                margin-bottom: 8px;
              }
              .footer { 
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
                text-align: center; 
                padding: 24px 30px; 
                color: #94a3b8; 
                font-size: 13px; 
              }
              .footer p {
                margin: 0;
              }
              .footer a {
                text-decoration: none;
              }
              .footer-logo {
                font-weight: 700;
                color: #f97316;
              }
              .footer-link {
                color: #f97316;
                font-weight: 500;
              }
              .footer a:hover {
                text-decoration: underline;
              }
            </style>
          </head>
          <body>
            <div class="email-wrapper">
              <div class="header">
                <div class="logo-container">Q</div>
                <h1>Qualify</h1>
                <p>Gestão Inteligente de Clientes</p>
              </div>
              <div class="content">
                <h2 class="greeting">Olá, ${fullName}! 👋</h2>
                <p class="invite-text">
                  <strong>${inviterName}</strong> convidou você para fazer parte da equipe no Qualify.
                </p>
                
                <div class="org-card">
                  <div class="org-icon">🏢</div>
                  <span class="org-name">${organizationName}</span>
                </div>
                
                <div class="role-section">
                  <p class="role-label">Você foi convidado como:</p>
                  <span class="role-badge">✨ ${ROLE_LABELS[role]}</span>
                </div>
                
                <div class="cta-section">
                  <a href="${inviteLink}" class="button">✓ Aceitar Convite</a>
                </div>
                
                <div class="link-fallback">
                  <strong>Link alternativo:</strong>
                  <a href="${inviteLink}">${inviteLink}</a>
                </div>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} <a href="https://qualify.onixagence.com" class="footer-logo">Qualify</a> - <a href="https://onixagence.com" class="footer-link">Onix Agence</a></p>
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
