import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { jwtVerify } from "npm:jose@5";

interface JWTPayload {
  brand_id: string;
  user_id?: string;
  sub?: string;
  scope?: string[];
}

async function verifyBearerToken(req: Request, requiredScope?: string): Promise<JWTPayload> {
  console.log("[AUTH DEBUG] Starting token verification...");
  console.log("[AUTH DEBUG] All headers:", Object.fromEntries(req.headers.entries()));

  const url = new URL(req.url);
  const authHeader = req.headers.get("Authorization");
  const tokenFromQuery = url.searchParams.get("token");

  console.log("[AUTH DEBUG] Authorization header:", authHeader ? `${authHeader.substring(0, 20)}...` : "MISSING");
  console.log("[AUTH DEBUG] Token from query:", tokenFromQuery ? `${tokenFromQuery.substring(0, 20)}...` : "MISSING");

  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
    console.log("[AUTH DEBUG] Using token from Authorization header");
  } else if (tokenFromQuery) {
    token = tokenFromQuery;
    console.log("[AUTH DEBUG] Using token from query parameter");
  }

  if (!token) {
    console.error("[AUTH DEBUG] No token found in Authorization header or query parameter");
    const error = new Error("Missing authentication token");
    (error as any).statusCode = 401;
    throw error;
  }

  console.log("[AUTH DEBUG] Token extracted:", token.substring(0, 30) + "...");

  const jwtSecret = Deno.env.get("JWT_SECRET");
  if (!jwtSecret) {
    console.error("[AUTH DEBUG] JWT_SECRET not configured in environment!");
    const error = new Error("JWT_SECRET not configured");
    (error as any).statusCode = 500;
    throw error;
  }
  console.log("[AUTH DEBUG] JWT_SECRET found, length:", jwtSecret.length);

  const encoder = new TextEncoder();
  const secretKey = encoder.encode(jwtSecret);
  try {
    console.log("[AUTH DEBUG] Attempting to verify JWT...");
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    console.log("[AUTH DEBUG] JWT verified successfully! Payload:", JSON.stringify(payload, null, 2));

    if (!payload.brand_id) {
      console.error("[AUTH DEBUG] Token missing brand_id in payload");
      const error = new Error("Invalid token: missing brand_id");
      (error as any).statusCode = 401;
      throw error;
    }

    if (requiredScope) {
      const scopes = (payload.scope as string[]) || [];
      console.log("[AUTH DEBUG] Checking scope:", requiredScope, "Available scopes:", scopes);
      if (!scopes.includes(requiredScope)) {
        console.error("[AUTH DEBUG] Insufficient permissions");
        const error = new Error(`Insufficient permissions: ${requiredScope} required`);
        (error as any).statusCode = 403;
        throw error;
      }
    }

    console.log("[AUTH DEBUG] Authorization successful!");
    return payload as JWTPayload;
  } catch (err) {
    console.error("[AUTH DEBUG] JWT verification failed:", err);
    if ((err as any).statusCode) throw err;
    const error = new Error("Invalid or expired token");
    (error as any).statusCode = 401;
    throw error;
  }
}

