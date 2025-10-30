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

      let query = supabase
        .from("trips")
        .select(`
          id,
          brand_id,
          title,
          slug,
          description,
          content,
          featured_image,
          status,
          author_type,
          author_id,
          page_id,
          created_at,
          updated_at
        `)
        .eq("brand_id", brand_id)
        .order("created_at", { ascending: false });

      const { data: trips, error: tripsError } = await query;

      if (tripsError) throw tripsError;

      return new Response(
        JSON.stringify({ trips: trips || [] }),
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

      const builderUrl = `https://lovable.dev/projects/${Deno.env.get("LOVABLE_PROJECT_ID")}/editor?page_id=${page_id}`;

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
