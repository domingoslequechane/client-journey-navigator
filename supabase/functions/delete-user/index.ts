import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const DeleteUserSchema = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
});

const handler = async (req: Request): Promise<Response> => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verifica se o utilizador que faz o pedido tem a role 'proprietor'
    const { data: hasProprietorRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", requestingUser.id)
      .eq("role", "proprietor")
      .maybeSingle();

    if (!hasProprietorRole) {
      return new Response(
        JSON.stringify({ error: "Apenas o proprietário pode remover usuários" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    const validationResult = DeleteUserSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos", details: validationResult.error.errors.map(e => e.message) }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { userId } = validationResult.data;

    if (userId === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: "Você não pode remover sua própria conta" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Obtém o perfil do requerente para saber a sua organização
    const { data: requesterProfile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id")
      .eq("id", requestingUser.id)
      .single();

    // Obtém o perfil do utilizador a eliminar
    const { data: userToDelete, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, organization_id")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError || !userToDelete) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // VERIFICAÇÃO CRÍTICA DE SEGURANÇA: Garante que o utilizador alvo pertence à mesma organização
    if (userToDelete.organization_id !== requesterProfile?.organization_id) {
      console.error(`ALERTA DE SEGURANÇA: Utilizador ${requestingUser.id} tentou eliminar utilizador ${userId} de uma organização diferente.`);
      return new Response(
        JSON.stringify({ error: "Você não tem permissão para remover este usuário" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Utilizador ${userId} eliminado pelo proprietário ${requestingUser.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Usuário removido com sucesso", 
        deletedUser: { 
          full_name: userToDelete.full_name, 
          email: userToDelete.email 
        } 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Erro na função delete-user:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);