import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Fetching Google Search settings from database...');
    
    const { data: apiSettings, error: dbError } = await supabase
      .from('api_settings')
      .select('google_search_api_key, google_search_engine_id, provider, service_name')
      .eq('provider', 'system')
      .eq('service_name', 'Twilio WhatsApp')
      .maybeSingle();

    console.log('📊 Database query result:', {
      found: !!apiSettings,
      hasSearchKey: !!apiSettings?.google_search_api_key,
      hasCseId: !!apiSettings?.google_search_engine_id,
      error: dbError
    });

    if (dbError || !apiSettings) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Settings not found in database',
          details: dbError
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { google_search_api_key, google_search_engine_id } = apiSettings;

    if (!google_search_api_key || !google_search_engine_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Google Search credentials not configured',
          hasApiKey: !!google_search_api_key,
          hasCseId: !!google_search_engine_id
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔑 API Key info:', {
      keyLength: google_search_api_key.length,
      keyPrefix: google_search_api_key.substring(0, 10) + '...',
      cseId: google_search_engine_id,
      cseIdLength: google_search_engine_id.length
    });

    const testQuery = 'best beaches Cape Verde';
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${google_search_api_key}&cx=${google_search_engine_id}&q=${encodeURIComponent(testQuery)}&num=3`;
    
    console.log('🌐 Making request to:', searchUrl.replace(google_search_api_key, 'API_KEY_HIDDEN'));
    
    const searchResponse = await fetch(searchUrl);
    console.log('📡 Response status:', searchResponse.status);
    
    const responseText = await searchResponse.text();
    console.log('📝 Response body (first 500 chars):', responseText.substring(0, 500));
    
    let searchData;
    try {
      searchData = JSON.parse(responseText);
    } catch (e) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to parse response',
          responseText: responseText.substring(0, 1000)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!searchResponse.ok) {
      console.error('❌ Search failed:', searchData);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Google Search API error',
          status: searchResponse.status,
          details: searchData.error
        }),
        { status: searchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Search successful!', {
      itemsFound: searchData.items?.length || 0
    });

    return new Response(
      JSON.stringify({
        success: true,
        query: testQuery,
        resultsCount: searchData.items?.length || 0,
        results: searchData.items?.map((item: any) => ({
          title: item.title,
          snippet: item.snippet,
          link: item.link
        })) || [],
        searchInformation: searchData.searchInformation
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Exception:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});