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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: apiSettings } = await supabase
      .from('api_settings')
      .select('provider, service_name, api_key')
      .in('provider', ['OpenAI', 'Google'])
      .eq('is_active', true);

    const openaiApiKey = apiSettings?.find(s => s.provider === 'OpenAI')?.api_key;
    const googleApiKey = apiSettings?.find(s => s.provider === 'Google' && s.service_name === 'Google Maps API')?.api_key;
    const googleCseId = apiSettings?.find(s => s.provider === 'Google' && s.service_name === 'Google Custom Search')?.api_key;
    const googleMapsApiKey = googleApiKey;

    console.log('🔍 API Settings Check:', {
      hasOpenAI: !!openaiApiKey,
      hasGoogleMaps: !!googleApiKey,
      hasGoogleSearch: !!googleCseId,
      settingsCount: apiSettings?.length || 0
    });

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
        console.log('🔍 Google Search - Searching:', searchQuery);

        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCseId}&q=${encodeURIComponent(searchQuery)}&num=3`;

        const searchResponse = await fetch(searchUrl);
        console.log('🔍 Google Search - Response status:', searchResponse.status);

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          console.log('🔍 Google Search - Found items:', searchData.items?.length || 0);

          if (searchData.items && searchData.items.length > 0) {
            searchResults = "\n\nRelevante zoekresultaten:\n" + searchData.items
              .map((item: any) => `- ${item.title}: ${item.snippet}`)
              .join("\n");
            console.log('🔍 Google Search - Added to context');
          }
        } else {
          const errorText = await searchResponse.text();
          console.error('🔍 Google Search - Error:', errorText);
        }
      } catch (error) {
        console.error("🔍 Google Search - Exception:", error);
      }
    } else {
      console.log('🔍 Google Search - SKIPPED (missing keys):', {
        hasApiKey: !!googleApiKey,
        hasCseId: !!googleCseId
      });
    }

    const systemPrompt = `Je bent TravelBRO, een vriendelijke en behulpzame Nederlandse reisassistent voor de reis "${trip.name}".${searchResults ? searchResults : ''}`;

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