import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { deductCredits } from '../_shared/credits.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: apiSettings, error: apiError } = await supabase
      .from("api_settings")
      .select("api_key")
      .eq("provider", "OpenAI")
      .eq("service_name", "OpenAI API")
      .maybeSingle();

    if (apiError || !apiSettings?.api_key) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiApiKey = apiSettings.api_key;

    const creditResult = await deductCredits(
      supabase,
      userId,
      'ai_travel_import',
      `AI URL scraping: ${url.substring(0, 50)}`,
      { url }
    );

    if (!creditResult.success) {
      return new Response(
        JSON.stringify({ error: creditResult.error || 'Failed to deduct credits' }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Fetching URL:", url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log("Extracted text length:", textContent.length);

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Je bent een expert web scraper voor reisinformatie. Extraheer ALLE relevante reis informatie van de website. Return JSON met:

{
  "trip_name": "reis naam/titel",
  "destination": {
    "city": "stad/regio",
    "country": "land",
    "region": "gebied"
  },
  "duration": {
    "days": aantal dagen,
    "nights": aantal nachten,
    "description": "bijv. 8 dagen / 7 nachten"
  },
  "price": {
    "from": "vanaf prijs",
    "currency": "valuta",
    "notes": "prijs details",
    "included": ["wat inbegrepen is"],
    "not_included": ["wat niet inbegrepen is"]
  },
  "accommodations": [
    {
      "name": "hotel/resort naam",
      "type": "type accommodatie",
      "location": "locatie",
      "description": "omschrijving",
      "amenities": ["faciliteiten"],
      "rating": "rating indien vermeld"
    }
  ],
  "itinerary": [
    {
      "day": dag nummer,
      "title": "dag titel",
      "description": "wat gebeurt er deze dag",
      "activities": ["activiteiten"],
      "meals": "maaltijden info",
      "overnight": "overnachting"
    }
  ],
  "highlights": [
    "hoogtepunten van de reis"
  ],
  "included_services": [
    "wat is er allemaal inbegrepen"
  ],
  "activities": [
    {
      "name": "activiteit",
      "description": "beschrijving",
      "location": "waar",
      "optional": true/false
    }
  ],
  "practical_info": {
    "best_time": "beste reistijd",
    "group_size": "groepsgrootte",
    "difficulty": "moeilijkheidsgraad",
    "requirements": "eisen/voorwaarden"
  },
  "target_audience": "doelgroep",
  "description": "algemene reis beschrijving"
}

BELANGRIJK:
- Extraheer ALLE details die je kan vinden
- Wees specifiek met namen en locaties
- Bewaar alle praktische informatie
- Als info niet beschikbaar is: null of lege array
- Focus op concrete informatie, niet op marketing teksten`
          },
          {
            role: "user",
            content: `Extraheer alle reis informatie van deze website in gestructureerd JSON formaat:\n\nWebsite content:\n${textContent.slice(0, 15000)}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error("OpenAI API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to parse URL with OpenAI", details: error }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await aiResponse.json();
    const scrapedData = JSON.parse(aiData.choices[0].message.content);

    return new Response(
      JSON.stringify(scrapedData),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error scraping URL:", error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});