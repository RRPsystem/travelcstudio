import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { StateManager } from "./state-manager.ts";
import { GooglePlacesTool, GoogleDirectionsTool, WebSearchTool } from "./tools.ts";
import { ObservabilityLogger, ToolCall, RAGChunk } from "./observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TEMPERATURE = 0.3;
const MAX_TOKENS = 2000;
const MAX_HISTORY_MESSAGES = 20;

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const stateManager = new StateManager(supabase, sessionToken, tripId);
    const logger = new ObservabilityLogger(supabase, sessionToken, tripId);

    const { data: apiSettings } = await supabase
      .from('api_settings')
      .select('*')
      .in('provider', ['OpenAI', 'Google', 'system'])
      .eq('is_active', true);

    const openaiApiKey = apiSettings?.find(s => s.provider === 'OpenAI')?.api_key || Deno.env.get('OPENAI_API_KEY');
    const googleMapsApiKey = apiSettings?.find(s => s.provider === 'Google' && s.service_name === 'Google Maps API')?.api_key || Deno.env.get('GOOGLE_MAPS_API_KEY');
    const systemSettings = apiSettings?.find(s => s.provider === 'system' && s.service_name === 'Twilio WhatsApp');
    const googleSearchApiKey = systemSettings?.google_search_api_key || Deno.env.get('GOOGLE_SEARCH_API_KEY');
    const googleSearchEngineId = systemSettings?.google_search_engine_id || Deno.env.get('GOOGLE_SEARCH_ENGINE_ID');

    const { data: trip, error: tripError } = await supabase
      .from("travel_trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      return new Response(
        JSON.stringify({ error: "Trip not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: conversationHistory } = await supabase
      .from("travel_conversations")
      .select("*")
      .eq("session_token", sessionToken)
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true })
      .limit(MAX_HISTORY_MESSAGES);

    const slotsBefore = await stateManager.getSlots();
    console.log('🎯 Current slots:', slotsBefore);

    const toolsCalled: ToolCall[] = [];
    const ragChunks: RAGChunk[] = [];

    const detectIntent = (msg: string): string => {
      const lower = msg.toLowerCase();
      if (lower.includes('restaurant') || lower.includes('eten') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('ontbijt')) {
        return 'restaurants';
      }
      if (lower.includes('route') || lower.includes('afstand') || lower.includes('hoe ver') || lower.includes('reistijd')) {
        return 'route';
      }
      if (lower.includes('hotel') || lower.includes('accommodatie') || lower.includes('slapen') || lower.includes('verblijf')) {
        return 'hotelinfo';
      }
      if (lower.includes('doen') || lower.includes('activiteit') || lower.includes('bezienswaardigheid') || lower.includes('tips')) {
        return 'activiteiten';
      }
      if (lower.includes('weer') || lower.includes('temperatuur') || lower.includes('klimaat') ||
          lower.includes('nieuws') || lower.includes('actueel') || lower.includes('wat is') ||
          lower.includes('zoek') || lower.includes('informatie over')) {
        return 'websearch';
      }
      return 'algemeen';
    };

    const intent = detectIntent(message);
    console.log('🎯 Detected intent:', intent);

    let toolData = "";

    if (intent === 'restaurants' && googleMapsApiKey) {
      const location = slotsBefore.current_hotel || slotsBefore.current_destination;

      if (location) {
        console.log(`🍴 Fetching restaurants near: ${location}`);
        const placesTool = new GooglePlacesTool(googleMapsApiKey);
        const { restaurants, source } = await placesTool.findRestaurantsNearby(location);

        if (restaurants.length > 0) {
          toolData = "\n\n📍 REAL-TIME RESTAURANTS IN DE BUURT:\n";
          restaurants.forEach((r, i) => {
            toolData += `\n${i + 1}. **${r.name}**\n`;
            toolData += `   - Adres: ${r.address}\n`;
            toolData += `   - Afstand: ${Math.round(r.distance_meters)}m\n`;
            if (r.rating) toolData += `   - Rating: ${r.rating}/5 ⭐\n`;
            if (r.price_level) toolData += `   - Prijsniveau: ${'€'.repeat(r.price_level)}\n`;
            if (r.cuisine_types.length > 0) toolData += `   - Type: ${r.cuisine_types.join(', ')}\n`;
            if (r.is_open_now !== null) toolData += `   - ${r.is_open_now ? '✅ Nu open' : '❌ Nu gesloten'}\n`;
            toolData += `   - [Google Maps](${r.google_maps_url})\n`;
          });

          toolsCalled.push({
            tool_name: 'google_places',
            params: { location, radius: 1500 },
            response_summary: `Found ${restaurants.length} restaurants`,
            success: true
          });
        }
      }
    }

    if (intent === 'route' && googleMapsApiKey) {
      const matches = message.match(/(?:van|from)\s+([^\s]+).*(?:naar|to)\s+([^\s]+)/i);

      if (matches && matches[1] && matches[2]) {
        const origin = matches[1];
        const destination = matches[2];

        console.log(`🗺️ Fetching route: ${origin} → ${destination}`);
        const directionsTool = new GoogleDirectionsTool(googleMapsApiKey);
        const route = await directionsTool.getRoute(origin, destination);

        if (route) {
          toolData = `\n\n🗺️ ROUTE INFORMATIE:\n`;
          toolData += `- Afstand: ${route.distance_km} km\n`;
          toolData += `- Reistijd: ${route.duration_minutes} minuten\n`;
          toolData += `- [Open in Google Maps](${route.google_maps_url})\n`;

          toolsCalled.push({
            tool_name: 'google_directions',
            params: { origin, destination },
            response_summary: `${route.distance_km}km, ${route.duration_minutes}min`,
            success: true
          });
        }
      }
    }

    if (intent === 'websearch' && googleSearchApiKey && googleSearchEngineId) {
      const location = slotsBefore.current_destination || slotsBefore.current_hotel || trip.metadata?.destination?.city;

      console.log(`🔍 Performing web search for: ${message} ${location ? `in ${location}` : ''}`);
      const searchTool = new WebSearchTool(googleSearchApiKey, googleSearchEngineId);
      const searchResults = await searchTool.search(message, location);

      if (searchResults.length > 0) {
        toolData += "\n\n🔍 ACTUELE INFORMATIE VAN INTERNET:\n";
        searchResults.slice(0, 3).forEach((result, i) => {
          toolData += `\n${i + 1}. **${result.title}**\n`;
          toolData += `   ${result.snippet}\n`;
          toolData += `   [Bron: ${result.displayLink}](${result.link})\n`;
        });

        toolsCalled.push({
          tool_name: 'google_search',
          params: { query: message, location },
          response_summary: `Found ${searchResults.length} results`,
          success: true
        });
      }
    }

    let itineraryContext = "";
    if (trip.metadata?.itinerary && Array.isArray(trip.metadata.itinerary)) {
      itineraryContext = "\n\n📅 REISSCHEMA:\n";
      trip.metadata.itinerary.forEach((day: any) => {
        itineraryContext += `\nDag ${day.day} - ${day.location}\n`;
        if (day.hotel?.name) itineraryContext += `  🏨 Hotel: ${day.hotel.name}\n`;
        if (day.hotel?.has_restaurant) itineraryContext += `  🍴 Restaurant in hotel: JA\n`;
        if (day.activities && day.activities.length > 0) {
          itineraryContext += `  🎯 Activiteiten: ${day.activities.join(', ')}\n`;
        }
      });
    }

    const systemPrompt = `Je bent TravelBro, een persoonlijke AI reisassistent met toegang tot real-time internet informatie.

🎯 ANTI-IRRITATIE REGEL (BELANGRIJK!):
- Als de user vraagt over "daar", "het hotel", "in de buurt" en je weet uit HUIDIGE CONTEXT waar ze over praten → GEEF DIRECT ANTWOORD
- Vraag NOOIT om verduidelijking als de context duidelijk is
- Maximaal 1 vraag om verduidelijking als er echt meerdere opties zijn
- Daarna altijd een best-effort antwoord geven

${slotsBefore.current_destination || slotsBefore.current_hotel ? `
🎯 HUIDIGE CONTEXT (gebruik dit!):
${slotsBefore.current_destination ? `- Bestemming: ${slotsBefore.current_destination}` : ''}
${slotsBefore.current_hotel ? `- Hotel: ${slotsBefore.current_hotel}` : ''}
${slotsBefore.current_day ? `- Reisdag: ${slotsBefore.current_day}` : ''}
${slotsBefore.last_intent ? `- Laatste onderwerp: ${slotsBefore.last_intent}` : ''}

⚠️ Als user zegt "daar", "het hotel", "in de buurt" → ze bedoelen ${slotsBefore.current_destination || slotsBefore.current_hotel}!
` : ''}

📚 REIS INFORMATIE:
${trip.custom_context || 'Geen extra context'}

${itineraryContext}

${toolData}

🎯 ANTWOORD REGELS:
1. Gebruik context uit HUIDIGE CONTEXT en REISSCHEMA
2. Noem bronnen bij feiten ("Volgens jullie reisschema..." of "Volgens [bron]...")
3. Bij actuele informatie (weer, nieuws): gebruik de ACTUELE INFORMATIE VAN INTERNET als beschikbaar
4. Als je iets niet weet EN geen internet data beschikbaar is → zeg dat eerlijk
5. Geen verzonnen details (check-in tijden, kamertypes, etc.)
6. Gebruik emojis voor leesbaarheid
7. Bij restaurants/routes/weer: gebruik REAL-TIME data als beschikbaar

🚫 VERBODEN:
- Vragen "welke bestemming bedoel je?" als context duidelijk is
- Details verzinnen die niet in de bronnen staan
- Generieke lijstjes zonder context
- Zeggen "ik heb geen toegang tot internet" - je hebt dat WEL via de ACTUELE INFORMATIE sectie`;

    const messages: any[] = [
      { role: "system", content: systemPrompt }
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error("OpenAI API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get AI response", details: error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content;
    const tokensUsed = openaiData.usage?.total_tokens;

    const slotsUpdates = stateManager.extractSlotsFromMessage(message, aiResponse, trip);

    if (!slotsUpdates.last_intent && intent !== 'algemeen') {
      slotsUpdates.last_intent = intent as any;
    }

    await stateManager.updateSlots(slotsUpdates);

    const slotsAfter = await stateManager.getSlots();

    await supabase.from("travel_conversations").insert([
      {
        session_token: sessionToken,
        trip_id: tripId,
        role: "user",
        message: message,
      },
      {
        session_token: sessionToken,
        trip_id: tripId,
        role: "assistant",
        message: aiResponse,
      },
    ]);

    await logger.log({
      messageId: null,
      slotsBefore,
      slotsAfter,
      ragChunks,
      toolsCalled,
      modelTemperature: TEMPERATURE,
      tokensUsed
    });

    return new Response(
      JSON.stringify({ message: aiResponse }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("TravelBro error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});