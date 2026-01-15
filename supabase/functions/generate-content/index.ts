import { createClient } from 'npm:@supabase/supabase-js@2';
import { deductCredits } from '../_shared/credits.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateContentRequest {
  contentType: string;
  prompt: string;
  writingStyle?: string;
  additionalContext?: string | {
    from?: string;
    to?: string;
    distance?: string;
    duration?: string;
    waypoints?: any[];
    eateriesOnRoute?: any[];
    eateriesAtArrival?: any[];
    [key: string]: any;
  };
  options?: {
    vacationType?: string;
    vacationTypeDescription?: string;
    routeType?: string;
    routeTypeDescription?: string;
    days?: string;
    daysDescription?: string;
    destination?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
    systemPrompt?: string;
  };
  structuredGeneration?: {
    name: string;
    introWords?: number;
    highlights?: number;
    attractions?: number;
    restaurants?: number;
    hotels?: number;
    language?: string;
    brandId?: string;
    userId?: string;
  };
}

interface RouteStop {
  name: string;
  place_id: string;
  types: string[];
  rating?: number;
  detour_minutes: number;
  reason: string;
  location: {
    lat: number;
    lng: number;
  };
}

interface CompressedStep {
  instruction: string;
  highway: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: GenerateContentRequest = await req.json();
    const { contentType, prompt, writingStyle = 'professional', additionalContext = '', options = {} } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { data: settings } = await supabase
      .from('api_settings')
      .select('api_key')
      .eq('provider', 'OpenAI')
      .maybeSingle();

    let openaiApiKey = settings?.api_key;

    if (!openaiApiKey) {
      openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (openaiApiKey) {
        console.log('⚠️ Using system-wide OPENAI_API_KEY fallback');
      }
    }

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { data: gptModel } = await supabase
      .from('gpt_models')
      .select('*')
      .eq('content_type', contentType)
      .eq('is_active', true)
      .maybeSingle();

    console.log('[GPT] Looking for GPT model with content_type:', contentType);
    console.log('[GPT] Found GPT model:', gptModel?.name);

    function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
      const coordinates: Array<{ lat: number; lng: number }> = [];
      let index = 0;
      let lat = 0;
      let lng = 0;

      while (index < encoded.length) {
        let shift = 0;
        let result = 0;
        let byte;

        do {
          byte = encoded.charCodeAt(index++) - 63;
          result |= (byte & 0x1f) << shift;
          shift += 5;
        } while (byte >= 0x20);

        const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += deltaLat;

        shift = 0;
        result = 0;

        do {
          byte = encoded.charCodeAt(index++) - 63;
          result |= (byte & 0x1f) << shift;
          shift += 5;
        } while (byte >= 0x20);

        const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += deltaLng;

        coordinates.push({
          lat: lat / 1e5,
          lng: lng / 1e5
        });
      }

