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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    console.log("[trips-api] Request:", {
      method: req.method,
      pathname: url.pathname,
      pathParts,
    });

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

    const { data: userData, error: userDataError } = await supabase
      .from("users")
      .select("brand_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (userDataError || !userData) {
      return new Response(
        JSON.stringify({ error: "User data not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    const { brand_id, role } = userData;

    if (req.method === "GET" && pathParts.includes("trips-api")) {
      console.log("[trips-api] Fetching trips for brand:", brand_id);

      const page_id = url.searchParams.get("page_id");
      const for_builder = url.searchParams.get("for_builder") === "true";

      if (page_id) {
        console.log("[trips-api] Fetching trip for page_id:", page_id);

        const { data: assignment, error: assignmentError } = await supabase
          .from("trip_brand_assignments")
          .select(`
            id,
            trip_id,
            status,
            is_published,
            is_featured,
            priority,
            page_id,
            trips!inner (
              id,
              brand_id,
              title,
              slug,
              description,
              content,
              featured_image,
              price,
              duration_days,
              status,
              published_at,
              created_at
            )
          `)
          .eq("brand_id", brand_id)
          .eq("page_id", page_id)
          .in("status", ["accepted", "mandatory"])
          .maybeSingle();

        if (assignmentError) {
          console.error("[trips-api] Assignment error:", assignmentError);
        }

        if (assignment && assignment.trips) {
          const trip = Array.isArray(assignment.trips) ? assignment.trips[0] : assignment.trips;

          return new Response(
            JSON.stringify({
              trip: {
                ...trip,
                assignment_id: assignment.id,
                assignment_status: assignment.status,
                is_published: assignment.is_published,
                is_featured: assignment.is_featured || false,
                priority: assignment.priority || 999,
                source: 'assignment',
              }
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        const { data: brandTrip, error: brandTripError } = await supabase
          .from("trips")
          .select("*")
          .eq("brand_id", brand_id)
          .eq("page_id", page_id)
          .maybeSingle();

        if (brandTripError) {
          console.error("[trips-api] Brand trip error:", brandTripError);
        }

        if (brandTrip) {
          return new Response(
            JSON.stringify({
              trip: {
                ...brandTrip,
                source: 'brand',
                is_published: brandTrip.status === 'published',
              }
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        return new Response(
          JSON.stringify({ trip: null }),
          { status: 200, headers: corsHeaders }
        );
      }

      const { data: assignments, error: assignmentsError } = await supabase
        .from("trip_brand_assignments")
        .select(`
          id,
          trip_id,
          status,
          is_published,
          is_featured,
          priority,
          page_id,
          trips!inner (
            id,
            brand_id,
            title,
            slug,
            description,
            content,
            featured_image,
            price,
            duration_days,
            status,
            published_at,
            created_at
          )
        `)
        .eq("brand_id", brand_id)
        .in("status", ["accepted", "mandatory"]);

      if (assignmentsError) throw assignmentsError;

      const assignedTripIds = new Set((assignments || []).map(a => a.trip_id));

      const assignedTrips = (assignments || []).map(a => {
        const trip = Array.isArray(a.trips) ? a.trips[0] : a.trips;
        return {
          ...trip,
          assignment_id: a.id,
          assignment_status: a.status,
          is_published: a.is_published,
          is_featured: a.is_featured || false,
          priority: a.priority || 999,
          page_id: a.page_id,
          source: 'assignment',
        };
      });

      const { data: brandTrips, error: brandTripsError } = await supabase
        .from("trips")
        .select("*")
        .eq("brand_id", brand_id)
        .order("created_at", { ascending: false });

      if (brandTripsError) throw brandTripsError;

      const filteredBrandTrips = (brandTrips || [])
        .filter(t => !assignedTripIds.has(t.id))
        .map(t => ({
          ...t,
          source: 'brand',
          is_published: t.status === 'published',
          is_featured: false,
          priority: 999,
        }));

      const allTrips = [...assignedTrips, ...filteredBrandTrips];

      let filteredTrips = for_builder
        ? allTrips.filter(t => t.is_published || t.status === 'published')
        : allTrips;

      filteredTrips = filteredTrips.sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        if (a.is_featured && b.is_featured) {
          return (a.priority || 999) - (b.priority || 999);
        }
        return 0;
      });

      return new Response(
        JSON.stringify({ trips: filteredTrips }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (req.method === "POST" && pathParts.includes("deploy-to-builder")) {
      console.log("[trips-api] Deploying trip to builder");

      const body = await req.json();
      const { trip_id, page_slug } = body;

      if (!trip_id) {
        return new Response(
          JSON.stringify({ error: "Missing trip_id" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .eq("id", trip_id)
        .eq("brand_id", brand_id)
        .maybeSingle();

      if (tripError || !trip) {
        return new Response(
          JSON.stringify({ error: "Trip not found" }),
          { status: 404, headers: corsHeaders }
        );
      }

      const { data: websiteData, error: websiteError } = await supabase
        .from("websites")
        .select("id")
        .eq("brand_id", brand_id)
        .maybeSingle();

      if (websiteError || !websiteData) {
        return new Response(
          JSON.stringify({ error: "Website not found for this brand" }),
          { status: 404, headers: corsHeaders }
        );
      }

      const website_id = websiteData.id;

      let page_id = trip.page_id;

      if (!page_id && page_slug) {
        const { data: existingPage } = await supabase
          .from("website_pages")
          .select("id")
          .eq("website_id", website_id)
          .eq("slug", page_slug)
          .maybeSingle();

        if (existingPage) {
          page_id = existingPage.id;
        }
      }

      if (!page_id) {
        const pageSlug = page_slug || trip.slug || `trip-${Date.now()}`;

        const { data: newPage, error: pageError } = await supabase
          .from("website_pages")
          .insert({
            website_id,
            title: trip.title,
            slug: pageSlug,
            content_json: trip.content || {},
            status: "draft",
            content_type: "trip",
            show_in_menu: false,
            menu_order: 0,
          })
          .select("id")
          .maybeSingle();

        if (pageError) {
          console.error("[trips-api] Failed to create page:", pageError);
          throw pageError;
        }

        page_id = newPage!.id;

        const { error: updateError } = await supabase
          .from("trips")
          .update({ page_id })
          .eq("id", trip_id);

        if (updateError) {
          console.error("[trips-api] Failed to update trip with page_id:", updateError);
        }
      }

      const lovableProjectId = Deno.env.get("LOVABLE_PROJECT_ID");
      const builderUrl = lovableProjectId
        ? `https://lovable.dev/projects/${lovableProjectId}/editor?page_id=${page_id}`
        : null;

      return new Response(
        JSON.stringify({
          success: true,
          page_id,
          builder_url: builderUrl,
          trip: {
            id: trip.id,
            title: trip.title,
            slug: trip.slug,
          },
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (req.method === "POST" && pathParts.includes("sync-from-builder")) {
      console.log("[trips-api] Syncing trip from builder");

      const body = await req.json();
      const { page_id, trip_data } = body;

      if (!page_id) {
        return new Response(
          JSON.stringify({ error: "Missing page_id" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const { data: page, error: pageError } = await supabase
        .from("website_pages")
        .select("id, slug, title, content_json")
        .eq("id", page_id)
        .maybeSingle();

      if (pageError || !page) {
        return new Response(
          JSON.stringify({ error: "Page not found" }),
          { status: 404, headers: corsHeaders }
        );
      }

      const { data: existingTrip, error: existingError } = await supabase
        .from("trips")
        .select("id")
        .eq("page_id", page_id)
        .eq("brand_id", brand_id)
        .maybeSingle();

      const tripData: any = {
        brand_id,
        title: trip_data?.title || page.title,
        slug: trip_data?.slug || page.slug,
        description: trip_data?.description || "",
        content: trip_data?.content || page.content_json,
        featured_image: trip_data?.featured_image || "",
        status: "draft",
        author_type: "brand",
        author_id: user.id,
        page_id,
        updated_at: new Date().toISOString(),
      };

      if (existingTrip) {
        const { error: updateError } = await supabase
          .from("trips")
          .update(tripData)
          .eq("id", existingTrip.id);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({
            success: true,
            trip_id: existingTrip.id,
            message: "Trip updated successfully",
          }),
          { status: 200, headers: corsHeaders }
        );
      } else {
        tripData.created_at = new Date().toISOString();

        const { data: newTrip, error: insertError } = await supabase
          .from("trips")
          .insert(tripData)
          .select("id")
          .maybeSingle();

        if (insertError) throw insertError;

        return new Response(
          JSON.stringify({
            success: true,
            trip_id: newTrip!.id,
            message: "Trip created successfully",
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[trips-api] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});