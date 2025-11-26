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

    let brandId: string | null = null;
    let websiteIdFromDomain: string | null = null;

    if (subdomainParam) {
      if (subdomainParam.startsWith("brand-")) {
        brandId = subdomainParam.replace("brand-", "");
      } else {
        const { data: domainData } = await supabase
          .from("brand_domains")
          .select("brand_id, status, website_id, domain_type")
          .eq("subdomain_prefix", subdomainParam)
          .eq("domain_type", "subdomain")
          .eq("status", "verified")
          .maybeSingle();

        if (domainData) {
          brandId = domainData.brand_id;
          websiteIdFromDomain = domainData.website_id;
          console.log("[VIEWER] Found subdomain:", { subdomain: subdomainParam, brandId, websiteId: websiteIdFromDomain });
        }
      }
    }

    if (!brandId) {
      brandId = url.searchParams.get("brand_id");
    }

    if (!brandId) {
      return new Response(
        renderErrorPage("Brand niet gevonden", `Deze URL is niet gekoppeld aan een brand. Subdomain: ${subdomainParam}`),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    console.log("[VIEWER] Brand ID:", brandId, "Website ID:", websiteIdFromDomain);

    if (websiteIdFromDomain) {
      return await renderWebsite(supabase, websiteIdFromDomain, pathname);
    }

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
          headers: { ...corsHeaders, "Content-Type": "text/html" },
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
          headers: { ...corsHeaders, "Content-Type": "text/html" },
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
        { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html" } }
      );
    }

    return new Response(renderPage(page), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8"
      },
    });
  } catch (error) {
    console.error("[VIEWER] Error:", error);
    return new Response(
      renderErrorPage("Server Fout", error?.message || "Er is een fout opgetreden."),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }
});

const fontAwesomeFallback = `
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
<link rel="stylesheet" href="https://pro.fontawesome.com/releases/v5.15.4/css/all.css">
<style>
  .main-menu ul li > a::after,
  .main-menu ul li > span::after {
    font-family: 'Font Awesome 5 Free', 'Font Awesome 5 Pro', 'FontAwesome' !important;
    font-weight: 900 !important;
  }
</style>`;

const sliderDependencies = `
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css">
<script src="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js"></script>`;

