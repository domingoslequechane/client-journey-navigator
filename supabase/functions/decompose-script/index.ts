import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const {
      script,
      aspect_ratio = '16:9',
      duration_per_scene = 8,
      style = '',
    } = await req.json();

    if (!script?.trim()) {
      return new Response(JSON.stringify({ error: 'Script is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const wordCount = script.trim().split(/\s+/).length;
    // 3–5 scenes based on length (capped at 5 to respect Veo quota limits)
    const suggestedScenes = Math.min(5, Math.max(3, Math.ceil(wordCount / 80)));

    const systemPrompt = `You are a world-class film director. Decompose the following script/story into exactly ${suggestedScenes} cinematic scene prompts for Veo 3.1 AI video generator.

Video specs:
- Aspect ratio: ${aspect_ratio}
- Duration per scene: ${duration_per_scene} seconds
- Visual style: ${style || 'cinematic, professional, photorealistic'}

Rules for each scene prompt:
1. Write prompts in English (translate if needed)
2. Be extremely specific and visual: camera angle, movement, lighting, mood, action
3. Include camera motion: "slow pan", "aerial shot", "close-up", "tracking shot", "dolly zoom", etc.
4. Each prompt: 2-4 rich detailed sentences
5. CRITICAL ACTOR CONSISTENCY: Do NOT just use character names. You MUST include a strict, identical physical description and clothing description for the main characters in EVERY SINGLE SCENE to prevent the AI from generating different actors. (e.g. "A 30-year-old Asian man with short messy hair, wearing a grey hoodie and glasses...")
6. CRITICAL CONTINUITY: Ensure the background and setting descriptions are highly consistent across sequential scenes.
7. Scenes must flow logically and tell the story in sequence
8. Optimize specifically for ${duration_per_scene}s video clips

Return ONLY a valid JSON array, no markdown fences, no extra text:
[
  {
    "scene_number": 1,
    "title": "Short title in Portuguese",
    "prompt": "Detailed English cinematic prompt optimized for Veo 3.1",
    "duration_seconds": ${duration_per_scene}
  }
]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `SCRIPT:\n\n${script}\n\n${systemPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            responseMimeType: 'application/json',
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error('Empty response from Gemini');

    let scenes;
    try {
      scenes = JSON.parse(text);
    } catch {
      const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        scenes = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse scenes JSON from AI response');
      }
    }

    return new Response(JSON.stringify({ scenes }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error('decompose-script error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
