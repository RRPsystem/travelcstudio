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
      headers: { 'Authorization': authHeader }
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
      headers: { 'Authorization': `Bearer ${openaiApiKey}` },
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
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('=== WHATSAPP WEBHOOK CALLED ===');

    const formData = await req.formData();
    const from = formData.get('From')?.toString().replace('whatsapp:', '') || '';
    const body = formData.get('Body')?.toString() || '';
    const numMedia = parseInt(formData.get('NumMedia')?.toString() || '0');
    const mediaUrl = numMedia > 0 ? formData.get('MediaUrl0')?.toString() : undefined;
    const mediaContentType = numMedia > 0 ? formData.get('MediaContentType0')?.toString() : undefined;
    
    // Get location data if user shared their location
    const latitude = formData.get('Latitude')?.toString();
    const longitude = formData.get('Longitude')?.toString();
    const hasLocation = latitude && longitude;

    console.log('Received:', { from, body: body.substring(0, 50), numMedia, hasLocation });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get session with trip data
    const { data: sessionData } = await supabase
      .from('travel_whatsapp_sessions')
      .select(`*, travel_trips (id, name, parsed_data, source_urls, custom_context, gpt_model, gpt_temperature, brand_id)`)
      .eq('phone_number', from)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sessionData) {
      console.error('❌ NO SESSION FOR:', from);
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    const trip = sessionData.travel_trips;
    if (!trip) {
      console.error('❌ NO TRIP for session:', sessionData.id);
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    console.log('✅ Trip:', trip.name);

    // Get Twilio settings
    const { data: twilioSettings } = await supabase
      .from('api_settings')
      .select('twilio_account_sid, twilio_auth_token, twilio_whatsapp_number')
      .or(`brand_id.eq.${trip.brand_id},provider.eq.system`)
      .order('brand_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!twilioSettings?.twilio_account_sid) {
      console.error('Twilio credentials not found');
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    const twilioAccountSid = twilioSettings.twilio_account_sid;
    const twilioAuthToken = twilioSettings.twilio_auth_token;
    const twilioWhatsAppNumber = twilioSettings.twilio_whatsapp_number || '+14155238886';

    let userMessage = body;
    let imageUrl: string | undefined = undefined;

    // Handle image messages - store URL for vision API
    if (mediaContentType?.startsWith('image/') && mediaUrl) {
      console.log('📷 Image received:', mediaContentType);
      imageUrl = mediaUrl;
      if (!userMessage) {
        userMessage = '[Gebruiker stuurde een afbeelding]';
      }
    }

    // Handle location messages - user shared their location
    if (hasLocation) {
      console.log('📍 Location received:', latitude, longitude);
      // Add location context to the message
      const locationContext = `[Gebruiker deelde locatie: ${latitude}, ${longitude}]`;
      if (!userMessage) {
        userMessage = locationContext + ' Geef me een wandelroute vanaf deze locatie.';
      } else {
        userMessage = locationContext + ' ' + userMessage;
      }
    }

    // Handle audio messages
    if (mediaContentType?.startsWith('audio/')) {
      const { data: audioOpenaiSettings } = await supabase
        .from('api_settings')
        .select('api_key')
        .eq('provider', 'OpenAI')
        .eq('service_name', 'OpenAI API')
        .maybeSingle();

      if (audioOpenaiSettings?.api_key && mediaUrl) {
        try {
          userMessage = await transcribeAudio(mediaUrl, audioOpenaiSettings.api_key, twilioAccountSid, twilioAuthToken);
        } catch (e) {
          console.error('Transcription failed:', e);
        }
      }
    }

    // Get conversation history (individual messages from travel_conversations table)
    const { data: recentMessages } = await supabase
      .from('travel_conversations')
      .select('role, message')
      .eq('session_token', sessionData.session_token)
      .order('created_at', { ascending: false })
      .limit(6);

    const conversationHistory = (recentMessages || []).reverse().map((m: any) => ({ role: m.role, content: m.message }));
    conversationHistory.push({ role: 'user', content: userMessage });

    // Save user message
    await supabase.from('travel_conversations').insert({
      trip_id: trip.id,
      session_token: sessionData.session_token,
      message: userMessage,
      role: 'user'
    });

    // Get OpenAI settings
    const { data: openaiSettings } = await supabase
      .from('api_settings')
      .select('api_key')
      .eq('provider', 'OpenAI')
      .eq('service_name', 'OpenAI API')
      .maybeSingle();

    if (!openaiSettings?.api_key) {
      await sendWhatsAppMessage(from, 'Sorry, ik kan momenteel geen berichten verwerken.', twilioAccountSid, twilioAuthToken, twilioWhatsAppNumber);
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    // Prepare trip info - REMOVE raw_compositor_data to reduce tokens
    let compactData = trip.parsed_data;
    if (compactData?.raw_compositor_data) {
      const { raw_compositor_data, ...rest } = compactData;
      compactData = rest;
    }

    const tripInfo = compactData ? JSON.stringify(compactData, null, 2) : '';
    const customContext = trip.custom_context || '';

    // Extract destination info for context
    const destinations = compactData?.destinations || compactData?.destination || [];
    const destinationNames = Array.isArray(destinations) 
      ? destinations.map((d: any) => typeof d === 'string' ? d : d.name || d.city).filter(Boolean).join(', ')
      : (typeof destinations === 'string' ? destinations : '');

    const systemPrompt = `Je bent TravelBro, de persoonlijke reisassistent voor de reis "${trip.name}".

=== BELANGRIJKE CONTEXT ===
🎯 BESTEMMING: ${destinationNames || 'Zie reisdata hieronder'}
📅 REIS: "${trip.name}"

De reiziger heeft deze reis GEBOEKT en gaat naar: ${destinationNames || 'de bestemming in de reisdata'}.
ALLES wat je bespreekt moet relevant zijn voor DEZE specifieke reis.

=== REISDATA ===
${customContext}
${tripInfo}

=== GEDRAGSREGELS ===
1. **GESPREKSCONTEXT VOLGEN (ZEER BELANGRIJK!):**
   - Lees de HELE conversatie-historie voordat je antwoordt
   - Als de reiziger vraagt over "het hotel" of "daar", refereer dan naar de LAATST BESPROKEN locatie/hotel in het gesprek
   - Voorbeeld: Als je net over Belfast sprak en de reiziger vraagt "zit er eentje dicht bij het hotel?", dan bedoelt hij het hotel in BELFAST, niet een ander hotel
   - Spring NOOIT naar een andere locatie tenzij de reiziger dat expliciet vraagt

2. CONTEXT BEWAKEN: Relateer ALLES aan de geboekte reis. Als iemand een foto stuurt van de Eiffeltoren maar naar Ierland gaat, zeg dan: "Dat is de Eiffeltoren in Parijs! Maar jouw reis gaat naar Ierland - bedoel je misschien iets anders?"

3. BIJ AFBEELDINGEN:
   - Herken eerst wat je ziet
   - Check dan of het relevant is voor de reis
   - Als het NIET in het reisgebied ligt, wijs daar vriendelijk op
   - Vraag of de reiziger iets anders bedoelt

4. BIJ FOUTEN: Als de reiziger zegt dat je iets verkeerd hebt, erken dit direct en corrigeer jezelf. Zeg bijvoorbeeld: "Je hebt gelijk, mijn excuses! Laat me je helpen met de juiste informatie voor jouw reis naar ${destinationNames}."

5. STIJL:
   - Antwoord in het Nederlands
   - Wees vriendelijk maar beknopt
   - Toon NOOIT prijzen (klant heeft al geboekt)
   - Wees proactief met suggesties

6. LOKALE TIPS: Bij vragen over fietsverhuur, restaurants, etc. geef concrete suggesties gebaseerd op de HUIDIGE locatie in het gesprek.

7. WANDELROUTES MET LOCATIE:
   - Als de gebruiker een locatie deelt of vraagt om een wandelroute, stel EERST deze 3 korte vragen:
     1. ⏱️ Hoe lang wil je wandelen? (bijv. 1 uur, 2 uur, 5 km)
     2. 🌳 Door de natuur of door het centrum?
     3. ☕ Wil je onderweg ergens koffie/lunch doen?
   
   - Wacht op antwoorden voordat je de route maakt
   - Gebruik de coördinaten als startpunt
   - Genereer een wandelroute met interessante stops gebaseerd op de voorkeuren
   - Geef een Google Maps wandellink in dit formaat:
     https://www.google.com/maps/dir/[startlocatie]/[stop1]/[stop2]/[eindlocatie]/@[lat],[lng],15z/data=!4m2!4m1!3e2
   - De "!3e2" aan het einde zorgt voor wandelmodus
   - Voorbeeld output na vragen:
     🚶 **Wandelroute vanaf jouw locatie**
     📍 Start: [locatienaam]
     🛤️ Route: [stop1] → [stop2] → [stop3]
     ⏱️ Duur: ± X uur
     ☕ Koffie stop: [naam café]
     
     👉 [Google Maps wandellink]`;

    // Use gpt-4o for vision, gpt-4o-mini for text only
    const gptModel = imageUrl ? 'gpt-4o' : 'gpt-4o-mini';
    
    // Build messages - add image if present
    let messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6)
    ];

    // If image is present, modify the last user message to include the image
    if (imageUrl) {
      // Fetch image and convert to base64 (Twilio requires auth)
      try {
        const imgResponse = await fetch(imageUrl, {
          headers: { 'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`) }
        });
        if (imgResponse.ok) {
          const imgBlob = await imgResponse.blob();
          const imgBuffer = await imgBlob.arrayBuffer();
          const base64Image = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
          const mimeType = mediaContentType || 'image/jpeg';
          
          // Replace last message with vision format
          const lastMsg = messages[messages.length - 1];
          messages[messages.length - 1] = {
            role: 'user',
            content: [
              { type: 'text', text: lastMsg.content + '\n\nBeschrijf wat je ziet op deze afbeelding en help de gebruiker met hun vraag over deze locatie/plek.' },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          };
          console.log('📷 Image added to vision request');
        }
      } catch (imgError) {
        console.error('Failed to fetch image:', imgError);
      }
    }

    console.log('Calling OpenAI:', gptModel, imageUrl ? '(with vision)' : '');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiSettings.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: gptModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI error:', error);
      throw new Error('OpenAI failed');
    }

    const aiResult = await openaiResponse.json();
    const aiMessage = aiResult.choices[0].message.content;

    // Save assistant response
    await supabase.from('travel_conversations').insert({
      trip_id: trip.id,
      session_token: sessionData.session_token,
      message: aiMessage,
      role: 'assistant'
    });

    // Update session timestamp
    await supabase
      .from('travel_whatsapp_sessions')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', sessionData.id);

    // Send WhatsApp response
    await sendWhatsAppMessage(from, aiMessage, twilioAccountSid, twilioAuthToken, twilioWhatsAppNumber);
    console.log('✅ Response sent');

    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });
  }
});
