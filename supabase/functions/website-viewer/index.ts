import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, host, x-forwarded-host",
  "Content-Type": "text/html; charset=utf-8",
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
    const pathname = url.pathname.replace(/^\/website-viewer/, '') || '/';
    const subdomainParam = url.searchParams.get("subdomain");

    console.log("[VIEWER] Request:", { subdomain: subdomainParam, pathname, url: req.url });

    const websiteId = url.searchParams.get("website_id");
    if (websiteId) {
      return await renderWebsite(supabase, websiteId, pathname);
    }

    const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
    console.log("[VIEWER] Forwarded host:", forwardedHost);

    let subdomain: string | null = null;

    if (forwardedHost) {
      const hostParts = forwardedHost.split('.');
      console.log("[VIEWER] Host parts:", hostParts);

      if (hostParts.length >= 3 && hostParts[hostParts.length - 2] === 'ai-travelstudio' && hostParts[hostParts.length - 1] === 'nl') {
        subdomain = hostParts.slice(0, -2).join('.');
      } else if (hostParts.length === 2 || hostParts.length === 1) {
        subdomain = forwardedHost;
      }
    }

    if (subdomainParam) {
      subdomain = subdomainParam;
    }

    console.log("[VIEWER] Using subdomain:", subdomain);

    if (!subdomain) {
      return new Response(
        renderErrorPage("Ongeldig domein", "Geen geldig (sub)domein gevonden."),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    const { data: domainData, error: domainError } = await supabase
      .from("brand_domains")
      .select("brand_id")
      .eq("domain", subdomain)
      .maybeSingle();

    if (domainError || !domainData) {
      console.error("[VIEWER] Domain lookup failed:", domainError);
      return new Response(
        renderErrorPage("Domein niet gevonden", `Het domein '${subdomain}' is niet geregistreerd.`),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    const brandId = domainData.brand_id;
    console.log("[VIEWER] Found brandId:", brandId);

    let page = null;
    let pageError = null;

    if (pathname === '/') {
      console.log("[VIEWER] Root path - trying multiple slug variations");

      const { data: rootSlashPage } = await supabase
        .from("pages")
        .select("*")
        .eq("brand_id", brandId)
        .eq("slug", "/")
        .eq("status", "published")
        .or("content_type.eq.page,content_type.is.null")
        .maybeSingle();

      if (rootSlashPage) {
        page = rootSlashPage;
        console.log("[VIEWER] Found page with slug '/'");
      } else {
        const { data: homePage } = await supabase
          .from("pages")
          .select("*")
          .eq("brand_id", brandId)
          .eq("slug", "home")
          .eq("status", "published")
          .or("content_type.eq.page,content_type.is.null")
          .maybeSingle();

        if (homePage) {
          page = homePage;
          console.log("[VIEWER] Found page with slug 'home'");
        } else {
          const { data: indexPage } = await supabase
            .from("pages")
            .select("*")
            .eq("brand_id", brandId)
            .eq("slug", "index")
            .eq("status", "published")
            .or("content_type.eq.page,content_type.is.null")
            .maybeSingle();

          if (indexPage) {
            page = indexPage;
            console.log("[VIEWER] Found page with slug 'index'");
          }
        }
      }
    } else {
      const slug = pathname.replace(/^\//, '');
      console.log("[VIEWER] Looking for slug:", slug);

      const result = await supabase
        .from("pages")
        .select("*")
        .eq("brand_id", brandId)
        .eq("slug", slug)
        .eq("status", "published")
        .or("content_type.eq.page,content_type.is.null")
        .maybeSingle();

      page = result.data;
      pageError = result.error;

      if (!page) {
        const slugWithSlash = `/${slug}`;
        const result2 = await supabase
          .from("pages")
          .select("*")
          .eq("brand_id", brandId)
          .eq("slug", slugWithSlash)
          .eq("status", "published")
          .or("content_type.eq.page,content_type.is.null")
          .maybeSingle();

        page = result2.data;
        pageError = result2.error;
        if (page) {
          console.log("[VIEWER] Found page with leading slash:", slugWithSlash);
        }
      }
    }

    if (pageError || !page) {
      console.error("[VIEWER] Page not found:", pageError);
      return new Response(
        renderErrorPage(
          "Pagina niet gevonden",
          `De pagina '${pathname}' bestaat niet of is niet gepubliceerd.`
        ),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    const { data: menuPages } = await supabase
      .from("pages")
      .select("id, title, slug, menu_label")
      .eq("brand_id", brandId)
      .eq("show_in_menu", true)
      .eq("status", "published")
      .order("menu_order", { ascending: true });

    return new Response(renderPageWithMenu(page, menuPages || []), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("[VIEWER] Error:", error);
    return new Response(
      renderErrorPage("Server Error", `Er is een fout opgetreden: ${error.message}`),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }
});

async function renderWebsite(supabase: any, websiteId: string, pathname: string) {
  const slug = pathname === '/' ? 'home' : pathname.replace(/^\//, '');
  console.log("[VIEWER] Website render - slug:", slug);

  const { data: page, error: pageError } = await supabase
    .from("pages")
    .select("*")
    .eq("website_id", websiteId)
    .eq("slug", slug)
    .eq("status", "published")
    .or("content_type.eq.page,content_type.is.null")
    .maybeSingle();

  if (!page && slug === "home") {
    const { data: indexPage } = await supabase
      .from("pages")
      .select("*")
      .eq("website_id", websiteId)
      .eq("slug", "index")
      .eq("status", "published")
      .or("content_type.eq.page,content_type.is.null")
      .maybeSingle();

    if (indexPage) {
      const { data: website } = await supabase
        .from("websites")
        .select("brand_id")
        .eq("id", websiteId)
        .maybeSingle();

      if (website) {
        const { data: menuPages } = await supabase
          .from("pages")
          .select("id, title, slug, menu_label")
          .eq("brand_id", website.brand_id)
          .eq("show_in_menu", true)
          .eq("status", "published")
          .order("menu_order", { ascending: true });

        return new Response(renderPageWithMenu(indexPage, menuPages || []), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        });
      }
    }
  }

  if (pageError || !page) {
    console.error("[VIEWER] Page not found:", pageError);
    return new Response(
      renderErrorPage(
        "Pagina niet gevonden",
        `De pagina '${slug}' bestaat niet of is niet gepubliceerd.`
      ),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }

  const { data: website } = await supabase
    .from("websites")
    .select("brand_id")
    .eq("id", websiteId)
    .maybeSingle();

  if (website) {
    const { data: menuPages } = await supabase
      .from("pages")
      .select("id, title, slug, menu_label")
      .eq("brand_id", website.brand_id)
      .eq("show_in_menu", true)
      .eq("status", "published")
      .order("menu_order", { ascending: true });

    return new Response(renderPageWithMenu(page, menuPages || []), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  return new Response(renderPage(page), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html" },
  });
}

function renderPage(page: any): string {
  let html = page.body_html || "";

  if (html.includes("<base href")) {
    html = html.replace(/<base[^>]*>/gi, "");
    console.log("[VIEWER] Removed base href tag");
  }

  return html;
}

function renderPageWithMenu(page: any, menuPages: any[]): string {
  let html = page.body_html || "";

  if (html.includes("<base href")) {
    html = html.replace(/<base[^>]*>/gi, "");
    console.log("[VIEWER] Removed base href tag");
  }

  if (menuPages && menuPages.length > 0) {
    const menuHtml = buildMenuHtml(menuPages);
    console.log("[VIEWER] Generated menu HTML:", menuHtml.substring(0, 200));

    const navRegex = /<nav[^>]*class="[^"]*main-menu[^"]*"[^>]*>.*?<\/nav>/gis;
    const navMatch = html.match(navRegex);

    if (navMatch) {
      const existingNav = navMatch[0];
      console.log("[VIEWER] Found existing nav element:", existingNav.substring(0, 200));

      const classMatch = existingNav.match(/class="([^"]*)"/i);
      const navClasses = classMatch ? classMatch[1] : "main-menu";

      const parser = new DOMParser();
      const doc = parser.parseFromString(existingNav, "text/html");
      const navElement = doc.querySelector("nav");

      if (navElement) {
        const existingUl = navElement.querySelector(":scope > ul");
        if (existingUl) {
          const ulClasses = existingUl.className || "";
          console.log("[VIEWER] Found UL with classes:", ulClasses);

          const newMenuHtml = `<ul class="${ulClasses}">${menuHtml}</ul>`;
          const newNav = `<nav class="${navClasses}">${newMenuHtml}</nav>`;

          html = html.replace(navRegex, newNav);
          console.log("[VIEWER] Replaced nav with menu from database");
        } else {
          console.log("[VIEWER] No direct child UL found in nav");
        }
      }
    } else {
      console.log("[VIEWER] No main-menu nav found in template");
    }
  }

  return html;
}

function buildMenuHtml(menuPages: any[]): string {
  return menuPages
    .map((page) => {
      const label = page.menu_label || page.title;
      const href = page.slug.startsWith("/") ? page.slug : `/${page.slug}`;
      return `<li class="menu-item"><a href="${href}">${label}</a></li>`;
    })
    .join("\n    ");
}

function renderErrorPage(title: string, message: string): string {
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
        }
        .icon {
            font-size: 80px;
            margin-bottom: 20px;
        }
        h1 {
            color: #2d3748;
            font-size: 32px;
            margin-bottom: 16px;
            font-weight: 700;
        }
        p {
            color: #718096;
            font-size: 18px;
            line-height: 1.6;
            margin-bottom: 32px;
        }
        a {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        a:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🌐</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="/">← Terug naar Home</a>
    </div>
</body>
</html>
  `.trim();
}