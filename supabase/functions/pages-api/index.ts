import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { jwtVerify } from "npm:jose@5";
import { SavePageSchema, PublishPageSchema } from "./schemas.ts";
import { RateLimiter, getClientId, addRateLimitHeaders } from "../_shared/rate-limit.ts";

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
  console.log("[VERIFY] Token received, length:", token.length);

  const jwtSecret = Deno.env.get("JWT_SECRET");
  if (!jwtSecret) {
    const error = new Error("JWT_SECRET not configured");
    (error as any).statusCode = 500;
    throw error;
  }
  console.log("[VERIFY] Secret available, length:", jwtSecret.length);

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
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Client-Info, Apikey");
  return headers;
}

// Rate limiter: 100 requests per minute per client
const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 100 });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders() });
  }

  // Apply rate limiting
  const clientId = getClientId(req);
  try {
    rateLimiter.check(clientId);
  } catch (error: any) {
    const rateLimitInfo = rateLimiter.getInfo(clientId);
    const headers = addRateLimitHeaders(corsHeaders(), rateLimitInfo);
    if (error.retryAfter) {
      headers.set('Retry-After', error.retryAfter.toString());
    }
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 429, headers }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    console.log("[DEBUG] Incoming request:", {
      method: req.method,
      pathname: url.pathname,
      pathParts,
      searchParams: Object.fromEntries(url.searchParams.entries()),
    });

    if (req.method === "POST" && (pathParts.includes("save") || pathParts.includes("saveDraft"))) {
      console.log("[DEBUG] Processing saveDraft/save");
      const rawBody = await req.json();

      const validation = SavePageSchema.safeParse(rawBody);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: "Invalid request data", details: validation.error.errors }),
          { status: 400, headers: corsHeaders() }
        );
      }

      const body = validation.data;
      console.log("[DEBUG] Body:", {
        title: body.title,
        slug: body.slug,
        has_content: !!body.content_json,
        page_id: body.page_id,
        content_type: body.content_type,
        is_template: body.is_template,
        template_category: body.template_category,
        preview_image_url: body.preview_image_url
      });

      const claims = await verifyBearerToken(req, supabase, "content:write", ["pages:write"]);
      const { brand_id, user_id, sub } = claims;
      const isTemplateMode = body.is_template === true || body.is_template === 'true';

      console.log("[DEBUG] Verified claims:", {
        brand_id,
        user_id: user_id || sub,
        isTemplateMode
      });

      const {
        title,
        slug,
        content_json,
        page_id,
        content_type,
        template_category,
        preview_image_url
      } = body;

      let result: any;

      if (page_id) {
        console.log("[DEBUG] Updating existing page with id:", page_id);

        const { data: existingPage, error: fetchError } = await supabase
          .from("pages")
          .select("id, version")
          .eq("id", page_id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!existingPage) {
          return new Response(
            JSON.stringify({ error: "Page not found" }),
            { status: 404, headers: corsHeaders() }
          );
        }

        const newVersion = (existingPage.version || 1) + 1;

        const updateData: any = {
          title,
          content_json,
          updated_at: new Date().toISOString(),
          version: newVersion
        };

        if (isTemplateMode && template_category) {
          updateData.template_category = template_category;
        }
        if (isTemplateMode && preview_image_url) {
          updateData.preview_image_url = preview_image_url;
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

      if (!isTemplateMode && content_type && ['news', 'destination', 'trip'].includes(content_type)) {
        const tableName = content_type === 'news' ? 'news_items' : content_type === 'destination' ? 'destinations' : 'trips';
        const userId = claims.sub || claims.user_id;

        console.log(`[DEBUG] Syncing ${content_type} to ${tableName} table`);

        const contentData: any = {
          brand_id,
          title,
          slug,
          content: content_json,
          description: content_json.description || content_json.excerpt || '',
          featured_image: content_json.featured_image || content_json.image || '',
          status: 'draft',
          author_type: 'brand',
          author_id: userId,
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
      const rawBody = await req.json();

      const validation = PublishPageSchema.safeParse(rawBody);
      if (!validation.success) {
        return new Response(
          JSON.stringify({ error: "Invalid request data", details: validation.error.errors }),
          { status: 400, headers: corsHeaders() }
        );
      }

      const body = validation.data;
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

      const newVersion = (page.version || 1) + 1;

      const { error } = await supabase
        .from("pages")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          body_html,
          version: newVersion,
          updated_at: new Date().toISOString()
        })
        .eq("id", pageId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: corsHeaders() }
      );
    }

    if (req.method === "GET") {
      console.log("[DEBUG] GET request to pages-api");

      const claims = await verifyBearerToken(req, supabase, "pages:read");
      const { brand_id } = claims;
      const isTemplateMode = url.searchParams.get('is_template') === 'true';

      const pageIdFromQuery = url.searchParams.get('page_id');
      const pageIdFromPath = pathParts[pathParts.length - 1];
      const pageId = pageIdFromQuery || pageIdFromPath;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId);

      if (isUUID && pageId) {
        console.log("[DEBUG] Fetching single page:", pageId);

        const { data: page, error } = await supabase
          .from("pages")
          .select("*")
          .eq("id", pageId)
          .maybeSingle();

        if (error) throw error;

        if (!page) {
          return new Response(
            JSON.stringify({ error: "Page not found" }),
            { status: 404, headers: corsHeaders() }
          );
        }

        const responseData: any = {
          id: page.id,
          title: page.title,
          slug: page.slug,
          html: page.content_json || {},
          content_json: page.content_json || {},
          brand_id: page.brand_id,
          content_type: page.content_type,
          is_template: page.is_template,
          template_category: page.template_category,
          version: page.version,
          created_at: page.created_at,
          updated_at: page.updated_at
        };

        return new Response(
          JSON.stringify(responseData),
          { status: 200, headers: corsHeaders() }
        );
      }

      console.log("[DEBUG] Fetching pages list for:", { brand_id, isTemplateMode });

      let query = supabase
        .from("pages")
        .select("*")
        .order("updated_at", { ascending: false });

      if (isTemplateMode) {
        query = query.eq("is_template", true);
      } else if (brand_id) {
        query = query.eq("brand_id", brand_id).eq("is_template", false);
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify(data || []),
        { status: 200, headers: corsHeaders() }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error("[ERROR] pages-api error:", error);
    const statusCode = error.statusCode || 500;
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: statusCode, headers: corsHeaders() }
    );
  }
});