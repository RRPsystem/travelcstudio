import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    let phoneNumber;

    if (req.method === "GET") {
      const url = new URL(req.url);
      phoneNumber = url.searchParams.get('phoneNumber');
    } else {
      try {
        const body = await req.json();
        phoneNumber = body.phoneNumber;
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: "phoneNumber required (use ?phoneNumber=31611725801 for GET)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const debugLog: any[] = [];

    debugLog.push({
      step: 1,
      action: "Looking for WhatsApp session",
      phoneNumber: phoneNumber
    });

    const { data: sessionData, error: sessionError } = await supabase
      .from('travel_whatsapp_sessions')
      .select(`
        *,
        travel_trips (
          id,
          name,
          parsed_data,
          source_urls,
          custom_context,
          gpt_model,
          gpt_temperature,
          brand_id
        )
      `)
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      debugLog.push({
        step: 1,
        status: "ERROR",
        error: sessionError.message
      });
    } else if (!sessionData) {
      debugLog.push({
        step: 1,
        status: "NOT FOUND",
        message: "No session found for this phone number"
      });
    } else {
      debugLog.push({
        step: 1,
        status: "SUCCESS",
        session: {
          id: sessionData.id,
          phone_number: sessionData.phone_number,
          trip_id: sessionData.trip_id,
          session_token: sessionData.session_token,
          created_at: sessionData.created_at
        }
      });
    }

    if (!sessionData) {
      const { data: allSessions } = await supabase
        .from('travel_whatsapp_sessions')
        .select('id, phone_number, trip_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      debugLog.push({
        step: 2,
        action: "All sessions in database",
        sessions: allSessions
      });

      return new Response(
        JSON.stringify({ debugLog, error: "No session found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trip = sessionData.travel_trips;

    if (!trip) {
      debugLog.push({
        step: 2,
        status: "ERROR",
        message: "Trip not found",
        trip_id: sessionData.trip_id
      });

      return new Response(
        JSON.stringify({ debugLog, error: "Trip not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    debugLog.push({
      step: 2,
      status: "SUCCESS",
      trip: {
        id: trip.id,
        name: trip.name,
        brand_id: trip.brand_id,
        has_custom_context: !!trip.custom_context,
        gpt_model: trip.gpt_model
      }
    });

    debugLog.push({
      step: 3,
      action: "Calling travelbro-chat endpoint",
      payload: {
        tripId: trip.id,
        sessionToken: sessionData.session_token,
        message: "Test debug message",
        deviceType: "whatsapp"
      }
    });

    try {
      const travelbroResponse = await fetch(`${supabaseUrl}/functions/v1/travelbro-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          tripId: trip.id,
          sessionToken: sessionData.session_token,
          message: "Test debug message",
          deviceType: "whatsapp"
        }),
      });

      const responseText = await travelbroResponse.text();

      debugLog.push({
        step: 3,
        status: travelbroResponse.ok ? "SUCCESS" : "ERROR",
        httpStatus: travelbroResponse.status,
        httpStatusText: travelbroResponse.statusText,
        responsePreview: responseText.substring(0, 500)
      });

      if (!travelbroResponse.ok) {
        debugLog.push({
          step: 3,
          errorDetails: "Full error response",
          fullResponse: responseText
        });
      } else {
        try {
          const jsonResponse = JSON.parse(responseText);
          debugLog.push({
            step: 3,
            parsedResponse: jsonResponse
          });
        } catch (e) {
          debugLog.push({
            step: 3,
            warning: "Could not parse response as JSON",
            rawResponse: responseText
          });
        }
      }
    } catch (fetchError: any) {
      debugLog.push({
        step: 3,
        status: "FETCH ERROR",
        error: fetchError.message,
        stack: fetchError.stack
      });
    }

    const { data: apiSettings } = await supabase
      .from('api_settings')
      .select('provider, service_name, is_active')
      .eq('is_active', true);

    debugLog.push({
      step: 4,
      action: "Check API settings",
      availableApis: apiSettings?.map(s => `${s.provider} - ${s.service_name}`)
    });

    return new Response(
      JSON.stringify({
        debugLog,
        summary: {
          sessionFound: !!sessionData,
          tripFound: !!trip,
          phoneNumber: phoneNumber,
          tripName: trip?.name
        }
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Debug error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
        type: error.constructor.name
      }, null, 2),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});