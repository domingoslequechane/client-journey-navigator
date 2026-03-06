import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AcceptInviteSchema = z.object({
  inviteToken: z.string().uuid("Token de convite inválido"),
});

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

    // Verify authentication
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

    const body = await req.json();

    // Validate input
    const validationResult = AcceptInviteSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({
          error: "Token de convite inválido",
          details: validationResult.error.errors.map(e => e.message)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { inviteToken } = validationResult.data;
    console.log(`User ${user.id} attempting to accept invite with token: ${inviteToken}`);

    // Fetch the invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("organization_invites")
      .select("*, organizations(name)")
      .eq("invite_token", inviteToken)
      .single();

    if (inviteError || !invite) {
      console.error("Invite not found:", inviteError?.message);
      return new Response(
        JSON.stringify({ error: "Convite não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invite is still pending
    if (invite.status !== "pending") {
      console.error(`Invite already ${invite.status}`);
      return new Response(
        JSON.stringify({ error: `Este convite já foi ${invite.status === 'accepted' ? 'aceito' : invite.status === 'cancelled' ? 'cancelado' : 'expirado'}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invite has expired
    if (new Date(invite.expires_at) < new Date()) {
      // Update status to expired
      await supabaseAdmin
        .from("organization_invites")
        .update({ status: "expired" })
        .eq("id", invite.id);

      console.error("Invite has expired");
      return new Response(
        JSON.stringify({ error: "Este convite expirou. Solicite um novo convite ao administrador." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the logged user's email matches the invite email
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      console.error(`Email mismatch: ${user.email} vs ${invite.email}`);
      return new Response(
        JSON.stringify({
          error: "Este convite foi enviado para outro e-mail",
          details: `O convite é para ${invite.email}, mas você está logado como ${user.email}`
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already a member of this organization
    const { data: existingMember } = await supabaseAdmin
      .from("organization_members")
      .select("id, is_active")
      .eq("user_id", user.id)
      .eq("organization_id", invite.organization_id)
      .single();

    if (existingMember?.is_active) {
      // Mark invite as accepted anyway
      await supabaseAdmin
        .from("organization_invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Você já faz parte desta organização",
          organizationId: invite.organization_id,
          organizationName: invite.organizations?.name
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add user to organization_members
    const { error: memberError } = await supabaseAdmin
      .from("organization_members")
      .upsert({
        user_id: user.id,
        organization_id: invite.organization_id,
        role: invite.role,
        privileges: invite.privileges,
        is_active: true,
        joined_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,organization_id'
      });

    if (memberError) {
      console.error("Error adding to organization_members:", memberError);
      return new Response(
        JSON.stringify({ error: "Erro ao adicionar à organização" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile with organization_id and current_organization_id
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        organization_id: invite.organization_id,
        current_organization_id: invite.organization_id,
        role: invite.role,
        privileges: invite.privileges,
        full_name: invite.full_name,
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // Don't fail, the member was already added
    }

    // Update invite status to accepted
    const { error: updateError } = await supabaseAdmin
      .from("organization_invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString()
      })
      .eq("id", invite.id);

    if (updateError) {
      console.error("Error updating invite status:", updateError);
      // Don't fail, the user was already added
    }

    console.log(`User ${user.id} successfully accepted invite to organization ${invite.organization_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Convite aceito com sucesso!",
        organizationId: invite.organization_id,
        organizationName: invite.organizations?.name,
        role: invite.role
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in accept-invite function:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
