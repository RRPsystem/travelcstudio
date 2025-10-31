import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getFallbackCSS(): string {
  return `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background: #ffffff; min-height: 100vh; overflow-x: hidden; display: flex; flex-direction: column; }
.wb-container, body > .wb-component:not(.wb-hero-page):not(.wb-media-row):not([class*="full-width"]) { max-width: 1200px; margin-left: auto; margin-right: auto; padding-left: 1rem; padding-right: 1rem; }
body > .wb-hero-page, body > .wb-component.wb-hero-page, .wb-hero-page.edge-to-edge { max-width: 100%; width: 100%; margin-left: 0; margin-right: 0; }
.wb-component { position: relative; display: block; clear: both; }
body > *:not(.wb-hero-page) { position: relative; display: block; width: 100%; }
h1, h2, h3, h4, h5, h6 { font-weight: 700; line-height: 1.2; margin-bottom: 1rem; color: #111827; }
h1 { font-size: 2.5rem; } h2 { font-size: 2rem; } h3 { font-size: 1.75rem; } h4 { font-size: 1.5rem; } h5 { font-size: 1.25rem; } h6 { font-size: 1rem; }
p { margin-bottom: 1rem; color: #4b5563; }
img { max-width: 100%; height: auto; display: block; }
a { color: #2563eb; text-decoration: none; transition: color 0.2s ease; }
a:hover { color: #1d4ed8; text-decoration: underline; }
button, .btn { padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 600; border-radius: 0.5rem; border: none; cursor: pointer; transition: all 0.2s ease; display: inline-block; }
button:hover, .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
section, .section { padding: 3rem 0; }
.wb-hero-page { position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; min-height: 500px; width: 100%; }
.wb-hero-page > * { position: absolute; }
.hp-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }
.hp-bg img { width: 100%; height: 100%; object-fit: cover; }
.hp-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, var(--overlay-opacity, 0.4)); z-index: 2; }
.hp-content, .hp-word { position: absolute; z-index: 3; font-weight: 900; text-transform: uppercase; pointer-events: none; user-select: none; letter-spacing: -0.02em; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
.wb-hero-page form, .wb-hero-page .hp-form, .wb-hero-page [class*="form"], .wb-hero-page [class*="search"] { position: absolute; z-index: 10; pointer-events: auto; }
.wb-hero-page input, .wb-hero-page button, .wb-hero-page select { pointer-events: auto; }
.wb-media-row { padding: 40px 0; }
.mr-track { display: grid; grid-auto-flow: column; gap: 1rem; overflow-x: auto; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.2) transparent; padding: 0 1rem; }
.mr-track::-webkit-scrollbar { height: 8px; }
.mr-track::-webkit-scrollbar-track { background: transparent; }
.mr-track::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.2); border-radius: 4px; }
.mr-track.shadow-on .mr-item { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
.mr-item { position: relative; overflow: hidden; border-radius: var(--mr-item-radius, 12px); height: var(--mr-item-height, 250px); scroll-snap-align: start; transition: transform 0.2s ease; }
.mr-item:hover { transform: scale(1.02); }
.mr-item img { width: 100%; height: 100%; object-fit: cover; }
@media (max-width: 768px) { h1 { font-size: 2rem; } h2 { font-size: 1.75rem; } h3 { font-size: 1.5rem; } .wb-container { padding-left: 1rem; padding-right: 1rem; } .mr-item { height: 200px; } }
  `;
}

