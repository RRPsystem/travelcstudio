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

    const decodePolyline = (encoded: string): Array<{lat: number, lng: number}> => {
      const coordinates: Array<{lat: number, lng: number}> = [];
      let index = 0;
      let lat = 0;
      let lng = 0;

      while (index < encoded.length) {
        let shift = 0;
        let result = 0;
        let byte: number;

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
        // Create search points along the ACTUAL route polyline
        const searchPoints: Array<{lat: number, lng: number}> = [];

        if (polyline?.encodedPolyline) {
          // Decode the polyline to get actual route coordinates
          try {
            const decoded = decodePolyline(polyline.encodedPolyline);
            console.log(`🗺️ Decoded polyline: ${decoded.length} coordinates`);

            if (decoded.length === 0) {
              console.error('❌ Polyline decoded to 0 coordinates!');
              throw new Error('Empty polyline');
            }

            // Sample evenly along the route (every ~14% of the route = 7 points)
            const sampleInterval = Math.max(1, Math.floor(decoded.length / 7));
            console.log(`📍 Sampling every ${sampleInterval} coordinates (target: 7 points)`);

            for (let i = sampleInterval; i < decoded.length; i += sampleInterval) {
              searchPoints.push(decoded[i]);
            }

            console.log(`✅ Generated ${searchPoints.length} search points from polyline`);
          } catch (error) {
            console.error('❌ Polyline decode error:', error);
            console.log('⚠️ Falling back to straight line');

            // Fallback to straight line
            const distance = Math.sqrt(
              Math.pow(destLat - originLat, 2) + Math.pow(destLng - originLng, 2)
            );
            const segments = distance > 2.0 ? 7 : 5;

            for (let i = 1; i <= segments; i++) {
              const ratio = i / (segments + 1);
              searchPoints.push({
                lat: originLat + (destLat - originLat) * ratio,
                lng: originLng + (destLng - originLng) * ratio
              });
            }
          }
        } else {
          // Fallback: straight line interpolation
          console.log('⚠️ No polyline provided, using straight line');
          const distance = Math.sqrt(
            Math.pow(destLat - originLat, 2) + Math.pow(destLng - originLng, 2)
          );
          const segments = distance > 2.0 ? 7 : 5;

          for (let i = 1; i <= segments; i++) {
            const ratio = i / (segments + 1);
            searchPoints.push({
              lat: originLat + (destLat - originLat) * ratio,
              lng: originLng + (destLng - originLng) * ratio
            });
          }
        }

        console.log(`🗺️ Searching along ${searchPoints.length} points from ${originLat.toFixed(2)},${originLng.toFixed(2)} to ${destLat.toFixed(2)},${destLng.toFixed(2)}`);

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
                  'tourist_attraction', 'park', 'viewpoint', 'museum', 'playground',
                  'cafe', 'restaurant', 'bakery', 'landmark', 'beach', 'lake',
                  'waterfall', 'castle', 'garden', 'art_gallery', 'aquarium', 'zoo'
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

          const searchData = await searchResponse.json();
          const candidates = searchData.places || [];
          console.log(`📍 Point ${point.lat.toFixed(2)},${point.lng.toFixed(2)}: found ${candidates.length} candidates${candidates.length > 0 ? ` (first: ${candidates[0].displayName?.text || 'unknown'})` : ''}`);

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

        if (allStops.length === 0) {
          console.error(`❌ NO STOPS FOUND! This is the problem.`);
          console.error(`   - Search points: ${searchPoints.length}`);
          console.error(`   - Polyline provided: ${polyline?.encodedPolyline ? 'YES' : 'NO'}`);
          return [];
        }

        allStops.sort((a, b) => {
          const ratingDiff = (b.rating || 0) - (a.rating || 0);
          if (Math.abs(ratingDiff) > 0.5) return ratingDiff;
          return a.detour_minutes - b.detour_minutes;
        });

        // BOLT requirements: TIME_BUDGET limits + diversity
        // Handle both "1-dag" and "1 dag" formats
        const normalizedTimeBudget = timeBudget?.replace(/-/g, ' ').trim().toLowerCase();
        const is1Day = normalizedTimeBudget === '1 dag';

        const maxStops = is1Day ? 4 : 7;
        const minStops = is1Day ? 3 : 3;

        const diverseStops: RouteStop[] = [];
        const usedTypes = new Set<string>();
        const typeGroups = {
          nature: ['park', 'viewpoint', 'beach', 'lake', 'waterfall', 'garden'],
          culture: ['museum', 'castle', 'landmark', 'art_gallery', 'tourist_attraction'],
          food: ['cafe', 'restaurant', 'bakery'],
          family: ['playground', 'zoo', 'aquarium']
        };

        // First pass: ensure diversity across type groups
        for (const stop of allStops) {
          if (diverseStops.length >= maxStops) break;

          const primaryType = stop.types[0];

          // Add if we haven't used this exact type yet
          if (!usedTypes.has(primaryType)) {
            diverseStops.push(stop);
            usedTypes.add(primaryType);
          }
          // Or add high-rated attractions even if type is duplicate
          else if (stop.rating && stop.rating >= 4.5 && diverseStops.length < maxStops) {
            diverseStops.push(stop);
          }
        }

        console.log(`\u2705 Selected ${diverseStops.length} diverse stops (min ${minStops}, max ${maxStops} for "${timeBudget || 'no limit'}")`);

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
          // Fast route: use highways, optimize for time
          routeModifiers.avoidHighways = false;
          routeModifiers.avoidTolls = false;
          routingPreference = 'TRAFFIC_AWARE_OPTIMAL';
        } else if (routeType === 'toeristische-route') {
          // Scenic route: prefer scenic roads but DON'T avoid highways completely (Google interprets this wrong)
          // Instead, use TRAFFIC_UNAWARE to get scenic alternatives
          routeModifiers.avoidHighways = false; // Changed from true
          routeModifiers.avoidTolls = false;
          routingPreference = 'TRAFFIC_UNAWARE';
        } else if (routeType === 'gemengd') {
          // Mixed: balance speed and scenery
          routeModifiers.avoidHighways = false;
          routeModifiers.avoidTolls = false;
          routingPreference = 'TRAFFIC_UNAWARE';
        }

        // Add waypoints for known corridors to guide Google Routes API
        const intermediates: any[] = [];
        const originLower = origin.toLowerCase();
        const destLower = destination.toLowerCase();

        console.log(`🔍 Route detection: "${originLower}" → "${destLower}"`);
        console.log(`   Route type: "${routeType}"`);

        // SF/Bay Area → Yosemite area: force via Central Valley
        if (
          (originLower.includes('san francisco') || originLower.includes('oakland') || originLower.includes('san jose')) &&
          (destLower.includes('mariposa') || destLower.includes('yosemite'))
        ) {
          if (routeType === 'toeristische-route') {
            // Scenic: via Pacheco Pass (CA-152)
            console.log('✅ WAYPOINT MATCH: SF→Yosemite scenic → adding Casa de Fruta waypoint');
            intermediates.push({ address: 'Casa de Fruta, CA' });
          } else {
            // Fast/Mixed: via Merced (CA-99)
            console.log('✅ WAYPOINT MATCH: SF→Yosemite fast → adding Merced waypoint');
            intermediates.push({ address: 'Merced, CA' });
          }
        } else {
          console.log('ℹ️ No waypoint match for this corridor');
        }

        const routeRequest: any = {
          origin: { address: origin },
          destination: { address: destination },
          travelMode: 'DRIVE',
          routingPreference,
          languageCode: 'nl'
        };

        if (intermediates.length > 0) {
          routeRequest.intermediates = intermediates;
          console.log(`🎯 Using ${intermediates.length} waypoint(s): ${intermediates.map((i: any) => i.address).join(', ')}`);
        }

        if (Object.keys(routeModifiers).length > 0) {
          routeRequest.routeModifiers = routeModifiers;
        }

        console.log(`📤 Sending Google Routes API request...`);
        console.log(`   Origin: ${origin}`);
        console.log(`   Destination: ${destination}`);
        console.log(`   Waypoints: ${intermediates.length > 0 ? intermediates.map((i: any) => i.address).join(', ') : 'none'}`);

        const response = await fetch(
          `https://routes.googleapis.com/directions/v2:computeRoutes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': googleMapsApiKey,
              'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs.steps.navigationInstruction,routes.legs.steps.localizedValues,routes.legs.startLocation,routes.legs.endLocation,routes.polyline'
            },
            body: JSON.stringify(routeRequest)
          }
        );

        if (!response.ok) {
          console.error('Google Routes API error:', response.status, await response.text());
          return null;
        }

        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const legs = route.legs || [];

          if (legs.length === 0) return null;

          // Combine all legs (important when we have waypoints)
          const allSteps: any[] = [];
          for (const leg of legs) {
            if (leg.steps) {
              allSteps.push(...leg.steps);
            }
          }

          const compressedSteps = compressSteps(allSteps);

          console.log(`📍 Route breakdown:`);
          console.log(`   - Legs: ${legs.length}`);
          console.log(`   - Total steps: ${allSteps.length}`);
          console.log(`   - Compressed to: ${compressedSteps.length} highway segments`);
          console.log(`   - Highways: ${compressedSteps.map(s => s.highway).join(' → ')}`);

          // Use start of first leg and end of last leg
          const originLoc = legs[0].startLocation.latLng;
          const destLoc = legs[legs.length - 1].endLocation.latLng;

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
      // CRITICAL: Routes REQUIRE Google Maps API for stops
      if (!googleMapsApiKey) {
        return new Response(
          JSON.stringify({
            error: 'GOOGLE_MAPS_API_NOT_CONFIGURED',
            message: 'Google Maps API is niet geconfigureerd. Routes kunnen niet gegenereerd worden zonder Google Maps API key voor route planning en stops.'
          }),
          {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const routeMatch = prompt.match(/van\s+(.+?)\s+naar\s+(.+)/i) || prompt.match(/from\s+(.+?)\s+to\s+(.+)/i);
      if (routeMatch) {
        const origin = routeMatch[1].trim();
        const destination = routeMatch[2].trim();

        routePayload = await fetchCompleteRoute(origin, destination, options.routeType || 'snelle-route', options.days);

        if (!routePayload) {
          return new Response(
            JSON.stringify({
              error: 'ROUTE_CALCULATION_FAILED',
              message: `Route van ${origin} naar ${destination} kon niet berekend worden. Mogelijke oorzaken:\n- Google Routes API error\n- Ongeldige locatie namen\n- Route te lang of onmogelijk\n\nControleer de locatie namen en probeer opnieuw.`
            }),
            {
              status: 422,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
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
          // NO FALLBACK! Return error instead of generating generic text
          return new Response(
            JSON.stringify({
              error: 'NO_STOPS_FOUND',
              message: `Geen interessante stops gevonden langs de route ${routePayload.ORIGIN} → ${routePayload.DESTINATION}. Dit kan komen door:\n- Te weinig toeristische attracties langs deze route\n- Google Places API configuratie problemen\n- Route via afgelegen gebied\n\nRoute details:\n- Afstand: ${routePayload.DISTANCE_KM} km\n- Route: ${routePayload.ROUTE_LINE}\n\nProbeer een andere route of neem contact op met de beheerder.`,
              route_data: routePayload
            }),
            {
              status: 422,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        } else {
          userPrompt = `🚨 STRIKTE REGELS - LEES DIT EERST:
1. Gebruik ALLEEN de ${stopsCount} stops hieronder - GEEN andere plaatsen verzinnen
2. Gebruik EXACT de wegnummers uit ROUTE_LINE - GEEN andere wegen verzinnen
3. De route gaat via: ${routePayload.ROUTE_LINE}

📊 ROUTE GEGEVENS:
- Van: ${routePayload.ORIGIN}
- Naar: ${routePayload.DESTINATION}
- Afstand: ${routePayload.DISTANCE_KM} km
- Reistijd zonder stops: ${routePayload.DURATION_NOSTOPS}
- Reistijd met stops: ${routePayload.DURATION_WITH_STOPS}
- Route: ${routePayload.ROUTE_LINE}
${routePayload.TIME_BUDGET ? `- Tijdsbudget: ${routePayload.TIME_BUDGET}\n` : ''}

🎯 VERPLICHTE STOPS (${stopsCount}x - gebruik deze EXACTE namen):
${routePayload.STOPS.map((stop: string, i: number) => `${i + 1}. ${stop}`).join('\n')}

✍️ OPDRACHT:
Schrijf een routebeschrijving met:
- Intro: korte pitch (3 zinnen) over het avontuur
- Route-overzicht: afstand + reistijd zoals hierboven
- Hoofdwegen: gebruik EXACT de wegen uit ROUTE_LINE (${routePayload.ROUTE_LINE})
- Route in stappen: beschrijf de route aan de hand van ROUTE_LINE
- Leuke stops: beschrijf ELKE stop hierboven met emoji, naam, en waarom het leuk is
- Tips: tankstations, beste vertrektijd, parkeertips

🚫 VERBODEN:
- Andere plaatsen/stops verzinnen die niet in de lijst staan
- Andere wegen/routes verzinnen die niet in ROUTE_LINE staan
- Stops overslaan
${routePayload.SCENIC_LOOP ? `\n📍 SCENIC LOOP (voor gemengde variant):\n${routePayload.SCENIC_LOOP.description}` : ''}`;
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