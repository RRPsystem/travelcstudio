import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const timestamp = Date.now();
    const brandEmail = `tester-brand-${timestamp}@test.com`;
    const agentEmail = `tester-agent-${timestamp}@test.com`;
    const password = 'test123';

    const { data: brandUser, error: brandError } = await supabaseAdmin.auth.admin.createUser({
      email: brandEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'brand'
      }
    });

    if (brandError) throw brandError;

    const { data: agentUser, error: agentError } = await supabaseAdmin.auth.admin.createUser({
      email: agentEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'agent'
      }
    });

    if (agentError) throw agentError;

    await supabaseAdmin
      .from('users')
      .insert([
        {
          id: brandUser.user.id,
          email: brandEmail,
          role: 'brand',
          brand_id: '00000000-0000-0000-0000-000000000000'
        },
        {
          id: agentUser.user.id,
          email: agentEmail,
          role: 'agent',
          brand_id: '00000000-0000-0000-0000-000000000000'
        }
      ]);

    return new Response(
      JSON.stringify({
        success: true,
        brand: { email: brandEmail, id: brandUser.user.id },
        agent: { email: agentEmail, id: agentUser.user.id }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating demo testers:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
