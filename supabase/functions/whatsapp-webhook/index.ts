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
    const from = formData.get('From')?.toString().replace('whatsapp:', '') || '';
    const body = formData.get('Body')?.toString() || '';
    const numMedia = parseInt(formData.get('NumMedia')?.toString() || '0');
    const mediaUrl = numMedia > 0 ? formData.get('MediaUrl0')?.toString() : undefined;
    const mediaContentType = numMedia > 0 ? formData.get('MediaContentType0')?.toString() : undefined;

    console.log('Received WhatsApp message:', {
      from,
      body,
      numMedia,
      mediaContentType
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sessionData } = await supabase
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

    if (!sessionData) {
      console.error('❌ NO ACTIVE SESSION FOUND FOR:', from);
      console.log('Available sessions check - querying phone_number:', from);
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
    console.log('📊 Trip data check:', {
      hasCustomContext: !!trip.custom_context,
      customContextLength: trip.custom_context?.length || 0,
      hasParsedData: !!trip.parsed_data,
      parsedDataKeys: trip.parsed_data ? Object.keys(trip.parsed_data) : []
    });

    const brandId = trip.brand_id;

    const { data: twilioSettings } = await supabase
      .from('api_settings')
      .select('twilio_account_sid, twilio_auth_token, twilio_whatsapp_number')
      .or(`brand_id.eq.${brandId},provider.eq.system`)
      .order('brand_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!twilioSettings?.twilio_account_sid || !twilioSettings?.twilio_auth_token) {
      console.error('Twilio credentials not found');
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    const twilioAccountSid = twilioSettings.twilio_account_sid;
    const twilioAuthToken = twilioSettings.twilio_auth_token;
    const twilioWhatsAppNumber = twilioSettings.twilio_whatsapp_number || '+14155238886';

    let userMessage = body;

    if (mediaContentType?.startsWith('audio/')) {
      console.log('Processing audio message...');
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

    const { data: conversationData, error: convError } = await supabase
      .from('travel_conversations')
      .select('id, conversation_history')
      .eq('session_id', sessionData.id)
      .maybeSingle();

    let conversationId: string;
    let conversationHistory: Array<{role: string; content: string}>;

    if (conversationData) {
      conversationId = conversationData.id;
      conversationHistory = conversationData.conversation_history || [];
    } else {
      const { data: newConv, error: createError } = await supabase
        .from('travel_conversations')
        .insert({
          session_id: sessionData.id,
          trip_id: trip.id,
          brand_id: brandId,
          conversation_history: []
        })
        .select('id')
        .single();

      if (createError || !newConv) {
        console.error('Failed to create conversation:', createError);
        conversationId = crypto.randomUUID();
        conversationHistory = [];
      } else {
        conversationId = newConv.id;
        conversationHistory = [];
      }
    }

    conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    const { data: openaiSettings } = await supabase
      .from('api_settings')
      .select('api_key')
      .eq('provider', 'OpenAI')
      .eq('service_name', 'OpenAI API')
      .maybeSingle();

    if (!openaiSettings?.api_key) {
      await sendWhatsAppMessage(
        from,
        'Sorry, ik kan momenteel geen berichten verwerken. Probeer het later opnieuw.',
        twilioAccountSid,
        twilioAuthToken,
        twilioWhatsAppNumber
      );
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    const { data: intakeData } = await supabase
      .from('travel_intakes')
      .select('intake_data')
      .eq('session_token', sessionData.session_token)
      .maybeSingle();

    const intakeInfo = intakeData?.intake_data
      ? `\n\nReiziger informatie uit intake formulier:\n${JSON.stringify(intakeData.intake_data, null, 2)}`
      : '';

    const customContextInfo = trip.custom_context
      ? `\n\nExtra reis context en details:\n${trip.custom_context}`
      : '';

    const tripInfo = trip.parsed_data && Object.keys(trip.parsed_data).length > 0
      ? `\n\nReis informatie:\n${JSON.stringify(trip.parsed_data, null, 2)}`
      : '';

    const sourceUrlsInfo = trip.source_urls && trip.source_urls.length > 0
      ? `\n\nBron URLs voor deze reis:\n${trip.source_urls.join('\n')}`
      : '';

    const dataSourcesInfo = [];
    if (intakeInfo) dataSourcesInfo.push('✓ Intake formulier met reiziger voorkeuren');
    if (customContextInfo) dataSourcesInfo.push('✓ Extra reis context van de reisagent');
    if (tripInfo) dataSourcesInfo.push('✓ Gedetailleerde reis informatie (parsed data)');
    if (sourceUrlsInfo) dataSourcesInfo.push('✓ Bron URLs met reis documentatie');

    const dataSourcesList = dataSourcesInfo.length > 0
      ? `\n\nBeschikbare informatiebronnen voor deze reis:\n${dataSourcesInfo.join('\n')}`
      : '';

    const systemPrompt = `Je bent TravelBro, een behulpzame Nederlandse reisassistent voor de reis "${trip.name}".

BESCHIKBARE INFORMATIE:${intakeInfo}${customContextInfo}${tripInfo}${sourceUrlsInfo}${dataSourcesList}

HOE TE ANTWOORDEN:
• Gebruik ALTIJD de informatie uit de beschikbare bronnen hierboven
• Als reis informatie (parsed_data) beschikbaar is, bevat deze details uit PDF's, websites en andere documenten
• Als intake formulier data beschikbaar is, gebruik dit om gepersonaliseerde adviezen te geven
• Als bron URLs beschikbaar zijn, refereer ernaar als de reiziger meer details wil
• Beantwoord vragen kort, duidelijk en vriendelijk in het Nederlands
• Als informatie niet in de beschikbare bronnen staat, zeg dan eerlijk: "Die informatie heb ik niet in de reisdocumenten, maar ik kan je wel helpen met [alternatief]"

SPECIALE FUNCTIES:
Als de reiziger vraagt om een routebeschrijving of afstand tussen locaties, antwoord:
"Ik kan je helpen met routeinfo! Stuur me:
• Je vertrekpunt
• Je bestemming
• Voorkeur: auto, fiets, lopen of openbaar vervoer

Bijvoorbeeld: 'Route van Amsterdam Centraal naar Rijksmuseum met de fiets'"

VOORBEELDEN:
- Vraag: "Wat is het hotel adres?"
  → Kijk in parsed_data/custom_context voor hotel info
- Vraag: "Welke activiteiten zijn er?"
  → Zoek in parsed_data naar activities/itinerary
- Vraag: "Waar moet ik heen op dag 2?"
  → Check parsed_data voor dagprogramma

Wees persoonlijk, behulpzaam en enthousiast!`;

    const gptModel = trip.gpt_model || 'gpt-4o-mini';
    const gptTemperature = trip.gpt_temperature !== null && trip.gpt_temperature !== undefined
      ? trip.gpt_temperature
      : 0.7;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10)
    ];

    console.log('Calling OpenAI with model:', gptModel, 'temperature:', gptTemperature);

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiSettings.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: gptModel,
        messages: messages,
        temperature: gptTemperature,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to get AI response');
    }

    const aiResult = await openaiResponse.json();
    const aiMessage = aiResult.choices[0].message.content;

    conversationHistory.push({
      role: 'assistant',
      content: aiMessage
    });

    await supabase
      .from('travel_conversations')
      .update({
        conversation_history: conversationHistory,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    await supabase
      .from('travel_whatsapp_sessions')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', sessionData.id);

    await supabase
      .from('travel_whatsapp_messages')
      .insert([
        {
          conversation_id: conversationId,
          session_id: sessionData.id,
          trip_id: trip.id,
          direction: 'inbound',
          message_content: userMessage,
          sender_phone: from
        },
        {
          conversation_id: conversationId,
          session_id: sessionData.id,
          trip_id: trip.id,
          direction: 'outbound',
          message_content: aiMessage,
          sender_phone: twilioWhatsAppNumber
        }
      ]);

    console.log('Sending WhatsApp message...');
    await sendWhatsAppMessage(
      from,
      aiMessage,
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