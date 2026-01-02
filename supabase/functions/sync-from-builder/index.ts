import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { jwtVerify } from "npm:jose@5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

interface BuilderJWTPayload {
  brand_id: string;
  sub: string;
  scope: string[];
  mode?: string;
  is_template?: boolean;
}

async function verifyBuilderToken(token: string): Promise<BuilderJWTPayload> {
  const jwtSecret = Deno.env.get("JWT_SECRET");
  if (!jwtSecret) {
    throw new Error("JWT_SECRET not configured");
  }

  const encoder = new TextEncoder();
  const secretKey = encoder.encode(jwtSecret);

  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as BuilderJWTPayload;
  } catch (error) {
    console.error("[sync-from-builder] JWT verification failed:", error);
    throw new Error("Invalid token");
  }
}

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
    console.log("[sync-from-builder] Request received:", {
      method: req.method,
      origin: req.headers.get("Origin"),
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    let payload: BuilderJWTPayload;
    try {
      payload = await verifyBuilderToken(token);
      console.log("[sync-from-builder] Token verified:", {
        brand_id: payload.brand_id,
        user_id: payload.sub,
        scope: payload.scope,
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      const body = await req.json();
      console.log("[sync-from-builder] Saving trip from builder:", {
        brand_id: payload.brand_id,
        trip_data_keys: Object.keys(body),
      });

      const { trip_id, page_id, title, description, destinations, duration_days, price_from,
              images, tags, gpt_instructions, is_featured, featured_priority } = body;

      if (!trip_id) {
        return new Response(
          JSON.stringify({ error: "trip_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existingTrip, error: fetchError } = await supabase
        .from("trips")
        .select("id")
        .eq("id", trip_id)
        .maybeSingle();

      if (fetchError) {
        console.error("[sync-from-builder] Error checking existing trip:", fetchError);
        return new Response(
          JSON.stringify({ error: "Database error checking trip" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tripData = {
        title: title || "Untitled Trip",
        description: description || "",
        destinations: destinations || [],
        duration_days: duration_days || null,
        price_from: price_from || null,
        images: images || [],
        tags: tags || [],
        gpt_instructions: gpt_instructions || null,
        is_featured: is_featured || false,
        featured_priority: featured_priority || null,
        page_id: page_id || null,
        updated_at: new Date().toISOString(),
      };

      if (existingTrip) {
        console.log("[sync-from-builder] Updating existing trip:", trip_id);

        const { data: updatedTrip, error: updateError } = await supabase
          .from("trips")
          .update(tripData)
          .eq("id", trip_id)
          .select()
          .single();

        if (updateError) {
          console.error("[sync-from-builder] Error updating trip:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update trip", details: updateError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: assignmentError } = await supabase
          .from("trip_brand_assignments")
          .upsert({
            trip_id: trip_id,
            brand_id: payload.brand_id,
            is_published: false,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "trip_id,brand_id"
          });

        if (assignmentError) {
          console.error("[sync-from-builder] Error updating assignment:", assignmentError);
        }

        // Genereer publieke URL met trips.id
        const { data: brandData } = await supabase
          .from("brands")
          .select("slug")
          .eq("id", payload.brand_id)
          .maybeSingle();

        const brandSlug = brandData?.slug || "www";
        const publicUrl = `https://${brandSlug}.ai-travelstudio.nl/trip/${trip_id}`;

        return new Response(
          JSON.stringify({
            success: true,
            trip: updatedTrip,
            publicUrl: publicUrl,
            message: "Trip updated successfully"
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      } else {
        console.log("[sync-from-builder] Creating new trip:", trip_id);

        const { data: newTrip, error: insertError } = await supabase
          .from("trips")
          .insert({
            id: trip_id,
            brand_id: payload.brand_id,
            ...tripData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error("[sync-from-builder] Error creating trip:", insertError);
          return new Response(
            JSON.stringify({ error: "Failed to create trip", details: insertError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: assignmentError } = await supabase
          .from("trip_brand_assignments")
          .insert({
            trip_id: trip_id,
            brand_id: payload.brand_id,
            is_published: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (assignmentError) {
          console.error("[sync-from-builder] Error creating assignment:", assignmentError);
        }

        // Genereer publieke URL met trips.id
        const { data: brandData } = await supabase
          .from("brands")
          .select("slug")
          .eq("id", payload.brand_id)
          .maybeSingle();

        const brandSlug = brandData?.slug || "www";
        const publicUrl = `https://${brandSlug}.ai-travelstudio.nl/trip/${trip_id}`;

        return new Response(
          JSON.stringify({
            success: true,
            trip: newTrip,
            publicUrl: publicUrl,
            message: "Trip created successfully"
          }),
          {
            status: 201,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const tripId = url.searchParams.get("trip_id");

      if (!tripId) {
        return new Response(
          JSON.stringify({ error: "trip_id parameter is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: trip, error: fetchError } = await supabase
        .from("trips")
        .select(`
          *,
          trip_brand_assignments!inner(
            brand_id,
            is_published
          )
        `)
        .eq("id", tripId)
        .eq("trip_brand_assignments.brand_id", payload.brand_id)
        .maybeSingle();

      if (fetchError) {
        console.error("[sync-from-builder] Error fetching trip:", fetchError);
        return new Response(
          JSON.stringify({ error: "Database error fetching trip" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!trip) {
        return new Response(
          JSON.stringify({ error: "Trip not found or not accessible" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ trip }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[sync-from-builder] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});