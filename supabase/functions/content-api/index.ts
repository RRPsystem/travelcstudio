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

  const JWT_SECRET = Deno.env.get("JWT_SECRET");
  if (!JWT_SECRET) {
    console.error("[AUTH DEBUG] JWT_SECRET not configured");
    const error = new Error("Server configuration error");
    (error as any).statusCode = 500;
    throw error;
  }

  console.log("[AUTH DEBUG] JWT_SECRET found, length:", JWT_SECRET.length);

  const secretKey = new TextEncoder().encode(JWT_SECRET);

  try {
    console.log("[AUTH DEBUG] Attempting to verify token...");
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    console.log("[AUTH DEBUG] Token verified successfully!");
    console.log("[AUTH DEBUG] Payload:", JSON.stringify(payload, null, 2));

    if (requiredScope) {
      const scopes = (payload.scope as string[]) || [];
      console.log("[AUTH DEBUG] Required scope:", requiredScope);
      console.log("[AUTH DEBUG] Token scopes:", scopes);
      if (!scopes.includes(requiredScope)) {
        const error = new Error(`Missing required scope: ${requiredScope}`);
        (error as any).statusCode = 403;
        throw error;
      }
    }

    return payload as JWTPayload;
  } catch (err) {
    console.error("[AUTH DEBUG] Token verification failed:", err);
    if ((err as any).statusCode) throw err;
    const error = new Error("Invalid or expired token");
    (error as any).statusCode = 401;
    throw error;
  }
}

