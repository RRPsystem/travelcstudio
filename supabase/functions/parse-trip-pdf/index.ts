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
    const { pdfUrl } = await req.json();

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ error: "PDF URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const { data: apiSettings, error: apiError } = await supabase
      .from("api_settings")
      .select("api_key")
      .eq("provider", "OpenAI")
      .eq("is_active", true)
      .maybeSingle();

    if (apiError || !apiSettings?.api_key) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured in database" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiApiKey = apiSettings.api_key;

    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error("Failed to download PDF");
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    const jsPDFLib = await import("npm:pdfjs-dist@3.11.174/legacy/build/pdf.mjs");

    const loadingTask = jsPDFLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n\n";
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: `Je bent een expert reisdocument parser. Extraheer en structureer ALLE reis informatie uit de PDF tekst. Return JSON met:

BELANGRIJKE STRUCTUUR:
{
  "destination": {
    "city": "exacte stad/regio naam",
    "country": "land",
    "region": "regio/gebied"
  },
  "dates": {
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "duration": "aantal dagen/nachten"
  },
  "accommodations": [
    {
      "name": "hotel naam",
      "type": "hotel/resort/villa/etc",
      "address": "volledig adres",
      "location": "gebied/buurt",
      "description": "gedetailleerde omschrijving",
      "amenities": ["zwembad", "restaurant", "wifi", etc],
      "room_type": "kamer type",
      "check_in": "datum",
      "check_out": "datum"
    }
  ],
  "itinerary": [
    {
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "title": "Dag titel",
      "description": "uitgebreide beschrijving van de dag",
      "activities": [
        {
          "time": "tijd indien vermeld",
          "name": "activiteit naam",
          "description": "details",
          "location": "locatie"
        }
      ],
      "meals": {
        "breakfast": true/false,
        "lunch": true/false,
        "dinner": true/false,
        "details": "extra meal info"
      },
      "accommodation": "waar overnacht je"
    }
  ],
  "activities": [
    {
      "name": "activiteit naam",
      "description": "uitgebreide beschrijving",
      "location": "waar",
      "duration": "hoe lang",
      "included": true/false,
      "price": "prijs indien vermeld"
    }
  ],
  "included_services": [
    "gedetailleerde lijst van wat inbegrepen is"
  ],
  "not_included": [
    "wat niet inbegrepen is"
  ],
  "price_info": {
    "total": "bedrag",
    "currency": "EUR/USD/etc",
    "per_person": "bedrag pp",
    "notes": "extra prijs info",
    "included_in_price": ["wat zit in de prijs"]
  },
  "transportation": {
    "arrival": "hoe kom je er",
    "departure": "hoe ga je terug",
    "local": "lokaal vervoer info",
    "transfers": ["transfer details"]
  },
  "important_notes": [
    "alle belangrijke info, veiligheid, documenten, wat mee te nemen, etc"
  ],
  "contact_info": {
    "emergency": "noodcontact",
    "local_contact": "lokale contact",
    "tour_operator": "reisorganisatie info"
  },
  "target_audience": "gezinnen/tieners/jongeren/etc",
  "highlights": [
    "unieke highlights van de reis"
  ]
}

BELANGRIJK:
- Extraheer ALLE details, zelfs kleine dingen
- Wees zo specifiek mogelijk met adressen en locaties
- Splits lange beschrijvingen op in relevante secties
- Bewaar alle praktische informatie (tijden, adressen, contacten)
- Als iets niet in de tekst staat, gebruik null of lege array`
          },
          {
            role: "user",
            content: `Analyseer deze reisdocument tekst en extraheer ALLE reis informatie in gestructureerd JSON formaat. Wees zeer grondig en gedetailleerd.\n\nDocument tekst:\n\n${fullText}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to parse PDF with OpenAI", details: error }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const parsedData = JSON.parse(data.choices[0].message.content);

    return new Response(
      JSON.stringify(parsedData),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error parsing PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});