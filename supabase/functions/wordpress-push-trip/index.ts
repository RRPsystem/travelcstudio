import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TripPushPayload {
  assignment_id: string;
  force_update?: boolean;
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

    const { assignment_id, force_update = false }: TripPushPayload = await req.json();

    if (!assignment_id) {
      return new Response(
        JSON.stringify({ error: "Missing assignment_id" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from("trip_brand_assignments")
      .select(`
        id,
        trip_id,
        brand_id,
        status,
        metadata,
        trips!inner (
          id,
          title,
          slug,
          description,
          content,
          featured_image,
          price,
          duration_days,
          metadata
        )
      `)
      .eq("id", assignment_id)
      .maybeSingle();

    if (assignmentError || !assignment) {
      return new Response(
        JSON.stringify({ error: "Assignment not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (assignment.status !== "accepted" && assignment.status !== "mandatory" && !force_update) {
      return new Response(
        JSON.stringify({ error: "Trip must be accepted before pushing to WordPress" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id, name, wordpress_url, wordpress_username, wordpress_app_password")
      .eq("id", assignment.brand_id)
      .maybeSingle();

    if (brandError || !brand) {
      return new Response(
        JSON.stringify({ error: "Brand not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (!brand.wordpress_url || !brand.wordpress_username || !brand.wordpress_app_password) {
      return new Response(
        JSON.stringify({
          error: "WordPress credentials not configured for this brand",
          details: "Please configure WordPress URL, username and app password in brand settings"
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const trip = Array.isArray(assignment.trips) ? assignment.trips[0] : assignment.trips;

    const wpMetadata = assignment.metadata || {};
    const existingWpId = wpMetadata.wp_post_id;

    const wpUrl = brand.wordpress_url.replace(/\/$/, "");
    const endpoint = existingWpId
      ? `${wpUrl}/wp-json/rbs-travel/v1/trips/${existingWpId}`
      : `${wpUrl}/wp-json/rbs-travel/v1/trips`;

    const method = existingWpId ? "PUT" : "POST";

    const tripData = {
      title: trip.title,
      slug: trip.slug,
      description: trip.description || "",
      content: trip.content || {},
      featured_image: trip.featured_image || "",
      price: trip.price || 0,
      duration_days: trip.duration_days || 0,
      tc_idea_id: trip.metadata?.tc_idea_id || trip.id,
      continent: trip.metadata?.continent || "",
      country: trip.metadata?.country || "",
      status: "draft",
      booking_url: "",
      contact_button_text: "",
      contact_button_url: "",
      whatsapp_number: "",
      whatsapp_message: "",
    };

    const authString = btoa(`${brand.wordpress_username}:${brand.wordpress_app_password}`);

    console.log(`[wordpress-push-trip] ${method} to ${endpoint}`);

    const wpResponse = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`,
      },
      body: JSON.stringify(tripData),
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error("[wordpress-push-trip] WordPress API error:", errorText);
      throw new Error(`WordPress API error: ${wpResponse.status} - ${errorText}`);
    }

    const wpResult = await wpResponse.json();

    const updatedMetadata = {
      ...wpMetadata,
      wp_post_id: wpResult.id || existingWpId,
      wp_slug: wpResult.slug,
      wp_url: `${wpUrl}/?p=${wpResult.id || existingWpId}`,
      last_pushed_at: new Date().toISOString(),
      push_status: "success",
    };

    const { error: updateError } = await supabase
      .from("trip_brand_assignments")
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment_id);

    if (updateError) {
      console.error("[wordpress-push-trip] Failed to update metadata:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: existingWpId ? "Trip updated in WordPress" : "Trip created in WordPress",
        wp_post_id: wpResult.id || existingWpId,
        wp_url: updatedMetadata.wp_url,
        action: existingWpId ? "updated" : "created",
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
    console.error("[wordpress-push-trip] Error:", error);
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
