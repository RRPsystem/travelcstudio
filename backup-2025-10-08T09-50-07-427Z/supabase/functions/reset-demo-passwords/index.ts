import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const updates = [
      { id: 'f24acef5-a7dd-4f4b-8c8c-43f223d62a10', email: 'admin@travel.com', password: 'admin123' },
      { id: 'a2cbb78c-0e98-478a-89f4-58dc8debf057', email: 'brand@travel.com', password: 'brand123' },
      { id: '48568dec-bb42-40ed-8daa-989c25a68883', email: 'operator@travel.com', password: 'operator123' }
    ];

    const results = [];

    for (const update of updates) {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        update.id,
        { password: update.password }
      );

      if (error) {
        results.push({ email: update.email, success: false, error: error.message });
      } else {
        results.push({ email: update.email, success: true });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});