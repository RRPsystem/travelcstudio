import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { source_id } = await req.json();

    if (!source_id) {
      throw new Error('source_id is required');
    }

    const { data: source, error: sourceError } = await supabaseClient
      .from('wordpress_sources')
      .select('*')
      .eq('id', source_id)
      .single();

    if (sourceError) throw sourceError;

    const wpUrl = `${source.url}/wp-json/wp/v2/pages?per_page=100&categories=templates`;
    const headers: any = {
      'Content-Type': 'application/json'
    };

    if (source.api_key) {
      headers['Authorization'] = `Bearer ${source.api_key}`;
    }

    const wpResponse = await fetch(wpUrl, { headers });

    if (!wpResponse.ok) {
      throw new Error(`WordPress API error: ${wpResponse.status}`);
    }

    const wpPages = await wpResponse.json();
    let syncedCount = 0;

    for (const page of wpPages) {
      const { error: upsertError } = await supabaseClient
        .from('wordpress_templates')
        .upsert({
          wordpress_source_id: source_id,
          wp_page_id: page.id.toString(),
          name: page.title.rendered,
          description: page.excerpt?.rendered?.replace(/<[^>]*>/g, '').trim() || null,
          preview_image_url: page.featured_media_url || null,
          cached_html: page.content.rendered,
          cache_updated_at: new Date().toISOString(),
          category: 'general',
          is_active: true
        }, {
          onConflict: 'wordpress_source_id,wp_page_id'
        });

      if (!upsertError) {
        syncedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        total: wpPages.length
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error syncing WordPress templates:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});