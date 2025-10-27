import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { tripId, sessionToken, message } = await req.json();

    if (!tripId || !sessionToken || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const googleApiKey = Deno.env.get("GOOGLE_SEARCH_API_KEY");
    const googleCseId = Deno.env.get("GOOGLE_SEARCH_CSE_ID");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Google Maps API key from database
    const { data: mapsSettings } = await supabase
      .from('api_settings')
      .select('api_key')
      .eq('service_name', 'Google Maps API')
      .eq('is_active', true)
      .maybeSingle();

    const googleMapsApiKey = mapsSettings?.api_key;

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

    const { data: intake } = await supabase
      .from("travel_intakes")
      .select("*")
      .eq("session_token", sessionToken)
      .single();

    const { data: conversationHistory } = await supabase
      .from("travel_conversations")
      .select("*")
      .eq("session_token", sessionToken)
      .order("created_at", { ascending: true })
      .limit(10);

    let searchResults = "";
    if (googleApiKey && googleCseId) {
      try {
        const searchQuery = `${message} ${trip.name}`;
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCseId}&q=${encodeURIComponent(searchQuery)}&num=3`;

        const searchResponse = await fetch(searchUrl);
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.items && searchData.items.length > 0) {
            searchResults = "\n\nRelevante zoekresultaten:\n" + searchData.items
              .map((item: any) => `- ${item.title}: ${item.snippet}`)
              .join("\n");
          }
        }
      } catch (error) {
        console.error("Search error:", error);
      }
    }

    // Check if message is location/route related and add Maps/Places data
    let locationData = "";
    const locationKeywords = ['route', 'routes', 'hoe kom ik', 'afstand', 'reistijd', 'navigatie', 'rijden', 'hotel', 'restaurant', 'attractie', 'adres', 'locatie', 'waar is', 'waar ligt'];
    const isLocationQuery = locationKeywords.some(keyword => message.toLowerCase().includes(keyword));

    if (isLocationQuery && googleMapsApiKey) {
      try {
        // Extract potential locations from parsed trip data
        let destinations = [];

        if (trip.parsed_data?.accommodations) {
          destinations = trip.parsed_data.accommodations.map((acc: any) => acc.name || acc.location).filter(Boolean);
        }

        if (trip.parsed_data?.activities) {
          const activityLocations = trip.parsed_data.activities.map((act: any) => act.location).filter(Boolean);
          destinations = [...destinations, ...activityLocations];
        }

        // If we found destinations and the message seems to ask about getting there
        if (destinations.length > 0 && (message.toLowerCase().includes('hoe kom ik') || message.toLowerCase().includes('route'))) {
          // Try to find the most relevant destination based on the message
          const relevantDest = destinations.find((dest: string) =>
            message.toLowerCase().includes(dest.toLowerCase())
          ) || destinations[0];

          if (relevantDest) {
            // Get place details
            const placesUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(relevantDest)}&inputtype=textquery&fields=formatted_address,geometry,name,rating,types&key=${googleMapsApiKey}&language=nl`;

            const placesResponse = await fetch(placesUrl);
            if (placesResponse.ok) {
              const placesData = await placesResponse.json();

              if (placesData.status === 'OK' && placesData.candidates && placesData.candidates.length > 0) {
                const place = placesData.candidates[0];
                locationData = `\n\n📍 Locatie informatie voor "${relevantDest}":\n`;
                locationData += `- Adres: ${place.formatted_address}\n`;
                locationData += `- Coördinaten: ${place.geometry.location.lat}, ${place.geometry.location.lng}\n`;

                if (place.rating) {
                  locationData += `- Google rating: ${place.rating}/5\n`;
                }

                // If there's a current location in intake or we can infer it, get directions
                let currentLocation = null;
                if (intake?.intake_data?.current_location) {
                  currentLocation = intake.intake_data.current_location;
                } else if (trip.parsed_data?.accommodations && trip.parsed_data.accommodations.length > 0) {
                  // Use first accommodation as starting point
                  currentLocation = trip.parsed_data.accommodations[0].name || trip.parsed_data.accommodations[0].location;
                }

                if (currentLocation && currentLocation !== relevantDest) {
                  // Get directions
                  const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(currentLocation)}&destination=${encodeURIComponent(relevantDest)}&mode=driving&key=${googleMapsApiKey}&language=nl`;

                  const directionsResponse = await fetch(directionsUrl);
                  if (directionsResponse.ok) {
                    const directionsData = await directionsResponse.json();

                    if (directionsData.status === 'OK' && directionsData.routes && directionsData.routes.length > 0) {
                      const route = directionsData.routes[0];
                      const leg = route.legs[0];

                      locationData += `\n🚗 Route van ${currentLocation}:\n`;
                      locationData += `- Afstand: ${leg.distance.text}\n`;
                      locationData += `- Reistijd: ${leg.duration.text}\n`;
                      locationData += `- Start adres: ${leg.start_address}\n`;
                      locationData += `- Bestemming: ${leg.end_address}\n`;
                    }
                  }
                }
              }
            }
          }
        } else if (message.toLowerCase().includes('restaurant') || message.toLowerCase().includes('eten')) {
          // Search for restaurants near trip location
          let searchLocation = trip.name;
          if (trip.parsed_data?.accommodations && trip.parsed_data.accommodations.length > 0) {
            searchLocation = trip.parsed_data.accommodations[0].location || trip.name;
          }

          const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=restaurant+${encodeURIComponent(searchLocation)}&key=${googleMapsApiKey}&language=nl`;

          const placesResponse = await fetch(placesUrl);
          if (placesResponse.ok) {
            const placesData = await placesResponse.json();

            if (placesData.status === 'OK' && placesData.results && placesData.results.length > 0) {
              locationData = `\n\n🍽️ Restaurants in de buurt:\n`;
              placesData.results.slice(0, 5).forEach((place: any) => {
                locationData += `- ${place.name} (${place.rating || 'geen'}/5) - ${place.formatted_address}\n`;
              });
            }
          }
        }
      } catch (error) {
        console.error("Location data error:", error);
      }
    }

    const hasValidTripData = trip.parsed_data && !trip.parsed_data.error;
    const tripDataText = hasValidTripData
      ? JSON.stringify(trip.parsed_data, null, 2)
      : "Geen gedetailleerde reis informatie beschikbaar uit het reisdocument. Je kunt wel algemene tips geven over de bestemming en helpen met vragen.";

    const systemPrompt = `Je bent TravelBRO, een vriendelijke en behulpzame Nederlandse reisassistent voor de reis "${trip.name}".

Reis informatie:
${tripDataText}

${trip.source_urls && trip.source_urls.length > 0 ? `Extra informatie bronnen:\n${trip.source_urls.join("\n")}\n` : ''}

${trip.custom_context ? `\n🎯 SPECIFIEKE REIS CONTEXT:\n${trip.custom_context}\n` : ''}

Reiziger informatie:
${intake ? JSON.stringify(intake.intake_data, null, 2) : "Geen intake data beschikbaar"}

BELANGRIJKE INSTRUCTIES voor het gebruik van reiziger informatie:

1. FAVORIET ETEN: Als reizigers favoriet eten hebben vermeld (bijv. "Pizza", "Mac Donalds"), gebruik dit actief in je adviezen:
   - Suggereer restaurants die dit eten serveren in de buurt van de accommodatie
   - Noem specifieke aanbevelingen: "Voor Susan die van pizza houdt, is er een leuke pizzeria op 10 minuten lopen!"

2. ALLERGIEËN & DIEETWENSEN: Als er allergieën of dieetwensen zijn vermeld, wees hier ALTIJD alert op:
   - Waarschuw voor potentiële problemen
   - Geef alternatieven: "Voor de vegetariër in je gezelschap zijn er goede vega opties bij..."

3. VERWACHTINGEN: Als reizigers hebben aangegeven waar ze naar uitkijken, speel hier actief op in:
   - Geef tips over deze specifieke activiteiten
   - "Ik zie dat Jory uitkijkt naar het zwembad! Het resort heeft een geweldig kinderbad met..."

4. INTERESSES (kinderen/tieners): Gebruik hun hobby's voor relevante tips:
   - Gaming → gaming cafés, arcades in de buurt
   - TikTok → leuke TikTok spots, fotogenieke locaties
   - Sport → sportfaciliteiten, activiteiten

5. BIJZONDERHEDEN: Als er speciale behoeften zijn vermeld (bijv. "wagenziek", "knuffel nodig"), geef proactief tips:
   - Voor wagenziek: suggereer kortere reisroutes, pauze plekken
   - Voor slaapproblemen: tips over de accommodatie

6. LOCATIE & ROUTE VRAGEN: Als er gevraagd wordt naar routes, adressen of hoe ergens te komen:
   - Gebruik de locatie informatie hieronder om concrete adressen, afstanden en reistijden te geven
   - Geef praktische tips zoals parkeren, openbaar vervoer alternatieven
   - Wees specifiek: "Het is 15 minuten rijden (12 km) via de A1"

Geef persoonlijke, vriendelijke adviezen waar reizigers bij naam genoemd worden. Wees altijd positief, behulpzaam en enthousiast. Gebruik emoji's waar passend. Houd antwoorden kort en to the point tenzij meer detail gevraagd wordt.${searchResults}${locationData}`;

    const messages = [
      { role: "system", content: systemPrompt },
    ];

    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((conv: any) => {
        messages.push({
          role: conv.role,
          content: conv.message,
        });
      });
    }

    messages.push({ role: "user", content: message });

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: trip.gpt_model || "gpt-4o",
        messages,
        max_tokens: 1000,
        temperature: trip.gpt_temperature ?? 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error("OpenAI API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get AI response", details: error }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in travelbro-chat:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});