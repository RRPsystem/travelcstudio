import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const builderId = url.searchParams.get("builder_id");
    const categorySlug = url.searchParams.get("category");
    const pageSlug = url.searchParams.get("page");
    const action = url.searchParams.get("action");

    if (!builderId || !categorySlug) {
      throw new Error("builder_id and category are required");
    }

    const { data: builder, error: builderError } = await supabase
      .from("external_builders")
      .select("*")
      .eq("id", builderId)
      .single();

    if (builderError) throw builderError;
    if (!builder) throw new Error("Builder not found");

    let apiUrl: string;

    if (action === "list") {
      apiUrl = `${builder.api_endpoint}/${categorySlug}/list`;
    } else if (pageSlug) {
      apiUrl = `${builder.api_endpoint}/${categorySlug}/${pageSlug}`;
    } else {
      throw new Error("Either action=list or page parameter is required");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (builder.auth_token) {
      headers["Authorization"] = `Bearer ${builder.auth_token}`;
    }

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch from builder API: ${response.statusText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
