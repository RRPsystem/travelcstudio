import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { jwtVerify } from "npm:jose@5";

interface JWTPayload {
  brand_id: string;
  user_id?: string;
  sub?: string;
  scope?: string[];
  is_template?: boolean;
}

async function verifyBearerToken(req: Request, supabaseClient: any, requiredScope?: string, alternativeScopes?: string[]): Promise<JWTPayload> {
  const url = new URL(req.url);
  const authHeader = req.headers.get("Authorization");
  const tokenFromQuery = url.searchParams.get("token");

  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (tokenFromQuery) {
    token = tokenFromQuery;
  }

  if (!token) {
    const error = new Error("Missing authentication token");
    (error as any).statusCode = 401;
    throw error;
  }
  console.log("[VERIFY] Token received:", { length: token.length, first30: token.substring(0, 30) });

  const jwtSecret = Deno.env.get("JWT_SECRET");
  if (!jwtSecret) {
    const error = new Error("JWT_SECRET not configured");
    (error as any).statusCode = 500;
    throw error;
  }
  console.log("[VERIFY] Secret available:", { length: jwtSecret.length, first10: jwtSecret.substring(0, 10) });

  const encoder = new TextEncoder();
  const secretKey = encoder.encode(jwtSecret);

  try {
    console.log("[VERIFY] Attempting to verify custom JWT...");
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    console.log("[VERIFY] Custom JWT verified successfully:", payload);
    const typedPayload = payload as unknown as JWTPayload;

    if (requiredScope) {
      const hasRequiredScope = typedPayload.scope?.includes(requiredScope);
      const hasAlternativeScope = alternativeScopes?.some(scope => typedPayload.scope?.includes(scope));

      if (!hasRequiredScope && !hasAlternativeScope) {
        const error = new Error(`Missing required scope: ${requiredScope}${alternativeScopes ? ` or ${alternativeScopes.join(', ')}` : ''}`);
        (error as any).statusCode = 403;
        throw error;
      }
    }

    return typedPayload;
  } catch (err) {
    console.log("[VERIFY] Custom JWT verification failed, trying Supabase auth...");

    try {
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !user) {
        throw new Error('Supabase auth verification failed');
      }

      console.log("[VERIFY] Supabase auth verified, fetching user data...");
      const { data: userData, error: dbError } = await supabaseClient
        .from('users')
        .select('brand_id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (dbError || !userData || !userData.brand_id) {
        throw new Error('User data not found or no brand assigned');
      }

      console.log("[VERIFY] Supabase auth successful:", { brand_id: userData.brand_id, user_id: user.id });

      return {
        brand_id: userData.brand_id,
        sub: user.id,
        user_id: user.id,
        scope: ['pages:read', 'pages:write', 'content:read', 'content:write']
      };
    } catch (supabaseErr) {
      console.error("[VERIFY] Both JWT and Supabase auth failed");
      const error = new Error(`Invalid JWT: ${err.message}`);
      (error as any).statusCode = 401;
      throw error;
    }
  }
}

