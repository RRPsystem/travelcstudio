import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    const { templateSid } = await req.json();

    if (!templateSid) {
      return new Response(
        JSON.stringify({ error: 'templateSid is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: systemSettings } = await supabase
      .from('api_settings')
      .select('twilio_account_sid, twilio_auth_token')
      .eq('provider', 'system')
      .eq('service_name', 'Twilio WhatsApp')
      .maybeSingle();

    if (!systemSettings?.twilio_account_sid || !systemSettings?.twilio_auth_token) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not found' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const accountSid = systemSettings.twilio_account_sid.trim();
    const authToken = systemSettings.twilio_auth_token.trim();

    const twilioUrl = `https://content.twilio.com/v1/Content/${templateSid}`;
    const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);

    const response = await fetch(twilioUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    const templateData = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        template: templateData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error inspecting template:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
