import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { jwtVerify } from "npm:jose@5";

interface JWTPayload {
  brand_id: string;
  user_id?: string;
  sub?: string;
}

async function verifyBearerToken(req: Request): Promise<JWTPayload> {
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

    if (req.method === "POST" && pathParts.includes("saveDraft")) {
      const body = await req.json();
      const claims = await verifyBearerToken(req);
      const { brand_id, page_id, title, slug, content_json } = body;

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

      if (page_id) {
        const { data: currentPage } = await supabase
          .from("pages")
          .select("version")
          .eq("id", page_id)
          .maybeSingle();

        const { data, error } = await supabase
          .from("pages")
          .update({
            title,
            slug,
            content_json,
            status: "draft",
            version: (currentPage?.version || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", page_id)
          .select("id, slug")
          .maybeSingle();

        if (error) throw error;
        result = data;
      } else {
        const { data: existingPage } = await supabase
          .from("pages")
          .select("id, version")
          .eq("brand_id", brand_id)
          .eq("slug", slug)
          .maybeSingle();

        if (existingPage) {
          const { data, error } = await supabase
            .from("pages")
            .update({
              title,
              content_json,
              status: "draft",
              version: (existingPage.version || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingPage.id)
            .select("id, slug")
            .maybeSingle();

          if (error) throw error;
          result = data;
        } else {
          const userId = claims.sub || claims.user_id;
          const { data, error } = await supabase
            .from("pages")
            .insert({
              brand_id,
              title,
              slug,
              content_json,
              status: "draft",
              version: 1,
              content_type: "page",
              show_in_menu: false,
              menu_order: 0,
              parent_slug: null,
              owner_user_id: userId,
              created_by: userId
            })
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
          message: "Draft saved successfully"
        }),
        { status: 200, headers: corsHeaders() }
      );
    }

    if (req.method === "POST" && pathParts.includes("publish")) {
      const body = await req.json();
      const claims = await verifyBearerToken(req);
      const { brand_id, page_id, title, slug, content_json } = body;

      if (claims.brand_id !== brand_id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: corsHeaders() }
        );
      }

      if (!brand_id || !page_id || !title || !slug) {
        return new Response(
          JSON.stringify({ error: "brand_id, page_id, title, and slug required" }),
          { status: 400, headers: corsHeaders() }
        );
      }

      const { data: currentPage } = await supabase
        .from("pages")
        .select("version")
        .eq("id", page_id)
        .maybeSingle();

      const { data, error } = await supabase
        .from("pages")
        .update({
          title,
          slug,
          content_json,
          status: "published",
          published_at: new Date().toISOString(),
          version: (currentPage?.version || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", page_id)
        .select("id, slug")
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          id: data.id,
          slug: data.slug,
          message: "Page published successfully"
        }),
        { status: 200, headers: corsHeaders() }
      );
    }

    if (req.method === "POST" && pathParts.includes("duplicate")) {
      const body = await req.json();
      const claims = await verifyBearerToken(req);
      const { page_id, new_slug } = body;

      if (!page_id || !new_slug) {
        return new Response(
          JSON.stringify({ error: "page_id and new_slug are required" }),
          { status: 400, headers: corsHeaders() }
        );
      }

      const { data: originalPage } = await supabase
        .from("pages")
        .select("*")
        .eq("id", page_id)
        .maybeSingle();

      if (!originalPage) {
        return new Response(
          JSON.stringify({ error: "Page not found" }),
          { status: 404, headers: corsHeaders() }
        );
      }

      if (claims.brand_id !== originalPage.brand_id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: corsHeaders() }
        );
      }

      const { data, error } = await supabase
        .from("pages")
        .insert({
          brand_id: originalPage.brand_id,
          title: `${originalPage.title} (copy)`,
          slug: new_slug,
          content_json: originalPage.content_json,
          status: "draft",
          version: 1,
          content_type: originalPage.content_type || "page",
          show_in_menu: false,
          menu_order: originalPage.menu_order,
          parent_slug: originalPage.parent_slug
        })
        .select("id, slug")
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          id: data.id,
          slug: data.slug,
          message: "Page duplicated successfully"
        }),
        { status: 200, headers: corsHeaders() }
      );
    }

    if (req.method === "DELETE") {
      const claims = await verifyBearerToken(req);
      const pageId = pathParts[pathParts.length - 1];

      if (!pageId || pageId === "pages-api") {
        return new Response(
          JSON.stringify({ error: "page_id is required" }),
          { status: 400, headers: corsHeaders() }
        );
      }

      const { data: page } = await supabase
        .from("pages")
        .select("brand_id")
        .eq("id", pageId)
        .maybeSingle();

      if (!page) {
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

    if (req.method === "POST" && pathParts.includes("updateMenuSettings")) {
      const body = await req.json();
      const claims = await verifyBearerToken(req);
      const { page_id, show_in_menu } = body;

      if (!page_id || show_in_menu === undefined) {
        return new Response(
          JSON.stringify({ error: "page_id and show_in_menu are required" }),
          { status: 400, headers: corsHeaders() }
        );
      }

      const { data: page } = await supabase
        .from("pages")
        .select("brand_id")
        .eq("id", page_id)
        .maybeSingle();

      if (!page) {
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
        .update({ show_in_menu })
        .eq("id", page_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Menu settings updated successfully" }),
        { status: 200, headers: corsHeaders() }
      );
    }

    if (req.method === "GET" && pathParts.includes("list")) {
      const brandId = url.searchParams.get("brand_id");
      if (!brandId) {
        return new Response(
          JSON.stringify({ error: "brand_id is required" }),
          { status: 400, headers: corsHeaders() }
        );
      }

      let query = supabase
        .from("pages")
        .select("title, slug, show_in_menu, parent_slug, menu_order, status")
        .eq("brand_id", brandId)
        .eq("status", "published");

      const { data, error } = await query.order("menu_order", { ascending: true });
      if (error) throw error;

      const pages = (data || []).map(page => ({
        title: page.title,
        slug: page.slug,
        url: `/${page.slug}`,
        show_in_menu: page.show_in_menu,
        parent_slug: page.parent_slug,
        order: page.menu_order
      }));

      return new Response(JSON.stringify({ pages }), { status: 200, headers: corsHeaders() });
    }

    if (req.method === "GET" && pathParts.includes("preview")) {
      const brandId = url.searchParams.get("brand_id");
      const slug = url.searchParams.get("slug");

      if (!brandId || !slug) {
        return new Response(
          JSON.stringify({ error: "brand_id and slug are required" }),
          { status: 400, headers: corsHeaders() }
        );
      }

      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("brand_id", brandId)
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return new Response(
          JSON.stringify({ error: "Page not found" }),
          { status: 404, headers: corsHeaders() }
        );
      }

      return new Response(JSON.stringify({ page: data }), { status: 200, headers: corsHeaders() });
    }

    if (req.method === "GET") {
      const brandId = url.searchParams.get("brand_id");
      const pageId = url.searchParams.get("page_id");

      if (pageId) {
        const claims = await verifyBearerToken(req);

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

        if (claims.brand_id !== data.brand_id) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 403, headers: corsHeaders() }
          );
        }

        return new Response(JSON.stringify({ page: data }), { status: 200, headers: corsHeaders() });
      }

      if (pathParts[pathParts.length - 1] === "pages-api") {
        if (!brandId) {
          return new Response(
            JSON.stringify({ error: "brand_id is required" }),
            { status: 400, headers: corsHeaders() }
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