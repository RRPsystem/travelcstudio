import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Riverside-Signature',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    const eventType = payload.event_type || payload.type;

    console.log('[Riverside Webhook] Received event:', eventType);

    await supabase.from('riverside_webhook_logs').insert({
      event_type: eventType,
      recording_id: payload.recording?.id || payload.id,
      payload: payload,
      processed: false
    });

    if (eventType === 'recording.completed' || eventType === 'recording.published') {
      const recording = payload.recording || payload;
      const recordingId = recording.id;
      const downloadUrl = recording.download_url || recording.media_url;

      console.log('[Riverside Webhook] Processing recording:', recordingId);

      const { data: planning } = await supabase
        .from('podcast_episodes_planning')
        .select('*')
        .eq('riverside_recording_id', recordingId)
        .maybeSingle();

      if (planning) {
        console.log('[Riverside Webhook] Found planning for recording');

        const mediaPath = `riverside/${recordingId}/${Date.now()}.mp4`;

        let mediaUrl = downloadUrl;

        if (downloadUrl && downloadUrl.startsWith('http')) {
          try {
            const mediaResponse = await fetch(downloadUrl);
            const mediaBlob = await mediaResponse.blob();
            const mediaArrayBuffer = await mediaBlob.arrayBuffer();

            const { error: uploadError } = await supabase.storage
              .from('travel-journal')
              .upload(mediaPath, mediaArrayBuffer, {
                contentType: 'video/mp4',
                upsert: false
              });

            if (uploadError) {
              console.error('[Riverside Webhook] Upload error:', uploadError);
            } else {
              const { data: { publicUrl } } = supabase.storage
                .from('travel-journal')
                .getPublicUrl(mediaPath);
              mediaUrl = publicUrl;
              console.log('[Riverside Webhook] Media uploaded successfully');
            }
          } catch (uploadErr) {
            console.error('[Riverside Webhook] Failed to download/upload media:', uploadErr);
          }
        }

        const { data: episode, error: episodeError } = await supabase
          .from('travel_journal_episodes')
          .insert({
            title: planning.title,
            description: planning.description,
            media_url: mediaUrl,
            media_type: 'video',
            duration: recording.duration || 0,
            is_published: true,
            published_at: new Date().toISOString(),
            created_by: planning.created_by
          })
          .select()
          .single();

        if (episodeError) {
          console.error('[Riverside Webhook] Error creating episode:', episodeError);
          throw episodeError;
        }

        await supabase
          .from('podcast_episodes_planning')
          .update({
            episode_id: episode.id,
            status: 'published'
          })
          .eq('id', planning.id);

        await supabase
          .from('riverside_webhook_logs')
          .update({ processed: true })
          .eq('recording_id', recordingId)
          .eq('processed', false);

        console.log('[Riverside Webhook] Episode published successfully');

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Recording processed and episode published',
            episode_id: episode.id
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('[Riverside Webhook] No planning found for recording');

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Recording logged but no planning found',
            note: 'Create a planning entry with this riverside_recording_id to auto-publish'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Riverside Webhook] Error:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});