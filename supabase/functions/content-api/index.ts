import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { jwtVerify } from "npm:jose@5";

interface JWTPayload {
  brand_id: string;
  user_id?: string;
  sub?: string;
  scope?: string[];
  mode?: string;
  is_template?: boolean;
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

  const JWT_SECRET = Deno.env.get("JWT_SECRET");
  if (!JWT_SECRET) {
    console.error("[AUTH DEBUG] JWT_SECRET not configured");
    const error = new Error("Server configuration error");
    (error as any).statusCode = 500;
    throw error;
  }

  console.log("[AUTH DEBUG] JWT_SECRET found, length:", JWT_SECRET.length);

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    console.log("[AUTH DEBUG] Token verified successfully");
    console.log("[AUTH DEBUG] Payload:", JSON.stringify(payload, null, 2));

    if (requiredScope && Array.isArray(payload.scope)) {
      if (!payload.scope.includes(requiredScope)) {
        console.error(`[AUTH DEBUG] Token missing required scope: ${requiredScope}`);
        console.error("[AUTH DEBUG] Available scopes:", payload.scope);
        const error = new Error(`Insufficient permissions: ${requiredScope} required`);
        (error as any).statusCode = 403;
        throw error;
      }
      console.log(`[AUTH DEBUG] Required scope "${requiredScope}" verified`);
    }

