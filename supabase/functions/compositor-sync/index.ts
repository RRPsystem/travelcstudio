import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { trip_id, compositor_booking_id, compositor_api_url } = await req.json();

    if (!trip_id || !compositor_booking_id) {
      return new Response(
        JSON.stringify({ error: "Missing trip_id or compositor_booking_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get trip to find brand_id
    const { data: trip, error: tripError } = await supabase
      .from("travel_trips")
      .select("brand_id")
      .eq("id", trip_id)
      .single();

    if (tripError || !trip) {
      return new Response(
        JSON.stringify({ error: "Trip not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch data from Travel Compositor API
    // Use sync-travel endpoint (same as initial sync) - this endpoint works
    const apiUrl = "https://www.ai-websitestudio.nl/api/travelbro/sync-travel";
    
    console.log("[Compositor Sync] Fetching from:", apiUrl);
    console.log("[Compositor Sync] Booking ID:", compositor_booking_id);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: compositor_booking_id,
        micrositeId: "rondreis-planner",
        language: "NL",
        brand_id: trip.brand_id
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Compositor Sync] API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Compositor API error: ${response.status}`, details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("[Compositor Sync] Received data:", JSON.stringify(result).substring(0, 500));

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error || "Compositor sync failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const compositorData = result.data;

    // Build structured itinerary from compositor data
    const structuredItinerary = {
      title: compositorData.title || compositorData.name || "Onbekende reis",
      destination: compositorData.destination || compositorData.destinations?.[0]?.name || "",
      start_date: compositorData.start_date || compositorData.departure_date || null,
      end_date: compositorData.end_date || compositorData.return_date || null,
      duration_days: compositorData.duration_days || compositorData.nights + 1 || 0,
      destinations: compositorData.destinations || [],
      hotels: compositorData.hotels || [],
      flights: compositorData.flights || [],
      activities: compositorData.activities || [],
      itinerary: compositorData.itinerary || compositorData.day_by_day || [],
      included: compositorData.included || [],
      excluded: compositorData.excluded || [],
      price: compositorData.price || null,
      currency: compositorData.currency || "EUR",
      travelers: compositorData.travelers || compositorData.pax || null,
      raw_compositor_data: compositorData
    };

    // Build raw text summary for AI context
    let rawText = `REIS: ${structuredItinerary.title}\n`;
    rawText += `BESTEMMING: ${structuredItinerary.destination}\n`;
    
    if (structuredItinerary.start_date) {
      rawText += `STARTDATUM: ${structuredItinerary.start_date}\n`;
    }
    if (structuredItinerary.end_date) {
      rawText += `EINDDATUM: ${structuredItinerary.end_date}\n`;
    }
    if (structuredItinerary.duration_days) {
      rawText += `DUUR: ${structuredItinerary.duration_days} dagen\n`;
    }

    if (structuredItinerary.hotels && structuredItinerary.hotels.length > 0) {
      rawText += `\nHOTELS:\n`;
      structuredItinerary.hotels.forEach((hotel: any, i: number) => {
        rawText += `${i + 1}. ${hotel.name || hotel.hotel_name}`;
        if (hotel.city || hotel.location) rawText += ` - ${hotel.city || hotel.location}`;
        if (hotel.nights) rawText += ` (${hotel.nights} nachten)`;
        rawText += `\n`;
      });
    }

    if (structuredItinerary.itinerary && structuredItinerary.itinerary.length > 0) {
      rawText += `\nDAGPROGRAMMA:\n`;
      structuredItinerary.itinerary.forEach((day: any, i: number) => {
        rawText += `Dag ${day.day || i + 1}: ${day.title || day.description || ""}\n`;
        if (day.activities) {
          day.activities.forEach((act: any) => {
            rawText += `  - ${typeof act === 'string' ? act : act.name || act.description}\n`;
          });
        }
      });
    }

    if (structuredItinerary.included && structuredItinerary.included.length > 0) {
      rawText += `\nINCLUSIEF:\n`;
      structuredItinerary.included.forEach((item: any) => {
        rawText += `- ${typeof item === 'string' ? item : item.description}\n`;
      });
    }

    console.log("[Compositor Sync] Built raw text:", rawText.substring(0, 500));

    // Update trip with synced data
    const { error: updateError } = await supabase
      .from("travel_trips")
      .update({
        parsed_data: structuredItinerary,
        raw_text: rawText,
        compositor_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", trip_id);

    if (updateError) {
      console.error("[Compositor Sync] Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update trip", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Compositor Sync] Trip updated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        structured_itinerary: structuredItinerary,
        message: "Trip synced successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Compositor Sync] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
