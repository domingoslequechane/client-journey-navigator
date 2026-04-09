// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      throw new Error("Missing url parameter");
    }

    console.log("Scraping URL:", url);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch URL. Status: ${response.status}`);
    }

    const html = await response.text();

    const getMetaProperty = (docHtml: string, property: string) => {
      const regex = new RegExp(`<meta\\s+property=["']${property}["']\\s+content=["']([^"']+)["']`, 'i');
      const match = docHtml.match(regex);
      return match ? match[1] : null;
    };
    
    const getMetaName = (docHtml: string, name: string) => {
      const regex = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']+)["']`, 'i');
      const match = docHtml.match(regex);
      return match ? match[1] : null;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = titleMatch ? titleMatch[1] : getMetaProperty(html, "og:title") || "";
    title = title.replace(/\n\s+/g, " ").trim();

    const description = getMetaProperty(html, "og:description") || getMetaName(html, "description") || "";
    const ogImage = getMetaProperty(html, "og:image");

    const imgRegex = /<img[^>]+src=["']([^"']+(?:png|jpg|jpeg|webp))["']/gi;
    let match;
    const imagesSet = new Set<string>();
    
    if (ogImage) {
        imagesSet.add(ogImage.startsWith('http') ? ogImage : new URL(ogImage, url).href);
    }
    
    while ((match = imgRegex.exec(html)) !== null) {
      let src = match[1];
      if (!src.startsWith("data:")) {
        try {
            src = new URL(src, url).href;
            if (src.startsWith("http")) imagesSet.add(src);
        } catch(e) {}
      }
    }
    
    const images = Array.from(imagesSet).slice(0, 15);

    let textContent = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    textContent = textContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
    textContent = textContent.replace(/<[^>]+>/g, " ");
    textContent = textContent.replace(/\s{2,}/g, " ").trim();
    const content = textContent.substring(0, 10000);

    const result = { title, description, content, images, ogImage };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Scraping error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