const sliderInitScript = `
<script>
(function($) {
    'use strict';

    $(document).ready(function() {
        console.log('[Slider Init] Starting universal slider initialization...');

        try {
            $('.slick-initialized').slick('unslick');
            console.log('[Slider Init] Destroyed existing sliders');
        } catch(e) {}

        if ($('.destination-slider').length && !$('.destination-slider').hasClass('slick-initialized')) {
            $('.destination-slider').slick({
                dots: false, arrows: false, infinite: true, speed: 800, autoplay: true,
                variableWidth: true, slidesToShow: 6, slidesToScroll: 1,
                responsive: [
                    { breakpoint: 1400, settings: { slidesToShow: 4 } },
                    { breakpoint: 1024, settings: { slidesToShow: 3 } },
                    { breakpoint: 767, settings: { slidesToShow: 1 } }
                ]
            });
            console.log('[Slider Init] ✅ Tripex destination-slider');
        }

        if ($('.tour-slider').length && !$('.tour-slider').hasClass('slick-initialized')) {
            $('.tour-slider').slick({
                dots: true, arrows: false, infinite: true, speed: 800, autoplay: true,
                slidesToShow: 4, slidesToScroll: 1,
                responsive: [
                    { breakpoint: 1500, settings: { slidesToShow: 3 } },
                    { breakpoint: 1200, settings: { slidesToShow: 2 } },
                    { breakpoint: 767, settings: { slidesToShow: 1 } }
                ]
            });
            console.log('[Slider Init] ✅ Tripex tour-slider');
        }

        if ($('.gallery-slider').length && !$('.gallery-slider').hasClass('slick-initialized')) {
            $('.gallery-slider').slick({
                dots: false, arrows: false, infinite: true, speed: 800, autoplay: true,
                slidesToShow: 5, slidesToScroll: 1,
                responsive: [
                    { breakpoint: 1500, settings: { slidesToShow: 3 } },
                    { breakpoint: 1200, settings: { slidesToShow: 2 } },
                    { breakpoint: 550, settings: { slidesToShow: 1 } }
                ]
            });
            console.log('[Slider Init] ✅ Tripex gallery-slider');
        }

        if ($('.testimonial-slider').length && !$('.testimonial-slider').hasClass('slick-initialized')) {
            $('.testimonial-slider').slick({
                dots: true, arrows: false, infinite: true, speed: 800, autoplay: true,
                slidesToShow: 1, slidesToScroll: 1
            });
            console.log('[Slider Init] ✅ Tripex testimonial-slider');
        }

        if ($('.clients-slider').length && !$('.clients-slider').hasClass('slick-initialized')) {
            $('.clients-slider').slick({
                dots: false, arrows: false, infinite: true, speed: 800, autoplay: true,
                slidesToShow: 6, slidesToScroll: 1,
                responsive: [
                    { breakpoint: 1450, settings: { slidesToShow: 5 } },
                    { breakpoint: 1200, settings: { slidesToShow: 3 } },
                    { breakpoint: 767, settings: { slidesToShow: 2 } },
                    { breakpoint: 400, settings: { slidesToShow: 1 } }
                ]
            });
            console.log('[Slider Init] ✅ Tripex clients-slider');
        }

        if ($('.tour-gallery-slider').length && !$('.tour-gallery-slider').hasClass('slick-initialized')) {
            $('.tour-gallery-slider').slick({
                dots: false, arrows: true, infinite: true, speed: 800, autoplay: true,
                slidesToShow: 1, slidesToScroll: 1,
                prevArrow: '<div class="prev"><i class="far fa-angle-left"></i></div>',
                nextArrow: '<div class="next"><i class="far fa-angle-right"></i></div>'
            });
            console.log('[Slider Init] ✅ Tripex tour-gallery-slider');
        }

        function initHeroSlider(selector) {
            if ($(selector).length && !$(selector).hasClass('slick-initialized')) {
                $(selector).slick({
                    dots: false, arrows: true, infinite: true, speed: 800,
                    fade: true, autoplay: true, slidesToShow: 1, slidesToScroll: 1,
                    prevArrow: '<div class="prev"><i class="fal fa-arrow-left"></i></div>',
                    nextArrow: '<div class="next"><i class="fal fa-arrow-right"></i></div>',
                    responsive: [
                        { breakpoint: 1200, settings: { arrows: false } }
                    ]
                });
                console.log('[Slider Init] ✅ GoWild ' + selector);
            }
        }

        initHeroSlider('.hero-slider-one');
        initHeroSlider('.hero-slider-two');
        initHeroSlider('.hero-slider-three');

        if ($('.slider-active-3-item').length && !$('.slider-active-3-item').hasClass('slick-initialized')) {
            $('.slider-active-3-item').slick({
                dots: false, arrows: false, infinite: true, speed: 800, autoplay: true,
                slidesToShow: 3, slidesToScroll: 1,
                responsive: [
                    { breakpoint: 1200, settings: { slidesToShow: 2 } },
                    { breakpoint: 991, settings: { slidesToShow: 2 } },
                    { breakpoint: 800, settings: { slidesToShow: 1 } }
                ]
            });
            console.log('[Slider Init] ✅ GoWild slider-active-3-item');
        }

        if ($('.slider-active-4-item').length && !$('.slider-active-4-item').hasClass('slick-initialized')) {
            $('.slider-active-4-item').slick({
                dots: false, arrows: false, infinite: true, speed: 800, autoplay: true,
                slidesToShow: 4, slidesToScroll: 1,
                responsive: [
                    { breakpoint: 1400, settings: { slidesToShow: 3 } },
                    { breakpoint: 1200, settings: { slidesToShow: 2 } },
                    { breakpoint: 575, settings: { slidesToShow: 1 } }
                ]
            });
            console.log('[Slider Init] ✅ GoWild slider-active-4-item');
        }

        if ($('.slider-active-5-item').length && !$('.slider-active-5-item').hasClass('slick-initialized')) {
            $('.slider-active-5-item').slick({
                dots: false, arrows: false, infinite: true, speed: 800, autoplay: true,
                slidesToShow: 5, slidesToScroll: 1,
                responsive: [
                    { breakpoint: 1400, settings: { slidesToShow: 4 } },
                    { breakpoint: 1199, settings: { slidesToShow: 3 } },
                    { breakpoint: 991, settings: { slidesToShow: 2 } },
                    { breakpoint: 575, settings: { slidesToShow: 1 } }
                ]
            });
            console.log('[Slider Init] ✅ GoWild slider-active-5-item');
        }

        if ($('.place-slider').length && !$('.place-slider').hasClass('slick-initialized')) {
            $('.place-slider').slick({
                dots: false, arrows: false, infinite: true, speed: 800, autoplay: true,
                variableWidth: true, slidesToShow: 3, slidesToScroll: 1,
                responsive: [
                    { breakpoint: 767, settings: { slidesToShow: 1 } }
                ]
            });
            console.log('[Slider Init] ✅ GoWild place-slider');
        }

        if ($('.recent-place-slider').length && !$('.recent-place-slider').hasClass('slick-initialized')) {
            $('.recent-place-slider').slick({
                dots: false, arrows: true, infinite: true, speed: 800, autoplay: true,
                slidesToShow: 2, slidesToScroll: 1,
                prevArrow: '<div class="prev"><i class="far fa-arrow-left"></i></div>',
                nextArrow: '<div class="next"><i class="far fa-arrow-right"></i></div>',
                responsive: [
                    { breakpoint: 767, settings: { slidesToShow: 1 } }
                ]
            });
            console.log('[Slider Init] ✅ GoWild recent-place-slider');
        }

        if ($('.testimonial-slider-one').length && !$('.testimonial-slider-one').hasClass('slick-initialized')) {
            $('.testimonial-slider-one').slick({
                dots: false, arrows: false, infinite: true, speed: 800, autoplay: true,
                slidesToShow: 1, slidesToScroll: 1
            });
            console.log('[Slider Init] ✅ GoWild testimonial-slider-one');
        }

        if ($('.partner-slider-one').length && !$('.partner-slider-one').hasClass('slick-initialized')) {
            $('.partner-slider-one').slick({
                dots: false, arrows: false, infinite: true, speed: 800, autoplay: true,
                slidesToShow: 5, slidesToScroll: 1,
                responsive: [
                    { breakpoint: 1400, settings: { slidesToShow: 4 } },
                    { breakpoint: 991, settings: { slidesToShow: 3 } },
                    { breakpoint: 800, settings: { slidesToShow: 2 } },
                    { breakpoint: 575, settings: { slidesToShow: 1 } }
                ]
            });
            console.log('[Slider Init] ✅ GoWild partner-slider-one');
        }

        console.log('[Slider Init] ✅ All sliders initialized!');
    });
})(window.jQuery);
</script>`;

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
  ${fontAwesomeFallback}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${cssBaseUrl}/main.css">
  <link rel="stylesheet" href="${cssBaseUrl}/components.css">
