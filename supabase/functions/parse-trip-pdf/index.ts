import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function deductCredits(
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
  description?: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_action_type: actionType,
      p_description: description,
      p_metadata: metadata || {}
    });

    if (error) {
      if (error.message.includes('Insufficient credits')) {
        return { success: false, error: 'Onvoldoende credits. Koop nieuwe credits om door te gaan.' };
      }
      if (error.message.includes('Action type not found')) {
        return { success: false, error: 'Deze actie vereist geen credits.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deducting credits:', error);
    return { success: false, error: 'Er is een fout opgetreden bij het aftrekken van credits.' };
  }
}

async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  const uint8Array = new Uint8Array(pdfBuffer);
  let text = '';

  const textDecoder = new TextDecoder('utf-8', { fatal: false });
  const pdfText = textDecoder.decode(uint8Array);

  const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
  const textRegex = /\((.*?)\)/g;
  const tjRegex = /\[(.*?)\]/g;

  let match;
  while ((match = streamRegex.exec(pdfText)) !== null) {
    const streamContent = match[1];

    let textMatch;
    while ((textMatch = textRegex.exec(streamContent)) !== null) {
      const cleanText = textMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\(/g, '(')
        .replace(/\\)/g, ')')
        .replace(/\\\\/g, '\\');

      if (cleanText.length > 1 && /[a-zA-Z0-9]/.test(cleanText)) {
        text += cleanText + ' ';
      }
    }

    while ((textMatch = tjRegex.exec(streamContent)) !== null) {
      const arrayContent = textMatch[1];
      const innerTextRegex = /\((.*?)\)/g;
      let innerMatch;
      while ((innerMatch = innerTextRegex.exec(arrayContent)) !== null) {
        const cleanText = innerMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\(/g, '(')
          .replace(/\\)/g, ')')
          .replace(/\\\\/g, '\\');

        if (cleanText.length > 1 && /[a-zA-Z0-9]/.test(cleanText)) {
          text += cleanText + ' ';
        }
      }
    }
  }

  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

async function parseWithGPT(pdfText: string, openaiApiKey: string) {
  const systemPrompt = `Je bent een expert reisdocument parser. Extraheer en structureer ALLE reis informatie uit de tekst.\n\nVERPLICHTE VELDEN:\n- trip_name: Naam van de reis\n- reservation_id: Hoofdreserveringsnummer (eerste boekingnummer dat je vindt)\n- departure_date: Vertrekdatum (ISO 8601: YYYY-MM-DD)\n- arrival_date: Aankomstdatum (ISO 8601: YYYY-MM-DD)\n- destination: { city, country, region }\n- segments: Array van reissegmenten\n- booking_refs: Alle boeknummers\n- emergency_contacts: Noodnummers\n\nElk segment MOET:\n- kind: "flight" | "hotel" | "transfer" | "activity"\n- segment_ref: Boeknummer\n- start_datetime: ISO 8601\n- end_datetime: ISO 8601 (of null)\n- location: { name, address, city, country }\n- details: Extra info\n\nBELANGRIJK:\n- Alle datums in ISO 8601 format\n- Als info ontbreekt: gebruik null\n- Return ALLEEN valid JSON`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Analyseer dit reisdocument en extraheer ALLE informatie:\n\n${pdfText.substring(0, 100000)}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "travel_document_schema",
          strict: false,
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
                    end_datetime: { type: ["string", "null"] },
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
                required: [],
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
            required: ["trip_name", "reservation_id", "departure_date", "arrival_date", "destination", "segments"],
            additionalProperties: false
          }
        }
      },
      temperature: 0.1,
      max_tokens: 4096
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GPT parsing failed: ${error}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  return JSON.parse(content);
}

function convertToItinerary(parsedData: any): any[] {
  if (!parsedData?.segments) return [];

  const hotelSegments = parsedData.segments.filter((s: any) => s.kind === 'hotel');

  return hotelSegments.map((hotel: any, index: number) => {
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
        has_restaurant: hotel.details?.has_restaurant || null,
        amenities: hotel.details?.amenities || []
      },
      activities: extractActivities(hotel, parsedData.segments)
    };
  });
}

function extractActivities(hotel: any, allSegments: any[]): string[] {
  const activities: string[] = [];

  const hotelStart = new Date(hotel.start_datetime);
  const hotelEnd = hotel.end_datetime ? new Date(hotel.end_datetime) : null;

  allSegments.forEach(segment => {
    if (segment.kind === 'activity') {
      const activityDate = new Date(segment.start_datetime);

      if (activityDate >= hotelStart && (!hotelEnd || activityDate < hotelEnd)) {
        activities.push(segment.location.name);
      }
    }
  });

  return activities;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
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
      `AI PDF parsing: ${pdfUrl.substring(pdfUrl.lastIndexOf('/') + 1, pdfUrl.lastIndexOf('/') + 30)}`,
      { pdfUrl }
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

    console.log('Downloading PDF from:', pdfUrl);
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error("Failed to download PDF");
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    console.log('Extracting text from PDF...');
    const pdfText = await extractTextFromPDF(pdfBuffer);

    if (!pdfText || pdfText.length < 100) {
      throw new Error("Could not extract enough text from PDF. Please make sure the PDF contains readable text.");
    }

    console.log('Parsing with GPT-4o (text length:', pdfText.length, 'chars)');
    const parsedData = await parseWithGPT(pdfText, openaiApiKey);

    const itinerary = convertToItinerary(parsedData);

    console.log('Successfully parsed PDF');

    return new Response(
      JSON.stringify({
        ...parsedData,
        itinerary
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error parsing PDF:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});