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

async function extractTextWithPdfParse(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('📄 Using pdf-parse npm package...');
    const pdfParse = await import('npm:pdf-parse@1.1.1');
    // Convert ArrayBuffer to Uint8Array for Deno compatibility
    const uint8Array = new Uint8Array(pdfBuffer);
    const data = await pdfParse.default(uint8Array);
    console.log('✅ Extracted', data.text.length, 'characters from PDF');
    return data.text;
  } catch (error) {
    console.error('❌ pdf-parse failed:', error.message);
    throw new Error(`PDF text extraction failed: ${error.message}`);
  }
}

async function parseWithGPT(pdfText: string, openaiApiKey: string) {
  const systemPrompt = `Je bent een expert reisdocument parser. Extraheer en structureer ALLE reis informatie uit het document.

VERPLICHTE VELDEN:
- trip_name: Naam van de reis
- reservation_id: Hoofdreserveringsnummer (eerste boekingnummer dat je vindt)
- departure_date: Vertrekdatum (ISO 8601: YYYY-MM-DD)
- arrival_date: Aankomstdatum (ISO 8601: YYYY-MM-DD)
- destination: { city, country, region }
- segments: Array van reissegmenten met ALLE overnachtingen en activiteiten

Elk segment MOET bevatten:
- kind: "flight" | "hotel" | "transfer" | "activity"
- segment_ref: Boeknummer
- start_datetime: ISO 8601 (YYYY-MM-DDTHH:MM:SS)
- end_datetime: ISO 8601 of null
- location: { name, address, city, country }
- details: { room_type, meal_plan, amenities, etc }

BELANGRIJK:
- Extraheer ALLE hotels en accommodaties met complete details
- Alle datums in ISO 8601 format
- Als info ontbreekt: gebruik null maar probeer zo veel mogelijk te vinden
- Return ALLEEN valid JSON`;

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
          content: `Analyseer dit reisdocument en extraheer ALLE informatie. Let SPECIAAL op accommodaties en hotels:\n\n${pdfText.substring(0, 50000)}`
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
    console.log('🟢 parse-trip-pdf called, method:', req.method);

    const bodyText = await req.text();
    console.log('📦 Request body:', bodyText.substring(0, 200));

    let pdfUrl: string;
    try {
      const body = JSON.parse(bodyText);
      pdfUrl = body.pdfUrl;
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!pdfUrl) {
      console.log('❌ No pdfUrl provided');
      return new Response(
        JSON.stringify({ error: "PDF URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('✅ PDF URL:', pdfUrl);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    console.log('🔐 Checking authentication...');
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError) {
        console.error('❌ Auth error:', authError.message);
      }
      userId = user?.id || null;
      console.log('👤 User ID:', userId || 'NOT FOUND');
    } else {
      console.log('❌ No Authorization header');
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

    console.log('🔑 Getting OpenAI API key...');
    const { data: apiSettings, error: apiError } = await supabase
      .from("api_settings")
      .select("api_key")
      .eq("provider", "OpenAI")
      .eq("service_name", "OpenAI API")
      .maybeSingle();

    if (apiError) {
      console.error('❌ API settings error:', apiError.message);
    }

    if (!apiSettings?.api_key) {
      console.log('❌ No OpenAI API key found');
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('✅ OpenAI key found');
    const openaiApiKey = apiSettings.api_key;

    console.log('💳 Deducting credits...');
    const creditResult = await deductCredits(
      supabase,
      userId,
      'ai_travel_import',
      `AI PDF parsing: ${pdfUrl.substring(pdfUrl.lastIndexOf('/') + 1, pdfUrl.lastIndexOf('/') + 30)}`,
      { pdfUrl }
    );

    if (!creditResult.success) {
      console.log('❌ Credit deduction failed:', creditResult.error);
      return new Response(
        JSON.stringify({ error: creditResult.error || 'Failed to deduct credits' }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('✅ Credits deducted');
    console.log('📥 Downloading PDF from:', pdfUrl);

    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      console.error('❌ PDF download failed:', pdfResponse.status, pdfResponse.statusText);
      throw new Error(`Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
    }

    console.log('✅ PDF downloaded');
    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('📦 PDF size:', pdfBuffer.byteLength, 'bytes');

    console.log('📄 Extracting text from PDF with pdf-parse...');
    const pdfText = await extractTextWithPdfParse(pdfBuffer);
    console.log('✅ Extracted text length:', pdfText.length, 'chars');
    console.log('📝 First 500 chars:', pdfText.substring(0, 500));

    if (!pdfText || pdfText.length < 100) {
      console.log('❌ Not enough text extracted');
      throw new Error("Could not extract enough text from PDF. Please make sure the PDF contains readable text.");
    }

    console.log('🤖 Parsing with GPT-4o...');
    const parsedData = await parseWithGPT(pdfText, openaiApiKey);
    console.log('✅ GPT parsing complete');

    const itinerary = convertToItinerary(parsedData);
    console.log('✅ Itinerary created with', itinerary.length, 'entries');

    console.log('🎉 Successfully parsed PDF');

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
    console.error("❌ ERROR parsing PDF:", error);
    console.error("❌ Error stack:", error.stack);

    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error occurred',
        details: error.stack?.substring(0, 500)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});