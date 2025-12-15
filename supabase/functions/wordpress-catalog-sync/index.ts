import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WordPressTravelItem {
  id: number;
  travel_id: string;
  title: string;
  continent: string;
  country: string;
  preview_url: string;
  thumbnail: string;
  price: string;
  nights: string;
}

interface WordPressCatalogResponse {
  total: number;
  filters: {
    continents: Array<{
      slug: string;
      name: string;
      countries: Array<{
        slug: string;
        name: string;
      }>;
    }>;
  };
  travels: WordPressTravelItem[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (userData?.role !== "operator" && userData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only operators can sync WordPress catalog" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const url = new URL(req.url);
    const wpUrl = url.searchParams.get("wp_url") || "https://flyendrive.online";
    const continent = url.searchParams.get("continent");
    const country = url.searchParams.get("country");
    const targetBrandId = url.searchParams.get("brand_id");

    let catalogUrl = `${wpUrl}/wp-json/rbs-travel/v1/catalog`;
    const params = [];
    if (continent) params.push(`continent=${encodeURIComponent(continent)}`);
    if (country) params.push(`country=${encodeURIComponent(country)}`);
    if (params.length > 0) {
      catalogUrl += `?${params.join("&")}`;
    }

    console.log("[wordpress-catalog-sync] Fetching from:", catalogUrl);

    const wpResponse = await fetch(catalogUrl, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!wpResponse.ok) {
      throw new Error(`WordPress API error: ${wpResponse.status} ${wpResponse.statusText}`);
    }

    const catalogData: WordPressCatalogResponse = await wpResponse.json();

    console.log(`[wordpress-catalog-sync] Found ${catalogData.travels.length} trips`);

    let syncedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const travel of catalogData.travels) {
      try {
        const { data: existing } = await supabase
          .from("trips")
          .select("id")
          .eq("tc_idea_id", travel.travel_id)
          .maybeSingle();

        const tripData = {
          title: travel.title,
          slug: travel.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
          description: `${travel.title} - ${travel.nights} nachten in ${travel.country}`,
          price: parseFloat(travel.price) || 0,
          duration_days: parseInt(travel.nights) || 0,
          featured_image: travel.thumbnail || "",
          tc_idea_id: travel.travel_id,
          source: "wordpress_catalog",
          status: "draft",
          author_type: "operator",
          author_id: user.id,
          is_mandatory: false,
          enabled_for_brands: true,
          enabled_for_franchise: true,
          metadata: {
            wp_post_id: travel.id,
            continent: travel.continent,
            country: travel.country,
            preview_url: travel.preview_url,
            wp_source_url: wpUrl,
            synced_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          const { error: updateError } = await supabase
            .from("trips")
            .update(tripData)
            .eq("id", existing.id);

          if (updateError) {
            errors.push(`Failed to update ${travel.title}: ${updateError.message}`);
          } else {
            updatedCount++;
          }
        } else {
          const insertData: any = { ...tripData, created_at: new Date().toISOString() };
          
          if (targetBrandId) {
            insertData.brand_id = targetBrandId;
          } else {
            const dummyBrandId = "00000000-0000-0000-0000-000000000000";
            insertData.brand_id = dummyBrandId;
          }

          const { error: insertError } = await supabase
            .from("trips")
            .insert(insertData);

          if (insertError) {
            errors.push(`Failed to create ${travel.title}: ${insertError.message}`);
          } else {
            syncedCount++;
          }
        }
      } catch (err: any) {
        errors.push(`Error processing ${travel.title}: ${err.message}`);
        skippedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: catalogData.total,
        synced: syncedCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors : undefined,
        filters: catalogData.filters,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("[wordpress-catalog-sync] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
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