function corsHeaders(req?: Request): Headers {
  const headers = new Headers();

  const origin = req?.headers.get('origin') ?? '*';
  const allowedOrigins = [
    'https://www.ai-websitestudio.nl',
    'https://ai-websitestudio.nl',
    'https://www.ai-travelstudio.nl',
    'https://ai-travelstudio.nl',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8000'
  ];

  const isAllowed = allowedOrigins.includes(origin) ||
                   origin.includes('ai-websitestudio.nl') ||
                   origin.includes('ai-travelstudio.nl') ||
                   origin.includes('localhost') ||
                   origin.includes('127.0.0.1');

  const allowOrigin = isAllowed ? origin : '*';

  headers.set('Access-Control-Allow-Origin', allowOrigin);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, apikey');
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('Content-Type', 'application/json');
  return headers;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders(req) });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const contentType = url.searchParams.get("type") || pathParts[pathParts.length - 2];

    const validTypes = ["news_items", "destinations", "trips"];
    if (!validTypes.includes(contentType)) {
      return new Response(
        JSON.stringify({ error: "Invalid content type. Must be: news_items, destinations, or trips" }),
        { status: 400, headers: corsHeaders(req) }
      );
    }

    if (req.method === "POST" && (pathParts.includes("save") || url.pathname.includes("/save"))) {
      const body = await req.json();
      const claims = await verifyBearerToken(req, "content:write");
      const { brand_id, id, title, slug, content, author_type, author_id, ...otherFields } = body;

      console.log('[SAVE DEBUG] Body:', JSON.stringify(body, null, 2));
      console.log('[SAVE DEBUG] Claims:', JSON.stringify(claims, null, 2));
      console.log('[SAVE DEBUG] Author type from body:', author_type);
      console.log('[SAVE DEBUG] Author ID from body:', author_id);

      const SYSTEM_BRAND_ID = '00000000-0000-0000-0000-000000000999';
      const isSystemBrand = claims.brand_id === SYSTEM_BRAND_ID;

      if (!isSystemBrand && claims.brand_id !== brand_id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: corsHeaders(req) }
        );
      }

      if (!brand_id || !title || !slug) {
        return new Response(
          JSON.stringify({ error: "brand_id, title, and slug required" }),
          { status: 400, headers: corsHeaders(req) }
        );
      }

      let result;
      const isAdminNews = author_type === 'admin';

      if (id) {
        const updateData: any = {
          title,
          slug,
          content,
          ...otherFields,
          updated_at: new Date().toISOString(),
        };

        if (contentType === 'news_items') {
          if (isAdminNews) {
            updateData.author_type = 'admin';
            updateData.author_id = author_id || claims.user_id || claims.sub;
          } else {
            updateData.author_type = 'brand';
            updateData.author_id = claims.user_id || claims.sub;
          }
        }

        const { data, error } = await supabase
          .from(contentType)
          .update(updateData)
          .eq("id", id)
          .select("id, slug")
          .maybeSingle();

        if (error) throw error;
        result = data;
      } else {
        const { data: existing } = await supabase
          .from(contentType)
          .select("id")
          .eq("brand_id", brand_id)
          .eq("slug", slug)
          .maybeSingle();

        if (existing) {
          const updateData: any = {
            title,
            content,
            ...otherFields,
            updated_at: new Date().toISOString(),
          };

          if (contentType === 'news_items') {
            if (isAdminNews) {
              updateData.author_type = 'admin';
              updateData.author_id = author_id || claims.user_id || claims.sub;
            } else {
              updateData.author_type = 'brand';
              updateData.author_id = claims.user_id || claims.sub;
            }
          }

          const { data, error } = await supabase
            .from(contentType)
            .update(updateData)
            .eq("id", existing.id)
            .select("id, slug")
            .maybeSingle();

          if (error) throw error;
          result = data;
        } else {
          const insertData: any = {
            brand_id,
            title,
            slug,
            content,
            status: "draft",
            ...otherFields,
          };

          if (contentType === 'news_items') {
            if (isAdminNews) {
              insertData.author_type = 'admin';
              insertData.author_id = author_id || claims.user_id || claims.sub;
            } else {
              insertData.author_type = 'brand';
              insertData.author_id = author_id || claims.user_id || claims.sub;
            }
            console.log('[SAVE DEBUG] Setting author_type:', insertData.author_type, 'author_id:', insertData.author_id);
          }

          console.log('[SAVE DEBUG] Insert data:', JSON.stringify(insertData, null, 2));

          const { data, error } = await supabase
            .from(contentType)
            .insert(insertData)
            .select("id, slug")
            .maybeSingle();

          if (error) throw error;
          result = data;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          id: result.id,
          slug: result.slug,
          status: "draft",
          message: "Content saved successfully"
        }),
        { status: 200, headers: corsHeaders(req) }
      );
    }

    if (req.method === "PUT") {
      const body = await req.json();
      const claims = await verifyBearerToken(req, "content:write");
      const brandId = url.searchParams.get("brand_id");
      const slugParam = url.searchParams.get("slug");
      const itemId = pathParts[pathParts.length - 1];

      const { content: bodyContent, ...otherFields } = body;

      const SYSTEM_BRAND_ID = '00000000-0000-0000-0000-000000000999';
      const isSystemBrand = claims.brand_id === SYSTEM_BRAND_ID;

      if (!brandId || (!isSystemBrand && claims.brand_id !== brandId)) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: corsHeaders(req) }
        );
      }

      let targetId: string | null = null;

      if (slugParam) {
        const { data: bySlug } = await supabase
          .from(contentType)
          .select("id")
          .eq("brand_id", brandId)
          .eq("slug", slugParam)
          .maybeSingle();
        targetId = bySlug?.id || null;
      } else if (itemId && itemId !== "content-api") {
        const { data: bySlug } = await supabase
          .from(contentType)
          .select("id")
          .eq("brand_id", brandId)
          .eq("slug", itemId)
          .maybeSingle();

        if (bySlug) {
          targetId = bySlug.id;
        } else {
          targetId = itemId;
        }
      }

      if (!targetId) {
        return new Response(
          JSON.stringify({ error: "Content not found" }),
          { status: 404, headers: corsHeaders(req) }
        );
      }

      const updateData: any = {
        content: bodyContent,
        ...otherFields,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from(contentType)
        .update(updateData)
        .eq("id", targetId)
        .eq("brand_id", brandId)
        .select("id, slug")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return new Response(
          JSON.stringify({ error: "Content not found or unauthorized" }),
          { status: 404, headers: corsHeaders(req) }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          id: data.id,
          slug: data.slug,
          message: "Content updated successfully"
        }),
        { status: 200, headers: corsHeaders(req) }
      );
    }

    if (req.method === "POST" && (pathParts.includes("publish") || url.pathname.includes("/publish"))) {
      const body = await req.json();
      const claims = await verifyBearerToken(req, "content:write");

      let brand_id = body.brand_id || url.searchParams.get("brand_id") || claims.brand_id;
      let id = body.id || url.searchParams.get("id");
      let slug = body.slug || url.searchParams.get("slug");

      console.log("[PUBLISH DEBUG] Extracted params:", { brand_id, id, slug, body, query: Object.fromEntries(url.searchParams) });

      const SYSTEM_BRAND_ID = '00000000-0000-0000-0000-000000000999';
      const isSystemBrand = claims.brand_id === SYSTEM_BRAND_ID;

      if (!isSystemBrand && claims.brand_id !== brand_id) {
        console.error("[PUBLISH DEBUG] Brand mismatch:", { claimsBrandId: claims.brand_id, providedBrandId: brand_id });
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: corsHeaders(req) }
        );
      }

      if (!brand_id || (!id && !slug)) {
        console.error("[PUBLISH DEBUG] Missing required params:", { brand_id, id, slug });
        return new Response(
          JSON.stringify({ error: "brand_id and (id or slug) required" }),
          { status: 400, headers: corsHeaders(req) }
        );
      }

      let query = supabase.from(contentType).select("id, slug, author_type");

      if (id) {
        query = query.eq("id", id);
      } else {
        query = query.eq("brand_id", brand_id).eq("slug", slug);
      }

      const { data: item } = await query.maybeSingle();

      if (!item) {
        return new Response(
          JSON.stringify({ error: "Content not found" }),
          { status: 404, headers: corsHeaders(req) }
        );
      }

      const authorType = item.author_type || 'brand';
      let assignmentUpdated = false;
      let responseKind = 'brand';

      if (contentType === 'news_items' && authorType === 'admin') {
        responseKind = 'admin';

        const { data: assignment } = await supabase
          .from('news_brand_assignments')
          .select('id')
          .eq('news_id', item.id)
          .eq('brand_id', brand_id)
          .maybeSingle();

        if (assignment) {
          const { error: assignError } = await supabase
            .from('news_brand_assignments')
            .update({
              is_published: true,
              status: 'accepted',
              acknowledged_at: new Date().toISOString()
            })
            .eq('id', assignment.id);

          if (assignError) throw assignError;
          assignmentUpdated = true;
        }
      }

      const { data, error } = await supabase
        .from(contentType)
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .select("id, slug, status")
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          id: data.id,
          slug: data.slug,
          status: data.status,
          kind: responseKind,
          assignment_updated: assignmentUpdated,
          message: "Content published successfully"
        }),
        { status: 200, headers: corsHeaders(req) }
      );
    }

    if (req.method === "DELETE") {
      const claims = await verifyBearerToken(req, "content:write");
      const itemId = pathParts[pathParts.length - 1];

      if (!itemId || itemId === "content-api") {
        return new Response(
          JSON.stringify({ error: "id is required" }),
          { status: 400, headers: corsHeaders(req) }
        );
      }

      const { data: item } = await supabase
        .from(contentType)
        .select("brand_id")
        .eq("id", itemId)
        .maybeSingle();

      if (!item) {
        return new Response(
          JSON.stringify({ error: "Content not found" }),
          { status: 404, headers: corsHeaders(req) }
        );
      }

      const SYSTEM_BRAND_ID = '00000000-0000-0000-0000-000000000999';
      const isSystemBrand = claims.brand_id === SYSTEM_BRAND_ID;

      if (!isSystemBrand && claims.brand_id !== item.brand_id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: corsHeaders(req) }
        );
      }

      const { error } = await supabase
        .from(contentType)
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Content deleted successfully" }),
        { status: 200, headers: corsHeaders(req) }
      );
    }

    if (req.method === "GET" && pathParts.includes("list")) {
      const brandId = url.searchParams.get("brand_id");
      const status = url.searchParams.get("status");
      const includeAssigned = url.searchParams.get("include_assigned") === "true";

      if (!brandId) {
        return new Response(
          JSON.stringify({ error: "brand_id is required" }),
          { status: 400, headers: corsHeaders(req) }
        );
      }

      if (contentType === "news_items" && includeAssigned) {
        const { data: ownNews, error: ownError } = await supabase
          .from("news_items")
          .select("*, author_type, is_mandatory")
          .eq("brand_id", brandId)
          .order("updated_at", { ascending: false });

        if (ownError) throw ownError;

        const { data: assignments, error: assignError } = await supabase
          .from("news_brand_assignments")
          .select(`
            news_id,
            status,
            news_items!inner (
              id,
              title,
              slug,
              content,
              excerpt,
              featured_image,
              status,
              author_type,
              is_mandatory,
              published_at,
              created_at,
              updated_at
            )
          `)
          .eq("brand_id", brandId)
          .in("status", ["accepted", "mandatory"]);

        if (assignError) throw assignError;

        const assignedNews = (assignments || []).map(a => {
          const newsItem = Array.isArray(a.news_items) ? a.news_items[0] : a.news_items;
          return {
            ...newsItem,
            author_type: newsItem.author_type || "admin",
            is_mandatory: newsItem.is_mandatory || false
          };
        });

        const allNews = [...(ownNews || []), ...assignedNews];

        return new Response(JSON.stringify({ items: allNews }), { status: 200, headers: corsHeaders(req) });
      }

      let query = supabase
        .from(contentType)
        .select("*")
        .eq("brand_id", brandId);

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });
      if (error) throw error;

      return new Response(JSON.stringify({ items: data || [] }), { status: 200, headers: corsHeaders(req) });
    }

    if (req.method === "GET") {
      const brandId = url.searchParams.get("brand_id");
      const slugParam = url.searchParams.get("slug");
      const itemId = pathParts[pathParts.length - 1];

      if (!brandId) {
        return new Response(
          JSON.stringify({ error: "brand_id is required" }),
          { status: 400, headers: corsHeaders(req) }
        );
      }

      let query = supabase.from(contentType).select("*").eq("brand_id", brandId);

      if (slugParam) {
        query = query.eq("slug", slugParam);
      }
      else if (itemId && itemId !== "content-api") {
        const { data: bySlug } = await supabase
          .from(contentType)
          .select("*")
          .eq("brand_id", brandId)
          .eq("slug", itemId)
          .maybeSingle();

        if (bySlug) {
          return new Response(JSON.stringify({ item: bySlug }), { status: 200, headers: corsHeaders(req) });
        }

        query = query.eq("id", itemId);
      } else {
        return new Response(
          JSON.stringify({ error: "slug or id is required" }),
          { status: 400, headers: corsHeaders(req) }
        );
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      if (!data) {
        return new Response(
          JSON.stringify({ error: "Content not found" }),
          { status: 404, headers: corsHeaders(req) }
        );
      }

      return new Response(JSON.stringify({ item: data }), { status: 200, headers: corsHeaders(req) });
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: corsHeaders(req) }
    );
  } catch (error) {
    console.error("Error:", error);
    const statusCode = (error as any).statusCode || 500;
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        timestamp: new Date().toISOString()
      }),
      { status: statusCode, headers: corsHeaders(req) }
    );
  }
});