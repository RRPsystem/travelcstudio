import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { jwtVerify } from "npm:jose@5";
import { SavePageSchema, PublishPageSchema } from "./schemas.ts";
import { RateLimiter, getClientId, addRateLimitHeaders } from "./rate-limit.ts";

function enhanceHtmlWithBrandMeta(html: string, brandId: string): string {
  if (!html || !brandId) return html;

  let enhancedHtml = html;

  if (!html.includes('meta name="brand-id"') && !html.includes('meta name=\'brand-id\'')) {
    const brandMetaTag = `\n    <meta name="brand-id" content="${brandId}">`;

    if (html.includes('<head>')) {
      enhancedHtml = enhancedHtml.replace('<head>', `<head>${brandMetaTag}`);
    } else if (html.includes('<HEAD>')) {
      enhancedHtml = enhancedHtml.replace('<HEAD>', `<HEAD>${brandMetaTag}`);
    }
  }

  const travelSearchWidgetPattern = /<div([^>]*)id=["']travel-search-widget["']([^>]*)>/gi;
  enhancedHtml = enhancedHtml.replace(travelSearchWidgetPattern, (match, beforeId, afterId) => {
    if (match.includes('data-brand-id=')) {
      return match;
    }

    const hasDataMode = match.includes('data-mode=');
    if (hasDataMode) {
      return match.replace(/data-mode=(["'][^"']*["'])/, `data-mode=$1 data-brand-id="${brandId}"`);
    } else {
      return match.replace('>', ` data-brand-id="${brandId}">`);
    }
  });

  if (!html.includes('dynamic-menu.js')) {
    const menuScript = `\n    <!-- Dynamic Menu Widget -->\n    <script src="https://www.ai-websitestudio.nl/widgets/dynamic-menu.js"></script>\n`;

    if (html.includes('</body>')) {
      enhancedHtml = enhancedHtml.replace('</body>', `${menuScript}</body>`);
    } else if (html.includes('</BODY>')) {
      enhancedHtml = enhancedHtml.replace('</BODY>', `${menuScript}</BODY>`);
    }
  }

  return enhancedHtml;
}

interface JWTPayload {
  brand_id: string;
  user_id?: string;
  sub?: string;
  scopes?: string[];
  content_type?: string;
  pageId?: string;
  iat?: number;
  exp?: number;
}

const corsHeaders = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

const rateLimiter = new RateLimiter({
  windowMs: 60000,
  maxRequests: 100
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders(),
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const clientId = getClientId(req);

    try {
      rateLimiter.check(clientId);
    } catch (error: any) {
      const rateLimitInfo = rateLimiter.getInfo(clientId);
      const headers = addRateLimitHeaders(new Headers(corsHeaders()), rateLimitInfo);

      if (error.retryAfter) {
        headers.set('Retry-After', error.retryAfter.toString());
      }

      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.statusCode || 429, headers }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    console.log("[DEBUG] Request:", {
      method: req.method,
      pathname: url.pathname,
      pathParts,
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: corsHeaders() }
      );
    }

    const token = authHeader.substring(7);
    const jwtSecret = Deno.env.get("JWT_SECRET");

    if (!jwtSecret) {
      return new Response(
        JSON.stringify({ error: "JWT_SECRET not configured" }),
        { status: 500, headers: corsHeaders() }
      );
    }

    let claims: JWTPayload;
    try {
      const encoder = new TextEncoder();
      const secretKey = encoder.encode(jwtSecret);

      const { payload } = await jwtVerify(token, secretKey, {
        algorithms: ["HS256"],
      });

      claims = payload as JWTPayload;

      if (!claims.brand_id) {
        throw new Error("Invalid token: missing brand_id");
      }
    } catch (error: any) {
      console.error("[ERROR] Token verification failed:", error.message);
      return new Response(
        JSON.stringify({ error: "Invalid token", details: error.message }),
        { status: 401, headers: corsHeaders() }
      );
    }

    const { brand_id } = claims;

    if (req.method === "GET" && pathParts.includes("pages-api")) {
      console.log("[DEBUG] Fetching pages for brand:", brand_id);

      let query = supabase
        .from("pages")
        .select("*")
        .eq("brand_id", brand_id)
        .order("updated_at", { ascending: false });

      const page_id = url.searchParams.get("page_id");
      if (page_id) {
        query = query.eq("id", page_id);
      }

      const { data: pages, error } = await query;

      if (error) throw error;

      const rateLimitInfo = rateLimiter.getInfo(clientId);
      const responseHeaders = addRateLimitHeaders(new Headers(corsHeaders()), rateLimitInfo);

      if (page_id && pages && pages.length > 0) {
        return new Response(
          JSON.stringify(pages[0]),
          { status: 200, headers: responseHeaders }
        );
      }

      return new Response(
        JSON.stringify({ pages: pages || [] }),
        { status: 200, headers: responseHeaders }
      );
    }

    if (req.method === "POST" && pathParts.includes("save")) {
      console.log("[DEBUG] Saving page for brand:", brand_id);

      const rawBody = await req.json();
      console.log("[DEBUG] Raw body:", JSON.stringify(rawBody).substring(0, 200));

      const validation = SavePageSchema.safeParse(rawBody);
      if (!validation.success) {
        console.error("[ERROR] Validation failed:", validation.error.errors);
        return new Response(
          JSON.stringify({ error: "Invalid request data", details: validation.error.errors }),
          { status: 400, headers: corsHeaders() }
        );
      }

      const body = validation.data;
      const { title, slug, content_json, content, body_html, page_id, content_type, is_template, template_category, preview_image_url } = body;

      const isTemplateMode = is_template === true || is_template === 'true';

      console.log("[DEBUG] Processing save:", {
        page_id,
        title,
        slug,
        content_type,
        isTemplateMode,
        has_content_json: !!content_json,
        has_content: !!content,
        has_body_html: !!body_html
      });

      let htmlContent = body_html || content || '';
      if (htmlContent && !isTemplateMode) {
        htmlContent = enhanceHtmlWithBrandMeta(htmlContent, brand_id);
      }

      const finalContentJson = content_json || {};

      let result;
      if (page_id) {
        console.log("[DEBUG] Updating existing page:", page_id);

        const updateData: any = {
          title,
          slug,
          content_json: finalContentJson,
          updated_at: new Date().toISOString()
        };

        if (htmlContent) {
          updateData.body_html = htmlContent;
        }

        if (content_type) {
          updateData.content_type = content_type;
        }

        if (isTemplateMode) {
          updateData.is_template = true;
          if (template_category) {
            updateData.template_category = template_category;
          }
          if (preview_image_url) {
            updateData.preview_image_url = preview_image_url;
          }
        }

        const { data, error } = await supabase
          .from("pages")
          .update(updateData)
          .eq("id", page_id)
          .select()
          .maybeSingle();

        if (error) throw error;
        result = data;
      } else {
        console.log("[DEBUG] Creating new page");

        const insertData: any = {
          brand_id: isTemplateMode ? null : brand_id,
          title,
          slug,
          content_json: finalContentJson,
          status: "draft",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          show_in_menu: false,
          menu_order: 0,
          parent_slug: null
        };

        if (htmlContent) {
          insertData.body_html = htmlContent;
        }

        if (content_type) {
          insertData.content_type = content_type;
        }

        if (isTemplateMode) {
          insertData.is_template = true;
          if (template_category) {
            insertData.template_category = template_category;
          }
          if (preview_image_url) {
            insertData.preview_image_url = preview_image_url;
          }
        }

        const { data, error } = await supabase
          .from("pages")
          .insert(insertData)
          .select()
          .maybeSingle();

        if (error) throw error;
        result = data;
      }

      if (!isTemplateMode && content_type && ['news', 'destination', 'trip'].includes(content_type)) {
        const tableName = content_type === 'news' ? 'news_items' : content_type === 'destination' ? 'destinations' : 'trips';
        const userId = claims.sub || claims.user_id;

        console.log(`[DEBUG] Syncing ${content_type} to ${tableName} table`);

        const contentData: any = {
          brand_id,
          title,
          slug,
          content: finalContentJson,
          description: finalContentJson.description || finalContentJson.excerpt || '',
          featured_image: finalContentJson.featured_image || finalContentJson.image || '',
          status: 'draft',
          author_type: 'brand',
          author_id: userId,
          page_id: result.id,
        };

        if (content_type === 'news') {
          contentData.source = 'direct';
        }

        const { data: existingContent, error: existingError } = await supabase
          .from(tableName)
          .select('id')
          .eq('slug', slug)
          .eq('brand_id', brand_id)
          .maybeSingle();

        if (existingContent) {
          const { error: updateError } = await supabase
            .from(tableName)
            .update({
              ...contentData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingContent.id);

          if (updateError) {
            console.error(`[ERROR] Failed to update ${tableName}:`, updateError);
          } else {
            console.log(`[DEBUG] Successfully updated ${tableName} with id:`, existingContent.id);
          }
        } else {
          const { error: insertError } = await supabase
            .from(tableName)
            .insert({
              ...contentData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error(`[ERROR] Failed to insert ${tableName}:`, insertError);
          } else {
            console.log(`[DEBUG] Successfully created new ${tableName} record`);
          }
        }
      }

      const responseData: any = {
        page_id: result.id,
        title,
        slug: result.slug,
        content_json: finalContentJson,
        status: "draft"
      };

      if (htmlContent) {
        responseData.content = htmlContent;
        responseData.body_html = htmlContent;
      }

      if (isTemplateMode) {
        responseData.is_template = true;
        responseData.template_category = template_category || 'general';
      } else {
        responseData.brand_id = brand_id;
      }

      console.log("[DEBUG] Sending success response:", responseData);

      const rateLimitInfo = rateLimiter.getInfo(clientId);
      const responseHeaders = addRateLimitHeaders(new Headers(corsHeaders()), rateLimitInfo);

      return new Response(
        JSON.stringify(responseData),
        { status: 200, headers: responseHeaders }
      );
    }

    if (req.method === "POST" && pathParts.includes("publish")) {
      const rawBody = await req.json();

      const validation = PublishPageSchema.safeParse(rawBody);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: "Invalid request data", details: validation.error.errors }),
          { status: 400, headers: corsHeaders() }
        );
      }

      const body = validation.data;
      const page_id = url.searchParams.get("page_id");

      if (!page_id) {
        return new Response(
          JSON.stringify({ error: "Missing page_id parameter" }),
          { status: 400, headers: corsHeaders() }
        );
      }

      const { data: page, error: pageError } = await supabase
        .from("pages")
        .select("*")
        .eq("id", page_id)
        .eq("brand_id", brand_id)
        .maybeSingle();

      if (pageError || !page) {
        return new Response(
          JSON.stringify({ error: "Page not found" }),
          { status: 404, headers: corsHeaders() }
        );
      }

      let htmlContent = body.body_html || page.body_html || '';
      if (htmlContent) {
        htmlContent = enhanceHtmlWithBrandMeta(htmlContent, brand_id);
      }

      const { error: updateError } = await supabase
        .from("pages")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          body_html: htmlContent,
          updated_at: new Date().toISOString()
        })
        .eq("id", page_id);

      if (updateError) throw updateError;

      const rateLimitInfo = rateLimiter.getInfo(clientId);
      const responseHeaders = addRateLimitHeaders(new Headers(corsHeaders()), rateLimitInfo);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Page published successfully"
        }),
        { status: 200, headers: responseHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error("[ERROR] pages-api:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: corsHeaders() }
    );
  }
});