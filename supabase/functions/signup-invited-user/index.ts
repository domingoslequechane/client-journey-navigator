import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SignupInviteSchema = z.object({
  inviteToken: z.string().uuid("Token de convite inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
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

    const body = await req.json();

    const validationResult = SignupInviteSchema.safeParse(body);
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

    const { inviteToken, password } = validationResult.data;

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("organization_invites")
      .select("*, organizations(name)")
      .eq("invite_token", inviteToken)
      .single();

    if (inviteError || !invite) {
      console.error("Invite not found:", inviteError?.message);
      return new Response(
        JSON.stringify({ error: "Convite não encontrado ou inválido" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invite.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Este convite já foi ${invite.status === 'accepted' ? 'aceito' : invite.status === 'cancelled' ? 'cancelado' : 'expirado'}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      await supabaseAdmin.from("organization_invites").update({ status: "expired" }).eq("id", invite.id);
      return new Response(
        JSON.stringify({ error: "Este convite expirou." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: invite.full_name,
        role: "user",
      }
    });

    if (authError) {
      console.error("Error creating user from invite:", authError);
      return new Response(
        JSON.stringify({ error: authError.message || "Erro ao criar conta no banco de dados." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    const { error: memberError } = await supabaseAdmin
      .from("organization_members")
      .upsert({
        user_id: userId,
        organization_id: invite.organization_id,
        role: invite.role,
        privileges: invite.privileges,
        is_active: true,
      }, {
        onConflict: 'organization_id,user_id'
      });

    if (memberError) {
      console.error("Error adding to members:", memberError);
      return new Response(
        JSON.stringify({ error: "Erro ao adicionar à organização" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabaseAdmin
      .from("organization_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    await supabaseAdmin
      .from("profiles")
      .update({ current_organization_id: invite.organization_id })
      .eq("id", userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Conta criada e convite aceito com sucesso",
        email: invite.email,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in signup-invited-user function:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
