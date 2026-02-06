import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Only GET and POST requests allowed" }),
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

    // ============================================
    // ACTION: toggle-assignment (POST) - Toggle brand assignment
    // ============================================
    if (action === "toggle-assignment" && req.method === "POST") {
      const body = await req.json();
      const { travel_id, brand_id: bodyBrandId, field, value } = body;
      const targetBrandId = bodyBrandId || brandId;

      if (!travel_id || !targetBrandId) {
        return new Response(
          JSON.stringify({ error: "travel_id and brand_id are required" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Check if assignment exists
      const { data: existing } = await supabase
        .from("travelc_travel_brand_assignments")
        .select("*")
        .eq("travel_id", travel_id)
        .eq("brand_id", targetBrandId)
        .maybeSingle();

      if (existing) {
        // Update existing assignment
        const updateField = field || "is_active";
        const updateValue = value !== undefined ? value : !existing[updateField];
        const { error } = await supabase
          .from("travelc_travel_brand_assignments")
          .update({ [updateField]: updateValue })
          .eq("id", existing.id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, action: "updated", field: updateField, value: updateValue }),
          { status: 200, headers: corsHeaders }
        );
      } else {
        // Create new assignment (activate)
        const { error } = await supabase
          .from("travelc_travel_brand_assignments")
          .insert([{
            travel_id,
            brand_id: targetBrandId,
            is_active: true,
            is_featured: false,
            show_hotels: true,
            show_prices: true,
            show_itinerary: true,
            header_type: "image",
            display_order: 0,
            status: "accepted"
          }]);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, action: "created" }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // ============================================
    // ACTION: assignments (GET) - Get assignments for a brand
    // ============================================
    if (action === "assignments") {
      if (!brandId) {
        return new Response(
          JSON.stringify({ error: "brand_id is required" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const { data, error } = await supabase
        .from("travelc_travel_brand_assignments")
        .select("*")
        .eq("brand_id", brandId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, assignments: data || [] }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ============================================
    // ACTION: import-travel (POST) - Import from Travel Compositor
    // ============================================
    if (action === "import-travel" && req.method === "POST") {
      const body = await req.json();
      const { tc_id, author_id, author_type } = body;

      if (!tc_id) {
        return new Response(
          JSON.stringify({ error: "tc_id is required" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Check if already exists
      const { data: existing } = await supabase
        .from("travelc_travels")
        .select("id, title")
        .eq("travel_compositor_id", tc_id)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: `Deze reis bestaat al: "${existing.title}"`, existing_id: existing.id }),
          { status: 409, headers: corsHeaders }
        );
      }

      // Call import edge function
      const importRes = await fetch(`${supabaseUrl}/functions/v1/import-travel-compositor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ travelId: tc_id }),
      });

      const importData = await importRes.json();
      if (!importData || !importData.title) {
        return new Response(
          JSON.stringify({ error: "Kon reis niet ophalen van Travel Compositor" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Generate slug
      const slug = importData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const travelData: Record<string, any> = {
        travel_compositor_id: tc_id,
        title: importData.title,
        slug,
        description: importData.description || "",
        intro_text: importData.introText || "",
        number_of_nights: importData.numberOfNights || 0,
        number_of_days: importData.numberOfDays || (importData.numberOfNights ? importData.numberOfNights + 1 : 0),
        price_per_person: importData.pricePerPerson || 0,
        price_description: importData.priceDescription || "",
        currency: importData.currency || "EUR",
        destinations: importData.destinations || [],
        countries: importData.countries || [],
        hotels: importData.hotels || [],
        flights: importData.flights || [],
        transports: importData.transports || [],
        car_rentals: importData.carRentals || [],
        activities: importData.activities || [],
        cruises: importData.cruises || [],
        transfers: importData.transfers || [],
        excursions: importData.excursions || [],
        images: importData.images || [],
        hero_image: importData.heroImage || importData.images?.[0] || "",
        hero_video_url: importData.heroVideoUrl || "",
        route_map_url: importData.routeMapUrl || "",
        itinerary: importData.itinerary || [],
        included: importData.included || [],
        excluded: importData.excluded || [],
        highlights: importData.highlights || [],
        selling_points: importData.sellingPoints || [],
        practical_info: importData.practicalInfo || {},
        price_breakdown: importData.priceBreakdown || {},
        travelers: importData.travelers || {},
        ai_summary: importData.aiSummary || "",
        all_texts: importData.allTexts || {},
        raw_tc_data: importData,
        author_id: author_id || null,
        author_type: author_type || "admin",
      };

      const { data: inserted, error: insertError } = await supabase
        .from("travelc_travels")
        .insert([travelData])
        .select("id, title")
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ success: true, travel: inserted, title: inserted.title }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ============================================
    // ACTION: save-travel (POST) - Update travel data
    // ============================================
    if (action === "save-travel" && req.method === "POST") {
      const body = await req.json();
      const { travel_id, data: travelUpdate } = body;

      if (!travel_id || !travelUpdate) {
        return new Response(
          JSON.stringify({ error: "travel_id and data are required" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Generate slug if title changed
      if (travelUpdate.title && !travelUpdate.slug) {
        travelUpdate.slug = travelUpdate.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }

      const { error } = await supabase
        .from("travelc_travels")
        .update(travelUpdate)
        .eq("id", travel_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ============================================
    // ACTION: delete-travel (POST) - Delete a travel
    // ============================================
    if (action === "delete-travel" && req.method === "POST") {
      const body = await req.json();
      const { travel_id } = body;

      if (!travel_id) {
        return new Response(
          JSON.stringify({ error: "travel_id is required" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Delete assignments first
      await supabase
        .from("travelc_travel_brand_assignments")
        .delete()
        .eq("travel_id", travel_id);

      const { error } = await supabase
        .from("travelc_travels")
        .delete()
        .eq("id", travel_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
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
