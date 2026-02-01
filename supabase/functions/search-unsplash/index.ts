import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Accept',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const { query, apiKey: providedApiKey, perPage = 30 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from database if not provided (using service role)
    let apiKey = providedApiKey;
    if (!apiKey) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: settings } = await supabase
        .from('api_settings')
        .select('api_key')
        .eq('provider', 'Unsplash')
        .eq('is_active', true)
        .maybeSingle();

      apiKey = settings?.api_key;
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unsplash API key not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&client_id=${apiKey}`
    );

    if (response.ok) {
      const data = await response.json();
      const images = data.results.map((photo: any) => ({
        url: photo.urls.regular,
        thumb: photo.urls.thumb,
        alt: photo.alt_description || photo.description || 'Unsplash photo',
        photographer: photo.user?.name || 'Unknown',
        photographerUrl: photo.user?.links?.html || ''
      }));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          images,
          total: data.total,
          totalPages: data.total_pages
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const errorData = await response.json();
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorData.errors?.[0] || 'Unsplash API error'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error searching Unsplash:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
