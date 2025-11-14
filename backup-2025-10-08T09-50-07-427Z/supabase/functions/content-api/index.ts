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
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }
  const token = authHeader.substring(7);
  const jwtSecret = Deno.env.get("JWT_SECRET");
  if (!jwtSecret) throw new Error("JWT_SECRET not configured");

  const encoder = new TextEncoder();
  const secretKey = encoder.encode(jwtSecret);
  const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
  if (!payload.brand_id) throw new Error("Invalid token: missing brand_id");

  if (requiredScope) {
    const scopes = (payload.scope as string[]) || [];
    if (!scopes.includes(requiredScope)) {
      throw new Error(`Insufficient permissions: ${requiredScope} required`);
    }
  }

  return payload as JWTPayload;
}

function corsHeaders(): Headers {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  headers.set('Access-Control-Allow-Headers', '*');
  headers.set('Access-Control-Max-Age', '86400');
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
    const contentType = url.searchParams.get("type") || pathParts[pathParts.length - 2];

    const validTypes = ["news_items", "destinations", "trips"];
    if (!validTypes.includes(contentType)) {
      return new Response(
        JSON.stringify({ error: "Invalid content type. Must be: news_items, destinations, or trips" }),
        { status: 400, headers: corsHeaders() }
      );
    }

    if (req.method === "POST" && pathParts.includes("save")) {
      const body = await req.json();
      const claims = await verifyBearerToken(req, "content:write");
      const { brand_id, id, title, slug, content, author_type, author_id, ...otherFields } = body;

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
              insertData.author_id = claims.user_id || claims.sub;
            }
          }

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
          message: "Content saved successfully"
        }),
        { status: 200, headers: corsHeaders() }
      );
    }

    if (req.method === "PUT") {
      const body = await req.json();
      const claims = await verifyBearerToken(req, "content:write");
      const brandId = url.searchParams.get("brand_id");
      const slugParam = url.searchParams.get("slug");
      const itemId = pathParts[pathParts.length - 1];

      const { content: bodyContent, ...otherFields } = body;

      if (!brandId || claims.brand_id !== brandId) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: corsHeaders() }
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
          { status: 404, headers: corsHeaders() }
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
          { status: 404, headers: corsHeaders() }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          id: data.id,
          slug: data.slug,
          message: "Content updated successfully"
        }),
        { status: 200, headers: corsHeaders() }
      );
    }

    if (req.method === "POST" && pathParts.includes("publish")) {
      const body = await req.json();
      const claims = await verifyBearerToken(req, "content:write");
      const { brand_id, id, slug } = body;

      if (claims.brand_id !== brand_id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: corsHeaders() }
        );
      }

      if (!brand_id || (!id && !slug)) {
        return new Response(
          JSON.stringify({ error: "brand_id and (id or slug) required" }),
          { status: 400, headers: corsHeaders() }
        );
      }

      let query = supabase.from(contentType).select("id, slug");

      if (id) {
        query = query.eq("id", id);
      } else {
        query = query.eq("brand_id", brand_id).eq("slug", slug);
      }

      const { data: item } = await query.maybeSingle();

      if (!item) {
        return new Response(
          JSON.stringify({ error: "Content not found" }),
          { status: 404, headers: corsHeaders() }
        );
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
          message: "Content published successfully"
        }),
        { status: 200, headers: corsHeaders() }
      );
    }

    if (req.method === "DELETE") {
      const claims = await verifyBearerToken(req, "content:write");
      const itemId = pathParts[pathParts.length - 1];

      if (!itemId || itemId === "content-api") {
        return new Response(
          JSON.stringify({ error: "id is required" }),
          { status: 400, headers: corsHeaders() }
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
          { status: 404, headers: corsHeaders() }
        );
      }

      if (claims.brand_id !== item.brand_id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: corsHeaders() }
        );
      }

      const { error } = await supabase
        .from(contentType)
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Content deleted successfully" }),
        { status: 200, headers: corsHeaders() }
      );
    }

    if (req.method === "GET" && pathParts.includes("list")) {
      const brandId = url.searchParams.get("brand_id");
      const status = url.searchParams.get("status");
      const includeAssigned = url.searchParams.get("include_assigned") === "true";

      if (!brandId) {
        return new Response(
          JSON.stringify({ error: "brand_id is required" }),
          { status: 400, headers: corsHeaders() }
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

        return new Response(JSON.stringify({ items: allNews }), { status: 200, headers: corsHeaders() });
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

      return new Response(JSON.stringify({ items: data || [] }), { status: 200, headers: corsHeaders() });
    }

    if (req.method === "GET") {
      const brandId = url.searchParams.get("brand_id");
      const slugParam = url.searchParams.get("slug");
      const itemId = pathParts[pathParts.length - 1];

      if (!brandId) {
        return new Response(
          JSON.stringify({ error: "brand_id is required" }),
          { status: 400, headers: corsHeaders() }
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
          return new Response(JSON.stringify({ item: bySlug }), { status: 200, headers: corsHeaders() });
        }

        query = query.eq("id", itemId);
      } else {
        return new Response(
          JSON.stringify({ error: "slug or id is required" }),
          { status: 400, headers: corsHeaders() }
        );
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      if (!data) {
        return new Response(
          JSON.stringify({ error: "Content not found" }),
          { status: 404, headers: corsHeaders() }
        );
      }

      return new Response(JSON.stringify({ item: data }), { status: 200, headers: corsHeaders() });
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: corsHeaders() }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: corsHeaders() }
    );
  }
});
