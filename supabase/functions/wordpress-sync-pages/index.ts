import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: userData } = await supabase
      .from('users')
      .select('brand_id')
      .eq('id', user.id)
      .single();

    if (!userData?.brand_id) {
      return new Response(
        JSON.stringify({ error: 'No brand associated with user' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: brand } = await supabase
      .from('brands')
      .select('wordpress_url, wordpress_username, wordpress_app_password')
      .eq('id', userData.brand_id)
      .single();

    if (!brand?.wordpress_url) {
      return new Response(
        JSON.stringify({ error: 'WordPress not configured for this brand' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const wpUrl = brand.wordpress_url.replace(/\/$/, '');
    const wpApiUrl = `${wpUrl}/wp-json/wp/v2/pages?per_page=100&_fields=id,title,slug,link,status`;

    const authString = brand.wordpress_username && brand.wordpress_app_password
      ? btoa(`${brand.wordpress_username}:${brand.wordpress_app_password}`)
      : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authString) {
      headers['Authorization'] = `Basic ${authString}`;
    }

    const wpResponse = await fetch(wpApiUrl, { headers });

    if (!wpResponse.ok) {
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch WordPress pages',
          status: wpResponse.status,
          message: await wpResponse.text(),
        }),
        {
          status: wpResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const wpPages = await wpResponse.json();

    const pagesToInsert = wpPages.map((page: any) => ({
      brand_id: userData.brand_id,
      wordpress_page_id: page.id,
      title: page.title.rendered || page.title,
      slug: page.slug,
      page_url: page.link,
      edit_url: `${wpUrl}/wp-admin/post.php?post=${page.id}&action=elementor`,
      status: page.status,
      last_synced_at: new Date().toISOString(),
    }));

    await supabase
      .from('wordpress_pages_cache')
      .delete()
      .eq('brand_id', userData.brand_id);

    const { error: insertError } = await supabase
      .from('wordpress_pages_cache')
      .insert(pagesToInsert);

    if (insertError) {
      console.error('Error inserting pages:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to cache pages', details: insertError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        pages_synced: pagesToInsert.length,
        pages: pagesToInsert,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});