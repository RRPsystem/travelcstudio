import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_DOMAIN = 'ai-travelstudio.nl';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    const vercelProjectId = Deno.env.get('VERCEL_PROJECT_ID') || 'website-builder';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    if (!vercelToken) {
      throw new Error('VERCEL_TOKEN not configured');
    }

    const { brand_id, website_id } = await req.json();

    if (!brand_id) {
      return new Response(
        JSON.stringify({ error: 'Missing brand_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get brand details
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', brand_id)
      .single();

    if (brandError || !brand) {
      return new Response(
        JSON.stringify({ error: 'Brand not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if subdomain already exists for this brand
    const { data: existingSubdomain } = await supabase
      .from('brand_domains')
      .select('*')
      .eq('brand_id', brand_id)
      .eq('domain_type', 'subdomain')
      .eq('auto_generated', true)
      .maybeSingle();

    if (existingSubdomain) {
      return new Response(
        JSON.stringify({
          success: true,
          domain: existingSubdomain.domain,
          subdomain_prefix: existingSubdomain.subdomain_prefix,
          message: 'Subdomain already exists',
          already_exists: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate subdomain prefix from brand name
    const { data: prefixData, error: prefixError } = await supabase
      .rpc('generate_subdomain_prefix', { brand_name: brand.name });

    if (prefixError) {
      throw prefixError;
    }

    const subdomainPrefix = prefixData;
    const fullDomain = `${subdomainPrefix}.${BASE_DOMAIN}`;

    // Add domain to Vercel
    const vercelApiUrl = `https://api.vercel.com/v9/projects/${vercelProjectId}/domains`;
    
    const vercelResponse = await fetch(vercelApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: fullDomain,
      }),
    });

    if (!vercelResponse.ok && vercelResponse.status !== 409) {
      const errorData = await vercelResponse.json();
      console.error('Vercel API error:', errorData);
      throw new Error(`Failed to add domain to Vercel: ${JSON.stringify(errorData)}`);
    }

    // Insert into brand_domains table
    const { data: newDomain, error: insertError } = await supabase
      .from('brand_domains')
      .insert({
        brand_id: brand_id,
        website_id: website_id || null,
        domain: fullDomain,
        domain_type: 'subdomain',
        subdomain_prefix: subdomainPrefix,
        auto_generated: true,
        status: 'verified',
        dns_verified_at: new Date().toISOString(),
        ssl_enabled: true,
        is_primary: true,
        verification_token: crypto.randomUUID()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        domain: fullDomain,
        subdomain_prefix: subdomainPrefix,
        domain_id: newDomain.id,
        message: 'Subdomain successfully created and configured',
        url: `https://${fullDomain}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in create-auto-subdomain function:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});