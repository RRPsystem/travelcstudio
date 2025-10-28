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
  additionalContext?: string;
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: allSettings, error: settingsError } = await supabaseClient
      .from('api_settings')
      .select('provider, service_name, api_key, metadata');

    if (settingsError) {
      console.error('Error fetching API settings:', settingsError);
      throw new Error('Failed to load API settings');
    }

    const openaiSettings = allSettings?.find(s => s.provider === 'OpenAI');
    const googleSearchSettings = allSettings?.find(s => s.provider === 'Google' && s.service_name === 'Google Custom Search');
    const googleMapsSettings = allSettings?.find(s => s.provider === 'Google' && s.service_name === 'Google Maps API');

    if (!openaiSettings?.api_key || !openaiSettings.api_key.startsWith('sk-')) {
      throw new Error('OpenAI API key not configured');
    }

    const openaiApiKey = openaiSettings.api_key;
    const googleSearchApiKey = googleSearchSettings?.api_key;
    const googleSearchEngineId = googleSearchSettings?.metadata?.search_engine_id;
    const googleMapsApiKey = googleMapsSettings?.api_key;

    const body: GenerateContentRequest = await req.json();
    const { contentType, prompt, writingStyle = 'professional', additionalContext = '', options = {} } = body;

    const { data: gptConfig, error: gptError } = await supabaseClient
      .from('gpt_models')
      .select('*')
      .eq('content_type', contentType)
      .eq('is_active', true)
      .maybeSingle();

    if (gptError) {
      console.error('Error fetching GPT config:', gptError);
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

    let systemPrompt = gptConfig?.system_prompt || options.systemPrompt || `Je bent een professionele reisschrijver die boeiende bestemmingsteksten schrijft over {DESTINATION}. Schrijf in {WRITING_STYLE} stijl voor {VACATION_TYPE} reizigers.`;

    const vacationTypeContext = options.vacationTypeDescription
      ? `${options.vacationType} (${options.vacationTypeDescription})`
      : options.vacationType || 'algemene';

    const routeTypeContext = options.routeTypeDescription
      ? `${options.routeType} (${options.routeTypeDescription})`
      : options.routeType || '';

    const daysContext = options.daysDescription
      ? `${options.days} (${options.daysDescription})`
      : options.days || '';

    systemPrompt = systemPrompt
      .replace(/{WRITING_STYLE}/g, writingStyle)
      .replace(/{VACATION_TYPE}/g, vacationTypeContext)
      .replace(/{ROUTE_TYPE}/g, routeTypeContext)
      .replace(/{ROUTE_TYPE_INSTRUCTION}/g, getRouteInstruction(options.routeType || ''))
      .replace(/{DAYS}/g, daysContext)
      .replace(/{DESTINATION}/g, options.destination || '');

    const compressSteps = (steps: any[]): CompressedStep[] => {
      const highwayRegex = /(I-\d+|US-\d+|[A-Z]{2}-\d+|A\d+|E\d+|N\d+|B\d+|L\d+|Gerlos|Nassfeld|Predil|Vršič|Soča)/gi;
      const compressed: CompressedStep[] = [];

      for (const step of steps) {
        const instruction = step.navigationInstruction?.instructions || step.html_instructions || '';
        const cleanInstruction = instruction.replace(/<[^>]*>/g, '');

        if (
          cleanInstruction.toLowerCase().includes('turn left') ||
          cleanInstruction.toLowerCase().includes('turn right') ||
          cleanInstruction.toLowerCase().includes('roundabout') ||
          cleanInstruction.toLowerCase().includes('street') ||
          cleanInstruction.toLowerCase().includes('continue straight')
        ) {
          continue;
        }

        const matches = instruction.match(highwayRegex);

        if (matches && matches.length > 0) {
          const highway = matches[0];

          if (compressed.length === 0 || compressed[compressed.length - 1].highway !== highway) {
            compressed.push({
              instruction: cleanInstruction,
              highway: highway
            });
          }
        }
      }

      if (steps.length > 0) {
        const lastStep = steps[steps.length - 1];
        const lastInstruction = lastStep.navigationInstruction?.instructions || lastStep.html_instructions || '';
        const cleanLast = lastInstruction.replace(/<[^>]*>/g, '');

        if (
          (cleanLast.toLowerCase().includes('destination') ||
           cleanLast.toLowerCase().includes('arrive') ||
           cleanLast.toLowerCase().includes('visitor center') ||
           cleanLast.toLowerCase().includes('entrance')) &&
          !compressed.some(s => s.instruction === cleanLast)
        ) {
          compressed.push({
            instruction: cleanLast,
            highway: 'ARRIVAL'
          });
        }
      }

      return compressed.slice(0, 6);
    };

    const calculateDetour = async (currentLat: number, currentLng: number, placeLat: number, placeLng: number, destLat: number, destLng: number): Promise<number> => {
      if (!googleMapsApiKey) return 999;

      try {
        const detourResponse = await fetch(
          `https://routes.googleapis.com/directions/v2:computeRoutes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': googleMapsApiKey,
              'X-Goog-FieldMask': 'routes.duration'
            },
            body: JSON.stringify({
              origin: { location: { latLng: { latitude: currentLat, longitude: currentLng } } },
              destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
              intermediates: [{ location: { latLng: { latitude: placeLat, longitude: placeLng } } }],
              travelMode: 'DRIVE',
              routingPreference: 'TRAFFIC_UNAWARE'
            })
          }
        );

        if (!detourResponse.ok) return 999;

        const detourData = await detourResponse.json();
        const detourDuration = parseInt(detourData.routes?.[0]?.duration?.replace('s', '') || '0');

        const directResponse = await fetch(
          `https://routes.googleapis.com/directions/v2:computeRoutes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': googleMapsApiKey,
              'X-Goog-FieldMask': 'routes.duration'
            },
            body: JSON.stringify({
              origin: { location: { latLng: { latitude: currentLat, longitude: currentLng } } },
              destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
              travelMode: 'DRIVE',
              routingPreference: 'TRAFFIC_UNAWARE'
            })
          }
        );

        if (!directResponse.ok) return 999;

        const directData = await directResponse.json();
        const directDuration = parseInt(directData.routes?.[0]?.duration?.replace('s', '') || '0');

        return Math.round((detourDuration - directDuration) / 60);
      } catch (error) {
        console.error('Detour calculation error:', error);
        return 999;
      }
    };

    const findRouteStops = async (originLat: number, originLng: number, destLat: number, destLng: number, routeType: string, timeBudget?: string, polyline?: any): Promise<RouteStop[]> => {
      if (!googleMapsApiKey) return [];

      try {
        // Create search points along the route
        const searchPoints: Array<{lat: number, lng: number}> = [];

        // For California routes, use known corridor points instead of straight line
        // SF→Mariposa typically goes: SF → Livermore → Modesto → Merced → Mariposa
        const distance = Math.sqrt(
          Math.pow(destLat - originLat, 2) + Math.pow(destLng - originLng, 2)
        );

        // Use more segments for longer routes
        const segments = distance > 2.0 ? 7 : 5;

        // Sample points along straight line (will be improved with polyline decoding)
        for (let i = 1; i <= segments; i++) {
          const ratio = i / (segments + 1);
          searchPoints.push({
            lat: originLat + (destLat - originLat) * ratio,
            lng: originLng + (destLng - originLng) * ratio
          });
        }

        console.log(`🗺️ Searching along ${segments} points from ${originLat.toFixed(2)},${originLng.toFixed(2)} to ${destLat.toFixed(2)},${destLng.toFixed(2)}`);

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
                    radius: 15000
                  }
                },
                maxResultCount: 20
              })
            }
          );

          if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            console.error(`❌ Places API error at point ${point.lat.toFixed(2)},${point.lng.toFixed(2)}: ${searchResponse.status}`, errorText);
            continue;
          }

          const searchData = await searchResponse.json();
          const candidates = searchData.places || [];
          console.log(`📍 Point ${point.lat.toFixed(2)},${point.lng.toFixed(2)}: found ${candidates.length} candidates`);

          for (const place of candidates) {
            if (seenPlaceIds.has(place.id)) continue;

            const placeLat = place.location?.latitude;
            const placeLng = place.location?.longitude;

            if (!placeLat || !placeLng) continue;

            // Include ALL places - let selection logic handle quality
            allStops.push({
              name: place.displayName?.text || 'Unknown',
              place_id: place.id,
              types: place.types || [],
              rating: place.rating || 0,
              detour_minutes: 10,
              reason: `${place.displayName?.text || 'Stop'} langs de route`,
              location: {
                lat: placeLat,
                lng: placeLng
              }
            });
            seenPlaceIds.add(place.id);
          }
        }

        console.log(`\ud83d\udd0d Found ${allStops.length} candidate stops (deduplicated)`);

        allStops.sort((a, b) => {
          const ratingDiff = (b.rating || 0) - (a.rating || 0);
          if (Math.abs(ratingDiff) > 0.5) return ratingDiff;
          return a.detour_minutes - b.detour_minutes;
        });

        const diverseStops: RouteStop[] = [];
        const usedTypes = new Set<string>();

        for (const stop of allStops) {
          const primaryType = stop.types[0];

          if (!usedTypes.has(primaryType) || (stop.rating && stop.rating >= 4.5)) {
            diverseStops.push(stop);
            usedTypes.add(primaryType);
          }

          if (timeBudget === '1 dag' && diverseStops.length >= 3) break;
          if (diverseStops.length >= 5) break;
        }

        console.log(`\u2705 Selected ${diverseStops.length} diverse stops (max ${timeBudget === '1 dag' ? '3-4' : '4-5'} for time budget)`);

        return diverseStops;
      } catch (error) {
        console.error('Route stops error:', error);
        return [];
      }
    };

    const fetchGoogleSearch = async (query: string): Promise<string> => {
      if (!googleSearchApiKey || !googleSearchEngineId) {
        console.log('\u26a0\ufe0f Google Search not configured');
        return '';
      }

      try {
        const response = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${googleSearchApiKey}&cx=${googleSearchEngineId}&q=${encodeURIComponent(query)}&num=3`
        );

        if (!response.ok) {
          console.error('Google Search API error:', response.status);
          return '';
        }

        const data = await response.json();
        const results = data.items?.slice(0, 3).map((item: any) =>
          `${item.title}: ${item.snippet}`
        ).join('\n\n') || '';

        console.log(`\u2705 Google Search results fetched for: ${query}`);
        return results;
      } catch (error) {
        console.error('Google Search error:', error);
        return '';
      }
    };

    const fetchCompleteRoute = async (origin: string, destination: string, routeType: string, timeBudget?: string): Promise<any> => {
      if (!googleMapsApiKey) {
        console.log('\u26a0\ufe0f Google Maps not configured');
        return null;
      }

      try {
        let routeModifiers: any = {};
        let routingPreference = 'TRAFFIC_UNAWARE';

        if (routeType === 'snelle-route') {
          routeModifiers.avoidHighways = false;
          routeModifiers.avoidTolls = false;
          routingPreference = 'TRAFFIC_AWARE_OPTIMAL';
        } else if (routeType === 'toeristische-route') {
          routeModifiers.avoidHighways = true;
          routeModifiers.avoidTolls = false;
        } else if (routeType === 'gemengd') {
          routeModifiers.avoidHighways = false;
          routeModifiers.avoidTolls = false;
        }

        const response = await fetch(
          `https://routes.googleapis.com/directions/v2:computeRoutes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': googleMapsApiKey,
              'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs.steps.navigationInstruction,routes.legs.steps.localizedValues,routes.legs.startLocation,routes.legs.endLocation,routes.polyline'
            },
            body: JSON.stringify({
              origin: { address: origin },
              destination: { address: destination },
              travelMode: 'DRIVE',
              routingPreference,
              routeModifiers: Object.keys(routeModifiers).length > 0 ? routeModifiers : undefined,
              languageCode: 'nl'
            })
          }
        );

        if (!response.ok) {
          console.error('Google Routes API error:', response.status, await response.text());
          return null;
        }

        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs?.[0];

          if (!leg) return null;

          const compressedSteps = compressSteps(leg.steps || []);

          const originLoc = leg.startLocation.latLng;
          const destLoc = leg.endLocation.latLng;
          const stops = await findRouteStops(
            originLoc.latitude,
            originLoc.longitude,
            destLoc.latitude,
            destLoc.longitude,
            routeType,
            timeBudget,
            route.polyline
          );

          const durationSeconds = parseInt(route.duration.replace('s', ''));
          const durationNoStops = Math.round(durationSeconds / 60);
          const estimatedStopTime = stops.length * 30;
          const durationWithStops = durationNoStops + estimatedStopTime;

          const routeLine = compressedSteps.map(s => s.highway).filter(h => h !== 'ARRIVAL').join(' \u2192 ');

          const payload = {
            ORIGIN: origin,
            DESTINATION: destination,
            DISTANCE_KM: (route.distanceMeters / 1000).toFixed(0),
            DURATION_NOSTOPS: `\u00b1${Math.floor(durationNoStops / 60)}u ${durationNoStops % 60}min`,
            DURATION_WITH_STOPS: `\u00b1${Math.floor(durationWithStops / 60)}\u2013${Math.floor(durationWithStops / 60) + 1}u`,
            ROUTE_LINE: routeLine,
            STEPS: compressedSteps.map(s => s.instruction),
            STOPS: stops.map(s => s.name),
            EATERIES: [],
            LODGINGS: [],
            SEASON_ALERTS: [],
            HOP_ON_HOP_OFF_AVAILABLE: false,
            TIME_BUDGET: timeBudget || '',
            SCENIC_LOOP: routeType === 'gemengd' ? {
              description: 'Voor een mooie scenic lus: neem afslag bij [punt X], volg [wegcode], sluit weer aan bij [wegcode]',
              start: 'TBD',
              end: 'TBD',
              roads: 'TBD'
            } : null
          };

          console.log('\n\ud83d\udce6 PAYLOAD TO LLM:');
          console.log(JSON.stringify(payload, null, 2));
          console.log(`\n\ud83d\udcca QA: steps=${compressedSteps.length}, stops=${stops.length}, last_step="${compressedSteps[compressedSteps.length - 1]?.instruction || 'N/A'}"`);

          return payload;
        }

        return null;
      } catch (error) {
        console.error('Complete route fetch error:', error);
        return null;
      }
    };

    const fetchPlacesInfo = async (destination: string): Promise<string> => {
      if (!googleMapsApiKey) {
        console.log('\u26a0\ufe0f Google Places not configured');
        return '';
      }

      try {
        const response = await fetch(
          `https://places.googleapis.com/v1/places:searchText`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': googleMapsApiKey,
              'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.editorialSummary'
            },
            body: JSON.stringify({
              textQuery: destination,
              languageCode: 'nl'
            })
          }
        );

        if (!response.ok) {
          console.error('Google Places API error:', response.status, await response.text());
          return '';
        }

        const data = await response.json();

        if (data.places && data.places.length > 0) {
          const place = data.places[0];

          let placeInfo = `\n\ud83d\udccd ${place.displayName?.text || destination}`;
          if (place.formattedAddress) placeInfo += `\n\ud83d\udcee Adres: ${place.formattedAddress}`;
          if (place.rating) placeInfo += `\n\u2b50 Rating: ${place.rating}/5 (${place.userRatingCount || 0} reviews)`;
          if (place.editorialSummary) placeInfo += `\n\ud83d\udcdd ${place.editorialSummary.text}`;
          if (place.types) placeInfo += `\n\ud83c\udff7\ufe0f Type: ${place.types.slice(0, 3).join(', ')}`;

          console.log(`\u2705 Google Places API: ${destination}`);
          return placeInfo;
        }

        return '';
      } catch (error) {
        console.error('Google Places API error:', error);
        return '';
      }
    };

    let realTimeContext = '';
    let routePayload: any = null;

    if (contentType === 'destination') {
      const placesInfo = await fetchPlacesInfo(prompt);
      if (placesInfo) {
        realTimeContext = placesInfo;
      }

      const searchQuery = `${prompt} travel guide tips 2024`;
      const searchResults = await fetchGoogleSearch(searchQuery);
      if (searchResults) {
        realTimeContext += `\n\nReisinfo van web:\n${searchResults}`;
      }
    } else if (contentType === 'route') {
      const routeMatch = prompt.match(/van\s+(.+?)\s+naar\s+(.+)/i) || prompt.match(/from\s+(.+?)\s+to\s+(.+)/i);
      if (routeMatch) {
        const origin = routeMatch[1].trim();
        const destination = routeMatch[2].trim();

        routePayload = await fetchCompleteRoute(origin, destination, options.routeType || 'snelle-route', options.days);
      }
    } else if (contentType === 'planning') {
      const placesInfo = await fetchPlacesInfo(prompt);
      if (placesInfo) {
        realTimeContext = placesInfo;
      }

      const searchQuery = `${prompt} dagplanning activiteiten 2024`;
      const searchResults = await fetchGoogleSearch(searchQuery);
      if (searchResults) {
        realTimeContext += `\n\nActiviteiten info:\n${searchResults}`;
      }
    } else if (contentType === 'hotel') {
      const searchQuery = `${prompt} hotels accommodatie 2024`;
      realTimeContext = await fetchGoogleSearch(searchQuery);
    }

    let userPrompt = prompt;

    if (contentType === 'destination') {
      userPrompt = `Schrijf een volledige bestemmingstekst over: ${prompt}`;
    } else if (contentType === 'route') {
      if (routePayload) {
        const stopsCount = routePayload.STOPS.length;

        if (stopsCount === 0) {
          // No stops found - create a basic route description WITHOUT inventing stops
          userPrompt = `Schrijf een routebeschrijving van ${routePayload.ORIGIN} naar ${routePayload.DESTINATION}.\n\nROUTE GEGEVENS:\n- Afstand: ${routePayload.DISTANCE_KM} km\n- Reistijd: ${routePayload.DURATION_NOSTOPS}\n- Route: ${routePayload.ROUTE_LINE}\n\nKRITIEKE INSTRUCTIE:\nEr zijn GEEN specifieke stops gevonden voor deze route. Schrijf daarom een KORTE, EENVOUDIGE routebeschrijving met:\n\n1. Een korte intro (2-3 zinnen) over de route\n2. Route-overzicht met afstand en reistijd\n3. De hoofdwegen die je neemt (uit ROUTE_LINE)\n4. Algemene tips (beste vertrektijd, tankstations, etc.)\n\nVerzin GEEN stops, plaatsen of attracties. Houd het simpel en feitelijk. Max 200 woorden.`;
        } else {
          userPrompt = `BELANGRIJKE INSTRUCTIE: Je krijgt hieronder ${stopsCount} concrete stops. Gebruik de EXACTE namen. Verzin GEEN extra plaatsen.\n\nROUTE GEGEVENS:\n- ORIGIN: ${routePayload.ORIGIN}\n- DESTINATION: ${routePayload.DESTINATION}\n- DISTANCE_KM: ${routePayload.DISTANCE_KM}\n- DURATION_NOSTOPS: ${routePayload.DURATION_NOSTOPS}\n- DURATION_WITH_STOPS: ${routePayload.DURATION_WITH_STOPS}\n- ROUTE_LINE: ${routePayload.ROUTE_LINE}\n${routePayload.TIME_BUDGET ? `- TIME_BUDGET: ${routePayload.TIME_BUDGET}\n` : ''}\nSTOPS (${stopsCount} stops - gebruik deze EXACTE namen):\n${routePayload.STOPS.map((stop: string, i: number) => `${i + 1}. "${stop}"`).join('\n')}\n\nOPDRACHT:\nSchrijf een volledige routebeschrijving volgens de structuur in je system prompt.\n- Gebruik voor ELKE stop hierboven een sectie in "Routebeschrijving & tussenstops"\n- Gebruik de EXACTE naam zoals hierboven staat (bijv. als er staat "Livermore", schrijf dan "Livermore")\n- Bedenk zelf sfeervolle beschrijvingen, activiteiten, eettips en weetjes voor elke stop\n- Maak het levendig en praktisch\n- Verzin GEEN extra stops die niet in bovenstaande lijst staan\n${routePayload.SCENIC_LOOP ? `\nSCENIC LOOP info (voor Mix variant):\n${routePayload.SCENIC_LOOP.description}` : ''}`;
        }
      } else {
        userPrompt = `Schrijf een volledige routebeschrijving voor: ${prompt}`;
      }
    } else if (contentType === 'planning') {
      userPrompt = `Maak een volledige dagplanning voor: ${prompt}`;
    } else if (contentType === 'hotel') {
      userPrompt = `Geef een volledig hotel overzicht voor: ${prompt}`;
    }

    if (realTimeContext && contentType !== 'route') {
      userPrompt += `\n\n=== ACTUELE INFORMATIE (Gebruik deze data!) ===\n${realTimeContext}\n=== EINDE ACTUELE INFORMATIE ===`;
    }

    if (additionalContext) {
      userPrompt += `\n\nExtra context: ${additionalContext}`;
    }

    const modelToUse = options.model || gptConfig?.model || 'gpt-3.5-turbo';
    const maxTokens = options.maxTokens || gptConfig?.max_tokens || 1500;
    const temperature = options.temperature !== undefined ? options.temperature : (gptConfig?.temperature || 0.7);

    console.log(`\n\ud83c\udfaf Using GPT config: ${gptConfig?.name || 'default'} (${modelToUse})`);
    console.log(`\ud83d\udcdd Writing Style: "${writingStyle}"`);
    console.log(`\ud83c\udfd6\ufe0f Vacation Type: "${vacationTypeContext}"`);
    console.log(`\ud83d\udcc5 Days: "${daysContext}"`);
    console.log(`\ud83d\udee3\ufe0f Route Type: "${routeTypeContext}"`);
    console.log(`\n\ud83c\udf10 Google APIs Status:`);
    console.log(`  - Google Search: ${googleSearchApiKey ? '\u2705' : '\u274c'}`);
    console.log(`  - Google Places API (New): ${googleMapsApiKey ? '\u2705' : '\u274c'}`);
    console.log(`  - Google Routes API: ${googleMapsApiKey ? '\u2705' : '\u274c'}`);

    if (gptConfig) {
      await supabaseClient
        .from('gpt_models')
        .update({
          usage_count: (gptConfig.usage_count || 0) + 1,
          last_used: new Date().toISOString()
        })
        .eq('id', gptConfig.id);
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API Error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    const content = data.choices[0]?.message?.content || 'Geen response ontvangen van OpenAI';

    return new Response(
      JSON.stringify({ content }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in generate-content function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});