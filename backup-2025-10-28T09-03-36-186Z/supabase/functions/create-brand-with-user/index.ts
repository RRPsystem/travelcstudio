import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: userData, error: dbError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (dbError || !userData || userData.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const body = await req.json();
    const {
      email,
      password,
      brandData
    } = body;

    if (!email || !password || !brandData) {
      throw new Error('Missing required fields: email, password, brandData');
    }

    const { name, slug, company_id } = brandData;
    if (!name || !slug || !company_id) {
      throw new Error('Missing required brand fields: name, slug, company_id');
    }

    const { data: brandResult, error: brandError } = await supabaseAdmin
      .from('brands')
      .insert({
        company_id,
        name,
        slug,
        description: brandData.description || '',
        business_type: brandData.business_type || 'custom_travel_agency',
        primary_color: brandData.primary_color || '#3B82F6',
        secondary_color: brandData.secondary_color || '#6B7280',
        contact_person: brandData.contact_person || '',
        contact_email: brandData.contact_email || email,
        contact_phone: brandData.contact_phone || '',
        street_address: brandData.street_address || '',
        city: brandData.city || '',
        postal_code: brandData.postal_code || '',
        country: brandData.country || 'Netherlands',
        website_url: brandData.website_url || '',
        logo_url: brandData.logo_url || ''
      })
      .select('id')
      .single();

    if (brandError) {
      throw new Error(`Failed to create brand: ${brandError.message}`);
    }

    const brandId = brandResult.id;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'brand'
      }
    });

    if (authError) {
      await supabaseAdmin.from('brands').delete().eq('id', brandId);
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    console.log('Inserting user into public.users table:', {
      id: authData.user.id,
      email,
      role: 'brand',
      brand_id: brandId
    });

    const { error: userInsertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        role: 'brand',
        brand_id: brandId
      });

    if (userInsertError) {
      console.error('Failed to insert user into public.users:', userInsertError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('brands').delete().eq('id', brandId);
      throw new Error(`Failed to create user record: ${userInsertError.message}`);
    }

    console.log('Successfully created user in public.users table');

    return new Response(
      JSON.stringify({
        success: true,
        brand_id: brandId,
        user_id: authData.user.id,
        email,
        message: 'Brand and user created successfully'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error creating brand with user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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