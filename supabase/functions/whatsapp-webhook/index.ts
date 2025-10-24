import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
  const audioResponse = await fetch(audioUrl, {
    headers: {
      'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
    },
  });

  if (!audioResponse.ok) {
    throw new Error('Failed to download audio');
  }

  const audioBlob = await audioResponse.blob();

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.ogg');
  formData.append('model', 'whisper-1');
  formData.append('language', 'nl');

  const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: formData,
  });

  if (!whisperResponse.ok) {
    const error = await whisperResponse.text();
    console.error('Whisper API error:', error);
    throw new Error('Failed to transcribe audio');
  }

  const result = await whisperResponse.json();
  return result.text;
}

async function getOrCreateSession(supabase: any, tripId: string, brandId: string, phoneNumber: string) {
  const { data: existingSession } = await supabase
    .from('travel_whatsapp_sessions')
    .select('*')
    .eq('trip_id', tripId)
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (existingSession) {
    await supabase
      .from('travel_whatsapp_sessions')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (existingSession.message_count || 0) + 1
      })
      .eq('id', existingSession.id);

    return existingSession;
  }

  const sessionToken = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const { data: newSession } = await supabase
    .from('travel_whatsapp_sessions')
    .insert({
      trip_id: tripId,
      brand_id: brandId,
      phone_number: phoneNumber,
      session_token: sessionToken,
      message_count: 1,
    })
    .select()
    .single();

  await supabase
    .from('travel_intakes')
    .insert({
      trip_id: tripId,
      session_token: sessionToken,
      travelers_count: 1,
      intake_data: { source: 'whatsapp', phone_number: phoneNumber },
    });

  return newSession;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const from = formData.get('From')?.toString().replace('whatsapp:', '') || '';
    let body = formData.get('Body')?.toString() || '';
    const to = formData.get('To')?.toString().replace('whatsapp:', '') || '';
    const numMedia = parseInt(formData.get('NumMedia')?.toString() || '0');
    const mediaUrl = numMedia > 0 ? formData.get('MediaUrl0')?.toString() : undefined;
    const mediaContentType = numMedia > 0 ? formData.get('MediaContentType0')?.toString() : undefined;

    console.log('WhatsApp message received:', { from, to, body, numMedia, mediaContentType });

    if (!from) {
      return new Response('Missing sender', { status: 400 });
    }

    if (!body) {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const { data: trip } = await supabase
      .from('travel_trips')
      .select('*')
      .eq('whatsapp_number', to)
      .eq('whatsapp_enabled', true)
      .eq('is_active', true)
      .maybeSingle();

    if (!trip) {
      console.log('No active trip found for WhatsApp number:', to);
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    let { data: apiSettings } = await supabase
      .from('api_settings')
      .select('twilio_account_sid, twilio_auth_token, twilio_whatsapp_number')
      .eq('brand_id', trip.brand_id)
      .maybeSingle();

    if (!apiSettings?.twilio_account_sid || !apiSettings?.twilio_auth_token) {
      const { data: systemSettings } = await supabase
        .from('api_settings')
        .select('twilio_account_sid, twilio_auth_token, twilio_whatsapp_number')
        .is('brand_id', null)
        .maybeSingle();

      if (systemSettings?.twilio_account_sid && systemSettings?.twilio_auth_token) {
        apiSettings = systemSettings;
      } else {
        console.error('No Twilio credentials configured (brand-specific or system-wide)');
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
          headers: { 'Content-Type': 'text/xml' },
        });
      }
    }

    const isVoiceMessage = mediaContentType?.includes('audio');

    if (isVoiceMessage && mediaUrl && openaiApiKey) {
      try {
        console.log('Transcribing voice message...');
        const transcribedText = await transcribeAudio(
          mediaUrl,
          openaiApiKey,
          apiSettings.twilio_account_sid,
          apiSettings.twilio_auth_token
        );
        body = `🎤 [Spraakbericht]: ${transcribedText}`;
        console.log('Transcribed text:', body);
      } catch (error) {
        console.error('Failed to transcribe audio:', error);
        body = '🎤 [Sorry, ik kon je spraakbericht niet verstaan. Kun je het opnieuw proberen of typen?]';
      }
    }

    const session = await getOrCreateSession(supabase, trip.id, trip.brand_id, from);

    const isNewSession = !session.session_token;
    if (isNewSession) {
      await sendWhatsAppMessage(
        from,
        trip.whatsapp_welcome_message || 'Hoi! Ik ben je TravelBRO assistent. Stel me gerust je vragen over de reis!',
        apiSettings.twilio_account_sid,
        apiSettings.twilio_auth_token,
        apiSettings.twilio_whatsapp_number || to
      );

      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const { data: intake } = await supabase
      .from('travel_intakes')
      .select('*')
      .eq('session_token', session.session_token)
      .maybeSingle();

    const { data: conversationHistory } = await supabase
      .from('travel_conversations')
      .select('*')
      .eq('session_token', session.session_token)
      .order('created_at', { ascending: true })
      .limit(20);

    const hasValidTripData = trip.parsed_data && !trip.parsed_data.error;
    const tripDataText = hasValidTripData
      ? JSON.stringify(trip.parsed_data, null, 2)
      : "Geen gedetailleerde reis informatie beschikbaar uit het reisdocument. Je kunt wel algemene tips geven over de bestemming en helpen met vragen.";

    const systemPrompt = `Je bent TravelBRO, een vriendelijke en behulpzame Nederlandse reisassistent voor de reis "${trip.name}".

Reis informatie:
${tripDataText}

Extra bron URL's: ${trip.source_urls.join(', ') || 'Geen'}

${intake?.intake_data ? `Reiziger informatie:
${JSON.stringify(intake.intake_data, null, 2)}` : ''}

Je taken:
1. Beantwoord vragen over de reis (accommodatie, activiteiten, restaurants, tijden, etc.)
2. Geef praktische tips en aanbevelingen
3. Wees enthousiast maar realistisch
4. Als je iets niet zeker weet, geef dat eerlijk toe
5. Houd antwoorden kort en conversationeel (max 3-4 zinnen)

SPECIAAL: Als iemand vraagt om een foto/afbeelding, antwoord dan met [IMAGE:url] waar url een werkende afbeelding URL is.
Voorbeeld: "Hier is het zwembad! [IMAGE:https://example.com/pool.jpg]"

SPECIAAL: Als iemand vraagt waar iets is (hotel, restaurant, attractie), geef dan de locatie met [LOCATION:lat,lng,naam].
Voorbeeld: "Het hotel vind je hier: [LOCATION:52.3676,4.9041,Hotel Amsterdam]"

Wees creatief maar realistisch met locaties en foto's. Gebruik alleen echte URLs die werken.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((conv: any) => {
        messages.push({
          role: conv.role,
          content: conv.message,
        });
      });
    }

    messages.push({ role: "user", content: body });

    await supabase
      .from('travel_conversations')
      .insert({
        trip_id: trip.id,
        session_token: session.session_token,
        message: body,
        role: 'user',
      });

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 500,
        temperature: 0.9,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error("OpenAI API error:", error);
      throw new Error('Failed to get AI response');
    }

    const openaiData = await openaiResponse.json();
    let aiResponse = openaiData.choices[0].message.content;

    let imageUrl: string | undefined;
    let locationData: { lat: number; lng: number; name: string } | undefined;

    const imageMatch = aiResponse.match(/\[IMAGE:(https?:\/\/[^\]]+)\]/);
    if (imageMatch) {
      imageUrl = imageMatch[1];
      aiResponse = aiResponse.replace(imageMatch[0], '').trim();
    }

    const locationMatch = aiResponse.match(/\[LOCATION:([^,]+),([^,]+),([^\]]+)\]/);
    if (locationMatch) {
      locationData = {
        lat: parseFloat(locationMatch[1]),
        lng: parseFloat(locationMatch[2]),
        name: locationMatch[3].trim(),
      };
      aiResponse = aiResponse.replace(locationMatch[0], '').trim();
    }

    await supabase
      .from('travel_conversations')
      .insert({
        trip_id: trip.id,
        session_token: session.session_token,
        message: aiResponse,
        role: 'assistant',
      });

    const updatedHistory = [
      ...(session.conversation_history || []).slice(-19),
      { role: 'user', content: body, timestamp: new Date().toISOString() },
      { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
    ];

    await supabase
      .from('travel_whatsapp_sessions')
      .update({
        conversation_history: updatedHistory,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.id);

    if (imageUrl) {
      await sendWhatsAppMessage(
        from,
        aiResponse || 'Hier is de foto!',
        apiSettings.twilio_account_sid,
        apiSettings.twilio_auth_token,
        apiSettings.twilio_whatsapp_number || to,
        imageUrl
      );
    } else if (locationData) {
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${locationData.lat},${locationData.lng}`;
      const locationMessage = aiResponse
        ? `${aiResponse}\n\n📍 ${locationData.name}\n${googleMapsUrl}`
        : `📍 ${locationData.name}\n${googleMapsUrl}`;

      await sendWhatsAppMessage(
        from,
        locationMessage,
        apiSettings.twilio_account_sid,
        apiSettings.twilio_auth_token,
        apiSettings.twilio_whatsapp_number || to
      );
    } else {
      await sendWhatsAppMessage(
        from,
        aiResponse,
        apiSettings.twilio_account_sid,
        apiSettings.twilio_auth_token,
        apiSettings.twilio_whatsapp_number || to
      );
    }

    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 500,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});