function corsHeaders(req?: Request): Headers {
  const headers = new Headers();

  const origin = req?.headers.get('origin') ?? '*';

  headers.set('Access-Control-Allow-Origin', origin === 'null' ? '*' : origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type, x-requested-with');
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('Access-Control-Allow-Credentials', 'true');

  if (req?.method !== 'OPTIONS') {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

Deno.serve(async (req: Request) => {
  console.log("[REQUEST] Method:", req.method, "URL:", req.url);
  console.log("[REQUEST] Origin:", req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    console.log("[CORS] Handling OPTIONS preflight request");
    const headers = corsHeaders(req);
    console.log("[CORS] Responding with status 200 and headers:", Object.fromEntries(headers.entries()));
    return new Response('ok', {
      status: 200,
      headers: headers
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    let contentType = url.searchParams.get("type") || pathParts[pathParts.length - 2];

    if (contentType === "news") {
      contentType = "news_items";
    }

    const action = pathParts[pathParts.length - 1];
    console.log("[CONTENT-API] Request:", req.method, url.pathname);
    console.log("[CONTENT-API] Content type:", contentType);
    console.log("[CONTENT-API] Action:", action);

    if (action === "list") {
      const payload = await verifyBearerToken(req, "content:read");
      const brandId = url.searchParams.get("brand_id") || payload.brand_id;

      console.log("[CONTENT-API] Listing content for brand:", brandId);

      if (contentType === "news_items") {
        const { data, error } = await supabase
          .from("news_items")
          .select(`
            id,
            title,
            slug,
            excerpt,
            content,
            featured_image,
            tags,
            created_at,
            updated_at,
            news_brand_assignments!inner(
              brand_id,
              is_published,
              published_at
            )
          `)
          .eq("news_brand_assignments.brand_id", brandId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[CONTENT-API] Database error:", error);
          throw error;
        }

        console.log("[CONTENT-API] Found", data?.length || 0, "news items");

        const transformedData = data?.map((item: any) => ({
          id: item.id,
          title: item.title,
          slug: item.slug,
          excerpt: item.excerpt,
          content: item.content,
          featured_image: item.featured_image,
          tags: item.tags,
          created_at: item.created_at,
          updated_at: item.updated_at,
          is_published: item.news_brand_assignments[0]?.is_published || false,
          published_at: item.news_brand_assignments[0]?.published_at || null,
        })) || [];

        return new Response(JSON.stringify(transformedData), {
          status: 200,
          headers: corsHeaders(req),
        });
      } else {
        const { data, error } = await supabase
          .from(contentType)
          .select("*")
          .eq("brand_id", brandId)
          .order("created_at", { ascending: false });

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

      if (contentType === "news_items") {
        const { data, error } = await supabase
          .from("news_items")
          .select(`
            *,
            news_brand_assignments!inner(
              brand_id,
              is_published,
              published_at
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
          published_at: data.news_brand_assignments[0]?.published_at || null,
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

      const brandId = body.brand_id || payload.brand_id;
      const itemId = body.id;

      if (contentType === "news_items") {
        if (itemId) {
          console.log("[CONTENT-API] Updating news item:", itemId);

          const updateData: any = {
            title: body.title,
            slug: body.slug,
            excerpt: body.excerpt || body.intro || '',
            content: body.content,
            featured_image: body.featured_image || '',
            tags: body.tags || [],
            brand_id: brandId,
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

          const { data: updatedItem, error: fetchError } = await supabase
            .from("news_items")
            .select(`
              *,
              news_brand_assignments!inner(
                brand_id,
                is_published,
                published_at
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
              published_at: updatedItem?.news_brand_assignments[0]?.published_at || null,
            }),
            {
              status: 200,
              headers: corsHeaders(req),
            }
          );
        } else {
          console.log("[CONTENT-API] Creating new news item");

          const insertData: any = {
            title: body.title,
            slug: body.slug,
            excerpt: body.excerpt || body.intro || '',
            content: body.content,
            featured_image: body.featured_image || '',
            tags: body.tags || [],
            brand_id: brandId,
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
              news_item_id: newItem.id,
              brand_id: brandId,
              is_published: false,
            });

          if (assignmentError) {
            console.error("[CONTENT-API] Assignment error:", assignmentError);
            throw assignmentError;
          }

          console.log("[CONTENT-API] Brand assignment created");

          return new Response(
            JSON.stringify({
              ...newItem,
              is_published: false,
              published_at: null,
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

      if (contentType === "news_items") {
        const { error: assignmentError } = await supabase
          .from("news_brand_assignments")
          .delete()
          .eq("news_item_id", id)
          .eq("brand_id", payload.brand_id);

        if (assignmentError) {
          console.error("[CONTENT-API] Assignment delete error:", assignmentError);
          throw assignmentError;
        }

        const { data: remainingAssignments } = await supabase
          .from("news_brand_assignments")
          .select("id")
          .eq("news_item_id", id);

        if (!remainingAssignments || remainingAssignments.length === 0) {
          const { error: deleteError } = await supabase
            .from("news_items")
            .delete()
            .eq("id", id);

          if (deleteError) {
            console.error("[CONTENT-API] Delete error:", deleteError);
            throw deleteError;
          }

          console.log("[CONTENT-API] News item deleted (no remaining assignments)");
        } else {
          console.log("[CONTENT-API] Assignment removed (item has other assignments)");
        }
      } else {
        const { error: deleteError } = await supabase
          .from(contentType)
          .delete()
          .eq("id", id)
          .eq("brand_id", payload.brand_id);

        if (deleteError) {
          console.error("[CONTENT-API] Delete error:", deleteError);
          throw deleteError;
        }

        console.log("[CONTENT-API] Item deleted successfully");
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: corsHeaders(req),
      });
    }

    if (action === "publish") {
      const payload = await verifyBearerToken(req, "content:write");
      const body = await req.json();
      const itemId = body.id;
      const isPublished = body.is_published;

      console.log("[CONTENT-API] Publishing item:", itemId, "published:", isPublished);

      if (contentType === "news_items") {
        const { error: updateError } = await supabase
          .from("news_brand_assignments")
          .update({
            is_published: isPublished,
            published_at: isPublished ? new Date().toISOString() : null,
          })
          .eq("news_item_id", itemId)
          .eq("brand_id", payload.brand_id);

        if (updateError) {
          console.error("[CONTENT-API] Publish error:", updateError);
          throw updateError;
        }

        console.log("[CONTENT-API] News item publish status updated");
      } else {
        const { error: updateError } = await supabase
          .from(contentType)
          .update({
            is_published: isPublished,
            published_at: isPublished ? new Date().toISOString() : null,
          })
          .eq("id", itemId)
          .eq("brand_id", payload.brand_id);

        if (updateError) {
          console.error("[CONTENT-API] Publish error:", updateError);
          throw updateError;
        }

        console.log("[CONTENT-API] Item publish status updated");
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: corsHeaders(req),
      });
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      {
        status: 400,
        headers: corsHeaders(req),
      }
    );
  } catch (err) {
    console.error("[CONTENT-API] Error:", err);
    const statusCode = (err as any).statusCode || 500;
    const message = err instanceof Error ? err.message : "Internal server error";

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: statusCode,
        headers: corsHeaders(req),
      }
    );
  }
});