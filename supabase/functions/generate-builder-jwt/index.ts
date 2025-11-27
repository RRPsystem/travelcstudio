import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { SignJWT } from 'npm:jose@5';

async function signJWT(payload: any): Promise<string> {
  const jwtSecret = Deno.env.get("JWT_SECRET");
  if (!jwtSecret) {
    throw new Error("JWT_SECRET not configured");
  }

  console.log("[JWT] Secret available:", { length: jwtSecret.length, first10: jwtSecret.substring(0, 10) });

  const encoder = new TextEncoder();
  const secretKey = encoder.encode(jwtSecret);

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secretKey);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const requestBody = await req.json();
    console.log('[JWT] Request body received:', JSON.stringify(requestBody, null, 2));
    const requestedScopes = requestBody.scopes || ['pages:read', 'pages:write', 'layouts:read', 'layouts:write', 'menus:read', 'menus:write', 'content:read', 'content:write'];

    const { data: userData, error: dbError } = await supabaseClient
      .from('users')
      .select('brand_id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (dbError || !userData) {
      console.error('[JWT] User data error:', dbError);
      throw new Error('User data not found');
    }

    let brandId = userData.brand_id;
    console.log('[JWT] Initial brand ID from user:', { user_brand_id: userData.brand_id, user_role: userData.role });

    if (requestBody.brand_id && requestBody.forceBrandId) {
      console.log('[JWT] Force brand ID requested:', { requested: requestBody.brand_id, forceBrandId: requestBody.forceBrandId });
      brandId = requestBody.brand_id;
      console.log('[JWT] Brand ID forced to:', brandId);
    } else {
      console.log('[JWT] NO force brand ID:', { has_brand_id: !!requestBody.brand_id, has_forceBrandId: !!requestBody.forceBrandId });
    }

    if (!brandId) {
      throw new Error('User has no brand assigned');
    }

    console.log('[JWT] Final brand ID:', { brandId, user_role: userData.role, forced: !!requestBody.forceBrandId });

    const payload: any = {
      brand_id: brandId,
      sub: user.id,
      scope: requestedScopes,
    };

    if (requestBody.content_type) {
      payload.content_type = requestBody.content_type;
      console.log('[JWT] Including content_type in payload:', requestBody.content_type);
    }

    if (requestBody.mode) {
      payload.mode = requestBody.mode;
      console.log('[JWT] Including mode in payload:', requestBody.mode);

      if (requestBody.mode === 'create-template' || requestBody.mode === 'edit-template') {
        payload.is_template = true;
        console.log('[JWT] Setting is_template=true for template mode');
      }
    }

    if (requestBody.author_type) {
      payload.author_type = requestBody.author_type;
      console.log('[JWT] Including author_type in payload:', requestBody.author_type);
    }

    if (requestBody.author_id) {
      payload.author_id = requestBody.author_id;
      console.log('[JWT] Including author_id in payload:', requestBody.author_id);
    }

    const jwt = await signJWT(payload);
    console.log("[JWT] Token generated:", { length: jwt.length, first30: jwt.substring(0, 30), scopes: requestedScopes });

    const apiUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1`;
    const apiKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const responseData: any = {
      token: jwt,
      brand_id: brandId,
      api_url: apiUrl,
      api_key: apiKey
    };

    if (requestBody.return_url) {
      responseData.return_url = requestBody.return_url;
      console.log('[JWT] Including return_url in response:', requestBody.return_url);
    }

    if (requestBody.page_id || requestBody.template_id || requestBody.menu_id || requestBody.footer_id) {
      const builderBaseUrl = 'https://www.ai-websitestudio.nl';
      const params = new URLSearchParams({
        api: apiUrl,
        brand_id: brandId,
        token: jwt,
        apikey: apiKey
      });

      if (requestBody.page_id) params.append('page_id', requestBody.page_id);
      if (requestBody.template_id) params.append('template_id', requestBody.template_id);
      if (requestBody.menu_id) params.append('menu_id', requestBody.menu_id);
      if (requestBody.footer_id) params.append('footer_id', requestBody.footer_id);
      if (requestBody.return_url) params.append('return_url', requestBody.return_url);

      responseData.url = `${builderBaseUrl}/?${params.toString()}`;
      console.log('[JWT] Generated deeplink URL');
    }

    return new Response(
      JSON.stringify(responseData),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error generating JWT:', error);
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