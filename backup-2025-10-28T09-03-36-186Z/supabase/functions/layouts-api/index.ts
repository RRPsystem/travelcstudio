import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

// JWT Helper (inline)
interface JWTPayload {
  brand_id: string;
  user_id?: string;
  sub?: string;
  scopes?: string[];
  iat?: number;
  exp?: number;
}

async function verifyBearerToken(req: Request): Promise<JWTPayload> {
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
    throw new Error("Missing authentication token");
  }

  const jwtSecret = Deno.env.get("JWT_SECRET");

  if (!jwtSecret) {
    throw new Error("JWT_SECRET not configured");
  }

  try {
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(jwtSecret);

    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (!payload.brand_id) {
      throw new Error("Invalid token: missing brand_id");
    }

    return payload as JWTPayload;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

// CORS Helper (inline)
function withCORS(req: Request, resInit: ResponseInit = {}): Headers {
  const origin = req.headers.get('origin') ?? '*';
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

  const headers = new Headers(resInit.headers || {});
  headers.set('Access-Control-Allow-Origin', allowOrigin);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'authorization,apikey,content-type,x-client-info');

  return headers;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: withCORS(req) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // GET /layouts-api/{brand_id}/published - Public endpoint for renderer
    if (req.method === "GET" && pathParts.length >= 2) {
      const brandId = pathParts[pathParts.length - 2];
      const action = pathParts[pathParts.length - 1];

      if (action === "published") {
        const { data, error } = await supabase
          .from("brand_layouts")
          .select("header_html, footer_html, menu_json, version")
          .eq("brand_id", brandId)
          .eq("status", "published")
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          return new Response(
            JSON.stringify({
              header_html: "",
              footer_html: "",
              menu_json: [],
              version: 0
            }),
            { status: 200, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
          );
        }

        return new Response(
          JSON.stringify(data),
          { status: 200, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
        );
      }
    }

    // All POST endpoints require JWT authentication
    const claims = await verifyBearerToken(req);

    // POST /layouts-api/header/saveDraft
    if (req.method === "POST" && pathParts.includes("header") && pathParts.includes("saveDraft")) {
      const body = await req.json();
      const { brand_id, content_json } = body;

      if (claims.brand_id !== brand_id) {
        return new Response(
          JSON.stringify({ error: { code: "UNAUTHORIZED", message: "brand_id mismatch" } }),
          { status: 403, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
        );
      }

      if (!brand_id || !content_json) {
        return new Response(
          JSON.stringify({ error: { code: "INVALID_REQUEST", message: "brand_id and content_json are required" } }),
          { status: 400, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
        );
      }

      const { data, error } = await supabase
        .from("brand_layouts")
        .upsert({
          brand_id,
          header_json: content_json,
          status: "draft"
        }, {
          onConflict: "brand_id"
        })
        .select("version, updated_at")
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ ok: true, version: data.version, updated_at: data.updated_at }),
        { status: 200, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
      );
    }

    // POST /layouts-api/header/publish
    if (req.method === "POST" && pathParts.includes("header") && pathParts.includes("publish")) {
      const body = await req.json();
      const { brand_id, body_html } = body;

      if (claims.brand_id !== brand_id) {
        return new Response(
          JSON.stringify({ error: { code: "UNAUTHORIZED", message: "brand_id mismatch" } }),
          { status: 403, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
        );
      }

      if (!brand_id || !body_html) {
        return new Response(
          JSON.stringify({ error: { code: "INVALID_REQUEST", message: "brand_id and body_html are required" } }),
          { status: 400, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
        );
      }

      // Get current version and increment
      const { data: current } = await supabase
        .from("brand_layouts")
        .select("version")
        .eq("brand_id", brand_id)
        .maybeSingle();

      const newVersion = (current?.version || 0) + 1;

      const { data, error } = await supabase
        .from("brand_layouts")
        .upsert({
          brand_id,
          header_html: body_html,
          status: "published",
          version: newVersion
        }, {
          onConflict: "brand_id"
        })
        .select("version, updated_at")
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ ok: true, version: data.version, updated_at: data.updated_at }),
        { status: 200, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
      );
    }

    // POST /layouts-api/footer/saveDraft
    if (req.method === "POST" && pathParts.includes("footer") && pathParts.includes("saveDraft")) {
      const body = await req.json();
      const { brand_id, content_json } = body;

      if (claims.brand_id !== brand_id) {
        return new Response(
          JSON.stringify({ error: { code: "UNAUTHORIZED", message: "brand_id mismatch" } }),
          { status: 403, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
        );
      }

      if (!brand_id || !content_json) {
        return new Response(
          JSON.stringify({ error: { code: "INVALID_REQUEST", message: "brand_id and content_json are required" } }),
          { status: 400, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
        );
      }

      const { data, error } = await supabase
        .from("brand_layouts")
        .upsert({
          brand_id,
          footer_json: content_json,
          status: "draft"
        }, {
          onConflict: "brand_id"
        })
        .select("version, updated_at")
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ ok: true, version: data.version, updated_at: data.updated_at }),
        { status: 200, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
      );
    }

    // POST /layouts-api/footer/publish
    if (req.method === "POST" && pathParts.includes("footer") && pathParts.includes("publish")) {
      const body = await req.json();
      const { brand_id, body_html } = body;

      if (claims.brand_id !== brand_id) {
        return new Response(
          JSON.stringify({ error: { code: "UNAUTHORIZED", message: "brand_id mismatch" } }),
          { status: 403, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
        );
      }

      if (!brand_id || !body_html) {
        return new Response(
          JSON.stringify({ error: { code: "INVALID_REQUEST", message: "brand_id and body_html are required" } }),
          { status: 400, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
        );
      }

      // Get current version and increment
      const { data: current } = await supabase
        .from("brand_layouts")
        .select("version")
        .eq("brand_id", brand_id)
        .maybeSingle();

      const newVersion = (current?.version || 0) + 1;

      const { data, error } = await supabase
        .from("brand_layouts")
        .upsert({
          brand_id,
          footer_html: body_html,
          status: "published",
          version: newVersion
        }, {
          onConflict: "brand_id"
        })
        .select("version, updated_at")
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ ok: true, version: data.version, updated_at: data.updated_at }),
        { status: 200, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
      );
    }

    // POST /layouts-api/menu/saveDraft
    if (req.method === "POST" && pathParts.includes("menu") && pathParts.includes("saveDraft")) {
      const body = await req.json();
      const { brand_id, menu_json } = body;

      if (claims.brand_id !== brand_id) {
        return new Response(
          JSON.stringify({ error: { code: "UNAUTHORIZED", message: "brand_id mismatch" } }),
          { status: 403, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
        );
      }

      if (!brand_id || !menu_json) {
        return new Response(
          JSON.stringify({ error: { code: "INVALID_REQUEST", message: "brand_id and menu_json are required" } }),
          { status: 400, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
        );
      }

      const { data, error } = await supabase
        .from("brand_layouts")
        .upsert({
          brand_id,
          menu_json,
          status: "draft"
        }, {
          onConflict: "brand_id"
        })
        .select("version, updated_at")
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ ok: true, version: data.version, updated_at: data.updated_at }),
        { status: 200, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
      );
    }

    // POST /layouts-api/menu/publish
    if (req.method === "POST" && pathParts.includes("menu") && pathParts.includes("publish")) {
      const body = await req.json();
      const { brand_id } = body;

      if (claims.brand_id !== brand_id) {
        return new Response(
          JSON.stringify({ error: { code: "UNAUTHORIZED", message: "brand_id mismatch" } }),
          { status: 403, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
        );
      }

      if (!brand_id) {
        return new Response(
          JSON.stringify({ error: { code: "INVALID_REQUEST", message: "brand_id is required" } }),
          { status: 400, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
        );
      }

      // Get current version and increment
      const { data: current } = await supabase
        .from("brand_layouts")
        .select("version")
        .eq("brand_id", brand_id)
        .maybeSingle();

      const newVersion = (current?.version || 0) + 1;

      const { data, error } = await supabase
        .from("brand_layouts")
        .upsert({
          brand_id,
          status: "published",
          version: newVersion
        }, {
          onConflict: "brand_id"
        })
        .select("version, updated_at")
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ ok: true, version: data.version, updated_at: data.updated_at }),
        { status: 200, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
      );
    }

    return new Response(
      JSON.stringify({ error: { code: "NOT_FOUND", message: "Endpoint not found" } }),
      { status: 404, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
    );
  } catch (error) {
    console.error("Error:", error);

    if (error.message?.includes("JWT") || error.message?.includes("token")) {
      return new Response(
        JSON.stringify({ error: { code: "INVALID_TOKEN", message: error.message } }),
        { status: 401, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
      );
    }

    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: error.message } }),
      { status: 500, headers: withCORS(req, { headers: { "Content-Type": "application/json" } }) }
    );
  }
});