import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { template_id } = await req.json();

    if (!template_id) {
      throw new Error('template_id is required');
    }

    const { data: template, error: templateError } = await supabaseClient
      .from('wordpress_templates')
      .select('*, wordpress_sources!inner(*)')
      .eq('id', template_id)
      .single();

    if (templateError) throw templateError;

    const wordpressUrl = template.wordpress_sources.url;
    const wpPageId = template.wp_page_id;
    const apiKey = template.wordpress_sources.api_key;

    const wpUrl = `${wordpressUrl}/wp-json/wp/v2/pages/${wpPageId}`;
    const headers: any = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const wpResponse = await fetch(wpUrl, { headers });

    if (!wpResponse.ok) {
      throw new Error(`WordPress API error: ${wpResponse.status}`);
    }

    const wpData = await wpResponse.json();

    // Fetch the actual page to get stylesheets and scripts
    const pageResponse = await fetch(wpData.link);
    const pageHtml = await pageResponse.text();

    // Extract stylesheets from the page
    const styleRegex = /<link[^>]*rel=["']stylesheet["'][^>]*>/gi;
    const stylesheets = pageHtml.match(styleRegex) || [];

    // Extract inline styles
    const inlineStyleRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
    const inlineStyles = pageHtml.match(inlineStyleRegex) || [];

    // Build a complete HTML document
    const completeHtml = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="${wordpressUrl}/">
  ${stylesheets.join('\n  ')}
  ${inlineStyles.join('\n  ')}
</head>
<body>
  ${wpData.content.rendered}
</body>
</html>
    `.trim();

    const { error: updateError } = await supabaseClient
      .from('wordpress_templates')
      .update({
        cached_html: completeHtml,
        cache_updated_at: new Date().toISOString(),
        preview_image_url: wpData.featured_media_url || template.preview_image_url
      })
      .eq('id', template_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        template: {
          id: wpData.id,
          title: wpData.title.rendered,
          content: completeHtml,
          excerpt: wpData.excerpt?.rendered,
          featured_media_url: wpData.featured_media_url,
          link: wpData.link
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching WordPress template:', error);
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