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
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

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
            content: `Je bent een expert reisdocument parser. Extraheer en structureer ALLE reis informatie uit het PDF document.

VERPLICHTE VELDEN (STRICT):
- trip_name: Naam van de reis
- reservation_id: Hoofdreserveringsnummer
- departure_date: Vertrekdatum (ISO 8601: YYYY-MM-DD)
- arrival_date: Aankomstdatum (ISO 8601: YYYY-MM-DD)
- destination: { city, country, region }
- segments: Array van reissegmenten (flights, hotels, transfers)
- booking_refs: { flight, hotel, transfer, other }
- emergency_contacts: Array met { name, phone, type }

Elk segment MOET bevatten:
- kind: "flight" | "hotel" | "transfer" | "activity"
- segment_ref: Unieke referentie (boeknummer)
- start_datetime: ISO 8601 datetime
- end_datetime: ISO 8601 datetime (optioneel, gebruik null indien niet bekend)
- location: { name, address, city, country }
- details: Object met specifieke info (bijv. flight_number, room_type, etc)

BELANGRIJK:
- Extraheer ALLE reserveringsnummers (PNR, boekingscodes, referenties)
- Alle datums MOETEN ISO 8601 format zijn (YYYY-MM-DD of YYYY-MM-DDTHH:MM:SS)
- Alle adressen compleet en gestructureerd
- ALLE noodnummers en contactgegevens
- Als info ontbreekt: gebruik null (niet weglaten)`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyseer dit reisdocument PDF en extraheer ALLE informatie volgens het schema. Wees zeer grondig met reserveringsnummers, datums en contactgegevens."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "travel_document_schema",
            strict: true,
            schema: {
              type: "object",
              properties: {
                trip_name: { type: "string" },
                reservation_id: { type: "string" },
                departure_date: { type: "string" },
                arrival_date: { type: "string" },
                destination: {
                  type: "object",
                  properties: {
                    city: { type: "string" },
                    country: { type: "string" },
                    region: { type: ["string", "null"] }
                  },
                  required: ["city", "country"],
                  additionalProperties: false
                },
                segments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      kind: { type: "string", enum: ["flight", "hotel", "transfer", "activity"] },
                      segment_ref: { type: "string" },
                      start_datetime: { type: "string" },
                      end_datetime: { type: "string" },
                      location: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          address: { type: "string" },
                          city: { type: ["string", "null"] },
                          country: { type: ["string", "null"] }
                        },
                        required: ["name", "address"],
                        additionalProperties: false
                      },
                      details: { type: "object", additionalProperties: true }
                    },
                    required: ["kind", "segment_ref", "start_datetime", "location"],
                    additionalProperties: false
                  }
                },
                booking_refs: {
                  type: "object",
                  properties: {
                    flight: { type: ["string", "null"] },
                    hotel: { type: ["string", "null"] },
                    transfer: { type: ["string", "null"] },
                    other: { type: "array", items: { type: "string" } }
                  },
                  additionalProperties: false
                },
                emergency_contacts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      phone: { type: "string" },
                      type: { type: "string" }
                    },
                    required: ["name", "phone", "type"],
                    additionalProperties: false
                  }
                },
                important_notes: { type: "array", items: { type: "string" } },
                included_services: { type: "array", items: { type: "string" } }
              },
              required: ["trip_name", "reservation_id", "departure_date", "arrival_date", "destination", "segments", "booking_refs", "emergency_contacts"],
              additionalProperties: false
            }
          }
        },
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