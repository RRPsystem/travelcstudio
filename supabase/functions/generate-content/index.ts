import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
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

    const { data: settings } = await supabase
      .from('api_settings')
      .select('api_key')
      .eq('provider', 'OpenAI')
      .maybeSingle();

    if (!settings?.api_key) {
      throw new Error('OpenAI API key not configured');
    }

    const openaiApiKey = settings.api_key;

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

    async function fetchCompleteRoute(
      origin: string,
      destination: string,
      routeType: string = 'snelle-route',
      timeBudget?: string
    ) {
      const { data: googleSettings } = await supabase
        .from('api_settings')
        .select('api_key')
        .eq('service_name', 'Google Maps API')
        .eq('is_active', true)
        .maybeSingle();

      if (!googleSettings?.api_key) {
        throw new Error('ROUTE_CALCULATION_FAILED: Google Maps API key not configured');
      }

      const googleMapsApiKey = googleSettings.api_key;
      const originLower = origin.toLowerCase();
      const destLower = destination.toLowerCase();

      console.log(`🔍 Route detection: "${originLower}" → "${destLower}"`);
      console.log(`   Route type: "${routeType}"`);

      const corridorWaypoints: Record<string, { pattern: RegExp; waypoint: string; type: string }> = {
        'sf_yosemite_scenic': {
          pattern: /san francisco.*?(yosemite|mariposa)|yosemite.*?san francisco/i,
          waypoint: 'Casa de Fruta, CA',
          type: 'scenic'
        },
        'sf_yosemite_fast': {
          pattern: /san francisco.*?(yosemite|mariposa)|yosemite.*?san francisco/i,
          waypoint: 'Merced, CA',
          type: 'fast'
        },
        'la_vegas': {
          pattern: /los angeles.*?las vegas|las vegas.*?los angeles/i,
          waypoint: 'Barstow, CA',
          type: 'fast'
        },
        'sf_la_pch': {
          pattern: /san francisco.*?los angeles|los angeles.*?san francisco/i,
          waypoint: 'Big Sur, CA',
          type: 'scenic'
        }
      };

      let selectedWaypoint: string | undefined;
      for (const [key, config] of Object.entries(corridorWaypoints)) {
        const routeText = `${originLower} ${destLower}`;
        if (config.pattern.test(routeText)) {
          if (routeType === 'toeristische-route' && config.type === 'scenic') {
            selectedWaypoint = config.waypoint;
            console.log(`✅ WAYPOINT MATCH: ${key} → adding ${selectedWaypoint} waypoint`);
            break;
          } else if ((routeType === 'snelle-route' || routeType === 'gemengd') && config.type === 'fast') {
            selectedWaypoint = config.waypoint;
            console.log(`✅ WAYPOINT MATCH: ${key} → adding ${selectedWaypoint} waypoint`);
            break;
          }
        }
      }

      if (!selectedWaypoint) {
        console.log(`ℹ️ No waypoint match for this corridor`);
      }

      console.log(`📤 Sending Google Routes API request...`);
      console.log(`   Origin: ${origin}`);
      console.log(`   Destination: ${destination}`);
      if (selectedWaypoint) {
        console.log(`   Waypoints: ${selectedWaypoint}`);
      }

      const requestBody: any = {
        origin: {
          address: origin
        },
        destination: {
          address: destination
        },
        travelMode: 'DRIVE',
        routingPreference: routeType === 'toeristische-route' ? 'TRAFFIC_AWARE' : 'TRAFFIC_AWARE_OPTIMAL',
        computeAlternativeRoutes: false,
        routeModifiers: {
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: false
        },
        languageCode: 'nl-NL',
        units: 'METRIC'
      };

      if (selectedWaypoint) {
        requestBody.intermediates = [{
          address: selectedWaypoint
        }];
      }

      const routesResponse = await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleMapsApiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline,routes.legs.steps.navigationInstruction,routes.legs.steps.localizedValues,routes.legs.polyline'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!routesResponse.ok) {
        const errorText = await routesResponse.text();
        console.error('❌ Google Routes API error:', errorText);
        throw new Error('ROUTE_CALCULATION_FAILED: Could not calculate route');
      }

      const routeData = await routesResponse.json();
      
      if (!routeData.routes || routeData.routes.length === 0) {
        console.error('❌ No routes found in response');
        throw new Error('ROUTE_CALCULATION_FAILED: No routes returned');
      }

      const route = routeData.routes[0];
      const legs = route.legs || [];
      
      console.log(`📍 Route breakdown:`);
      console.log(`   - Legs: ${legs.length}`);
      
      let allSteps: any[] = [];
      for (const leg of legs) {
        if (leg.steps) {
          allSteps = allSteps.concat(leg.steps);
        }
      }
      
      console.log(`   - Total steps: ${allSteps.length}`);

      const compressHighwaySteps = (steps: any[]): CompressedStep[] => {
        const compressed: CompressedStep[] = [];
        let currentHighway: string | null = null;
        let lastInstruction = '';

        for (const step of steps) {
          const instruction = step.navigationInstruction?.instructions || '';
          const highwayMatch = instruction.match(/(?:I-|US-|CA-|SR-)(\d+[A-Z]?)/i);
          const highway = highwayMatch ? highwayMatch[0] : null;

          if (highway && highway !== currentHighway) {
            if (currentHighway) {
              compressed.push({
                instruction: lastInstruction,
                highway: currentHighway
              });
            }
            currentHighway = highway;
            lastInstruction = instruction;
          } else if (!highway && currentHighway) {
            compressed.push({
              instruction: lastInstruction,
              highway: currentHighway
            });
            currentHighway = null;
          }

          if (!highway) {
            lastInstruction = instruction;
          }
        }

        if (currentHighway) {
          compressed.push({
            instruction: lastInstruction,
            highway: currentHighway
          });
        }

        return compressed;
      };

      const compressedSteps = compressHighwaySteps(allSteps);
      console.log(`   - Compressed to: ${compressedSteps.length} highway segments`);
      
      const highways = compressedSteps.map(s => s.highway).join(' → ');
      console.log(`   - Highways: ${highways}`);

      let polyline = route.polyline?.encodedPolyline;
      if (!polyline && legs.length > 0) {
        polyline = legs[0].polyline?.encodedPolyline;
      }

      if (!polyline) {
        console.error('❌ No polyline found in route response');
        throw new Error('ROUTE_CALCULATION_FAILED: No polyline in route');
      }

      const decodedPolyline = decodePolyline(polyline);
      console.log(`🗺️ Decoded polyline: ${decodedPolyline.length} coordinates`);

      const origin_location = decodedPolyline[0];
      const destination_location = decodedPolyline[decodedPolyline.length - 1];

      const searchPoints: Array<{ lat: number; lng: number }> = [];
      
      if (decodedPolyline.length > 0) {
        const segments = 7;
        const step = Math.floor(decodedPolyline.length / (segments + 1));
        
        console.log(`📍 Sampling every ${step} coordinates (target: ${segments} points)`);
        
        for (let i = 1; i <= segments; i++) {
          const idx = Math.min(i * step, decodedPolyline.length - 1);
          searchPoints.push(decodedPolyline[idx]);
        }
        
        console.log(`✅ Generated ${searchPoints.length} search points from polyline`);
      } else {
        console.log(`⚠️ Polyline too short, using linear interpolation`);
        const originLat = origin_location.lat;
        const originLng = origin_location.lng;
        const destLat = destination_location.lat;
        const destLng = destination_location.lng;
        
        const segments = 7;
        for (let i = 1; i <= segments; i++) {
          const ratio = i / (segments + 1);
          searchPoints.push({
            lat: originLat + (destLat - originLat) * ratio,
            lng: originLng + (destLng - originLng) * ratio
          });
        }
      }

      console.log(`🗺️ Searching along ${searchPoints.length} points from ${origin_location.lat.toFixed(2)},${origin_location.lng.toFixed(2)} to ${destination_location.lat.toFixed(2)},${destination_location.lng.toFixed(2)}`);

      const allStops: RouteStop[] = [];
      const seenPlaceIds = new Set<string>();

      for (const point of searchPoints) {
        const searchResponse = await fetch(
          `https://places.googleapis.com/v1/places:searchNearby`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': googleMapsApiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.types'
            },
            body: JSON.stringify({
              locationRestriction: {
                circle: {
                  center: { latitude: point.lat, longitude: point.lng },
                  radius: 8000
                }
              },
              includedTypes: [
                'tourist_attraction', 'park', 'museum', 'playground',
                'cafe', 'restaurant', 'bakery', 'natural_feature',
                'hiking_area', 'garden', 'art_gallery', 'aquarium', 'zoo',
                'church', 'amusement_park', 'shopping_mall'
              ],
              maxResultCount: 20
            })
          }
        );

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error(`❌ Places API error at point ${point.lat.toFixed(2)},${point.lng.toFixed(2)}: ${searchResponse.status}`, errorText);
          continue;
        }

        const placesData = await searchResponse.json();
        const places = placesData.places || [];
        
        console.log(`📍 Point ${point.lat.toFixed(2)},${point.lng.toFixed(2)}: found ${places.length} candidates${places.length > 0 ? ` (first: ${places[0].displayName?.text || 'unknown'})` : ''}`);

        for (const place of places) {
          if (seenPlaceIds.has(place.id)) continue;
          seenPlaceIds.add(place.id);

          if (!place.rating || place.rating < 3.5) continue;
          if (!place.userRatingCount || place.userRatingCount < 10) continue;

          const detour = Math.abs(place.location.latitude - point.lat) * 111 + 
                        Math.abs(place.location.longitude - point.lng) * 85;
          const detourMinutes = Math.round(detour * 2);

          allStops.push({
            name: place.displayName?.text || 'Unknown',
            place_id: place.id,
            types: place.types || [],
            rating: place.rating,
            detour_minutes: detourMinutes,
            reason: `Highly rated ${place.types?.[0]?.replace(/_/g, ' ') || 'attraction'}`,
            location: {
              lat: place.location.latitude,
              lng: place.location.longitude
            }
          });
        }
      }

      console.log(`🔍 Found ${allStops.length} candidate stops (deduplicated)`);

      if (allStops.length === 0) {
        console.warn(`⚠️ NO STOPS FOUND - but continuing with route only`);
        console.warn(`   - Search points: ${searchPoints.length}`);
        console.warn(`   - Polyline provided: ${polyline ? 'YES' : 'NO'}`);
      }

      allStops.sort((a, b) => {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (Math.abs(ratingDiff) > 0.5) return ratingDiff;
        return a.detour_minutes - b.detour_minutes;
      });

      const normalizedTimeBudget = timeBudget?.replace(/-/g, ' ').trim().toLowerCase();
      const is1Day = normalizedTimeBudget === '1 dag';

      const maxStops = is1Day ? 4 : 7;
      const minStops = is1Day ? 3 : 3;

      const diverseStops: RouteStop[] = [];
      const usedTypes = new Set<string>();
      const typeGroups = {
        nature: ['park', 'natural_feature', 'hiking_area', 'garden'],
        culture: ['museum', 'church', 'art_gallery', 'tourist_attraction'],
        food: ['cafe', 'restaurant', 'bakery'],
        family: ['playground', 'zoo', 'aquarium', 'amusement_park']
      };

      for (const stop of allStops) {
        if (diverseStops.length >= maxStops) break;

        const primaryType = stop.types[0];

        if (!usedTypes.has(primaryType)) {
          diverseStops.push(stop);
          usedTypes.add(primaryType);
        }
        else if (stop.rating && stop.rating >= 4.5 && diverseStops.length < maxStops) {
          diverseStops.push(stop);
        }
      }

      if (diverseStops.length < minStops && allStops.length >= minStops) {
        for (const stop of allStops) {
          if (diverseStops.length >= minStops) break;
          if (!diverseStops.find(s => s.place_id === stop.place_id)) {
            diverseStops.push(stop);
          }
        }
      }

      console.log(`✅ Selected ${diverseStops.length} diverse stops (${timeBudget || 'unlimited'} time budget)`);

      return {
        distance_km: Math.round(route.distanceMeters / 1000),
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
          
          console.log(JSON.stringify({
            ORIGIN: origin,
            DESTINATION: destination,
            DISTANCE_KM: routePayload.distance_km,
            DURATION_NONSTOP: routePayload.duration_nonstop,
            STEPS: routePayload.steps?.length || 0,
            STOPS: routePayload.stops?.length || 0,
            LAST_STEP: routePayload.steps?.[routePayload.steps.length - 1] || null
          }, null, 2));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          if (errorMessage.includes('ROUTE_CALCULATION_FAILED')) {
            return new Response(
              JSON.stringify({
                error: 'Er is een fout opgetreden bij het berekenen van de route',
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
        route: `Je bent een routeplanner die gedetailleerde routebeschrijvingen maakt. {ROUTE_TYPE_INSTRUCTION} Geef praktische informatie over de route, bezienswaardigheden onderweg, en reistips. Schrijf in {WRITING_STYLE} stijl voor {VACATION_TYPE} reizigers.`,
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

      if (ctx.eateriesOnRoute && ctx.eateriesOnRoute.length > 0) {
        userPrompt += `\n## Aanbevolen Eetgelegenheden onderweg (${ctx.eateriesOnRoute.length}):\n`;
        ctx.eateriesOnRoute.forEach((eat: any, idx: number) => {
          userPrompt += `${idx + 1}. ${eat.name} - ${eat.type}\n`;
          userPrompt += `   Adres: ${eat.address}\n`;
          userPrompt += `   Rating: ${eat.rating}/5 | Prijsklasse: ${'€'.repeat(eat.price_level || 2)}\n`;
          userPrompt += `   Omweg: ${eat.detour_minutes} minuten\n`;
          if (eat.kid_friendly) userPrompt += `   ⭐ Kindvriendelijk\n`;
          if (eat.note) userPrompt += `   ${eat.note}\n`;
        });
      }

      if (ctx.eateriesAtArrival && ctx.eateriesAtArrival.length > 0) {
        userPrompt += `\n## Eetgelegenheden bij aankomst (${ctx.eateriesAtArrival.length}):\n`;
        ctx.eateriesAtArrival.forEach((eat: any, idx: number) => {
          userPrompt += `${idx + 1}. ${eat.name} - ${eat.type}\n`;
          userPrompt += `   Adres: ${eat.address}\n`;
          userPrompt += `   Rating: ${eat.rating}/5 | Prijsklasse: ${'€'.repeat(eat.price_level || 2)}\n`;
          userPrompt += `   Afstand: ${Math.round(eat.distance_m || 0)}m van centrum\n`;
          if (eat.kid_friendly) userPrompt += `   ⭐ Kindvriendelijk\n`;
          if (eat.note) userPrompt += `   ${eat.note}\n`;
        });
      }

      userPrompt += `\n## Opdracht:\n`;
      userPrompt += `Schrijf een boeiende routebeschrijving in ${writingStyle} stijl voor ${options.vacationType || 'algemene'} reizigers. `;
      userPrompt += `Vermeld de bezienswaardigheden en eetgelegenheden op een natuurlijke manier in de tekst. `;
      userPrompt += `Maak het persoonlijk en aantrekkelijk.`;
    } else if (routePayload) {
      userPrompt = `
Genereer een routebeschrijving voor de volgende route:

Van: ${routePayload.origin}
Naar: ${routePayload.destination}
Afstand: ${routePayload.distance_km} km
Reistijd non-stop: ${routePayload.duration_nonstop}

${routePayload.stops && routePayload.stops.length > 0 ? `Aanbevolen stops onderweg:
${routePayload.stops.map((stop: RouteStop, i: number) =>
  `${i + 1}. ${stop.name} (${stop.rating}⭐) - ${stop.reason}`
).join('\n')}` : 'Geen stops aanbevolen voor deze route.'}

${routePayload.steps && routePayload.steps.length > 0 ? `Route overzicht:
${routePayload.steps.slice(0, 5).map((step: CompressedStep) =>
  `- ${step.highway}: ${step.instruction}`
).join('\n')}` : ''}

Schrijf een inspirerende routebeschrijving in Nederlandse taal die reizigers helpt deze route te ervaren.
`;
    } else if (additionalContext && typeof additionalContext === 'string') {
      userPrompt += `\n\nExtra context: ${additionalContext}`;
    }

    const messages = [
      {
        role: 'system',
        content: options.systemPrompt || getSystemPrompt(contentType)
      },
      {
        role: 'user',
        content: userPrompt
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'gpt-3.5-turbo',
        messages,
        max_tokens: options.maxTokens || 1500,
        temperature: options.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ content }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-content function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});