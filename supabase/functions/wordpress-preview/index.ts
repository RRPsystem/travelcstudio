import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
    const websiteId = url.searchParams.get('website_id');
    const pageIndex = parseInt(url.searchParams.get('page') || '0');

    console.log('Preview request:', { websiteId, pageIndex });

    if (!websiteId) {
      throw new Error('website_id is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: website, error: websiteError } = await supabaseClient
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .single();

    if (websiteError) {
      console.error('Website error:', websiteError);
      throw websiteError;
    }

    console.log('Website found:', website.id);

    const pages = website.pages || [];
    const page = pages[pageIndex];

    if (!page || !page.html) {
      throw new Error(`Page not found at index ${pageIndex}`);
    }

    console.log('Serving HTML, length:', page.html.length);

    // Return the HTML directly without any CSP restrictions
    return new Response(page.html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error serving WordPress preview:', error);
    return new Response(
      `<html><body><h1>Error</h1><p>${error instanceof Error ? error.message : 'Unknown error'}</p></body></html>`,
      {
        status: 400,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    );
  }
});