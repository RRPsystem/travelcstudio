import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');

    // Redirect to the app with a success message
    const appUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/\/[^.]+\./, '//');
    const redirectUrl = `${appUrl}?payment=success&user_id=${userId}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });
  } catch (error) {
    console.error('Error in redirect:', error);

    const appUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/\/[^.]+\./, '//');
    const redirectUrl = `${appUrl}?payment=error`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });
  }
});
