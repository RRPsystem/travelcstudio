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
    const country = url.searchParams.get("country");
    const duration = url.searchParams.get("duration");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const featured = url.searchParams.get("featured") === "true";

    console.log("[travelc-api] Request:", { action, brandId, slug, category, country, duration, limit });

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

      // Step 1: Get all active brand assignments for this brand
      const { data: assignments, error: assignError } = await supabase
        .from("travelc_travel_brand_assignments")
        .select("travel_id, is_active, is_featured, show_hotels, show_prices, header_type, custom_title, custom_price")
        .eq("brand_id", brandId)
        .eq("is_active", true);

      if (assignError) throw assignError;

      const activeTravelIds = (assignments || []).map(a => a.travel_id);

      if (activeTravelIds.length === 0) {
        return new Response(
          JSON.stringify({ success: true, travels: [], count: 0 }),
          { status: 200, headers: corsHeaders }
        );
      }

      const assignmentMap = new Map((assignments || []).map(a => [a.travel_id, a]));

      // Step 2: Get the travel data for active assignments
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
        .in("id", activeTravelIds)
        .order("created_at", { ascending: false })
        .limit(limit);

      // Optional filters
      if (category) {
        query = query.contains("categories", [category]);
      }
      if (continent) {
        query = query.contains("continents", [continent]);
      }
      if (country) {
        query = query.contains("countries", [country]);
      }

      const { data: travels, error } = await query;
      if (error) throw error;

      // Step 3: Merge travel data with brand-specific settings
      const result = (travels || []).map(travel => {
        const assignment = assignmentMap.get(travel.id)!;
        return {
          ...travel,
          // Brand overrides
          is_featured: assignment.is_featured || false,
          show_hotels: assignment.show_hotels ?? true,
          show_prices: assignment.show_prices ?? true,
          header_type: assignment.header_type || "image",
          display_title: assignment.custom_title || travel.title,
          display_price: assignment.custom_price || travel.price_per_person,
          // Summary for listing
          destination_count: travel.destinations?.length || 0,
          hotel_count: travel.hotels?.length || 0,
          country_list: travel.countries || [],
          first_image: travel.hero_image || travel.images?.[0] || "",
        };
      });

      // Filter by duration (e.g. "1-7", "8-14", "15-21", "22+")
      let filteredResult = result;
      if (duration) {
        const [minStr, maxStr] = duration.split("-");
        const min = parseInt(minStr) || 0;
        const max = maxStr === "+" || !maxStr ? 999 : parseInt(maxStr);
        filteredResult = result.filter(t => {
          const days = t.number_of_days || 0;
          return days >= min && days <= max;
        });
      }

      // Sort: featured first, then by date
      if (featured) {
        filteredResult.sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return 0;
        });
      }

      return new Response(
        JSON.stringify({ success: true, travels: filteredResult, count: filteredResult.length }),
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
    // ACTION: search-options - Get available filter options for this brand
    // ============================================
    if (action === "search-options") {
      if (!brandId) {
        return new Response(
          JSON.stringify({ error: "brand_id is required" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Get all active assignments
      const { data: assignments } = await supabase
        .from("travelc_travel_brand_assignments")
        .select("travel_id")
        .eq("brand_id", brandId)
        .eq("is_active", true);

      const travelIds = (assignments || []).map(a => a.travel_id);

      if (travelIds.length === 0) {
        return new Response(
          JSON.stringify({ success: true, countries: [], categories: [], continents: [], durations: [] }),
          { status: 200, headers: corsHeaders }
        );
      }

      const { data: travels } = await supabase
        .from("travelc_travels")
        .select("countries, categories, continents, number_of_days")
        .in("id", travelIds);

      const countriesSet = new Set<string>();
      const categoriesSet = new Set<string>();
      const continentsSet = new Set<string>();
      const daysArray: number[] = [];

      (travels || []).forEach(t => {
        (t.countries || []).forEach((c: string) => countriesSet.add(c));
        (t.categories || []).forEach((c: string) => categoriesSet.add(c));
        (t.continents || []).forEach((c: string) => continentsSet.add(c));
        if (t.number_of_days) daysArray.push(t.number_of_days);
      });

      return new Response(
        JSON.stringify({
          success: true,
          countries: [...countriesSet].sort(),
          categories: [...categoriesSet].sort(),
          continents: [...continentsSet].sort(),
          durations: daysArray.length > 0 ? {
            min: Math.min(...daysArray),
            max: Math.max(...daysArray)
          } : null
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
      const { tc_id, author_id, author_type, microsite_id } = body;

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

      // Call import edge function with micrositeId
      const importRes = await fetch(`${supabaseUrl}/functions/v1/import-travel-compositor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ travelId: tc_id, micrositeId: microsite_id || "rondreis-planner" }),
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
        source_microsite: microsite_id || "rondreis-planner",
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

    // ============================================
    // ACTION: bulk-toggle-brands (POST) - Toggle enabled_for_brands for multiple travels
    // ============================================
    if (action === "bulk-toggle-brands" && req.method === "POST") {
      const body = await req.json();
      const { travel_ids, enabled } = body;

      if (!Array.isArray(travel_ids) || travel_ids.length === 0) {
        return new Response(
          JSON.stringify({ error: "travel_ids array is required" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const { error } = await supabase
        .from("travelc_travels")
        .update({ enabled_for_brands: enabled })
        .in("id", travel_ids);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, count: travel_ids.length }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ============================================
    // ACTION: run-migration (POST) - Run a one-time migration
    // ============================================
    if (action === "run-migration" && req.method === "POST") {
      // Add source_microsite column if it doesn't exist
      const { error } = await supabase.rpc("exec_sql", {
        sql_query: "ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS source_microsite TEXT;"
      }).maybeSingle();

      // If rpc doesn't exist, try direct approach
      if (error) {
        // Try adding via a dummy update to check if column exists
        const { error: testError } = await supabase
          .from("travelc_travels")
          .update({ source_microsite: null })
          .eq("id", "00000000-0000-0000-0000-000000000000");
        
        if (testError && testError.message?.includes("source_microsite")) {
          return new Response(
            JSON.stringify({ success: false, error: "Column source_microsite does not exist. Please run in Supabase SQL Editor: ALTER TABLE travelc_travels ADD COLUMN IF NOT EXISTS source_microsite TEXT;" }),
            { status: 400, headers: corsHeaders }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Migration completed" }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ============================================
    // ACTION: brand-settings - Get brand colors/info for WP plugin
    // ============================================
    if (action === "brand-settings") {
      if (!brandId) {
        return new Response(
          JSON.stringify({ error: "brand_id is required" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const { data: brand, error } = await supabase
        .from("brands")
        .select("id, name, slug, primary_color, secondary_color, logo_url")
        .eq("id", brandId)
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          brand: brand || null,
        }),
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
