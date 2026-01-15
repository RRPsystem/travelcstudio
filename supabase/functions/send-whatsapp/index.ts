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
    const { to, message, brandId, useTemplate, templateSid, templateVariables, tripId, sessionToken, skipIntake } = await req.json();

    if (!to || (!message && !useTemplate)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Telefoonnummer en bericht (of template) zijn verplicht'
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

    if (tripId) {
      console.log('🔧 Creating WhatsApp session BEFORE sending message');
      const cleanPhoneNumber = to.replace('whatsapp:', '').replace('+', '');

      const { data: trip, error: tripError } = await supabase
        .from('travel_trips')
        .select('brand_id')
        .eq('id', tripId)
        .maybeSingle();

      if (tripError) {
        console.error('❌ Error fetching trip:', tripError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Trip ophalen mislukt: ' + tripError.message
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!trip) {
        console.error('❌ Trip not found with ID:', tripId);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Trip niet gevonden met ID: ' + tripId
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('✅ Trip found:', tripId, 'Brand:', trip.brand_id);

      const sessionData: any = {
        trip_id: tripId,
        phone_number: cleanPhoneNumber,
        brand_id: trip.brand_id,
        last_message_at: new Date().toISOString()
      };

      if (sessionToken && !skipIntake) {
        const { data: intakeExists } = await supabase
          .from('travel_intakes')
          .select('session_token')
          .eq('session_token', sessionToken)
          .maybeSingle();

        if (intakeExists) {
          sessionData.session_token = sessionToken;
          console.log('✅ Session token added - intake exists');
        }
      }

      const { data: sessionResult, error: sessionError } = await supabase
        .from('travel_whatsapp_sessions')
        .upsert(sessionData, {
          onConflict: 'trip_id,phone_number'
        })
        .select();

      if (sessionError) {
        console.error('❌ Error creating WhatsApp session:', sessionError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Sessie aanmaken mislukt: ' + sessionError.message
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else {
        console.log('✅ WhatsApp session created BEFORE sending:', sessionResult);
      }
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);

    console.log('Sending WhatsApp message:', {
      to: toNumber,
      from: fromWhatsApp,
      messageLength: message?.length || 0,
      useTemplate,
      templateSid,
      templateVariables
    });

    const formData = new URLSearchParams();
    formData.append('To', toNumber);
    formData.append('From', fromWhatsApp);

    if (useTemplate && templateSid) {
      console.log('🔍 DEBUG: Using template:', templateSid);
      console.log('🔍 DEBUG: Raw templateVariables received:', JSON.stringify(templateVariables));
      formData.append('ContentSid', templateSid);

      if (templateVariables && typeof templateVariables === 'object' && Object.keys(templateVariables).length > 0) {
        console.log('🔍 DEBUG: Processing template variables...');
        console.log('🔍 DEBUG: Raw templateVariables received:', JSON.stringify(templateVariables));

        const sanitizedVars: Record<string, string> = {};
        for (const [key, value] of Object.entries(templateVariables)) {
          const stringValue = String(value || '');
          const cleanValue = stringValue
            .replace(/[\r\n\t]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          if (cleanValue === '') {
            console.log(`⚠️ WARNING: Variable ${key} is empty after sanitization`);
            continue;
          }

          sanitizedVars[key] = cleanValue;
          console.log(`🔍 Variable ${key}: "${cleanValue}" (length: ${cleanValue.length})`);
        }

        const contentVarsString = JSON.stringify(sanitizedVars);
        console.log('🔍 DEBUG: Final ContentVariables:', contentVarsString);
        console.log('🔍 DEBUG: Number of variables:', Object.keys(sanitizedVars).length);

        formData.append('ContentVariables', contentVarsString);
        console.log(`✅ Added ContentVariables to form`);
      } else {
        console.log('✅ No ContentVariables - using template without variables');
      }
    } else if (message) {
      formData.append('Body', message);
    }

    console.log('FormData being sent to Twilio:', formData.toString());

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

      let errorMessage = responseData.message || 'Fout bij verzenden WhatsApp bericht';

      if (responseData.code === 21656) {
        console.error('❌ ContentVariables error - check your Twilio template configuration');
        console.error('Template SID:', templateSid);
        console.error('Variables sent:', JSON.stringify(templateVariables));
        errorMessage = `Template variables fout. Het template accepteert deze variabelen niet. Controleer de template configuratie in Twilio Console voor "${templateSid}".`;
      }

      if (responseData.code === 63016 || errorMessage.includes('template')) {
        errorMessage = '❌ WhatsApp Business vereist een approved message template voor het eerste bericht.\n\n' +
                      'Oplossingen:\n' +
                      '1. Maak een template in Twilio Console\n' +
                      '2. Of: laat de klant eerst een bericht sturen (dan heb je 24u voor vrije tekst)';
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          details: responseData,
          twilioCode: responseData.code,
          moreInfo: responseData.more_info
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('WhatsApp message sent successfully:', responseData.sid);

    if (tripId && useTemplate && sessionToken && !skipIntake) {
        console.log('📧 Sending follow-up message with intake link...');

        const { data: trip } = await supabase
          .from('travel_trips')
          .select('brand_id, share_token')
          .eq('id', tripId)
          .single();

        if (trip) {
          const { data: brandInfo } = await supabase
            .from('brands')
            .select('travelbro_domain')
            .eq('id', trip.brand_id)
            .single();

          const intakeLink = `https://${brandInfo?.travelbro_domain || 'travelbro.nl'}/${trip.share_token}`;
          const followUpMessage = `📋 Klik hier om je reisgegevens in te vullen:\n${intakeLink}\n\nDaarna kun je direct hier in WhatsApp al je vragen stellen! ✈️`;

          const followUpFormData = new URLSearchParams();
          followUpFormData.append('To', toNumber);
          followUpFormData.append('From', fromWhatsApp);
          followUpFormData.append('Body', followUpMessage);

          console.log('Sending follow-up message with link:', intakeLink);

          const followUpResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: followUpFormData.toString(),
          });

          if (followUpResponse.ok) {
            console.log('✅ Follow-up message sent successfully');
          } else {
            console.error('❌ Failed to send follow-up message:', await followUpResponse.text());
          }
        }
    }

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