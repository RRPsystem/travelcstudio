import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    const { testPhone } = await req.json();

    if (!testPhone) {
      return new Response(
        JSON.stringify({ error: 'testPhone is required (format: +31612345678)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: systemSettings } = await supabase
      .from('api_settings')
      .select('twilio_account_sid, twilio_auth_token, twilio_phone_number')
      .eq('provider', 'system')
      .eq('service_name', 'Twilio WhatsApp')
      .maybeSingle();

    if (!systemSettings?.twilio_account_sid || !systemSettings?.twilio_auth_token) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not found in database' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountSid = systemSettings.twilio_account_sid.trim();
    const authToken = systemSettings.twilio_auth_token.trim();
    const fromWhatsApp = `whatsapp:${systemSettings.twilio_phone_number.trim()}`;
    const toNumber = testPhone.startsWith('whatsapp:') ? testPhone : `whatsapp:${testPhone}`;

    const templateSid = 'HX01a2453a98f1070954288e9c01d7bfa3';

    const testVariables = {
      '1': 'Jan',
      '2': 'Bali, Indonesie',
      '3': 'https://travelbro.nl/test123'
    };

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);

    const formData = new URLSearchParams();
    formData.append('To', toNumber);
    formData.append('From', fromWhatsApp);
    formData.append('ContentSid', templateSid);
    formData.append('ContentVariables', JSON.stringify(testVariables));

    console.log('🧪 Testing Twilio WhatsApp Template');
    console.log('═══════════════════════════════════');
    console.log('Template SID:', templateSid);
    console.log('To:', toNumber);
    console.log('From:', fromWhatsApp);
    console.log('Variables:', JSON.stringify(testVariables));
    console.log('FormData:', formData.toString());
    console.log('═══════════════════════════════════');

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
      console.error('❌ Twilio API Error:', JSON.stringify(responseData, null, 2));
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.message || 'Unknown error',
          code: responseData.code,
          moreInfo: responseData.more_info,
          details: responseData,
          sentData: {
            to: toNumber,
            from: fromWhatsApp,
            templateSid,
            variables: testVariables,
            formData: formData.toString()
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Success! Message SID:', responseData.sid);
    console.log('Status:', responseData.status);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Template message sent successfully!',
        messageSid: responseData.sid,
        status: responseData.status,
        sentData: {
          to: toNumber,
          from: fromWhatsApp,
          templateSid,
          variables: testVariables
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Unexpected Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
