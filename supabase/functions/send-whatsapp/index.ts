import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    const { to, message, brandId } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Telefoonnummer en bericht zijn verplicht'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let twilioSettings;

    if (brandId) {
      const { data: brandSettings } = await supabase
        .from('api_settings')
        .select('twilio_account_sid, twilio_auth_token, twilio_whatsapp_number')
        .eq('brand_id', brandId)
        .maybeSingle();

      if (brandSettings?.twilio_account_sid && brandSettings?.twilio_auth_token) {
        twilioSettings = brandSettings;
      }
    }

    if (!twilioSettings) {
      const { data: systemSettings } = await supabase
        .from('api_settings')
        .select('twilio_account_sid, twilio_auth_token, twilio_whatsapp_number')
        .eq('provider', 'system')
        .eq('service_name', 'Twilio WhatsApp')
        .maybeSingle();

      if (!systemSettings?.twilio_account_sid || !systemSettings?.twilio_auth_token) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Twilio credentials niet gevonden. Configureer eerst Twilio in de settings.'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      twilioSettings = systemSettings;
    }

    const accountSid = twilioSettings.twilio_account_sid.trim();
    const authToken = twilioSettings.twilio_auth_token.trim();
    const fromNumber = twilioSettings.twilio_whatsapp_number?.trim() || 'whatsapp:+14155238886';

    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const fromWhatsApp = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);

    console.log('Sending WhatsApp message:', {
      to: toNumber,
      from: fromWhatsApp,
      messageLength: message.length
    });

    const formData = new URLSearchParams();
    formData.append('To', toNumber);
    formData.append('From', fromWhatsApp);
    formData.append('Body', message);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const responseData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio error:', responseData);
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.message || 'Fout bij verzenden WhatsApp bericht',
          details: responseData
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('WhatsApp message sent successfully:', responseData.sid);

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: responseData.sid,
        status: responseData.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Onbekende fout bij verzenden'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});