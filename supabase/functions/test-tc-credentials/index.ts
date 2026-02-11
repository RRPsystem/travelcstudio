import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TC_API_BASE = "https://online.travelcompositor.com/resources";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated via Supabase JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Niet geautoriseerd" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Ongeldige sessie" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { micrositeId } = body;

    if (!micrositeId) {
      return new Response(
        JSON.stringify({ success: false, error: "micrositeId is verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch credentials from database (server-side only)
    const { data: msData, error: dbError } = await supabase
      .from("tc_microsites")
      .select("microsite_id, username, password, name")
      .eq("id", micrositeId)
      .single();

    if (dbError || !msData) {
      return new Response(
        JSON.stringify({ success: false, error: "Microsite niet gevonden in database" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test authentication against TC API (server-side, credentials never leave the server)
    const authResponse = await fetch(`${TC_API_BASE}/authentication/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: msData.username,
        password: msData.password,
        micrositeId: msData.microsite_id,
      }),
    });

    if (authResponse.ok) {
      const authResult = await authResponse.json();
      const hasToken = !!authResult.token;

      // Update last_verified_at
      await supabase
        .from("tc_microsites")
        .update({ last_verified_at: new Date().toISOString() })
        .eq("id", micrositeId);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Verbinding succesvol voor ${msData.name}`,
          hasToken,
          expiresInSeconds: authResult.expirationInSeconds || null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const status = authResponse.status;
      console.error(`[TC Test] Auth failed for ${msData.microsite_id}: ${status}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Authenticatie mislukt (${status}). Controleer credentials.`,
          status,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("[TC Test] Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Test mislukt" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