    return payload as JWTPayload;
  } catch (err) {
    console.error("[AUTH DEBUG] Token verification failed:", err);
    const error = new Error("Invalid authentication token");
    (error as any).statusCode = 401;
    throw error;
  }
}

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Client-Info, Apikey",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders(req),
    });
  }

  try {
    const url = new URL(req.url);
    const contentType = url.searchParams.get("type");
    let action = url.searchParams.get("action");

    if (!action && req.method === "POST") {
      action = "save";
      console.log("[CONTENT-API] No action parameter, using default 'save' for POST request");
    }

    if (!action && req.method === "GET") {
      const slug = url.searchParams.get("slug");
      const id = url.searchParams.get("id");
      if (slug || id) {
        action = "list";
        console.log("[CONTENT-API] No action parameter, using default 'list' for GET request with slug/id");
      }
    }

    console.log("[CONTENT-API] Request:", {
      method: req.method,
      contentType,
      action,
      url: req.url,
    });

    if (!contentType) {
      return new Response(
        JSON.stringify({ error: "Missing type parameter" }),
        {
          status: 400,
          headers: corsHeaders(req),
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[CONTENT-API] Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: corsHeaders(req),
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "list") {
      const payload = await verifyBearerToken(req, "content:read");
      const brandId = payload.brand_id;

      console.log("[CONTENT-API] Listing items for brand:", brandId);

      if (contentType === "news_items") {
        const slugFilter = url.searchParams.get("slug");
        console.log("[CONTENT-API] Slug filter:", slugFilter);

        let query = supabase
          .from("news_items")
          .select("*")
          .eq("brand_id", brandId);

        if (slugFilter) {
          query = query.eq("slug", slugFilter);
        } else {
          query = query.order("created_at", { ascending: false });
        }

        const { data, error } = await query;

        if (error) {
          console.error("[CONTENT-API] Database error:", error);
          throw error;
        }

        console.log("[CONTENT-API] Found", data?.length || 0, "items");
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: corsHeaders(req),
        });
      }
    }

    if (action === "get") {
      const payload = await verifyBearerToken(req, "content:read");
      const id = url.searchParams.get("id");

      if (!id) {
        return new Response(JSON.stringify({ error: "Missing id parameter" }), {
          status: 400,
          headers: corsHeaders(req),
        });
      }

      console.log("[CONTENT-API] Getting item:", id);

      if (payload.is_template === true || payload.mode === 'edit-template') {
        console.log("[CONTENT-API] 🎯 TEMPLATE MODE - Loading from pages table");

        const { data, error } = await supabase
          .from("pages")
          .select("*")
          .eq("id", id)
          .eq("is_template", true)
          .maybeSingle();

        if (error) {
          console.error("[CONTENT-API] Database error:", error);
          throw error;
        }

        if (!data) {
          return new Response(JSON.stringify({ error: "Template not found" }), {
            status: 404,
            headers: corsHeaders(req),
          });
        }

        console.log("[CONTENT-API] ✅ Template loaded:", data.id);

        const transformedData = {
          id: data.id,
          title: data.title,
          slug: data.slug,
          ...data.content_json,
          template_category: data.template_category,
          preview_image_url: data.preview_image_url,
          status: data.status,
          _raw_content_json: data.content_json,
        };

        console.log("[CONTENT-API] Transformed data keys:", Object.keys(transformedData));
        return new Response(JSON.stringify(transformedData), {
          status: 200,
          headers: corsHeaders(req),
        });
      }

      if (contentType === "news_items") {
        const { data, error } = await supabase
          .from("news_items")
          .select(`
            *,
            news_brand_assignments!inner(
              brand_id,
              is_published
            )
          `)
          .eq("id", id)
          .eq("news_brand_assignments.brand_id", payload.brand_id)
          .maybeSingle();

        if (error) {
          console.error("[CONTENT-API] Database error:", error);
          throw error;
        }

        if (!data) {
          return new Response(JSON.stringify({ error: "Item not found" }), {
            status: 404,
            headers: corsHeaders(req),
          });
        }

        const transformedData = {
          ...data,
          is_published: data.news_brand_assignments[0]?.is_published || false,
        };

        return new Response(JSON.stringify(transformedData), {
          status: 200,
          headers: corsHeaders(req),
        });
      } else {
        const { data, error } = await supabase
          .from(contentType)
          .select("*")
          .eq("id", id)
          .eq("brand_id", payload.brand_id)
          .maybeSingle();

        if (error) {
          console.error("[CONTENT-API] Database error:", error);
          throw error;
        }

        if (!data) {
          return new Response(JSON.stringify({ error: "Item not found" }), {
            status: 404,
            headers: corsHeaders(req),
          });
        }

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: corsHeaders(req),
        });
      }
    }

    if (action === "save") {
      const payload = await verifyBearerToken(req, "content:write");
      const body = await req.json();

      console.log("[CONTENT-API] Saving content:", JSON.stringify(body, null, 2));
      console.log("[CONTENT-API] JWT payload:", { mode: payload.mode, is_template: payload.is_template });

      const brandId = body.brand_id || payload.brand_id;
      const itemId = body.id;

      if (payload.is_template === true || payload.mode === 'create-template' || payload.mode === 'edit-template') {
        console.log("[CONTENT-API] 🎯 TEMPLATE MODE DETECTED - Redirecting to pages table");

        let contentJson = body.content?.json || body.content_json || body.content || {};

        if (typeof contentJson === 'string') {
          try {
            contentJson = JSON.parse(contentJson);
          } catch (e) {
            console.error("[CONTENT-API] Failed to parse content JSON:", e);
          }
        }

        const pageData: any = {
          title: body.title,
          slug: body.slug,
          content_json: contentJson,
          is_template: true,
          template_category: body.template_category || contentJson.template_category || 'general',
          preview_image_url: body.preview_image_url || contentJson.preview_image_url || null,
          status: body.status || 'draft',
          brand_id: '00000000-0000-0000-0000-000000000999',
        };

        if (itemId) {
          console.log("[CONTENT-API] Updating template:", itemId);

          const updateData: any = {
            content_json: contentJson,
            updated_at: new Date().toISOString(),
          };

          const { data: updatedPage, error: updateError } = await supabase
            .from("pages")
            .update(updateData)
            .eq("id", itemId)
            .select()
            .single();

          if (updateError) {
            console.error("[CONTENT-API] Template update error:", updateError);
            throw updateError;
          }

          console.log("[CONTENT-API] ✅ Template updated successfully:", updatedPage.id);
          return new Response(JSON.stringify(updatedPage), {
            status: 200,
            headers: corsHeaders(req),
          });
        } else {
          console.log("[CONTENT-API] Creating new template");

          const { data: newPage, error: insertError } = await supabase
            .from("pages")
            .insert(pageData)
            .select()
            .single();

          if (insertError) {
            console.error("[CONTENT-API] Template insert error:", insertError);
            throw insertError;
          }

          console.log("[CONTENT-API] ✅ Template created successfully:", newPage.id);
          return new Response(JSON.stringify(newPage), {
            status: 201,
            headers: corsHeaders(req),
          });
        }
      }

      if (contentType === "news_items") {
        if (itemId) {
          console.log("[CONTENT-API] Updating news item:", itemId);

          const authorType = body.author_type || (payload as any).author_type || 'brand';
          const authorId = body.author_id || (payload as any).author_id || payload.sub || payload.user_id;

          const updateData: any = {
            title: body.title,
            slug: body.slug,
            excerpt: body.excerpt || body.intro || '',
            content: body.content,
            featured_image: body.featured_image || '',
            tags: body.tags || [],
            brand_id: brandId,
            author_type: authorType,
            author_id: authorId,
            updated_at: new Date().toISOString(),
          };

          const { error: updateError } = await supabase
            .from("news_items")
            .update(updateData)
            .eq("id", itemId);

          if (updateError) {
            console.error("[CONTENT-API] Update error:", updateError);
            throw updateError;
          }

          console.log("[CONTENT-API] News item updated successfully");

          const { error: upsertError } = await supabase
            .from("news_brand_assignments")
            .upsert(
              {
                news_id: itemId,
                brand_id: brandId,
              },
              {
                onConflict: "news_id,brand_id",
              }
            );

          if (upsertError) {
            console.error("[CONTENT-API] Brand assignment upsert error:", upsertError);
          } else {
            console.log("[CONTENT-API] Brand assignment ensured for news item:", itemId);
          }

          const { data: updatedItem, error: fetchError } = await supabase
            .from("news_items")
            .select(`
              *,
              news_brand_assignments!inner(
                brand_id,
                is_published
              )
            `)
            .eq("id", itemId)
            .eq("news_brand_assignments.brand_id", brandId)
            .maybeSingle();

          if (fetchError) {
            console.error("[CONTENT-API] Fetch error:", fetchError);
            throw fetchError;
          }

          return new Response(
            JSON.stringify({
              ...updatedItem,
              is_published: updatedItem?.news_brand_assignments[0]?.is_published || false,
            }),
            {
              status: 200,
              headers: corsHeaders(req),
            }
          );
        } else {
          console.log("[CONTENT-API] Creating new news item");

          const authorType = body.author_type || (payload as any).author_type || 'brand';
          const authorId = body.author_id || (payload as any).author_id || payload.sub || payload.user_id;

          const insertData: any = {
            title: body.title,
            slug: body.slug,
            excerpt: body.excerpt || body.intro || '',
            content: body.content,
            featured_image: body.featured_image || '',
            tags: body.tags || [],
            brand_id: brandId,
            author_type: authorType,
            author_id: authorId,
          };

          const { data: newItem, error: insertError } = await supabase
            .from("news_items")
            .insert(insertData)
            .select()
            .single();

          if (insertError) {
            console.error("[CONTENT-API] Insert error:", insertError);
            throw insertError;
          }

          console.log("[CONTENT-API] News item created:", newItem.id);

          const { error: assignmentError } = await supabase
            .from("news_brand_assignments")
            .insert({
              news_id: newItem.id,
              brand_id: brandId,
            });

          if (assignmentError) {
            console.error("[CONTENT-API] Brand assignment creation error:", assignmentError);
          } else {
            console.log("[CONTENT-API] Brand assignment created for news item:", newItem.id);
          }

          return new Response(
            JSON.stringify({
              ...newItem,
              is_published: false,
            }),
            {
              status: 201,
              headers: corsHeaders(req),
            }
          );
        }
      } else {
        if (itemId) {
          console.log("[CONTENT-API] Updating item:", itemId);

          const { data: updatedItem, error: updateError } = await supabase
            .from(contentType)
            .update({
              ...body,
              brand_id: brandId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", itemId)
            .eq("brand_id", brandId)
            .select()
            .single();

          if (updateError) {
            console.error("[CONTENT-API] Update error:", updateError);
            throw updateError;
          }

          console.log("[CONTENT-API] Item updated successfully");
          return new Response(JSON.stringify(updatedItem), {
            status: 200,
            headers: corsHeaders(req),
          });
        } else {
          console.log("[CONTENT-API] Creating new item");

          const { data: newItem, error: insertError } = await supabase
            .from(contentType)
            .insert({
              ...body,
              brand_id: brandId,
            })
            .select()
            .single();

          if (insertError) {
            console.error("[CONTENT-API] Insert error:", insertError);
            throw insertError;
          }

          console.log("[CONTENT-API] Item created successfully");
          return new Response(JSON.stringify(newItem), {
            status: 201,
            headers: corsHeaders(req),
          });
        }
      }
    }

    if (action === "load" || action === "load_news") {
      const payload = await verifyBearerToken(req, "content:read");
      const brandId = url.searchParams.get("brand_id") || payload.brand_id;
      const slug = url.searchParams.get("slug");

      console.log("[CONTENT-API] Loading news by slug:", slug, "for brand:", brandId);

      if (!slug) {
        return new Response(JSON.stringify({ error: "Missing slug parameter" }), {
          status: 400,
          headers: corsHeaders(req),
        });
      }

      if (contentType === "news_items") {
        const { data, error } = await supabase
          .from("news_items")
          .select("*")
          .eq("brand_id", brandId)
          .eq("slug", slug)
          .maybeSingle();

        if (error) {
          console.error("[CONTENT-API] Database error:", error);
          throw error;
        }

        if (!data) {
          return new Response(JSON.stringify({ error: "News item not found" }), {
            status: 404,
            headers: corsHeaders(req),
          });
        }

        console.log("[CONTENT-API] Found news item:", data.id);
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: corsHeaders(req),
        });
      }
    }

    if (action === "delete") {
      const payload = await verifyBearerToken(req, "content:write");
      const id = url.searchParams.get("id");

      if (!id) {
        return new Response(JSON.stringify({ error: "Missing id parameter" }), {
          status: 400,
          headers: corsHeaders(req),
        });
      }

      console.log("[CONTENT-API] Deleting item:", id);

      const { error } = await supabase
        .from(contentType)
        .delete()
        .eq("id", id)
        .eq("brand_id", payload.brand_id);

      if (error) {
        console.error("[CONTENT-API] Delete error:", error);
        throw error;
      }

      console.log("[CONTENT-API] Item deleted successfully");
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: corsHeaders(req),
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      {
        status: 400,
        headers: corsHeaders(req),
      }
    );
  } catch (error) {
    console.error("[CONTENT-API] Error:", error);

    const statusCode = (error as any).statusCode || 500;
    const message = error instanceof Error ? error.message : "Internal server error";

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: statusCode,
        headers: corsHeaders(req),
      }
    );
  }
});