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
  privileges: z.array(z.string()).min(1, "Selecione pelo menos um privilégio"),
  resend: z.boolean().optional(),
});

const PRIVILEGE_LABELS: Record<string, string> = {
  sales: "Vendas (Pipeline)",
  designer: "Designer (Operacional)",
  finance: "Finanças",
  link23: "Link 23",
  editorial: "Linha Editorial",
  social_media: "Social Media",
  qia: "QIA",
  studio: "Studio AI",
  academy: "Academia",
  clients: "Clientes",
  team: "Equipa",
  support: "Suporte e Feedback",
  notifications: "Notificações",
  settings: "Configurações",
  plans: "Planos",
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

    // Get profile details for permission check
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("role, privileges, organization_id, current_organization_id, full_name, account_type")
      .eq("id", user.id)
      .single();

    // SECURITY: Verify proprietor privileges using user_roles table
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "proprietor")
      .maybeSingle();

    // isAdmin logic: 
    // 1. role is 'admin' or 'owner' (from profiles)
    // 2. account_type is 'owner' (from profiles)
    // 3. has the 'team' privilege
    // 4. has the 'proprietor' app_role (from user_roles)
    const isAdmin =
      roleData?.role === "proprietor" ||
      profileData?.role === "admin" ||
      profileData?.role === "owner" ||
      profileData?.account_type === "owner" ||
      (profileData?.privileges || []).includes("team");

    if (!isAdmin) {
      console.error(`User ${user.id} (${user.email}) attempted to invite without admin privileges. Role: ${profileData?.role}, AccountType: ${profileData?.account_type}, Privileges: ${profileData?.privileges?.join(', ')}`);
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem convidar novos membros" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the admin's organization_id (prefer current_organization_id)
    const adminOrgId = profileData?.current_organization_id || profileData?.organization_id;
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

    const { email, fullName, privileges = [], resend: isResend } = validationResult.data;
    const role = privileges.includes('admin') ? 'admin' : 'sales';

    console.log(`Admin ${user.id} ${isResend ? 'resending invite to' : 'inviting user'}: ${email}, ${fullName}, role: ${role}, privileges: ${privileges.join(', ')}`);

    // Check if user is already an active member of this organization
    const { data: existingUser, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();

    if (listUsersError) {
      console.error("Error listing users:", listUsersError);
    }

    const existingUserRecord = existingUser?.users?.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existingUserRecord) {
      console.log(`User already exists with ID: ${existingUserRecord.id}`);
      const { data: existingMember, error: memberLookupError } = await supabaseAdmin
        .from("organization_members")
        .select("id, is_active")
        .eq("user_id", existingUserRecord.id)
        .eq("organization_id", adminOrgId)
        .maybeSingle();

      if (memberLookupError) {
        console.error("Error looking up organization member:", memberLookupError);
      }

      if (existingMember?.is_active && !isResend) {
        console.log("User is already an active member of this organization");
        return new Response(
          JSON.stringify({ error: "Este usuário já faz parte desta organização" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check for any existing non-accepted invite
    const { data: existingInvite, error: inviteLookupError } = await supabaseAdmin
      .from("organization_invites")
      .select("id, status, invite_token")
      .eq("email", email.toLowerCase())
      .eq("organization_id", adminOrgId)
      .neq("status", "accepted")
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteLookupError) {
      console.error("Error looking up existing invite:", inviteLookupError);
    }

    let inviteToken: string;

    if (existingInvite && (isResend || existingInvite.status !== 'pending')) {
      // Update existing invite with new expiration and token, and reset status to pending
      inviteToken = crypto.randomUUID();
      console.log(`Updating existing invite ID: ${existingInvite.id} (status: ${existingInvite.status}) with new token and resetting to pending`);
      const { error: updateError } = await supabaseAdmin
        .from("organization_invites")
        .update({
          invite_token: inviteToken,
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          full_name: fullName,
          role: role,
          privileges: privileges,
          created_at: new Date().toISOString(), // Reset creation date for sorting
        })
        .eq("id", existingInvite.id);

      if (updateError) {
        console.error("Error updating invite:", updateError);
        return new Response(
          JSON.stringify({ error: "Erro ao reenviar convite", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Existing invite updated with new token");
    } else if (existingInvite && !isResend) {
      console.log("Found existing pending invite, but not a resend request");
      return new Response(
        JSON.stringify({ error: "Já existe um convite pendente para este e-mail. Use a opção 'Reenviar Convite'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Create new invite
      inviteToken = crypto.randomUUID();
      console.log(`Creating new invite for ${email} in org ${adminOrgId}`);
      const { error: insertError } = await supabaseAdmin
        .from("organization_invites")
        .insert({
          organization_id: adminOrgId,
          email: email.toLowerCase(),
          full_name: fullName,
          role: role,
          privileges: privileges,
          invited_by: user.id,
          invite_token: inviteToken,
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });

      if (insertError) {
        console.error("Error creating invite:", insertError);
        return new Response(
          JSON.stringify({ error: "Erro ao criar convite", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("New invite created successfully");
    }

    // Create accept invite link
    const origin = req.headers.get("origin") || "https://qualify.marketing";
    const acceptInviteLink = `${origin}/accept-invite?token=${inviteToken}`;

    // If user doesn't exist, we used to generate a Supabase invite link.
    // However, we now have an in-place sign-up flow on the accept-invite page.
    // So we ALWAYS use the custom accept-invite link, regardless of whether the user exists.
    const supabaseInviteLink: string | null = null;

    // Send invite email
    try {
      const emailHtml = generateInviteEmailHtml({
        fullName,
        inviterName,
        organizationName,
        privileges,
        acceptInviteLink,
        supabaseInviteLink,
        isExistingUser: !!existingUserRecord,
      });

      await resend.emails.send({
        from: "Qualify <no-reply@qualify.marketing>",
        to: [email],
        subject: `${inviterName} convidou você para ${organizationName}`,
        html: emailHtml,
      });
      console.log("Invite email sent successfully to:", email);
    } catch (emailError) {
      console.error("Email error:", emailError);
      // Don't fail the invite if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isResend ? "Convite reenviado com sucesso!" : "Convite enviado com sucesso!",
        inviteToken: inviteToken, // For debugging
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

function generateInviteEmailHtml({
  fullName,
  inviterName,
  organizationName,
  privileges,
  acceptInviteLink,
  supabaseInviteLink,
  isExistingUser,
}: {
  fullName: string;
  inviterName: string;
  organizationName: string;
  privileges: string[];
  acceptInviteLink: string;
  supabaseInviteLink: string | null;
  isExistingUser: boolean;
}): string {
  // Since we implemented in-place signup, we always use the custom accept-invite link
  const primaryLink = acceptInviteLink;
  const buttonText = isExistingUser ? "Aceitar Convite" : "Criar Conta e Aceitar";

  return `
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
        .link-fallback a {
          color: #f97316;
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
          <h2 class="greeting">Olá, ${fullName}! 👋</h2>
          <p class="invite-text">
            <strong>${inviterName}</strong> convidou você para fazer parte da equipe no Qualify.
          </p>
          
          <div class="org-card">
            <div class="org-icon">🏢</div>
            <span class="org-name">${organizationName}</span>
          </div>
          
          <div class="role-section">
            <p class="role-label">Você foi convidado com os seguintes privilégios:</p>
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 12px;">
              ${privileges.map(p => `<span style="background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">${PRIVILEGE_LABELS[p] || p}</span>`).join('')}
            </div>
          </div>

          ${isExistingUser ? `
          <div class="info-box">
            <p>✓ Você já possui uma conta no Qualify. Clique no botão abaixo para aceitar o convite.</p>
          </div>
          ` : `
          <div class="info-box">
            <p>📧 Ao clicar no botão abaixo, você criará sua conta e já aceitará o convite automaticamente.</p>
          </div>
          `}
          
          <div class="cta-section">
            <a href="${primaryLink}" class="button">✓ ${buttonText}</a>
          </div>
          
          <div class="link-fallback">
            <strong>Link alternativo:</strong>
            <a href="${primaryLink}">${primaryLink}</a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} <a href="https://qualify.marketing" class="footer-logo">Qualify</a> - <a href="https://qualify.marketing" class="footer-link">Qualify Marketing</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}
