import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Niet geautoriseerd" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to get the authenticated user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Niet geautoriseerd" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the brand for this user via users.brand_id
    const { data: userData } = await supabase
      .from("users")
      .select("brand_id")
      .eq("id", user.id)
      .maybeSingle();

    const brandId = userData?.brand_id;

    if (!brandId) {
      return new Response(
        JSON.stringify({ error: "Geen brand gevonden voor deze gebruiker" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: brand } = await supabase
      .from("brands")
      .select("id, wordpress_url, wordpress_username, wordpress_app_password")
      .eq("id", brandId)
      .maybeSingle();

    if (!brand) {
      return new Response(
        JSON.stringify({ error: "Brand niet gevonden" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return await syncPages(supabase, brand);
  } catch (error: any) {
    console.error("[WP Sync Pages] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function syncPages(supabase: any, brand: any) {
  const { id: brandId, wordpress_url, wordpress_username, wordpress_app_password } = brand;

  if (!wordpress_url) {
    return new Response(
      JSON.stringify({ error: "WordPress URL is niet ingesteld. Ga naar Brand Settings om deze in te vullen." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Clean up the WordPress URL
  const wpUrl = wordpress_url.replace(/\/+$/, "");

  console.log(`[WP Sync Pages] Syncing pages for brand ${brandId} from ${wpUrl}`);

  // Build auth header if credentials are available
  const wpHeaders: Record<string, string> = {
    "Accept": "application/json",
  };

  if (wordpress_username && wordpress_app_password) {
    const credentials = btoa(`${wordpress_username}:${wordpress_app_password}`);
    wpHeaders["Authorization"] = `Basic ${credentials}`;
  }

  // Fetch all pages from WordPress REST API (paginated)
  let allPages: any[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const apiUrl = `${wpUrl}/wp-json/wp/v2/pages?per_page=${perPage}&page=${page}&status=publish,draft,private&_fields=id,title,slug,status,link,modified,template`;
    console.log(`[WP Sync Pages] Fetching: ${apiUrl}`);

    const response = await fetch(apiUrl, { headers: wpHeaders });

    if (!response.ok) {
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "WordPress authenticatie mislukt. Controleer je gebruikersnaam en applicatie wachtwoord in Brand Settings." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Geen toegang tot WordPress pagina's. Controleer de gebruikersrechten." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // If we get a 400 on page > 1, we've gone past the last page
      if (page > 1) break;

      const text = await response.text();
      console.error(`[WP Sync Pages] WP API error: ${response.status} ${text}`);
      return new Response(
        JSON.stringify({ error: `WordPress API fout: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pages = await response.json();
    if (!Array.isArray(pages) || pages.length === 0) break;

    allPages = allPages.concat(pages);

    // Check if there are more pages
    const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1");
    if (page >= totalPages) break;
    page++;
  }

  console.log(`[WP Sync Pages] Fetched ${allPages.length} pages from WordPress`);

  // Upsert pages into cache
  const now = new Date().toISOString();
  const upsertData = allPages.map((wp: any) => ({
    brand_id: brandId,
    wordpress_page_id: wp.id,
    title: wp.title?.rendered || wp.title || "Untitled",
    slug: wp.slug || "",
    page_url: wp.link || `${wpUrl}/${wp.slug}/`,
    edit_url: `${wpUrl}/wp-admin/post.php?post=${wp.id}&action=edit`,
    elementor_edit_url: `${wpUrl}/wp-admin/post.php?post=${wp.id}&action=elementor`,
    status: wp.status || "publish",
    template: wp.template || "",
    modified_at: wp.modified || null,
    last_synced_at: now,
  }));

  if (upsertData.length > 0) {
    const { error: upsertError } = await supabase
      .from("wordpress_pages_cache")
      .upsert(upsertData, { onConflict: "brand_id,wordpress_page_id" });

    if (upsertError) {
      console.error("[WP Sync Pages] Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Fout bij opslaan pagina's: " + upsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remove pages that no longer exist in WordPress
    const wpPageIds = allPages.map((wp: any) => wp.id);
    await supabase
      .from("wordpress_pages_cache")
      .delete()
      .eq("brand_id", brandId)
      .not("wordpress_page_id", "in", `(${wpPageIds.join(",")})`);
  }

  return new Response(
    JSON.stringify({
      success: true,
      pages_synced: allPages.length,
      message: `${allPages.length} pagina's gesynchroniseerd`,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
