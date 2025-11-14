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

    const demoUsers = [
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        email: 'admin@travel.com',
        password: 'admin123',
        role: 'admin',
        brand_id: null
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440011',
        email: 'brand@travel.com',
        password: 'brand123',
        role: 'brand',
        brand_id: '550e8400-e29b-41d4-a716-446655440001'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440012',
        email: 'operator@travel.com',
        password: 'operator123',
        role: 'operator',
        brand_id: null
      }
    ];

    const results = [];

    for (const user of demoUsers) {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === user.email);

      if (existingUser) {
        await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
        await supabaseAdmin.from('users').delete().eq('id', existingUser.id);
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          role: user.role
        }
      });

      if (authError) {
        results.push({ email: user.email, success: false, error: authError.message });
        continue;
      }

      const { error: upsertError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: authData.user.id,
          email: user.email,
          role: user.role,
          brand_id: user.brand_id
        });

      if (upsertError) {
        results.push({ email: user.email, success: false, error: upsertError.message });
      } else {
        results.push({ email: user.email, success: true, id: authData.user.id });
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