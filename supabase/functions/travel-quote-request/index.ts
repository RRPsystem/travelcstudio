import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map common WPForms field labels to our field names
function normalizeWPFormsData(body: any): any {
  // WPForms webhook sends: { fields: { '0': { id, name, value }, '1': { ... } } }
  // OR flat: { field_id: value, field_id_2: value }
  const fields = body.fields;
  if (!fields) return null;

  const fieldMap: Record<string, string> = {};

  // Build a map of lowercase label -> value
  if (typeof fields === "object") {
    for (const key of Object.keys(fields)) {
      const field = fields[key];
      if (field && typeof field === "object" && field.name && field.value !== undefined) {
        fieldMap[field.name.toLowerCase().trim()] = String(field.value).trim();
      } else if (typeof field === "string") {
        fieldMap[key.toLowerCase().trim()] = field.trim();
      }
    }
  }

  // Try to extract brand_id from hidden field or body
  const brandId = fieldMap["brand_id"] || fieldMap["brand id"] || fieldMap["brandid"] || body.brand_id || "";

  // Map common Dutch/English field names
  const name = fieldMap["naam"] || fieldMap["name"] || fieldMap["volledige naam"] || fieldMap["je naam"] || fieldMap["uw naam"] || "";
  const email = fieldMap["e-mail"] || fieldMap["email"] || fieldMap["e-mailadres"] || fieldMap["emailadres"] || "";
  const phone = fieldMap["telefoon"] || fieldMap["phone"] || fieldMap["telefoonnummer"] || fieldMap["tel"] || "";
  const msg = fieldMap["bericht"] || fieldMap["message"] || fieldMap["opmerking"] || fieldMap["opmerkingen"] || fieldMap["vraag"] || "";
  const travelTitle = fieldMap["reis"] || fieldMap["reistitel"] || fieldMap["travel"] || fieldMap["bestemming"] || "";
  const departureDate = fieldMap["vertrekdatum"] || fieldMap["departure date"] || fieldMap["datum"] || "";
  const persons = fieldMap["aantal personen"] || fieldMap["personen"] || fieldMap["persons"] || fieldMap["aantal"] || "";
  const requestType = fieldMap["type"] || fieldMap["aanvraag type"] || fieldMap["request_type"] || "";

  // Determine request type from form name or field
  let type = "contact";
  const formName = (body.form_title || body.form_name || "").toLowerCase();
  if (requestType) {
    if (requestType.toLowerCase().includes("offerte") || requestType.toLowerCase().includes("quote")) type = "quote";
    else if (requestType.toLowerCase().includes("info")) type = "info";
  } else if (formName.includes("offerte") || formName.includes("quote")) {
    type = "quote";
  } else if (formName.includes("info")) {
    type = "info";
  }

  return {
    brand_id: brandId,
    customer_name: name,
    customer_email: email,
    customer_phone: phone,
    message: msg,
    travel_title: travelTitle,
    departure_date: departureDate,
    number_of_persons: persons,
    request_type: type,
    source_url: body.page_url || body.entry_url || "",
    source: "wpforms",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Read brand_id from URL query parameter (easiest for WPForms webhook setup)
    const url = new URL(req.url);
    const urlBrandId = url.searchParams.get("brand_id") || "";
    const urlRequestType = url.searchParams.get("request_type") || "";

    const body = await req.json();

    // Detect if this is a WPForms webhook or our custom format
    let normalized;
    if (body.fields) {
      // WPForms webhook format
      console.log("[Quote Request] Detected WPForms webhook format");
      normalized = normalizeWPFormsData(body);
      if (!normalized) {
        return new Response(
          JSON.stringify({ error: "Kon WPForms data niet verwerken" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // URL params override if set
      if (urlBrandId) normalized.brand_id = urlBrandId;
      if (urlRequestType) normalized.request_type = urlRequestType;
    } else {
      // Our custom format (from travel detail page)
      normalized = {
        brand_id: body.brand_id || urlBrandId,
        travel_id: body.travel_id,
        travel_title: body.travel_title,
        travel_url: body.travel_url,
        customer_name: body.customer_name,
        customer_email: body.customer_email,
        customer_phone: body.customer_phone,
        departure_date: body.departure_date,
        number_of_persons: body.number_of_persons,
        request_type: body.request_type || urlRequestType || "quote",
        message: body.message,
        source_url: body.source_url,
        source: "travel-detail",
      };
    }

    const {
      brand_id,
      customer_name,
      customer_email,
      customer_phone,
      travel_id,
      travel_title,
      travel_url,
      departure_date,
      number_of_persons,
      request_type,
      message,
      source_url,
      source,
    } = normalized;

    // Validate required fields
    if (!brand_id) {
      return new Response(
        JSON.stringify({ error: "brand_id is verplicht. Voeg een hidden field 'brand_id' toe aan je WPForms formulier." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!customer_name || !customer_email) {
      return new Response(
        JSON.stringify({ error: "Naam en e-mailadres zijn verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      return new Response(
        JSON.stringify({ error: "Ongeldig e-mailadres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate request_type
    const validTypes = ["quote", "info", "contact"];
    const finalType = validTypes.includes(request_type) ? request_type : "contact";

    // Get source IP from headers
    const sourceIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

    // Use service role to insert (public endpoint, no auth required)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from("travel_quote_requests")
      .insert({
        brand_id,
        travel_id: travel_id || null,
        travel_title: travel_title || null,
        travel_url: travel_url || null,
        customer_name,
        customer_email,
        customer_phone: customer_phone || null,
        departure_date: departure_date || null,
        number_of_persons: number_of_persons ? parseInt(number_of_persons) : null,
        request_type: finalType,
        message: message || null,
        source_url: source_url || null,
        source_ip: sourceIp,
        status: "new",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Quote Request] Insert error:", error);
      return new Response(
        JSON.stringify({ error: "Kon aanvraag niet opslaan. Probeer het later opnieuw." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Quote Request] Saved: ${data.id} for brand ${brand_id}, type: ${finalType}, source: ${source}, travel: ${travel_title || travel_id || "n/a"}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Bedankt voor je aanvraag! We nemen zo snel mogelijk contact met je op.",
        id: data.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[Quote Request] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Er is een fout opgetreden" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