function buildHTML(page: any, supabaseUrl: string, css: string): string {
  const contentJson = page.content_json || {};

  if (page.body_html && page.body_html.trim().toLowerCase().startsWith('<!doctype')) {
    console.log("[PREVIEW] Using complete body_html - fixing relative CSS URLs");
    let html = page.body_html;

    html = html.replace(
      /href="\/styles\/main\.css"/g,
      `href="${supabaseUrl}/storage/v1/object/public/assets/styles/main.css"`
    );
    html = html.replace(
      /href="\/styles\/components\.css"/g,
      `href="${supabaseUrl}/storage/v1/object/public/assets/styles/components.css"`
    );

    return html;
  }

  let bodyHTML = '';

  if (contentJson.htmlSnapshot) {
    bodyHTML = contentJson.htmlSnapshot;
    console.log("[PREVIEW] Using htmlSnapshot");
  } else if (page.body_html) {
    bodyHTML = page.body_html;
    console.log("[PREVIEW] Using body_html");
  } else if (contentJson.components && Array.isArray(contentJson.components)) {
    for (const comp of contentJson.components) {
      bodyHTML += comp.html || '';
    }
    console.log("[PREVIEW] Using components");
  } else if (contentJson.html) {
    bodyHTML = contentJson.html;
    console.log("[PREVIEW] Using content_json.html");
  } else if (contentJson.layout && contentJson.layout.html) {
    bodyHTML = contentJson.layout.html;
    console.log("[PREVIEW] Using layout.html");
  } else if (contentJson.pages && contentJson.pages[0] && contentJson.pages[0].html) {
    bodyHTML = contentJson.pages[0].html;
    console.log("[PREVIEW] Using pages[0].html");
  } else if (typeof contentJson === 'string') {
    bodyHTML = contentJson;
    console.log("[PREVIEW] Using content_json as string");
  }

  if (!bodyHTML) {
    bodyHTML = '<div style="padding: 2rem; text-align: center;"><h1>Geen content beschikbaar</h1><p>Deze pagina heeft nog geen inhoud.</p></div>';
    console.log("[PREVIEW] No content found, using fallback message");
  }

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title || 'Preview'}</title>

  <style>
${css}
  </style>

  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap">
</head>
<body>
  ${bodyHTML}
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const apikey = url.searchParams.get("apikey");
    const effectiveKey = apikey || supabaseServiceKey;

    const supabase = createClient(supabaseUrl, effectiveKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    const pageId = url.searchParams.get("id");
    const pageSlug = url.searchParams.get("slug");

    if (!pageId && !pageSlug) {
      return new Response(
        JSON.stringify({ error: "Missing id or slug parameter" }),
        { status: 400, headers: corsHeaders }
      );
    }

    let query = supabase.from("pages").select("*");

    if (pageId) {
      query = query.eq("id", pageId);
    } else if (pageSlug) {
      query = query.eq("slug", pageSlug);
    }

    const { data: page, error } = await query.maybeSingle();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch page", details: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!page) {
      return new Response(
        JSON.stringify({ error: "Page not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    console.log("[PREVIEW] Page found:", {
      id: page.id,
      title: page.title,
      has_body_html: !!page.body_html,
      has_content_json: !!page.content_json,
      content_json_keys: page.content_json ? Object.keys(page.content_json) : []
    });

    console.log("[PREVIEW] Loading CSS from Storage...");
    let css = '';
    try {
      const mainCSSUrl = `${supabaseUrl}/storage/v1/object/public/assets/styles/main.css`;
      const componentsCSSUrl = `${supabaseUrl}/storage/v1/object/public/assets/styles/components.css`;

      const [mainRes, compRes] = await Promise.all([
        fetch(mainCSSUrl),
        fetch(componentsCSSUrl)
      ]);

      if (mainRes.ok && compRes.ok) {
        const mainCSS = await mainRes.text();
        const compCSS = await compRes.text();
        css = mainCSS + '\n\n' + compCSS;
        console.log("[PREVIEW] CSS loaded successfully:", { mainSize: mainCSS.length, compSize: compCSS.length });
      } else {
        console.log("[PREVIEW] CSS not in storage, using fallback CSS");
        css = getFallbackCSS();
      }
    } catch (e) {
      console.log("[PREVIEW] CSS loading error, using fallback:", e);
      css = getFallbackCSS();
    }

    const html = buildHTML(page, supabaseUrl, css);

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error: any) {
    console.error("[PREVIEW] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
