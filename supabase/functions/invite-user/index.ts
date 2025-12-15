import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  fullName: string;
  role: "sales" | "operations" | "campaign_management";
}

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

    const { email, fullName, role }: InviteRequest = await req.json();

    if (!email || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: "Email, nome e função são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Inviting user: ${email}, ${fullName}, ${role}`);

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === email);
    
    if (userExists) {
      return new Response(
        JSON.stringify({ error: "Este email já está cadastrado no sistema" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the origin from request headers for redirect URL
    const origin = req.headers.get("origin") || "https://hrarkpjuchrbffnrhzcy.lovableproject.com";
    const redirectUrl = `${origin}/set-password`;

    // Create user with invite
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName,
        role: role,
      },
      redirectTo: redirectUrl,
    });

    if (inviteError) {
      console.error("Invite error:", inviteError);
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send welcome email via Resend
    try {
      await resend.emails.send({
        from: "Qualify <onboarding@resend.dev>",
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
                  <a href="${redirectUrl}" class="button">Criar Minha Senha</a>
                </p>
                <p style="color: #64748b; font-size: 14px;">Se o botão não funcionar, acesse este link: ${redirectUrl}</p>
              </div>
              <div class="footer">
                <p>© 2024 Qualify - Onix Agency</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      console.log("Welcome email sent successfully");
    } catch (emailError) {
      console.error("Email error:", emailError);
      // Don't fail the invite if email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Convite enviado com sucesso!",
        user: inviteData.user 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in invite-user function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
