import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WordPressTripMetadata {
  wp_post_id: number;
  brand_id?: string;
  booking_url?: string;
  contact_button_text?: string;
  contact_button_url?: string;
  whatsapp_number?: string;
  whatsapp_message?: string;
  status?: string;
  published_at?: string;
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

    const webhookSecret = Deno.env.get("WORDPRESS_WEBHOOK_SECRET");
    const providedSecret = req.headers.get("X-Webhook-Secret");

    if (webhookSecret && providedSecret !== webhookSecret) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook secret" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const payload: WordPressTripMetadata = await req.json();

    if (!payload.wp_post_id) {
      return new Response(
        JSON.stringify({ error: "Missing wp_post_id" }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("[wordpress-trip-webhook] Received update for wp_post_id:", payload.wp_post_id);

    let query = supabase
      .from("trip_brand_assignments")
      .select("id, brand_id, metadata")
      .contains("metadata", { wp_post_id: payload.wp_post_id });

    if (payload.brand_id) {
      query = query.eq("brand_id", payload.brand_id);
    }

    const { data: assignments, error: findError } = await query;

    if (findError) {
      console.error("[wordpress-trip-webhook] Error finding assignment:", findError);
      throw findError;
    }

    if (!assignments || assignments.length === 0) {
      return new Response(
        JSON.stringify({
          warning: "No assignment found with this wp_post_id",
          wp_post_id: payload.wp_post_id,
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    const assignment = assignments[0];
    const existingMetadata = assignment.metadata || {};

    const updatedMetadata = {
      ...existingMetadata,
      wp_post_id: payload.wp_post_id,
      booking_url: payload.booking_url || existingMetadata.booking_url,
      contact_button_text: payload.contact_button_text || existingMetadata.contact_button_text,
      contact_button_url: payload.contact_button_url || existingMetadata.contact_button_url,
      whatsapp_number: payload.whatsapp_number || existingMetadata.whatsapp_number,
      whatsapp_message: payload.whatsapp_message || existingMetadata.whatsapp_message,
      wp_status: payload.status || existingMetadata.wp_status,
      last_synced_from_wp: new Date().toISOString(),
    };

    if (payload.published_at) {
      updatedMetadata.wp_published_at = payload.published_at;
    }

    const updateData: any = {
      metadata: updatedMetadata,
      updated_at: new Date().toISOString(),
    };

    if (payload.status === "publish" && !assignment.is_published) {
      updateData.is_published = true;
    }

    const { error: updateError } = await supabase
      .from("trip_brand_assignments")
      .update(updateData)
      .eq("id", assignment.id);

    if (updateError) {
      console.error("[wordpress-trip-webhook] Update error:", updateError);
      throw updateError;
    }

    console.log("[wordpress-trip-webhook] Successfully updated assignment:", assignment.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Trip metadata updated successfully",
        assignment_id: assignment.id,
        updated_fields: Object.keys(payload).filter(k => k !== "wp_post_id" && k !== "brand_id"),
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
    console.error("[wordpress-trip-webhook] Error:", error);
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
