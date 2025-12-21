import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RemoveMemberRequest {
  memberId: string;
  memberEmail: string;
  memberName: string;
  organizationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Remove member function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create client with user token for authentication check
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("User authentication error:", userError);
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Authenticated user:", user.id);

    const { memberId, memberEmail, memberName, organizationId }: RemoveMemberRequest = await req.json();

    if (!memberId || !memberEmail || !organizationId) {
      console.error("Missing required fields:", { memberId, memberEmail, organizationId });
      return new Response(JSON.stringify({ error: "Dados incompletos" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Removing member:", { memberId, memberEmail, memberName, organizationId });

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is an admin of the organization
    const { data: requesterMember, error: requesterError } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .single();

    if (requesterError || !requesterMember || requesterMember.role !== "admin") {
      console.error("Requester is not an admin:", requesterError);
      return new Response(JSON.stringify({ error: "Apenas administradores podem remover membros" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    if (orgError || !organization) {
      console.error("Error fetching organization:", orgError);
      return new Response(JSON.stringify({ error: "Organização não encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get admin's name for the email
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const adminName = adminProfile?.full_name || "O administrador";

    // Deactivate the member
    const { error: deactivateError } = await supabaseAdmin
      .from("organization_members")
      .update({
        is_active: false,
        removed_at: new Date().toISOString(),
        removed_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", memberId)
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    if (deactivateError) {
      console.error("Error deactivating member:", deactivateError);
      return new Response(JSON.stringify({ error: "Erro ao remover membro" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Clear current_organization_id if it was this organization
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        current_organization_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId)
      .eq("current_organization_id", organizationId);

    if (profileError) {
      console.warn("Error clearing current organization (non-critical):", profileError);
    }

    console.log("Member removed successfully, sending email notification");

    // Send email notification
    try {
      const emailResponse = await resend.emails.send({
        from: "Qualify <onboarding@resend.dev>",
        to: [memberEmail],
        subject: `Você foi removido da equipe ${organization.name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Notificação de Equipe</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="font-size: 16px; margin-bottom: 20px;">Olá${memberName ? ` ${memberName}` : ''},</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Informamos que você foi removido da equipe "<strong>${organization.name}</strong>" pelo administrador <strong>${adminName}</strong>.
              </p>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  A partir de agora, você não terá mais acesso aos dados desta organização.
                </p>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Se você acredita que isso foi um erro, entre em contato com o administrador da organização.
              </p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Sua conta no Qualify continua ativa e você pode acessá-la para gerenciar outras organizações das quais faça parte.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0;">
                Atenciosamente,<br>
                <strong>Equipe Qualify</strong>
              </p>
            </div>
          </body>
          </html>
        `,
      });

      console.log("Email sent successfully:", emailResponse);
    } catch (emailError) {
      console.error("Error sending email (non-critical):", emailError);
      // Don't fail the operation if email fails
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in remove-member function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
