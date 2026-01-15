import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

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
      throw new Error('Missing Authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { website_id, page_index, html, page_name } = await req.json();

    if (!website_id || page_index === undefined || !html) {
      throw new Error('website_id, page_index, and html are required');
    }

    const { data: website, error: fetchError } = await supabaseClient
      .from('websites')
      .select('*')
      .eq('id', website_id)
      .single();

    if (fetchError) throw fetchError;

    if (!website.pages || !Array.isArray(website.pages)) {
      throw new Error('Website has no pages array');
    }

    const updatedPages = [...website.pages];

    if (page_index >= updatedPages.length) {
      throw new Error('Invalid page_index');
    }

    updatedPages[page_index] = {
      ...updatedPages[page_index],
      html: html,
      modified: true,
      name: page_name || updatedPages[page_index].name
    };

    const { error: updateError } = await supabaseClient
      .from('websites')
      .update({
        pages: updatedPages,
        updated_at: new Date().toISOString()
      })
      .eq('id', website_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Page updated successfully',
        page_index: page_index
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error updating page:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
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