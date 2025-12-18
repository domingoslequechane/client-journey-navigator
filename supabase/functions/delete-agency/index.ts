import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RequestSchema = z.object({
  organizationId: z.string().uuid("ID da organização inválido"),
  otpCode: z.string().length(6, "Código deve ter 6 dígitos"),
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    const validationResult = RequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { organizationId, otpCode } = validationResult.data;

    // Verify user is admin and owner of the organization
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin" || profile.organization_id !== organizationId) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem apagar a agência" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify organization ownership
    const { data: org } = await supabase
      .from("organizations")
      .select("owner_id, name")
      .eq("id", organizationId)
      .single();

    if (!org || org.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Apenas o proprietário pode apagar a agência" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from("email_otps")
      .select("*")
      .eq("email", user.email)
      .eq("otp_code", otpCode)
      .single();

    if (otpError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "Código inválido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from("email_otps").delete().eq("id", otpRecord.id);
      return new Response(
        JSON.stringify({ error: "Código expirado. Solicite um novo código." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Delete the OTP
    await supabase.from("email_otps").delete().eq("id", otpRecord.id);

    console.log(`Starting deletion of organization ${organizationId} (${org.name}) by user ${user.id}`);

    // Get all clients for this organization (to delete related data)
    const { data: clients } = await supabase
      .from("clients")
      .select("id")
      .eq("organization_id", organizationId);

    const clientIds = clients?.map(c => c.id) || [];

    // Delete in order to respect foreign key constraints
    
    // 1. Delete AI messages (via conversations)
    if (clientIds.length > 0) {
      const { data: conversations } = await supabase
        .from("ai_conversations")
        .select("id")
        .in("client_id", clientIds);
      
      const conversationIds = conversations?.map(c => c.id) || [];
      if (conversationIds.length > 0) {
        await supabase.from("ai_messages").delete().in("conversation_id", conversationIds);
      }
      
      // 2. Delete AI conversations
      await supabase.from("ai_conversations").delete().in("client_id", clientIds);
      
      // 3. Delete activities
      await supabase.from("activities").delete().in("client_id", clientIds);
      
      // 4. Delete checklist items
      await supabase.from("checklist_items").delete().in("client_id", clientIds);
    }

    // 5. Delete clients
    await supabase.from("clients").delete().eq("organization_id", organizationId);

    // 6. Delete checklist templates
    await supabase.from("checklist_templates").delete().eq("organization_id", organizationId);

    // 7. Delete contract templates
    await supabase.from("contract_templates").delete().eq("organization_id", organizationId);

    // 8. Delete study suggestions
    await supabase.from("study_suggestions").delete().eq("organization_id", organizationId);

    // 9. Delete support messages (via tickets)
    const { data: tickets } = await supabase
      .from("support_tickets")
      .select("id")
      .eq("organization_id", organizationId);
    
    const ticketIds = tickets?.map(t => t.id) || [];
    if (ticketIds.length > 0) {
      await supabase.from("support_messages").delete().in("ticket_id", ticketIds);
    }

    // 10. Delete support tickets
    await supabase.from("support_tickets").delete().eq("organization_id", organizationId);

    // 11. Delete feedbacks
    await supabase.from("feedbacks").delete().eq("organization_id", organizationId);

    // 12. Delete payment history
    await supabase.from("payment_history").delete().eq("organization_id", organizationId);

    // 13. Delete subscription
    await supabase.from("subscriptions").delete().eq("organization_id", organizationId);

    // 14. Get all user IDs in this organization for cleanup
    const { data: orgProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("organization_id", organizationId);
    
    const userIds = orgProfiles?.map(p => p.id) || [];

    // 15. Delete login history for these users
    if (userIds.length > 0) {
      await supabase.from("login_history").delete().in("user_id", userIds);
      
      // 16. Delete notification reads for these users
      await supabase.from("notification_reads").delete().in("user_id", userIds);
    }

    // 17. Update profiles to remove organization reference (except owner who will be deleted)
    await supabase
      .from("profiles")
      .update({ organization_id: null })
      .eq("organization_id", organizationId)
      .neq("id", user.id);

    // 18. Delete owner's profile
    await supabase.from("profiles").delete().eq("id", user.id);

    // 19. Delete the organization
    const { error: deleteOrgError } = await supabase
      .from("organizations")
      .delete()
      .eq("id", organizationId);

    if (deleteOrgError) {
      console.error("Error deleting organization:", deleteOrgError);
      return new Response(
        JSON.stringify({ error: "Erro ao apagar organização" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 20. Delete the user from auth (this will sign them out)
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteUserError) {
      console.error("Error deleting user:", deleteUserError);
      // Continue even if user deletion fails - org is already deleted
    }

    console.log(`Successfully deleted organization ${organizationId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in delete-agency:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
