import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { video_id, operation_name } = await req.json();
    if (!video_id || !operation_name) {
      return new Response(JSON.stringify({ error: 'video_id and operation_name required' }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Check Gemini operation status
    const statusRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operation_name}`,
      { headers: { 'x-goog-api-key': GEMINI_API_KEY } }
    );

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      console.error('Gemini status check error:', errText);
      throw new Error(`Status check failed: ${statusRes.status}`);
    }

    const statusData = await statusRes.json();

    // Still processing
    if (!statusData.done) {
      return new Response(JSON.stringify({ status: 'processing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for errors in Gemini response
    if (statusData.error) {
      await supabase.from('generated_videos').update({
        status: 'failed',
        error_message: statusData.error.message || 'Gemini returned an error',
        completed_at: new Date().toISOString(),
      }).eq('id', video_id);

      return new Response(JSON.stringify({ status: 'failed', error: statusData.error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get video URI from response
    const samples = statusData.response?.generateVideoResponse?.generatedSamples;
    const videoUri = samples?.[0]?.video?.uri;

    if (!videoUri) {
      // Try alternative response path
      const altUri = statusData.response?.generatedVideos?.[0]?.video?.uri;
      if (!altUri) {
        await supabase.from('generated_videos').update({
          status: 'failed',
          error_message: 'No video URI in response',
          completed_at: new Date().toISOString(),
        }).eq('id', video_id);
        return new Response(JSON.stringify({ status: 'failed', error: 'No video URI in response' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const finalUri = videoUri || statusData.response?.generatedVideos?.[0]?.video?.uri;

    // Download the video from Gemini
    const videoRes = await fetch(finalUri, {
      headers: { 'x-goog-api-key': GEMINI_API_KEY },
    });

    if (!videoRes.ok) {
      throw new Error(`Failed to download video: ${videoRes.status}`);
    }

    const videoBytes = await videoRes.arrayBuffer();

    // Get organization_id for storage path
    const { data: videoRecord } = await supabase
      .from('generated_videos')
      .select('organization_id')
      .eq('id', video_id)
      .single();

    const orgId = videoRecord?.organization_id || 'unknown';
    const storagePath = `${orgId}/${video_id}.mp4`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(storagePath, new Uint8Array(videoBytes), {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(storagePath);
    const video_url = publicUrlData.publicUrl;

    // Update DB record
    await supabase.from('generated_videos').update({
      status: 'completed',
      video_url,
      storage_path: storagePath,
      completed_at: new Date().toISOString(),
    }).eq('id', video_id);

    return new Response(JSON.stringify({ status: 'completed', video_url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('check-video-status error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