</head>
<body>
${html}
${sliderDependencies}
${sliderInitScript}
</body>
</html>`;
  } else {
    if (!html.includes('font-awesome/5.')) {
      html = html.replace('</head>', fontAwesomeFallback + '\n</head>');
    }

    if (!html.includes('main.css') && !html.includes('components.css')) {
      html = html.replace(
        '</head>',
        `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${cssBaseUrl}/main.css">
  <link rel="stylesheet" href="${cssBaseUrl}/components.css">
</head>`
      );
    }

    if (!html.includes('jquery') && !html.includes('slick')) {
      html = html.replace('</body>', sliderDependencies + '\n' + sliderInitScript + '\n</body>');
    } else {
      html = html.replace('</body>', sliderInitScript + '\n</body>');
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

    const { data: menuPages } = await supabase
      .from("pages")
      .select("id, title, slug, menu_label")
      .eq("website_id", websiteId)
      .eq("show_in_menu", true)
      .order("menu_order", { ascending: true });

    let slug = pathname === "/" || pathname === "" ? "/" : pathname;
    if (slug !== "/" && slug.endsWith("/")) {
      slug = slug.substring(0, slug.length - 1);
    }

    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("*")
      .eq("website_id", websiteId)
      .eq("slug", slug)
      .maybeSingle();

    if (!page) {
      const { data: firstPage } = await supabase
        .from("pages")
        .select("*")
        .eq("website_id", websiteId)
        .order("menu_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstPage) {
        return new Response(renderWebsitePage(firstPage, website, menuPages || []), {
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

    return new Response(renderWebsitePage(page, website, menuPages || []), {
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

function renderWebsitePage(page: any, website: any, menuPages: any[]): string {
  let html = "";

  if (page.body_html) {
    html = page.body_html;
  } else if (page.content?.html) {
    html = page.content.html;
  } else if (page.content_json?.htmlSnapshot) {
    html = page.content_json.htmlSnapshot;
  }

  if (!html) {
    return renderErrorPage("Geen content", "Deze pagina heeft nog geen content.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const cssBaseUrl = `${supabaseUrl}/storage/v1/object/public/assets/styles`;

  const menuHtml = menuPages.length > 0 ? `
    <nav style="background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); box-shadow: 0 2px 10px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 1000;">
      <div style="max-width: 1200px; margin: 0 auto; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 1.5rem; font-weight: bold; color: #667eea;">${website.name || 'Website'}</div>
        <ul style="list-style: none; display: flex; gap: 2rem; margin: 0; padding: 0;">
          ${menuPages.map(p => `
            <li><a href="/${p.slug}" style="text-decoration: none; color: #333; font-weight: 500; transition: color 0.3s;" onmouseover="this.style.color='#667eea'" onmouseout="this.style.color='#333'">${p.menu_label || p.title}</a></li>
          `).join('')}
        </ul>
      </div>
    </nav>
  ` : '';

  if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
    html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title || "Pagina"}</title>
  ${fontAwesomeFallback}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${cssBaseUrl}/main.css">
  <link rel="stylesheet" href="${cssBaseUrl}/components.css">
  <style>
    body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
  </style>
</head>
<body>
${menuHtml}
${html}
${sliderDependencies}
${sliderInitScript}
</body>
</html>`;
  } else {
    if (!html.includes('font-awesome/5.')) {
      html = html.replace('</head>', fontAwesomeFallback + '\n</head>');
    }

    if (!html.includes('main.css') && !html.includes('components.css')) {
      html = html.replace(
        '</head>',
        `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${cssBaseUrl}/main.css">
  <link rel="stylesheet" href="${cssBaseUrl}/components.css">
</head>`
      );
    }

    if (menuHtml && !html.includes('<nav')) {
      html = html.replace('<body>', `<body>\n${menuHtml}`);
    }

    if (!html.includes('jquery') && !html.includes('slick')) {
      html = html.replace('</body>', sliderDependencies + '\n' + sliderInitScript + '\n</body>');
    } else {
      html = html.replace('</body>', sliderInitScript + '\n</body>');
    }
  }

  return html;
}