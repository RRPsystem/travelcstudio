import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendWhatsAppMessage(
  to: string,
  message: string,
  twilioAccountSid: string,
  twilioAuthToken: string,
  twilioWhatsAppNumber: string,
  mediaUrl?: string
) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

  const params: Record<string, string> = {
    From: `whatsapp:${twilioWhatsAppNumber}`,
    To: `whatsapp:${to}`,
    Body: message,
  };

  if (mediaUrl) {
    params.MediaUrl = mediaUrl;
  }

  const body = new URLSearchParams(params);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Twilio API error:', error);
    throw new Error('Failed to send WhatsApp message');
  }

  return await response.json();
}

async function transcribeAudio(audioUrl: string, openaiApiKey: string, twilioAccountSid: string, twilioAuthToken: string): Promise<string> {
  try {
    const authHeader = 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const audioResponse = await fetch(audioUrl, {
      headers: {
        'Authorization': authHeader
      }
    });

    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
    }

    const audioBlob = await audioResponse.blob();

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'nl');

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const error = await transcriptionResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to transcribe audio');
    }

    const result = await transcriptionResponse.json();
    return result.text;
  } catch (error) {
    console.error('Error in transcribeAudio:', error);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('=== WHATSAPP WEBHOOK CALLED ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);

    const formData = await req.formData();
    const rawFrom = formData.get('From')?.toString() || '';
    const from = rawFrom.replace('whatsapp:', '').replace('+', '');
    const body = formData.get('Body')?.toString() || '';
    const numMedia = parseInt(formData.get('NumMedia')?.toString() || '0');
    const mediaUrl = numMedia > 0 ? formData.get('MediaUrl0')?.toString() : undefined;
    const mediaContentType = numMedia > 0 ? formData.get('MediaContentType0')?.toString() : undefined;

    console.log('Received WhatsApp message:', {
      rawFrom,
      from,
      body,
      numMedia,
      mediaContentType
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: systemTwilioSettings } = await supabase
      .from('api_settings')
      .select('twilio_account_sid, twilio_auth_token, twilio_whatsapp_number')
      .eq('provider', 'system')
      .eq('service_name', 'Twilio WhatsApp')
      .maybeSingle();

    if (!systemTwilioSettings?.twilio_account_sid || !systemTwilioSettings?.twilio_auth_token) {
      console.error('System Twilio credentials not found');
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    console.log('🔍 Looking for session with phone number:', from);

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
      .eq('phone_number', from)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      console.error('❌ ERROR querying sessions:', sessionError);
    }

    console.log('🔍 Session query result:', sessionData ? 'FOUND' : 'NOT FOUND');

    if (!sessionData) {
      console.error('❌ NO ACTIVE SESSION FOUND FOR:', from);

      const { data: allSessions, error: allError } = await supabase
        .from('travel_whatsapp_sessions')
        .select('id, phone_number, trip_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      console.log('📋 Available sessions in database:');
      if (allSessions && allSessions.length > 0) {
        allSessions.forEach(s => {
          console.log(`  - Phone: "${s.phone_number}" | Trip: ${s.trip_id} | Created: ${s.created_at}`);
        });
      } else {
        console.log('  (No sessions found in database)');
      }

      await sendWhatsAppMessage(
        from,
        '❌ Ik kan geen actieve TravelBro sessie vinden voor dit nummer. Neem contact op met je reisagent om een nieuwe uitnodiging te ontvangen.',
        systemTwilioSettings.twilio_account_sid,
        systemTwilioSettings.twilio_auth_token,
        systemTwilioSettings.twilio_whatsapp_number || '+14155238886'
      );

      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    console.log('✅ Session found:', sessionData.id);

    const trip = sessionData.travel_trips;
    if (!trip) {
      console.error('❌ NO TRIP FOUND for session:', sessionData.id);
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    console.log('✅ Trip found:', trip.id, trip.name);

    const brandId = trip.brand_id;

    const { data: twilioSettings } = await supabase
      .from('api_settings')
      .select('twilio_account_sid, twilio_auth_token, twilio_whatsapp_number')
      .eq('brand_id', brandId)
      .maybeSingle();

    const finalTwilioSettings = twilioSettings?.twilio_account_sid && twilioSettings?.twilio_auth_token
      ? twilioSettings
      : systemTwilioSettings;

    const twilioAccountSid = finalTwilioSettings.twilio_account_sid;
    const twilioAuthToken = finalTwilioSettings.twilio_auth_token;
    const twilioWhatsAppNumber = finalTwilioSettings.twilio_whatsapp_number || '+14155238886';

    let userMessage = body;
    let processedImageUrl: string | null = null;

    if (mediaContentType?.startsWith('image/')) {
      console.log('📸 Processing image message...');
      processedImageUrl = mediaUrl || null;
      console.log('Image URL:', processedImageUrl);
    }

    if (mediaContentType?.startsWith('audio/')) {
      console.log('🎤 Processing audio message...');
      const { data: openaiSettings } = await supabase
        .from('api_settings')
        .select('api_key')
        .eq('provider', 'OpenAI')
        .eq('service_name', 'OpenAI API')
        .maybeSingle();

      if (!openaiSettings?.api_key) {
        await sendWhatsAppMessage(
          from,
          'Sorry, ik kan audio berichten momenteel niet verwerken. Stuur alsjeblieft een tekstbericht.',
          twilioAccountSid,
          twilioAuthToken,
          twilioWhatsAppNumber
        );
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        });
      }

      try {
        const transcription = await transcribeAudio(
          mediaUrl!,
          openaiSettings.api_key,
          twilioAccountSid,
          twilioAuthToken
        );
        console.log('Transcription:', transcription);
        userMessage = transcription;
      } catch (error) {
        console.error('Failed to transcribe audio:', error);
        await sendWhatsAppMessage(
          from,
          'Sorry, ik kon je audiobericht niet verstaan. Probeer het opnieuw of stuur een tekstbericht.',
          twilioAccountSid,
          twilioAuthToken,
          twilioWhatsAppNumber
        );
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        });
      }
    }

    console.log('🤖 Calling TravelBro chat endpoint...');

    const travelbroChatRequest: any = {
      tripId: trip.id,
      sessionToken: sessionData.session_token,
      deviceType: 'whatsapp',
    };

    if (userMessage) {
      travelbroChatRequest.message = userMessage;
    }

    if (processedImageUrl) {
      travelbroChatRequest.imageUrl = processedImageUrl;
    }

    const travelbroResponse = await fetch(`${supabaseUrl}/functions/v1/travelbro-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify(travelbroChatRequest),
    });

    if (!travelbroResponse.ok) {
      const error = await travelbroResponse.text();
      console.error('TravelBro chat error:', error);

      // Log error to database for debugging
      await supabase.from('debug_logs').insert({
        function_name: 'whatsapp-webhook -> travelbro-chat',
        error_message: error,
        request_payload: travelbroChatRequest,
        response_status: travelbroResponse.status,
        response_body: error
      });

      await sendWhatsAppMessage(
        from,
        'Sorry, ik kan je bericht momenteel niet verwerken. Probeer het later opnieuw.',
        twilioAccountSid,
        twilioAuthToken,
        twilioWhatsAppNumber
      );

      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    const travelbroResult = await travelbroResponse.json();
    console.log('✅ TravelBro response received:', {
      hasText: !!travelbroResult.text,
      visionUsed: travelbroResult.vision_used,
      displayCards: travelbroResult.display_cards?.length || 0
    });

    const aiMessage = travelbroResult.text || travelbroResult.message || 'Geen antwoord ontvangen';

    const displayCardsText = travelbroResult.display_cards && travelbroResult.display_cards.length > 0
      ? '\n\n' + travelbroResult.display_cards.map((card: any) => {
          if (card.type === 'restaurant') {
            return `📍 ${card.title}\n${card.data.address || ''}\n${card.data.distance_meters ? `${card.data.distance_meters}m afstand` : ''}`;
          }
          if (card.type === 'route') {
            return `🗺️ ${card.title}\n${card.data.distance_km} km • ${card.data.duration_minutes} min`;
          }
          return `ℹ️ ${card.title}`;
        }).join('\n\n')
      : '';

    const finalMessage = aiMessage + displayCardsText;

    await supabase
      .from('travel_whatsapp_sessions')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', sessionData.id);

    const messageContentForLog = userMessage || (processedImageUrl ? '[Foto verstuurd]' : '[Media]');

    await supabase
      .from('travel_whatsapp_messages')
      .insert([
        {
          phone_number: from,
          message: messageContentForLog,
          direction: 'inbound',
          whatsapp_number: twilioWhatsAppNumber,
          media_url: processedImageUrl || null,
        },
        {
          phone_number: twilioWhatsAppNumber,
          message: finalMessage,
          direction: 'outbound',
          whatsapp_number: twilioWhatsAppNumber,
          media_url: null,
        }
      ]);

    console.log('📤 Sending WhatsApp message...');
    await sendWhatsAppMessage(
      from,
      finalMessage,
      twilioAccountSid,
      twilioAuthToken,
      twilioWhatsAppNumber
    );

    console.log('✅ Response sent successfully to:', from);

    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in WhatsApp webhook:', error);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });
  }
});