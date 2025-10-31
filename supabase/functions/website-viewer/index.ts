import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const host = req.headers.get("host") || url.host;
    const pathname = url.pathname;
    
    console.log("[VIEWER] Request:", { host, pathname });

    let brandId: string | null = null;
    let isCustomDomain = false;

    if (!host.includes("supabase.co") && !host.includes("localhost")) {
      const domainParts = host.split(".");
      
      if (host.includes("ai-travelstudio.nl")) {
        const subdomain = domainParts[0];
        if (subdomain.startsWith("brand-")) {
          brandId = subdomain.replace("brand-", "");
        }
      } else {
        const { data: domainData } = await supabase
          .from("brand_domains")
          .select("brand_id, status, website_id")
          .eq("domain", host)
          .eq("status", "verified")
          .maybeSingle();

        if (domainData) {
          brandId = domainData.brand_id;
          isCustomDomain = true;

          if (domainData.website_id) {
            return await renderWebsite(supabase, domainData.website_id, pathname);
          }
        }
      }
    }

    if (!brandId) {
      brandId = url.searchParams.get("brand_id");
    }

    if (!brandId) {
      return new Response(
        renderErrorPage("Brand niet gevonden", "Deze URL is niet gekoppeld aan een brand."),
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    console.log("[VIEWER] Brand ID:", brandId, "Custom domain:", isCustomDomain);

    let slug = pathname === "/" || pathname === "" ? "home" : pathname.substring(1);
    
    if (slug.endsWith("/")) {
      slug = slug.substring(0, slug.length - 1);
    }

    console.log("[VIEWER] Looking for slug:", slug);

    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("*")
      .eq("brand_id", brandId)
      .eq("slug", slug)
      .eq("status", "published")
      .or("content_type.eq.page,content_type.is.null")
      .maybeSingle();

    if (!page && slug === "home") {
      const { data: indexPage } = await supabase
        .from("pages")
        .select("*")
        .eq("brand_id", brandId)
        .eq("slug", "index")
        .eq("status", "published")
        .or("content_type.eq.page,content_type.is.null")
        .maybeSingle();
      
      if (indexPage) {
        return new Response(renderPage(indexPage), {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      }

      const { data: firstPage } = await supabase
        .from("pages")
        .select("*")
        .eq("brand_id", brandId)
        .eq("status", "published")
        .or("content_type.eq.page,content_type.is.null")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstPage) {
        return new Response(renderPage(firstPage), {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      }
    }

    if (pageError || !page) {
      console.error("[VIEWER] Page not found:", pageError);
      return new Response(
        renderErrorPage(
          "Pagina niet gevonden",
          `De pagina '${slug}' bestaat niet of is niet gepubliceerd.`
        ),
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    return new Response(renderPage(page), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("[VIEWER] Error:", error);
    return new Response(
      renderErrorPage("Server Fout", error?.message || "Er is een fout opgetreden."),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
});

function renderPage(page: any): string {
  let html = "";

  if (page.body_html) {
    html = page.body_html;
  } else if (page.content_json?.htmlSnapshot) {
    html = page.content_json.htmlSnapshot;
  } else if (page.content_json?.layout?.html) {
    html = page.content_json.layout.html;
  }

  if (!html) {
    return renderErrorPage("Geen content", "Deze pagina heeft nog geen content.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const cssBaseUrl = `${supabaseUrl}/storage/v1/object/public/assets/styles`;

  if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
    html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title || "Pagina"}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${cssBaseUrl}/main.css">
  <link rel="stylesheet" href="${cssBaseUrl}/components.css">
</head>
<body>
${html}
</body>
</html>`;
  } else {
    if (!html.includes('main.css') && !html.includes('components.css')) {
      html = html.replace(
        '</head>',
        `  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${cssBaseUrl}/main.css">
  <link rel="stylesheet" href="${cssBaseUrl}/components.css">
</head>`
      );
    }
  }

  return html;
}

function renderErrorPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      text-align: center;
    }
    h1 {
      color: #667eea;
      margin: 0 0 1rem 0;
      font-size: 2rem;
    }
    p {
      color: #666;
      line-height: 1.6;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

async function renderWebsite(supabase: any, websiteId: string, pathname: string): Promise<Response> {
  try {
    const { data: website, error: websiteError } = await supabase
      .from("websites")
      .select("*")
      .eq("id", websiteId)
      .maybeSingle();

    if (websiteError || !website) {
      return new Response(
        renderErrorPage("Website niet gevonden", "Deze website bestaat niet."),
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    let slug = pathname === "/" || pathname === "" ? "home" : pathname.substring(1);
    if (slug.endsWith("/")) {
      slug = slug.substring(0, slug.length - 1);
    }

    const { data: page, error: pageError } = await supabase
      .from("website_pages")
      .select("*")
      .eq("website_id", websiteId)
      .eq("slug", slug)
      .maybeSingle();

    if (!page && slug === "home") {
      const { data: homepage } = await supabase
        .from("website_pages")
        .select("*")
        .eq("website_id", websiteId)
        .eq("is_homepage", true)
        .maybeSingle();

      if (homepage) {
        return new Response(renderWebsitePage(homepage, website), {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      }

      const { data: firstPage } = await supabase
        .from("website_pages")
        .select("*")
        .eq("website_id", websiteId)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstPage) {
        return new Response(renderWebsitePage(firstPage, website), {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      }
    }

    if (pageError || !page) {
      return new Response(
        renderErrorPage(
          "Pagina niet gevonden",
          `De pagina '${slug}' bestaat niet.`
        ),
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    return new Response(renderWebsitePage(page, website), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("[WEBSITE-RENDER] Error:", error);
    return new Response(
      renderErrorPage("Server Fout", error?.message || "Er is een fout opgetreden."),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}

function renderWebsitePage(page: any, website: any): string {
  let html = "";

  if (page.content?.html) {
    html = page.content.html;
  } else if (page.content?.htmlSnapshot) {
    html = page.content.htmlSnapshot;
  }

  if (!html) {
    return renderErrorPage("Geen content", "Deze pagina heeft nog geen content.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const cssBaseUrl = `${supabaseUrl}/storage/v1/object/public/assets/styles`;

  if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
    html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.meta_title || page.name || "Pagina"}</title>
  ${page.meta_description ? `<meta name="description" content="${page.meta_description}">` : ''}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${cssBaseUrl}/main.css">
  <link rel="stylesheet" href="${cssBaseUrl}/components.css">
</head>
<body>
${html}
</body>
</html>`;
  } else {
    if (!html.includes('main.css') && !html.includes('components.css')) {
      html = html.replace(
        '</head>',
        `  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${cssBaseUrl}/main.css">
  <link rel="stylesheet" href="${cssBaseUrl}/components.css">
</head>`
      );
    }
  }

  return html;
}