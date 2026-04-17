import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Veo image endpoints require bytesBase64Encoded


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const {
      project_id, organization_id, prompt,
      aspect_ratio = '16:9', resolution = '720p',
      duration_seconds = 8, model = 'veo-3.1-generate-preview',
      first_frame_base64, first_frame_mime,
      last_frame_base64, last_frame_mime,
    } = await req.json();

    if (!project_id || !organization_id || !prompt) {
      return new Response(JSON.stringify({ error: 'project_id, organization_id and prompt are required' }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Build Veo API request instance
    const instance: Record<string, unknown> = { prompt };
    if (first_frame_base64) {
      instance.image = { bytesBase64Encoded: first_frame_base64, mimeType: first_frame_mime || 'image/png' };
    }
    if (last_frame_base64 && first_frame_base64) {
      instance.lastFrame = { bytesBase64Encoded: last_frame_base64, mimeType: last_frame_mime || 'image/png' };
    }

    const parameters: Record<string, unknown> = {
      aspectRatio: aspect_ratio,
      resolution,
      durationSeconds: Number(duration_seconds),
    };

    const veoRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances: [instance], parameters }),
      }
    );

    if (!veoRes.ok) {
      const errText = await veoRes.text();
      console.error('Veo API error:', errText);
      throw new Error(`Veo API error: ${veoRes.status} - ${errText}`);
    }

    const operation = await veoRes.json();
    const operation_name = operation.name;

    // Save video record to DB with processing status
    const { data: video, error: dbErr } = await supabase
      .from('generated_videos')
      .insert({
        project_id,
        organization_id,
        created_by: user.id,
        prompt,
        aspect_ratio,
        resolution,
        duration_seconds,
        model,
        operation_name,
        status: 'processing',
      })
      .select()
      .single();

    if (dbErr) throw dbErr;

    return new Response(JSON.stringify({ video_id: video.id, operation_name, status: 'processing' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('generate-video error:', err);
    return new Response(JSON.stringify({ _error: true, message: err.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
