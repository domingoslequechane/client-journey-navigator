import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("returns 401 without auth", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-social-caption`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
    body: JSON.stringify({ platforms: ["instagram"], content_type: "feed", tone: "direto", length: "media" }),
  });
  const body = await response.text();
  console.log("No auth status:", response.status, body);
  assertEquals(response.status, 401);
});

Deno.test("returns 401 with invalid token", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-social-caption`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer invalid-token"
    },
    body: JSON.stringify({ platforms: ["instagram"], content_type: "feed", tone: "direto", length: "media" }),
  });
  const body = await response.text();
  console.log("Invalid auth status:", response.status, body);
  assertEquals(response.status, 401);
});