function corsHeaders(): Headers {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info, Apikey');
  headers.set('Content-Type', 'application/json');
  return headers;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders() });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    console.log("[DEBUG] Request:", {
      method: req.method,
      pathname: url.pathname,
      pathParts,
      hasAuth: req.headers.has("Authorization")
    });

    if (req.method === "POST" && (pathParts.includes("saveDraft") || pathParts.includes("save"))) {
      console.log("[DEBUG] Processing saveDraft/save");
      const body = await req.json();
      console.log("[DEBUG] Body:", {
        has_brand_id: !!body.brand_id,
        has_page_id: !!body.page_id,
        is_template: body.is_template,
        title: body.title,
        slug: body.slug,
        content_json_keys: body.content_json ? Object.keys(body.content_json) : [],
        content_json_sample: body.content_json ? JSON.stringify(body.content_json).substring(0, 200) : null
      });

      const claims = await verifyBearerToken(req, supabase, "content:write", ["pages:write"]);
      console.log("[DEBUG] Claims verified:", { brand_id: claims.brand_id, sub: claims.sub, has_content_type: !!(claims as any).content_type });

      let { brand_id, page_id, title, slug, is_template, template_category, preview_image_url, content_type } = body;

      if (!content_type && (claims as any).content_type) {
        content_type = (claims as any).content_type;
        console.log("[DEBUG] Using content_type from JWT:", content_type);
      }

      if (!content_type && (claims as any).mode === 'news') {
        content_type = 'news';
        console.log("[DEBUG] Detected news mode from JWT");
      }

      if (!content_type) {
        const referer = req.headers.get('Referer') || req.headers.get('Origin') || '';
        if (referer.includes('content_type=news') || referer.includes('mode=news')) {
          content_type = 'news';
          console.log("[DEBUG] Detected news content from referer");
        }
      }

      let content_json = body.content_json || body.json || body.content || body.layout || {};

      if (body.htmlSnapshot) {
        content_json.htmlSnapshot = body.htmlSnapshot;

        if (!content_type) {
          if (body.htmlSnapshot.includes('na-title') || body.htmlSnapshot.includes('na-content') || body.htmlSnapshot.includes('na-author')) {
            content_type = 'news';
            console.log("[DEBUG] Detected news content from HTML structure");
          } else {
            content_type = 'page';
            console.log("[DEBUG] Detected page content (no news markers found)");
          }
        }

        if (content_type === 'news' && title === 'Pagina') {
          const titleMatch = body.htmlSnapshot.match(/class="na-title"[^>]*>([^<]+)</);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
            content_json.title = title;
            console.log("[DEBUG] Extracted title from htmlSnapshot:", title);
          }
        }
      }

      console.log("[DEBUG] Extracted content_json:", {
        keys: Object.keys(content_json),
        has_layout: !!content_json.layout,
        has_json: !!content_json.json,
        has_htmlSnapshot: !!content_json.htmlSnapshot,
        final_title: title
      });

      const isTemplateFromJWT = claims.is_template === true;
      const isTemplateFromBody = is_template === true;
      const isTemplateMode = isTemplateFromJWT || isTemplateFromBody;

      console.log("[DEBUG] Template mode check:", {
        isTemplateFromJWT,
        isTemplateFromBody,
        isTemplateMode,
        jwtBrandId: claims.brand_id,
        bodyBrandId: brand_id
      });

      if (isTemplateMode) {
        if (!title || !slug) {
          return new Response(
            JSON.stringify({ error: "title and slug required for templates" }),
            { status: 400, headers: corsHeaders() }
          );
        }
      } else {
        if (claims.brand_id !== brand_id) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 403, headers: corsHeaders() }
          );
        }

        if (!brand_id || !title || !slug) {
          return new Response(
            JSON.stringify({ error: "brand_id, title, and slug required" }),
            { status: 400, headers: corsHeaders() }
          );
        }
      }

      let result;

      if (page_id) {
        const { data: currentPage } = await supabase
          .from("pages")
          .select("version")
          .eq("id", page_id)
          .maybeSingle();

        const updateData: any = {
          title,
          slug,
          content_json,
          status: "draft",
          version: (currentPage?.version || 0) + 1,
          updated_at: new Date().toISOString(),
        };

        if (content_type) {
          updateData.content_type = content_type;
        }

        if (isTemplateMode) {
          updateData.is_template = true;
          updateData.template_category = template_category || 'general';
          if (preview_image_url) {
            updateData.preview_image_url = preview_image_url;
          }
        }

        const { data, error } = await supabase
          .from("pages")
          .update(updateData)
          .eq("id", page_id)
          .select("id, slug")
          .maybeSingle();

        if (error) throw error;
        result = data;
      } else {
        console.log("[DEBUG] No page_id provided, creating new page/template with unique slug");

        let finalSlug = slug;
        let slugSuffix = 1;

        while (true) {
          let query = supabase
            .from("pages")
            .select("id, slug")
            .eq("slug", finalSlug);

          if (!isTemplateMode && brand_id) {
            query = query.eq("brand_id", brand_id);
          } else if (isTemplateMode) {
            query = query.eq("is_template", true);
          }

          const { data } = await query.maybeSingle();

          if (!data) {
            break;
          }

          slugSuffix++;
          const baseSlug = slug.replace(/-\d+$/, '');
          finalSlug = `${baseSlug}-${slugSuffix}`;
          console.log(`[DEBUG] Slug '${slug}' exists, trying '${finalSlug}'`);
        }

        const userId = claims.sub || claims.user_id;
        const finalTitle = slugSuffix > 1 ? `${title} ${slugSuffix}` : title;

        console.log(`[DEBUG] Creating new ${isTemplateMode ? 'template' : 'page'} with slug: ${finalSlug}, title: ${finalTitle}`);

        const insertData: any = {
          title: finalTitle,
          slug: finalSlug,
          content_json,
          status: "draft",
          version: 1,
          content_type: content_type || "page",
          show_in_menu: false,
          menu_order: 0,
          parent_slug: null,
        };

        if (isTemplateMode) {
          insertData.is_template = true;
          insertData.brand_id = null;
          insertData.owner_user_id = null;
          insertData.template_category = template_category || 'general';
          if (preview_image_url) {
            insertData.preview_image_url = preview_image_url;
          }
        } else {
          insertData.is_template = false;
          insertData.brand_id = brand_id;
          insertData.owner_user_id = userId;
          insertData.created_by = userId;
        }

        const { data, error } = await supabase
          .from("pages")
          .insert(insertData)
          .select("id, slug")
          .maybeSingle();

        if (error) throw error;
        result = data;
      }

      const responseData: any = {
        page_id: result.id,
        title,
        slug: result.slug,
        content_json,
        status: "draft"
      };

      if (isTemplateMode) {
        responseData.is_template = true;
        responseData.template_category = template_category || 'general';
      } else {
        responseData.brand_id = brand_id;
      }

      console.log("[DEBUG] Sending success response:", responseData);

      return new Response(
        JSON.stringify(responseData),
        { status: 200, headers: corsHeaders() }
      );
    }

    if (req.method === "POST" && pathParts.includes("publish")) {
      const body = await req.json();
      const claims = await verifyBearerToken(req, supabase, "content:write", ["pages:write"]);
      const pageId = pathParts[pathParts.length - 2];
      const { body_html } = body;

      if (!pageId || pageId === "pages-api") {
        return new Response(
          JSON.stringify({ error: "Invalid page_id in URL" }),
          { status: 400, headers: corsHeaders() }
        );
      }

      const { data: page, error: fetchError } = await supabase
        .from("pages")
        .select("brand_id, version")
        .eq("id", pageId)
        .maybeSingle();

      if (fetchError || !page) {
        return new Response(
          JSON.stringify({ error: "Page not found" }),
          { status: 404, headers: corsHeaders() }
        );
      }

      if (claims.brand_id !== page.brand_id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: corsHeaders() }
        );
      }

      const { data, error } = await supabase
        .from("pages")
        .update({
          body_html,
          status: "published",
          version: (page.version || 0) + 1,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", pageId)
        .select("id, slug, version")
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          page_id: data.id,
          slug: data.slug,
          version: data.version,
          message: "Page published successfully"
        }),
        { status: 200, headers: corsHeaders() }
      );
    }

    if (req.method === "GET" && pathParts.includes("list")) {
      const claims = await verifyBearerToken(req, supabase, "content:read", ["pages:read"]);
      const brandId = url.searchParams.get("brand_id") || claims.brand_id;

      if (claims.brand_id !== brandId) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: corsHeaders() }
        );
      }

      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("brand_id", brandId)
        .or("content_type.eq.page,content_type.is.null")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ items: data || [] }), { status: 200, headers: corsHeaders() });
    }

    if (req.method === "GET" && pathParts.length >= 2) {
      const pageId = pathParts[pathParts.length - 1];
      if (pageId !== "pages-api" && pageId !== "list") {
        const claims = await verifyBearerToken(req, supabase, "content:read", ["pages:read"]);

        const { data, error } = await supabase
          .from("pages")
          .select("*")
          .eq("id", pageId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          return new Response(
            JSON.stringify({ error: "Page not found" }),
            { status: 404, headers: corsHeaders() }
          );
        }

        if (!data.is_template && claims.brand_id !== data.brand_id) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 403, headers: corsHeaders() }
          );
        }

        if (data.content_json && data.content_json.htmlSnapshot && !data.content_json.layout && !data.content_json.json) {
          console.log("[DEBUG] Converting htmlSnapshot to layout for builder");
          data.content_json.layout = {
            html: data.content_json.htmlSnapshot,
            css: "",
            js: ""
          };
        }

        return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders() });
      }
    }

    if (req.method === "DELETE" && pathParts.length >= 2) {
      const pageId = pathParts[pathParts.length - 1];
      if (pageId !== "pages-api") {
        const claims = await verifyBearerToken(req, supabase, "content:write", ["pages:write"]);

        const { data: page, error: fetchError } = await supabase
          .from("pages")
          .select("brand_id")
          .eq("id", pageId)
          .maybeSingle();

        if (fetchError || !page) {
          return new Response(
            JSON.stringify({ error: "Page not found" }),
            { status: 404, headers: corsHeaders() }
          );
        }

        if (claims.brand_id !== page.brand_id) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 403, headers: corsHeaders() }
          );
        }

        const { error } = await supabase
          .from("pages")
          .delete()
          .eq("id", pageId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: "Page deleted successfully" }),
          { status: 200, headers: corsHeaders() }
        );
      }
    }

    if (req.method === "GET" && (url.pathname.endsWith("/pages") || url.pathname.endsWith("/pages-api"))) {
      const apikey = url.searchParams.get("apikey");
      const preview = url.searchParams.get("preview");
      const brand_id = url.searchParams.get("brand_id");
      const page_id = url.searchParams.get("page_id");

      if (page_id) {
        const { data, error } = await supabase
          .from("pages")
          .select("*")
          .eq("id", page_id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          return new Response(
            JSON.stringify({ error: "Page not found" }),
            { status: 404, headers: corsHeaders() }
          );
        }

        // Apply builder compatibility conversion
        if (data.content_json && data.content_json.htmlSnapshot && !data.content_json.layout && !data.content_json.json) {
          console.log("[DEBUG] Converting htmlSnapshot to layout for builder (anon query)");
          data.content_json.layout = {
            html: data.content_json.htmlSnapshot,
            css: "",
            js: ""
          };
        }

        return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders() });
      }

      if (apikey) {
        const { data: apiSettings, error: apiError } = await supabase
          .from("api_settings")
          .select("api_key, brand_id, can_read_content")
          .eq("api_key", apikey)
          .maybeSingle();

        if (apiError || !apiSettings || !apiSettings.can_read_content) {
          return new Response(
            JSON.stringify({ error: "Invalid API key or insufficient permissions" }),
            { status: 403, headers: corsHeaders() }
          );
        }

        let query = supabase
          .from("pages")
          .select("*")
          .eq("brand_id", apiSettings.brand_id)
          .or("content_type.eq.page,content_type.is.null");

        if (preview !== "true") {
          query = query.eq("status", "published");
        }

        const { data, error } = await query.order("updated_at", { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify({ items: data || [] }), { status: 200, headers: corsHeaders() });
      } else {
        if (!brand_id) {
          return new Response(
            JSON.stringify({ error: "brand_id is required" }),
            { status: 400, headers: corsHeaders() }
          );
        }

        const { data, error } = await supabase
          .from("pages")
          .select("*")
          .eq("brand_id", brand_id)
          .or("content_type.eq.page,content_type.is.null")
          .order("updated_at", { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify({ items: data || [] }), { status: 200, headers: corsHeaders() });
      }
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: corsHeaders() }
    );
  } catch (error) {
    console.error("[ERROR] Full error:", error);
    console.error("[ERROR] Error message:", error?.message);
    console.error("[ERROR] Error stack:", error?.stack);
    const statusCode = (error as any).statusCode || 500;
    return new Response(
      JSON.stringify({
        error: error?.message || "Internal server error",
        details: error?.toString(),
        timestamp: new Date().toISOString()
      }),
      { status: statusCode, headers: corsHeaders() }
    );
  }
});