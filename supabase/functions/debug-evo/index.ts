import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const EVOLUTION_URL = Deno.env.get("EVOLUTION_GO_URL")?.replace(/\/$/, "") || "http://localhost:8080";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY") || "";

serve(async (req) => {
  try {
    const listRes = await fetch(`${EVOLUTION_URL}/instance/all`, {
      headers: { "apikey": EVOLUTION_API_KEY }
    });
    const listData = await listRes.json();
    return new Response(JSON.stringify({ 
      ok: listRes.ok, 
      status: listRes.status,
      data: listData 
    }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
