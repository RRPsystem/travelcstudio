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

    let { data: domainData, error: domainError } = await supabase
      .from("brand_domains")
      .select("brand_id")
      .eq("domain", subdomain)
      .maybeSingle();

    if (domainError || !domainData) {
      console.log("[VIEWER] First lookup failed, trying with full domain");
      const fullDomain = `${subdomain}.ai-travelstudio.nl`;
      const result = await supabase
        .from("brand_domains")
        .select("brand_id")
        .eq("domain", fullDomain)
        .maybeSingle();

      domainData = result.data;
      domainError = result.error;

      if (domainError || !domainData) {
        console.error("[VIEWER] Both domain lookups failed:", { subdomain, fullDomain, domainError });
        return new Response(
          renderErrorPage("Domein niet gevonden", `Het domein '${subdomain}' is niet geregistreerd.`),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html" } }
        );
      }
      console.log("[VIEWER] Found domain with full domain:", fullDomain);
    }

    const brandId = domainData.brand_id;
    console.log("[VIEWER] Found brandId:", brandId);

    // Check for trip share route: /trip/:id_or_token
    const tripMatch = pathname.match(/^\/trip\/([a-f0-9-]+)$/i);
    if (tripMatch) {
      const idOrToken = tripMatch[1];
      console.log("[VIEWER] Trip route detected:", idOrToken);
      return await renderTrip(supabase, idOrToken, brandId);
    }

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

      const ulMatch = existingNav.match(/<ul[^>]*class="([^"]*)"/i);
      const ulClasses = ulMatch ? ulMatch[1] : "";
      console.log("[VIEWER] Found UL with classes:", ulClasses);

      const newMenuHtml = `<ul class="${ulClasses}">${menuHtml}</ul>`;
      const newNav = `<nav class="${navClasses}">${newMenuHtml}</nav>`;

      html = html.replace(navRegex, newNav);
      console.log("[VIEWER] Replaced nav with menu from database");
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

async function renderTrip(supabase: any, idOrToken: string, brandId: string) {
  console.log("[VIEWER] Loading trip with ID or token:", idOrToken);

  let trip = null;
  let tripError = null;

  // First try: by ID without brand join
  const { data: tripById, error: errorById } = await supabase
    .from("trips")
    .select("*")
    .eq("id", idOrToken)
    .maybeSingle();

  if (tripById) {
    trip = tripById;
    console.log("[VIEWER] Found trip by ID");
  } else {
    // Second try: by share_token
    const { data: tripByToken, error } = await supabase
      .from("trips")
      .select("*")
      .eq("share_token", idOrToken)
      .maybeSingle();

    trip = tripByToken;
    tripError = error;
    if (tripByToken) {
      console.log("[VIEWER] Found trip by share_token");
    }
  }

  if (tripError || !trip) {
    console.error("[VIEWER] Trip not found:", tripError || errorById);
    return new Response(
      renderErrorPage(
        "Reis niet gevonden",
        "Deze reis is niet (meer) beschikbaar of de link is verlopen."
      ),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }

  // Now try to load brand data separately (optional)
  if (trip.brand_id) {
    const { data: brandData } = await supabase
      .from("brands")
      .select("name, primary_color, secondary_color")
      .eq("id", trip.brand_id)
      .maybeSingle();

    if (brandData) {
      trip.brands = brandData;
      console.log("[VIEWER] Loaded brand data:", brandData.name);
    } else {
      console.log("[VIEWER] Brand not found or no access, using defaults");
    }
  }

  // Increment views and get updated count
  const { data: viewData, error: viewError } = await supabase.rpc("increment_trip_views", { trip_token: idOrToken });

  if (viewError) {
    console.error("[VIEWER] Failed to increment views:", viewError);
  }

  // Add view count to trip object
  trip.view_count = viewData || trip.view_count || 1;

  const html = renderTripPage(trip);

  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html" },
  });
}

