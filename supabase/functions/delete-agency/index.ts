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
      .select("owner_id, name, deleted_at")
      .eq("id", organizationId)
      .single();

    if (!org || org.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Apenas o proprietário pode apagar a agência" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already scheduled for deletion
    if (org.deleted_at) {
      return new Response(
        JSON.stringify({ error: "Esta agência já está agendada para exclusão" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
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

    console.log(`Scheduling soft deletion of organization ${organizationId} (${org.name}) by user ${user.id}`);

    // Calculate deletion date (30 days from now)
    const deleteScheduledFor = new Date();
    deleteScheduledFor.setDate(deleteScheduledFor.getDate() + 30);

    // SOFT DELETE: Mark organization as deleted instead of actually deleting
    const { error: softDeleteError } = await supabase
      .from("organizations")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        delete_scheduled_for: deleteScheduledFor.toISOString(),
      })
      .eq("id", organizationId);

    if (softDeleteError) {
      console.error("Error scheduling organization deletion:", softDeleteError);
      return new Response(
        JSON.stringify({ error: "Erro ao agendar exclusão da organização" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Successfully scheduled soft deletion of organization ${organizationId}. Permanent deletion on: ${deleteScheduledFor.toISOString()}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Agência agendada para exclusão. Você tem 30 dias para restaurar.",
        delete_scheduled_for: deleteScheduledFor.toISOString()
      }),
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
