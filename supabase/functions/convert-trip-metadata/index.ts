import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface HotelSegment {
  kind: 'hotel';
  segment_ref: string;
  start_datetime: string;
  end_datetime: string | null;
  location: {
    name: string;
    address: string;
    city: string | null;
    country: string | null;
  };
  details?: any;
}

function convertToItinerary(parsedData: any): any[] {
  if (!parsedData?.segments) return [];

  const hotelSegments = parsedData.segments.filter((s: any) => s.kind === 'hotel') as HotelSegment[];

  return hotelSegments.map((hotel, index) => {
    const startDate = new Date(hotel.start_datetime);
    const dayNumber = index + 1;

    return {
      day: dayNumber,
      date: startDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' }),
      location: hotel.location.city || hotel.location.name,
      hotel: {
        name: hotel.location.name,
        address: hotel.location.address,
        city: hotel.location.city,
        country: hotel.location.country,
        has_restaurant: null,
        amenities: []
      },
      activities: []
    };
  });
}

async function enrichWithGPT(itinerary: any[], rawText: string, openaiApiKey: string) {
  const prompt = `Analyseer deze reistekst en voeg details toe aan de itinerary:

REISTEKST:
${rawText.substring(0, 10000)}

HUIDIGE ITINERARY:
${JSON.stringify(itinerary, null, 2)}

Voeg toe voor elk hotel:
1. has_restaurant: true/false (of null als onbekend)
2. amenities: array met faciliteiten zoals ["restaurant", "bar", "zwembad", "spa", "wifi", "parking", "gym", etc.]
3. activities: array met activiteiten op die dag

Return ALLEEN de complete itinerary array als JSON.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Je bent een reisdocument analyzer. Return alleen valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    console.error('GPT enrichment failed, returning basic itinerary');
    return itinerary;
  }

  const result = await response.json();
  const content = JSON.parse(result.choices[0].message.content);

  return content.itinerary || content;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { tripId } = await req.json();

    if (!tripId) {
      return new Response(
        JSON.stringify({ error: "Trip ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: trip, error: tripError } = await supabase
      .from("travel_trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      return new Response(
        JSON.stringify({ error: "Trip not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (trip.metadata?.itinerary) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Trip already has itinerary",
          itinerary: trip.metadata.itinerary
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let itinerary = convertToItinerary(trip.parsed_data);

    const { data: apiSettings } = await supabase
      .from("api_settings")
      .select("api_key")
      .eq("provider", "OpenAI")
      .eq("service_name", "OpenAI API")
      .eq("is_active", true)
      .maybeSingle();

    if (apiSettings?.api_key && trip.raw_text) {
      console.log('Enriching itinerary with GPT...');
      itinerary = await enrichWithGPT(itinerary, trip.raw_text, apiSettings.api_key);
    }

    const { error: updateError } = await supabase
      .from("travel_trips")
      .update({
        metadata: {
          ...trip.metadata,
          itinerary
        }
      })
      .eq("id", tripId);

    if (updateError) {
      throw new Error(`Failed to update trip: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        itinerary,
        message: `Created itinerary with ${itinerary.length} days`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error converting metadata:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