      return coordinates;
    }

    function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    function compressSteps(steps: any[]): CompressedStep[] {
      const compressed: CompressedStep[] = [];
      const totalDistance = steps.reduce((sum, step) => {
        const meters = step.distance?.value || 0;
        return sum + meters;
      }, 0);
      const totalKm = totalDistance / 1000;

      let targetSteps: number;
      if (totalKm < 50) {
        targetSteps = 5;
      } else if (totalKm < 100) {
        targetSteps = 7;
      } else if (totalKm < 150) {
        targetSteps = 9;
      } else if (totalKm < 200) {
        targetSteps = 11;
      } else if (totalKm < 300) {
        targetSteps = 13;
      } else {
        targetSteps = 15;
      }

      const interval = Math.max(1, Math.floor(steps.length / targetSteps));

      for (let i = 0; i < steps.length; i += interval) {
        const step = steps[i];
        const instruction = step.html_instructions
          ?.replace(/<[^>]*>/g, '')
          ?.replace(/&nbsp;/g, ' ')
          || step.instructions
          || 'Volg de route';

        const highway = step.html_instructions?.match(/>(A\d+|E\d+|N\d+)</) ||
                       step.html_instructions?.match(/\b(A\d+|E\d+|N\d+)\b/);

        compressed.push({
          instruction,
          highway: highway ? highway[1] : ''
        });
      }

      if (compressed.length === 0 || compressed[compressed.length - 1].instruction !== steps[steps.length - 1].html_instructions) {
        const lastStep = steps[steps.length - 1];
        const lastInstruction = lastStep.html_instructions
          ?.replace(/<[^>]*>/g, '')
          ?.replace(/&nbsp;/g, ' ')
          || lastStep.instructions
          || 'Je bent aangekomen';

        compressed.push({
          instruction: lastInstruction,
          highway: ''
        });
      }

      return compressed;
    }

    async function getPlaceDetails(placeId: string): Promise<any> {
      const { data: mapsSettings } = await supabase
        .from('api_settings')
        .select('api_key')
        .eq('service_name', 'Google Maps API')
        .eq('is_active', true)
        .maybeSingle();

      if (!mapsSettings?.api_key) return null;

      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,rating,user_ratings_total,opening_hours,types,photos,price_level,website&key=${mapsSettings.api_key}&language=nl`;

      const response = await fetch(detailsUrl);
      if (!response.ok) return null;

      const data = await response.json();
      return data.status === 'OK' ? data.result : null;
    }

    async function enrichStopWithDetails(stop: RouteStop): Promise<RouteStop> {
      const details = await getPlaceDetails(stop.place_id);
      if (!details) return stop;

      return {
        ...stop,
        rating: details.rating || stop.rating,
        types: details.types || stop.types
      };
    }

    async function filterAndEnrichStops(stops: RouteStop[]): Promise<RouteStop[]> {
      const excludedTypes = new Set([
        'gas_station', 'car_repair', 'car_wash', 'parking',
        'convenience_store', 'atm', 'bank'
      ]);

      const validStops = stops.filter(stop => {
        const hasExcludedType = stop.types.some(type => excludedTypes.has(type));
        return !hasExcludedType;
      });

      const enrichedStops = await Promise.all(
        validStops.map(stop => enrichStopWithDetails(stop))
      );

      const finalStops = enrichedStops.filter(stop => {
        if (!stop.rating || stop.rating < 4.0) return false;
        return true;
      });

      return finalStops.slice(0, 10);
    }

    async function fetchCompleteRoute(origin: string, destination: string, routeType: string, days?: string) {
      const { data: mapsSettings } = await supabase
        .from('api_settings')
        .select('api_key')
        .eq('service_name', 'Google Maps API')
        .eq('is_active', true)
        .maybeSingle();

      if (!mapsSettings?.api_key) {
        throw new Error('Google Maps API key not configured');
      }

      const googleMapsApiKey = mapsSettings.api_key;
      let waypoints: string[] = [];
      let avoidHighways = false;

      if (routeType === 'toeristische-route') {
        avoidHighways = false;
      } else if (routeType === 'binnendoor-weggetjes') {
        avoidHighways = true;
      }

      const baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';
      const params = new URLSearchParams({
        origin,
        destination,
        key: googleMapsApiKey,
        language: 'nl',
        mode: 'driving',
        alternatives: 'true'
      });

      if (avoidHighways) {
        params.set('avoid', 'highways');
      }

      if (waypoints.length > 0) {
        params.set('waypoints', waypoints.join('|'));
      }

      const directionsResponse = await fetch(`${baseUrl}?${params.toString()}`);
      if (!directionsResponse.ok) {
        throw new Error(`Directions API failed: ${directionsResponse.status}`);
      }

      const directionsData = await directionsResponse.json();
      if (directionsData.status !== 'OK' || !directionsData.routes || directionsData.routes.length === 0) {
        throw new Error(`No route found: ${directionsData.status}`);
      }

      const route = directionsData.routes[0];
      const leg = route.legs[0];

      const polyline = route.overview_polyline?.encoded || route.overview_polyline?.points;
      if (!polyline) {
        console.error('Route data:', JSON.stringify(route, null, 2));

        const compressedSteps = compressSteps(leg.steps || []);
        return {
          distance: leg.distance.text,
          duration: leg.duration.text,
          distance_nonstop: leg.distance.text,
          duration_nonstop: leg.duration.text,
          origin: origin,
          destination: destination,
          steps: compressedSteps,
          stops: []
        };
      }

      const coordinates = decodePolyline(polyline);

      const radius = 10000;
      const placeTypes = ['tourist_attraction', 'museum', 'park', 'monument', 'art_gallery'];
      const uniquePlaces = new Map<string, RouteStop>();

      for (let i = 0; i < coordinates.length; i += Math.floor(coordinates.length / 15)) {
        const coord = coordinates[i];
        const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coord.lat},${coord.lng}&radius=${radius}&type=${placeTypes[0]}&key=${googleMapsApiKey}&language=nl`;

        try {
          const nearbyResponse = await fetch(nearbyUrl);
          if (!nearbyResponse.ok) continue;

          const nearbyData = await nearbyResponse.json();
          if (nearbyData.status === 'OK' && nearbyData.results) {
            for (const place of nearbyData.results.slice(0, 5)) {
              if (!uniquePlaces.has(place.place_id)) {
                const detourMinutes = Math.round(
                  calculateDistance(coord.lat, coord.lng, place.geometry.location.lat, place.geometry.location.lng) * 2
                );

                if (detourMinutes <= 15) {
                  uniquePlaces.set(place.place_id, {
                    name: place.name,
                    place_id: place.place_id,
                    types: place.types || [],
                    rating: place.rating,
                    detour_minutes: detourMinutes,
                    reason: 'Interessante bezienswaardigheid',
                    location: place.geometry.location
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error('Error fetching nearby places:', e);
        }
      }

      const allStops = Array.from(uniquePlaces.values());
      const filteredStops = await filterAndEnrichStops(allStops);

      const compressedSteps = compressSteps(leg.steps || []);

      const diverseStops = filteredStops.slice(0, 8);

      return {
        distance: leg.distance.text,
        duration: leg.duration.text,
        distance_nonstop: leg.distance.text,
        duration_nonstop: route.duration,
        origin: origin,
        destination: destination,
        steps: compressedSteps,
        stops: diverseStops
      };
    }

    let routePayload: any = null;

    if (contentType === 'route' && prompt) {
      console.log(`🔍 PAYLOAD TO LLM:`);

      const routeMatch = prompt.match(/route van (.+?) naar (.+?)$/i);
      if (routeMatch) {
        const origin = routeMatch[1].trim();
        const destination = routeMatch[2].trim();

        try {
          routePayload = await fetchCompleteRoute(origin, destination, options.routeType || 'snelle-route', options.days);
          
          console.log('📊 ROUTE PAYLOAD:');
          console.log(`  Origin: ${routePayload.origin}`);
          console.log(`  Destination: ${routePayload.destination}`);
          console.log(`  Distance: ${routePayload.distance}`);
          console.log(`  Duration: ${routePayload.duration}`);
          console.log(`  Steps: ${routePayload.steps.length} compressed steps`);
          console.log(`  Stops: ${routePayload.stops.length} interesting stops`);

          if (routePayload.stops && routePayload.stops.length > 0) {
            console.log('\n🎯 STOPS:');
            routePayload.stops.forEach((stop: RouteStop, i: number) => {
              console.log(`  ${i + 1}. ${stop.name} (${stop.detour_minutes} min detour, rating: ${stop.rating || 'n/a'})`);
            });
          }

        } catch (error) {
          console.error('❌ ERROR fetching route:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          if (errorMessage.includes('API key')) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Google Maps API key is niet geconfigureerd. Ga naar Operator > API Settings om de key in te stellen.',
                details: errorMessage
              }),
              {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          throw error;
        }
      }
    }

    const getRouteInstruction = (routeType: string) => {
      switch (routeType) {
        case 'snelle-route': return 'Focus op de snelste route met minimale reistijd.';
        case 'toeristische-route': return 'Kies de mooiste route met bezienswaardigheden onderweg.';
        case 'binnendoor-weggetjes': return 'Gebruik kleinere wegen en ontdek verborgen parels.';
        case 'gemengd': return 'Combineer snelheid met mooie bezienswaardigheden.';
        default: return '';
      }
    };

    const getSystemPrompt = (contentType: string) => {
      const basePrompts: Record<string, string> = {
        destination: `Je bent een professionele reisschrijver die boeiende bestemmingsteksten schrijft over {DESTINATION}. Schrijf in {WRITING_STYLE} stijl voor {VACATION_TYPE} reizigers. Gebruik actuele informatie en maak de tekst aantrekkelijk.`,
        structured_destination: `Je bent een professionele reisschrijver die complete bestemmingscontent genereert. Genereer content in STRICT JSON format zonder markdown formatting. Output moet ALLEEN valid JSON zijn zonder extra tekst.`,
        structured_trip: `Je bent een reisorganisatie expert die complete reis content genereert. Genereer content in STRICT JSON format zonder markdown formatting. Output moet ALLEEN valid JSON zijn zonder extra tekst.`,
        structured_news: `Je bent een professionele journalist die nieuwsartikelen schrijft. Genereer content in STRICT JSON format zonder markdown formatting. Output moet ALLEEN valid JSON zijn zonder extra tekst.`,`
        route: `Je bent een enthousiaste reisbuddy die routes tot een beleving maakt. {ROUTE_TYPE_INSTRUCTION}

FOCUS OP BELEVING, NIET OP NAVIGATIE:
- De routenavigatie wordt via Google Maps gedaan (die link wordt apart getoond)
- Jouw focus is op DE ERVARING tijdens de reis
- Vertel over wat ze ONDERWEG kunnen zien, doen, en beleven
- Suggereer leuke stops voor foto's, koffie, of een snack
- Geef tips voor waar ze kunnen eten/drinken onderweg
- Bij aankomst: suggereer een supermarkt voor boodschappen of restaurant voor direct uit eten

STRUCTUUR:
1. Korte intro over de reis (afstand/tijd)
2. Bezienswaardigheden onderweg (met waarom ze leuk zijn)
3. Eet- en drinkgelegenheden onderweg (match aan reizigersvoorkeuren als bekend)
4. Leuke stops voor foto's of een pauze
5. Tips bij aankomst (supermarkt of restaurant in de buurt)

STIJL:
- Schrijf in {WRITING_STYLE} stijl voor {VACATION_TYPE} reizigers
- Wees enthousiast en inspirerend
- Geef concrete namen van plekken (niet "er zijn cafés" maar "Café De Zon")
- Maak de reis tot een avontuur, niet alleen maar kilometers`,
        planning: `Je bent een reisplanner die {DAYS} dagplanningen maakt voor {DESTINATION}. Geef een praktische planning met tijden, activiteiten, en tips. Schrijf in {WRITING_STYLE} stijl voor {VACATION_TYPE} reizigers.`,
        hotel: `Je bent een hotelexpert die hotelzoekresultaten presenteert voor {VACATION_TYPE} reizigers. Geef gedetailleerde informatie over hotels, voorzieningen, en boekingsadvies. Schrijf in {WRITING_STYLE} stijl.`,
        image: `Je bent een AI die afbeeldingsbeschrijvingen genereert voor DALL-E. Maak een gedetailleerde, visuele beschrijving voor een {VACATION_TYPE} reisafbeelding in {WRITING_STYLE} stijl.`
      };

      let systemPrompt = basePrompts[contentType] || basePrompts.destination;
      
      systemPrompt = systemPrompt
        .replace('{WRITING_STYLE}', writingStyle)
        .replace('{VACATION_TYPE}', options.vacationType || 'algemene')
        .replace('{ROUTE_TYPE}', options.routeType || '')
        .replace('{ROUTE_TYPE_INSTRUCTION}', getRouteInstruction(options.routeType || ''))
        .replace('{DAYS}', options.days || '')
        .replace('{DESTINATION}', options.destination || '');

      return systemPrompt;
    };

    const generateStructuredContent = async (structuredReq: any) => {
      const { name, introWords = 200, highlights = 10, attractions = 5, restaurants = 2, hotels = 3, language = 'nl', brandId, userId } = structuredReq;

      const { data: brandVoice } = brandId ? await supabase
        .from('brand_voice_settings')
        .select('*')
        .eq('brand_id', brandId)
        .maybeSingle() : { data: null };

      const voiceInstructions = brandVoice ? `

BRAND VOICE:
- Tone: ${brandVoice.tone_of_voice}
- Target Audience: ${brandVoice.target_audience}
- Key Phrases: ${brandVoice.key_phrases?.join(', ')}
- Writing Style: ${brandVoice.writing_style}` : '';

      const structuredPrompt = `Genereer complete content voor de bestemming: ${name}

Genereer een JSON object met de volgende structuur (GEEN markdown, ALLEEN JSON):

{
  "intro": "${introWords} woorden professionele introductie over ${name}",
  "highlights": ["${highlights} korte highlights (elk 5-10 woorden)"],
  "attractions": [
    {
      "name": "Naam van bezienswaardigheid",
      "description": "Beschrijving 50-100 woorden",
      "location": "Locatie/wijk",
      "estimated_price": "€10-20",
      "rating": 4.5,
      "best_time": "Beste tijd om te bezoeken"
    }
    // ${attractions} bezienswaardigheden totaal
  ],
  "restaurants": [
    {
      "name": "Restaurant naam",
      "cuisine": "Type keuken",
      "description": "Beschrijving 30-50 woorden",
      "price_range": "€€",
      "specialty": "Specialiteit",
      "rating": 4.3
    }
    // ${restaurants} restaurants totaal
  ],
  "hotels": [
    {
      "name": "Hotel naam",
      "type": "Type accommodatie",
      "description": "Beschrijving 30-50 woorden",
      "price_range": "€€€",
      "amenities": ["voorziening1", "voorziening2"],
      "rating": 4.7
    }
    // ${hotels} hotels totaal
  ],
  "best_time_to_visit": "Beste reisperiode met uitleg",
  "getting_around": "Vervoer tips en opties",
  "budget_tips": ["5 concrete budget tips"],
  "local_customs": "Culturele tips en lokale gewoonten",
  "weather": "Klimaat informatie per seizoen",
  "language_tips": "Handige zinnen en taal tips"
}

Schrijf in het ${language === 'nl' ? 'Nederlands' : language === 'en' ? 'Engels' : language === 'de' ? 'Duits' : 'Nederlands'}.
Gebruik actuele en accurate informatie.
Wees specifiek en concreet met namen en locaties.${voiceInstructions}

Output ALLEEN het JSON object, geen extra tekst, geen markdown formatting.`;

      const cacheKey = `${contentType}_${name}_${language}_${introWords}_${highlights}_${attractions}`;
      const promptHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(structuredPrompt))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

      const { data: cached } = await supabase
        .from('ai_content_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .eq('prompt_hash', promptHash)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (cached) {
        console.log('✅ Using cached content');
        await supabase.rpc('increment_cache_usage', { cache_id: cached.id });
        return cached.generated_content;
      }

      console.log('🤖 Generating new content with OpenAI');

      if (userId) {
        const creditResult = await deductCredits(
          supabase,
          userId,
          'ai_content_generation',
          `AI content generatie voor ${name}`,
          { destination: name, contentType }
        );

        if (!creditResult.success) {
          throw new Error(creditResult.error || 'Failed to deduct credits');
        }
      }

      const { data: settings } = await supabase
        .from('api_settings')
        .select('api_key')
        .eq('provider', 'OpenAI')
        .maybeSingle();

      if (!settings?.api_key) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: getSystemPrompt('structured_destination') },
            { role: 'user', content: structuredPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);
      const tokensUsed = data.usage?.total_tokens || 0;
      const cost = (tokensUsed / 1000) * 0.03;

      await supabase.from('ai_content_cache').insert({
        content_type: contentType,
        cache_key: cacheKey,
        prompt_hash: promptHash,
        generated_content: content
      });

      if (brandId && userId) {
        await supabase.from('ai_content_generations').insert({
          brand_id: brandId,
          user_id: userId,
          content_type: contentType,
          prompt_settings: structuredReq,
          generated_content: content,
          tokens_used: tokensUsed,
          cost_usd: cost,
          status: 'completed'
        });
      }

      return content;
    };

    if (body.structuredGeneration) {
      const structuredContent = await generateStructuredContent(body.structuredGeneration);
      return new Response(
        JSON.stringify({ success: true, content: structuredContent }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let userPrompt = prompt;

    if (contentType === 'route' && additionalContext && typeof additionalContext === 'object') {
      const ctx = additionalContext as any;

      userPrompt += `\n\n## Route Informatie:\n`;
      userPrompt += `- Afstand: ${ctx.distance || 'Onbekend'}\n`;
      userPrompt += `- Reistijd: ${ctx.duration || 'Onbekend'}\n`;

      if (ctx.waypoints && ctx.waypoints.length > 0) {
        userPrompt += `\n## Bezienswaardigheden onderweg (${ctx.waypoints.length}):\n`;
        ctx.waypoints.forEach((wp: any, idx: number) => {
          userPrompt += `${idx + 1}. ${wp.name} (km ${wp.corridorKm}, omweg ${wp.detourMinutes} min)\n`;
          if (wp.description) userPrompt += `   ${wp.description}\n`;
        });
      }

      if (routePayload?.stops && routePayload.stops.length > 0) {
        userPrompt += `\n## Leuke stops/bezienswaardigheden (${routePayload.stops.length}):\n`;
        routePayload.stops.forEach((stop: RouteStop, idx: number) => {
          userPrompt += `${idx + 1}. **${stop.name}**\n`;
          userPrompt += `   - Omweg: ${stop.detour_minutes} minuten\n`;
          if (stop.rating) userPrompt += `   - Rating: ${stop.rating}/5\n`;
          userPrompt += `   - Reden: ${stop.reason}\n`;
        });
      }

      if (ctx.eateriesOnRoute && ctx.eateriesOnRoute.length > 0) {
        userPrompt += `\n## Eetgelegenheden onderweg:\n`;
        ctx.eateriesOnRoute.forEach((eatery: any) => {
          userPrompt += `- ${eatery.name} (${eatery.vicinity})\n`;
          if (eatery.rating) userPrompt += `  Rating: ${eatery.rating}/5\n`;
        });
      }

      if (ctx.eateriesAtArrival && ctx.eateriesAtArrival.length > 0) {
        userPrompt += `\n## Eetgelegenheden bij aankomst (${ctx.to}):\n`;
        ctx.eateriesAtArrival.forEach((eatery: any) => {
          userPrompt += `- ${eatery.name} (${eatery.vicinity})\n`;
          if (eatery.rating) userPrompt += `  Rating: ${eatery.rating}/5\n`;
        });
      }
    }

    let systemPrompt = options.systemPrompt || getSystemPrompt(contentType);
    let modelToUse = options.model || 'gpt-4o';
    let temperatureToUse = options.temperature ?? 0.7;
    let maxTokensToUse = options.maxTokens || 2000;

    if (gptModel && gptModel.system_prompt) {
      console.log('[GPT] Using operator GPT instructions from database');
      systemPrompt = gptModel.system_prompt
        .replace('{WRITING_STYLE}', writingStyle)
        .replace('{VACATION_TYPE}', options.vacationType || 'algemene')
        .replace('{DESTINATION}', options.destination || '')
        .replace('{ROUTE_TYPE_INSTRUCTION}', getRouteInstruction(options.routeType || ''))
        .replace('{TIME_BUDGET}', options.days || '');

      if (gptModel.model) modelToUse = gptModel.model;
      if (gptModel.temperature) temperatureToUse = gptModel.temperature;
      if (gptModel.max_tokens) maxTokensToUse = gptModel.max_tokens;

      console.log('[GPT] Model:', modelToUse);
      console.log('[GPT] Temperature:', temperatureToUse);
      console.log('[GPT] Max tokens:', maxTokensToUse);
    } else {
      console.log('[GPT] No operator instructions found, using fallback prompt');
    }

    if (userId) {
      const creditResult = await deductCredits(
        supabase,
        userId,
        'ai_content_generation',
        `AI content: ${contentType}`,
        { contentType, prompt: prompt.substring(0, 100) }
      );

      if (!creditResult.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: creditResult.error || 'Failed to deduct credits'
          }),
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: temperatureToUse,
        max_tokens: maxTokensToUse,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ content }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});