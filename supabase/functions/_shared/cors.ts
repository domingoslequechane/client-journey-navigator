const ALLOWED_ORIGINS = [
  "https://qualify.marketing",
  "https://qualify.onixagence.com",
];

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";

  // Permite origens oficiais ou subdomínios de preview comuns
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".lovable.app") ||
    origin.endsWith(".gpt-engineer.ai") ||
    origin.endsWith(".onixagence.com") ||
    origin.startsWith("http://localhost");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS, DELETE",
  };
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}