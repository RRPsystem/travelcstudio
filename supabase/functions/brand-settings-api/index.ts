import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface BrandSettingsPayload {
  brand_id: string;
  logo_url?: string;
  font_family?: string;
  color_palette?: string;
  color_primary?: string;
  color_secondary?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const method = req.method;

    if (method === 'GET') {
      const brandId = url.searchParams.get('brand_id');

      if (!brandId) {
        return new Response(
          JSON.stringify({ error: 'brand_id query parameter is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data, error } = await supabase
        .from('brand_settings')
        .select('*')
        .eq('brand_id', brandId)
        .maybeSingle();

      if (error) throw error;

      return new Response(JSON.stringify(data || {}), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST' || method === 'PUT') {
      const body: BrandSettingsPayload = await req.json();

      let brandId = body.brand_id;

      if (!brandId) {
        brandId = url.searchParams.get('brand_id') || '';
      }

      if (!brandId) {
        return new Response(
          JSON.stringify({
            error: 'brand_id is required (in body or query parameter)',
            received: body
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: existingSettings } = await supabase
        .from('brand_settings')
        .select('id')
        .eq('brand_id', brandId)
        .maybeSingle();

      const settingsData = {
        brand_id: brandId,
        logo_url: body.logo_url,
        font_family: body.font_family,
        color_palette: body.color_palette,
        color_primary: body.color_primary,
        color_secondary: body.color_secondary,
        updated_at: new Date().toISOString(),
      };

      if (existingSettings) {
        const { data, error } = await supabase
          .from('brand_settings')
          .update(settingsData)
          .eq('brand_id', brandId)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        const { data, error } = await supabase
          .from('brand_settings')
          .insert([settingsData])
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in brand-settings-api:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
