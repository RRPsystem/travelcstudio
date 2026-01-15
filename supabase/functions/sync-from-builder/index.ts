import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { jwtVerify } from "npm:jose@5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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

      const { id, page_id, title, description, destinations, duration_days, price_from,
              images, tags, gpt_instructions, is_featured, featured_priority, is_published } = body;

      let tripId = id;
      let existingTrip = null;

      if (tripId) {
        const { data: trip } = await supabase
          .from("trips")
          .select("id, share_token")
          .eq("id", tripId)
          .maybeSingle();

        existingTrip = trip;
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
        status: 'published',
        updated_at: new Date().toISOString(),
      };

      if (existingTrip) {
        console.log("[sync-from-builder] Updating existing trip:", tripId);

        const { data: updatedTrip, error: updateError } = await supabase
          .from("trips")
          .update(tripData)
          .eq("id", tripId)
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
            trip_id: updatedTrip.id,
            brand_id: payload.brand_id,
            is_published: is_published !== undefined ? is_published : true,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "trip_id,brand_id"
          });

        if (assignmentError) {
          console.error("[sync-from-builder] Error updating assignment:", assignmentError);
        }

        console.log("[sync-from-builder] Assignment updated:", {
          trip_id: updatedTrip.id,
          brand_id: payload.brand_id,
          is_published: is_published !== undefined ? is_published : true,
        });

        const { data: brandData } = await supabase
          .from("brands")
          .select("slug")
          .eq("id", payload.brand_id)
          .maybeSingle();

        const brandSlug = brandData?.slug || "www";
        const publicUrl = `https://${brandSlug}.ai-travelstudio.nl/trip/${updatedTrip.id}`;

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
        console.log("[sync-from-builder] Creating new trip (Supabase will generate UUID)");

        const insertData: any = {
          brand_id: payload.brand_id,
          ...tripData,
          created_at: new Date().toISOString(),
        };

        if (tripId) {
          insertData.id = tripId;
          insertData.share_token = tripId;
        }

        const { data: newTrip, error: insertError } = await supabase
          .from("trips")
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          console.error("[sync-from-builder] Error creating trip:", insertError);
          return new Response(
            JSON.stringify({ error: "Failed to create trip", details: insertError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!tripId && newTrip.share_token !== newTrip.id) {
          console.log("[sync-from-builder] Setting share_token to match trip ID");
          await supabase
            .from("trips")
            .update({ share_token: newTrip.id })
            .eq("id", newTrip.id);

          newTrip.share_token = newTrip.id;
        }

        const { error: assignmentError } = await supabase
          .from("trip_brand_assignments")
          .insert({
            trip_id: newTrip.id,
            brand_id: payload.brand_id,
            is_published: is_published !== undefined ? is_published : true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (assignmentError) {
          console.error("[sync-from-builder] Error creating assignment:", assignmentError);
        }

        console.log("[sync-from-builder] Assignment created:", {
          trip_id: newTrip.id,
          brand_id: payload.brand_id,
          is_published: is_published !== undefined ? is_published : true,
        });

        const { data: brandData } = await supabase
          .from("brands")
          .select("slug")
          .eq("id", payload.brand_id)
          .maybeSingle();

        const brandSlug = brandData?.slug || "www";
        const publicUrl = `https://${brandSlug}.ai-travelstudio.nl/trip/${newTrip.id}`;

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