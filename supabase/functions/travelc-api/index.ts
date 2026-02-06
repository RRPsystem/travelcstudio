import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Only GET requests allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";
    const brandId = url.searchParams.get("brand_id");
    const slug = url.searchParams.get("slug");
    const category = url.searchParams.get("category");
    const continent = url.searchParams.get("continent");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const featured = url.searchParams.get("featured") === "true";

    console.log("[travelc-api] Request:", { action, brandId, slug, category, limit });

    // ============================================
    // ACTION: list - Get all active travels for a brand
    // ============================================
    if (action === "list") {
      if (!brandId) {
        return new Response(
          JSON.stringify({ error: "brand_id is required" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Get travels that are enabled for brands or mandatory
      let query = supabase
        .from("travelc_travels")
        .select(`
          id, travel_compositor_id, title, slug, description, intro_text,
          number_of_nights, number_of_days, price_per_person, price_description,
          destinations, countries, hotels, images, hero_image, hero_video_url,
          categories, themes, continents, highlights, 
          enabled_for_brands, enabled_for_franchise, is_mandatory,
          created_at
        `)
        .or("enabled_for_brands.eq.true,is_mandatory.eq.true")
        .order("created_at", { ascending: false })
        .limit(limit);

      // Optional filters
      if (category) {
        query = query.contains("categories", [category]);
      }
      if (continent) {
        query = query.contains("continents", [continent]);
      }

      const { data: travels, error } = await query;
      if (error) throw error;

      // Also check brand-specific assignments
      const { data: assignments } = await supabase
        .from("travelc_travel_brand_assignments")
        .select("travel_id, is_active, is_featured, show_hotels, show_prices, header_type, custom_title, custom_price")
        .eq("brand_id", brandId)
        .eq("is_active", true);

      const assignmentMap = new Map((assignments || []).map(a => [a.travel_id, a]));

      // Merge travels with brand-specific settings
      const result = (travels || []).map(travel => {
        const assignment = assignmentMap.get(travel.id);
        return {
          ...travel,
          // Brand overrides
          is_featured: assignment?.is_featured || false,
          show_hotels: assignment?.show_hotels ?? true,
          show_prices: assignment?.show_prices ?? true,
          header_type: assignment?.header_type || "image",
          display_title: assignment?.custom_title || travel.title,
          display_price: assignment?.custom_price || travel.price_per_person,
          // Summary for listing
          destination_count: travel.destinations?.length || 0,
          hotel_count: travel.hotels?.length || 0,
          country_list: travel.countries || [],
          first_image: travel.hero_image || travel.images?.[0] || "",
        };
      });

      // Sort: featured first, then by date
      if (featured) {
        result.sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return 0;
        });
      }

      return new Response(
        JSON.stringify({ success: true, travels: result, count: result.length }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ============================================
    // ACTION: get - Get single travel by slug
    // ============================================
    if (action === "get") {
      if (!slug) {
        return new Response(
          JSON.stringify({ error: "slug is required" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const { data: travel, error } = await supabase
        .from("travelc_travels")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      if (!travel) {
        return new Response(
          JSON.stringify({ error: "Travel not found" }),
          { status: 404, headers: corsHeaders }
        );
      }

      // Get brand-specific settings if brand_id provided
      let brandSettings = null;
      if (brandId) {
        const { data: assignment } = await supabase
          .from("travelc_travel_brand_assignments")
          .select("*")
          .eq("travel_id", travel.id)
          .eq("brand_id", brandId)
          .maybeSingle();
        brandSettings = assignment;
      }

      // Remove raw_tc_data from public response (too large)
      const { raw_tc_data, ...publicTravel } = travel;

      return new Response(
        JSON.stringify({
          success: true,
          travel: {
            ...publicTravel,
            brand_settings: brandSettings,
          },
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ============================================
    // ACTION: categories - Get available categories
    // ============================================
    if (action === "categories") {
      const { data, error } = await supabase
        .from("travelc_categories")
        .select("id, name, slug, icon, color, description")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, categories: data || [] }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: list, get, categories" }),
      { status: 400, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error("[travelc-api] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