function renderTripPage(trip: any): string {
  const typeLabels: Record<string, string> = {
    roadbook: "📚 Roadbook",
    offerte: "💰 Offerte",
    catalog: "📖 Reis",
    wordpress: "📝 Reis",
    custom: "🎯 Reis",
  };

  const typeLabel = typeLabels[trip.trip_type] || "📖 Reis";
  const brandName = trip.brands?.name || "Reisorganisatie";
  const primaryColor = trip.brands?.primary_color || "#ea580c";
  const customMessage = trip.share_settings?.custom_message;
  const showPrice = trip.share_settings?.show_price !== false;
  const showContact = trip.share_settings?.show_contact !== false;

  let description = trip.description || "";
  if (!description && trip.content?.html) {
    const tempDiv = trip.content.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    description = tempDiv.substring(0, 200);
  }

  let galleryImages: string[] = [];
  if (trip.gallery) {
    if (Array.isArray(trip.gallery)) {
      galleryImages = trip.gallery;
    } else if (typeof trip.gallery === "string") {
      try {
        galleryImages = JSON.parse(trip.gallery);
      } catch (e) {
        console.error("[VIEWER] Failed to parse gallery:", e);
      }
    }
  }

  return `
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${trip.title} - ${brandName}</title>
    <meta name="description" content="${description}">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f9fafb;
            color: #1f2937;
            line-height: 1.6;
        }
        .hero {
            position: relative;
            height: 400px;
            background: linear-gradient(135deg, ${primaryColor} 0%, #1f2937 100%);
            overflow: hidden;
        }
        .hero img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0.8;
        }
        .hero-gradient {
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%);
        }
        .hero-content {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 2rem;
            color: white;
        }
        .type-badge {
            display: inline-block;
            padding: 0.5rem 1rem;
            background: ${primaryColor};
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 1rem;
            margin-right: 0.5rem;
        }
        .view-badge {
            display: inline-block;
            padding: 0.5rem 1rem;
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 1rem;
        }
        .hero-title {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
        .hero-description {
            font-size: 1.25rem;
            opacity: 0.9;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        .message-box {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 1.5rem;
            margin-bottom: 2rem;
            border-radius: 0.5rem;
        }
        .message-box p {
            color: #1e40af;
            margin: 0;
        }
        .info-bar {
            background: white;
            border-radius: 0.75rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            padding: 1.5rem;
            margin-bottom: 2rem;
            display: flex;
            flex-wrap: wrap;
            gap: 2rem;
        }
        .info-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .info-icon {
            width: 2.5rem;
            height: 2.5rem;
            background: #f3f4f6;
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
        }
        .info-text {
            display: flex;
            flex-direction: column;
        }
        .info-label {
            font-size: 0.875rem;
            color: #6b7280;
        }
        .info-value {
            font-size: 1.125rem;
            font-weight: 600;
            color: #111827;
        }
        .content-box {
            background: white;
            border-radius: 0.75rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            padding: 2rem;
            margin-bottom: 2rem;
        }
        .content-box h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: #111827;
        }
        .content-box p {
            margin-bottom: 1rem;
        }
        .gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1rem;
        }
        .gallery img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-radius: 0.5rem;
        }
        .contact-box {
            background: linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}05 100%);
            border: 2px solid ${primaryColor}40;
            border-radius: 0.75rem;
            padding: 2rem;
            text-align: center;
        }
        .contact-box h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            color: #111827;
        }
        .contact-box p {
            color: #6b7280;
            margin-bottom: 1.5rem;
        }
        .btn-group {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s;
        }
        .btn-primary {
            background: ${primaryColor};
            color: white;
        }
        .btn-primary:hover {
            opacity: 0.9;
            transform: translateY(-2px);
        }
        .btn-secondary {
            background: white;
            color: ${primaryColor};
            border: 2px solid ${primaryColor};
        }
        .btn-secondary:hover {
            background: ${primaryColor}10;
        }
        .footer {
            text-align: center;
            padding: 2rem;
            color: #6b7280;
            font-size: 0.875rem;
        }
        @media (max-width: 768px) {
            .hero-title {
                font-size: 1.75rem;
            }
            .container {
                padding: 1rem;
            }
            .info-bar {
                flex-direction: column;
                gap: 1rem;
            }
        }
    </style>
</head>
<body>
    ${trip.featured_image ? `
    <div class="hero">
        <img src="${trip.featured_image}" alt="${trip.title}">
        <div class="hero-gradient"></div>
        <div class="hero-content">
            <div>
                <span class="type-badge">${typeLabel}</span>
                <span class="view-badge">👁️ ${trip.view_count || 1} ${trip.view_count === 1 ? 'weergave' : 'weergaven'}</span>
            </div>
            <h1 class="hero-title">${trip.title}</h1>
            ${trip.description ? `<p class="hero-description">${trip.description}</p>` : ""}
        </div>
    </div>
    ` : `
    <div class="hero">
        <div class="hero-gradient"></div>
        <div class="hero-content">
            <div>
                <span class="type-badge">${typeLabel}</span>
                <span class="view-badge">👁️ ${trip.view_count || 1} ${trip.view_count === 1 ? 'weergave' : 'weergaven'}</span>
            </div>
            <h1 class="hero-title">${trip.title}</h1>
            ${trip.description ? `<p class="hero-description">${trip.description}</p>` : ""}
        </div>
    </div>
    `}

    <div class="container">
        ${customMessage ? `
        <div class="message-box">
            <p>${customMessage}</p>
        </div>
        ` : ""}

        ${trip.duration_days || (showPrice && trip.price) ? `
        <div class="info-bar">
            ${trip.duration_days ? `
            <div class="info-item">
                <div class="info-icon">⏱️</div>
                <div class="info-text">
                    <span class="info-label">Duur</span>
                    <span class="info-value">${trip.duration_days} dagen</span>
                </div>
            </div>
            ` : ""}
            ${showPrice && trip.price ? `
            <div class="info-item">
                <div class="info-icon">💰</div>
                <div class="info-text">
                    <span class="info-label">Prijs</span>
                    <span class="info-value">€${trip.price},-</span>
                </div>
            </div>
            ` : ""}
        </div>
        ` : ""}

        ${trip.content?.html ? `
        <div class="content-box">
            ${trip.content.html}
        </div>
        ` : ""}

        ${galleryImages.length > 0 ? `
        <div class="content-box">
            <h2>Foto's</h2>
            <div class="gallery">
                ${galleryImages.map((img: string) => `<img src="${img}" alt="Reis foto">`).join("")}
            </div>
        </div>
        ` : ""}

        ${showContact ? `
        <div class="contact-box">
            <h2>Interesse?</h2>
            <p>Neem contact met ons op voor meer informatie of om te boeken!</p>
            <div class="btn-group">
                <a href="mailto:info@${brandName.toLowerCase().replace(/\s+/g, "")}.nl" class="btn btn-primary">
                    📧 Email ons
                </a>
                <a href="tel:+31000000000" class="btn btn-secondary">
                    📞 Bel ons
                </a>
            </div>
        </div>
        ` : ""}
    </div>

    <div class="footer">
        <p>Aangeboden door ${brandName}</p>
    </div>
</body>
</html>
  `.trim();
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