import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Detect if message needs a Google Search (skip for greetings, simple chat, follow-ups)
function needsSearch(msg: string): boolean {
  const lower = msg.toLowerCase().trim();
  // Skip search for short greetings / simple chat
  if (lower.length < 8) return false;
  const skipPatterns = /^(hoi|hey|hi|hallo|hello|bedankt|dank|thanks|ok|oke|ja|nee|top|super|cool|goed|prima|bye|dag|doei|tot ziens)/i;
  if (skipPatterns.test(lower)) return false;
  // Do search for informational queries
  const searchPatterns = /\b(waar|what|where|when|hoe|how|prijs|price|kosten|cost|open|ticket|weer|weather|temperatuur|restaurant|hotel|museum|route|wandel|fiets|bike|bus|trein|train|metro|taxi|parkeren|parking|adres|address|tip|aanbevel|recommend)\b/i;
  return searchPatterns.test(lower);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { tripId, sessionToken, message, imageBase64, userLocation, deviceType } = await req.json();

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

    // ⚡ PARALLEL: fetch all DB data at once instead of sequentially
    const startTime = Date.now();
    const [settingsResult, tripResult, intakeResult, historyResult] = await Promise.all([
      supabase
        .from('api_settings')
        .select('provider, service_name, api_key, metadata, google_search_api_key, google_search_engine_id, google_places_api_key')
        .in('provider', ['OpenAI', 'Google', 'system'])
        .eq('is_active', true),
      supabase
        .from("travel_trips")
        .select("*")
        .eq("id", tripId)
        .single(),
      supabase
        .from("travel_intakes")
        .select("*")
        .eq("session_token", sessionToken)
        .maybeSingle(),
      supabase
        .from("travel_conversations")
        .select("role, message")
        .eq("session_token", sessionToken)
        .order("created_at", { ascending: true })
        .limit(10),
    ]);
    console.log(`⚡ Parallel DB queries: ${Date.now() - startTime}ms`);

    const apiSettings = settingsResult.data;
    const trip = tripResult.data;
    const tripError = tripResult.error;
    const intake = intakeResult.data;
    const conversationHistory = historyResult.data;

    if (tripError || !trip) {
      return new Response(
        JSON.stringify({ error: "Trip not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiApiKey = apiSettings?.find((s: any) => s.provider === 'OpenAI')?.api_key;
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemSettings = apiSettings?.find((s: any) => s.provider === 'system' && s.service_name === 'Twilio WhatsApp');
    const googleSearchApiKey = systemSettings?.google_search_api_key;
    const googleCseId = systemSettings?.google_search_engine_id;

    // ⚡ SMART SEARCH: only Google Search when the message actually needs it
    let searchResults = "";
    const shouldSearch = needsSearch(message) && googleSearchApiKey && googleCseId;

    if (shouldSearch) {
      try {
        const searchStart = Date.now();
        const isWeatherQuery = /\b(weer|weather|temperature|temperatuur|rain|regen|zon|sun|cloud|bewolkt)\b/i.test(message);
        let searchQuery;
        if (isWeatherQuery) {
          const location = trip.parsed_data?.destination || trip.name || '';
          const dateStr = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
          searchQuery = `weer ${location} ${dateStr}`;
        } else {
          searchQuery = `${message} ${trip.name}`;
        }

        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleSearchApiKey}&cx=${googleCseId}&q=${encodeURIComponent(searchQuery)}&num=3`;
        const searchResponse = await fetch(searchUrl);

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.items?.length > 0) {
            searchResults = "\n\nRelevante zoekresultaten:\n" + searchData.items
              .map((item: any) => `- ${item.title}: ${item.snippet}`)
              .join("\n");
          }
        }
        console.log(`🔍 Google Search: ${Date.now() - searchStart}ms (${searchResults ? 'found' : 'empty'})`);
      } catch (error) {
        console.error("🔍 Google Search error:", error);
      }
    } else {
      console.log(`🔍 Google Search: SKIPPED (needsSearch=${needsSearch(message)}, hasKeys=${!!(googleSearchApiKey && googleCseId)})`);
    }

    // Build context
    let tripContext = `REISINFORMATIE:\n- Reis: ${trip.name}`;
    if (trip.custom_context && typeof trip.custom_context === 'string' && trip.custom_context.length > 0) {
      tripContext += `\n\nGEDETAILLEERDE REISINFORMATIE:\n${trip.custom_context.substring(0, 8000)}`;
    }
    if (trip.parsed_data && typeof trip.parsed_data === 'object' && Object.keys(trip.parsed_data).length > 0) {
      tripContext += `\n\nGESTRUCTUREERDE REISINFORMATIE:\n${JSON.stringify(trip.parsed_data, null, 2)}`;
    }
    if (trip.gpt_instructions) {
      tripContext += `\n\nSPECIALE INSTRUCTIES VOOR DEZE REIS:\n${trip.gpt_instructions}`;
    }

    let intakeContext = '';
    if (intake?.intake_data) {
      intakeContext = `\n\nCLIËNT VOORKEUREN (uit intake):\n${JSON.stringify(intake.intake_data, null, 2)}`;
    }

    const systemPrompt = `Je bent TravelBRO, een vriendelijke en behulpzame Nederlandse reisassistent.

${tripContext}${intakeContext}

${searchResults ? `=== ACTUELE INFORMATIE VIA GOOGLE SEARCH ===
${searchResults}
KRITISCH: Gebruik deze zoekresultaten als basis voor je antwoord.
===` : ''}

INSTRUCTIES:
${searchResults ? '- GEBRUIK DE GOOGLE SEARCH RESULTATEN om de vraag te beantwoorden\n- Wees specifiek en concreet op basis van de zoekresultaten' : '- Voor actuele informatie (weer, prijzen, openingstijden) heb ik helaas geen live data beschikbaar'}
- Gebruik de reisinformatie voor algemene vragen over de reis
- Wees vriendelijk, beknopt en behulpzaam
- Antwoord KORT en bondig (max 2-3 alineas) tenzij de vraag een uitgebreid antwoord vereist
- Als informatie ontbreekt, zeg dat eerlijk`;

    const messages: any[] = [{ role: "system", content: systemPrompt }];
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((conv: any) => {
        messages.push({ role: conv.role, content: conv.message });
      });
    }
    messages.push({ role: "user", content: message });

    // ⚡ STREAMING: stream the OpenAI response back to the client
    const model = trip.gpt_model || "gpt-4o-mini";
    console.log(`🤖 Using model: ${model}, messages: ${messages.length}`);

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 800,
        temperature: trip.gpt_temperature ?? 0.7,
        stream: true,
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

    // Stream the response
    const reader = openaiResponse.body!.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter(l => l.startsWith("data: "));

            for (const line of lines) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`));
                }
              } catch (e) {
                // Skip unparseable chunks
              }
            }
          }
          // Send done signal
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        }

        // ⚡ FIRE-AND-FORGET: save conversation after streaming is done
        console.log(`💾 Saving conversation (${fullResponse.length} chars)`);
        supabase.from("travel_conversations").insert([
          { trip_id: tripId, session_token: sessionToken, message, role: "user" },
          { trip_id: tripId, session_token: sessionToken, message: fullResponse, role: "assistant" },
        ]).then(() => console.log('💾 Conversation saved'))
          .catch((e: any) => console.error('💾 Save error:', e));
      }
    });

    console.log(`⚡ Total prep time: ${Date.now() - startTime}ms — now streaming`);

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
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