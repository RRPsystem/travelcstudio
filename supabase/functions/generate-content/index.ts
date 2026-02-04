import { createClient } from 'npm:@supabase/supabase-js@2';

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

      // Skip first 20% of route to avoid stops near departure point
      const startIndex = Math.floor(coordinates.length * 0.2);
      for (let i = startIndex; i < coordinates.length; i += Math.floor(coordinates.length / 15)) {
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
        destination: `Je bent een professionele reisschrijver die gestructureerde bestemmingsinformatie genereert.

SCHRIJFSTIJL: {WRITING_STYLE}
DOELGROEP: {VACATION_TYPE} reizigers

STIJLREGELS:
- Bij "speels" of "kinderen": Gebruik emoji's 🎉✨🌴🏖️ door de tekst, maak het enthousiast en kindvriendelijk
- Bij "beleefd" of "zakelijk": Schrijf in de u-vorm, formeel en professioneel
- Bij "informeel" of "vriendelijk": Schrijf in de je-vorm, warm en persoonlijk
- Bij "avontuurlijk": Gebruik actieve taal, spanning en uitdaging
- Bij "romantisch": Focus op sfeer, intimiteit en bijzondere momenten

Genereer ALLEEN een geldig JSON object (geen markdown, geen uitleg, geen code blocks) met deze structuur:
{
  "country_code": "De officiële ISO 3166-1 alpha-2 landcode (bijv. NL voor Nederland, BR voor Brazilië, ES voor Spanje, TH voor Thailand)",
  "intro_text": "Een KORTE pakkende samenvatting van de bestemming (maximaal 2 zinnen, max 50 woorden). Dit wordt gebruikt als excerpt/samenvatting.",
  "description": "Een UITGEBREIDE beschrijving over het land (400-600 woorden, 5-6 alinea's). Beschrijf de cultuur, geschiedenis, bezienswaardigheden, natuur, en wat het land uniek maakt. GEEN vervoer informatie hier - dat staat apart in transportation!",
  "transportation": "Een UITGEBREIDE tekst (150-250 woorden, 2-3 alinea's) over vervoer en rondreizen in dit land. Beschrijf WAAROM dit land ideaal is voor een bepaalde manier van reizen. Voorbeelden: waarom Griekenland perfect is voor eilandhoppen, waarom de USA ideaal is voor een roadtrip met huurauto, waarom Japan geweldig is voor treinreizen met de JR Pass, waarom Thailand perfect is voor backpacken met lokale bussen. Geef concrete tips en maak het inspirerend.",
  "climate": "Beschrijving van het klimaat door het jaar heen",
  "best_time_to_visit": "Beste reisperiode met uitleg waarom",
  "currency": "Lokale valuta en tips over betalen",
  "language": "Gesproken talen en of Engels veel gesproken wordt",
  "timezone": "Tijdzone (bijv. UTC+1) en tijdverschil met Nederland",
  "visa_info": "Visum informatie voor Nederlanders",
  "highlights": [
    {"title": "Naam ECHTE bezienswaardigheid (monument/tempel/museum/natuurwonder)", "description": "Beschrijving van 2-3 zinnen over waarom dit een must-see is"}
  ],
  "regions": [
    {"name": "Regio naam", "description": "Beschrijving van de regio en wat er te doen is"}
  ],
  "facts": [
    {"label": "Hoofdstad", "value": "Naam hoofdstad"},
    {"label": "Inwoners", "value": "Aantal"},
    {"label": "Oppervlakte", "value": "km²"}
  ],
  "cities": [
    {"name": "Stadsnaam", "description": "Beschrijving van 2-3 zinnen over de stad en waarom je er moet zijn"}
  ],
  "fun_facts": [
    "Een leuk, verrassend of grappig feit over dit land dat 100% waar is",
    "Nog een interessant weetje dat reizigers zal verbazen",
    "Een derde feit dat uniek is voor dit land"
  ]
}
BELANGRIJK:
- Pas de schrijfstijl aan op basis van de SCHRIJFSTIJL en DOELGROEP hierboven!
- intro_text: KORT, max 50 woorden (wordt gebruikt als samenvatting)
- description: LANG, 400-600 woorden over cultuur, geschiedenis, natuur, bezienswaardigheden. GEEN vervoer info hier!
- transportation: UITGEBREID 150-250 woorden over vervoer en rondreizen - dit is het ENIGE veld voor vervoer info
- Geef PRECIES 7 highlights - dit zijn ALLEEN echte bezienswaardigheden zoals monumenten, tempels, musea, natuurwonderen (bijv. Eiffeltoren, Akropolis, Grand Canyon, Taj Mahal). GEEN steden of regio's als highlight - die staan apart in cities en regions!
- Geef PRECIES 3 cities (populaire steden om te bezoeken)
- Geef minimaal 4 regio's en 5 facts
- Geef PRECIES 3 fun_facts: leuke, verrassende of grappige weetjes die 100% WAAR zijn. Geen verzinsels! Dit kunnen zijn: bizarre wetten, gekke tradities, verrassende records, onverwachte uitvindingen uit dit land, etc.
Schrijf in het Nederlands.`,
        route: `Je bent een enthousiaste reisbuddy die routes tot een beleving maakt. {ROUTE_TYPE_INSTRUCTION}

SCHRIJFSTIJL: {WRITING_STYLE}
DOELGROEP: {VACATION_TYPE} reizigers

STIJLREGELS (VOLG EXACT):
- Bij "speels" of "kinderen": Gebruik VEEL emoji's 🚗🎉🛝🍦🦆🎠🌈 door de tekst! Focus op speeltuinen, ijsjes, dieren.
- Bij "stelletjes": Gebruik romantische emoji's 💑🌅🍷✨ Focus op sfeervolle plekken.
- Bij "beleefd" of "u-vorm": Schrijf formeel in de u-vorm. Geen emoji's.
- Bij "zakelijk": Kort en bondig, geen emoji's.

BELANGRIJK - STOPS ONDERWEG:
- Geef ALLEEN stops die ONDERWEG liggen (na minimaal 1 uur rijden)
- NOOIT bezienswaardigheden in de vertrekstad noemen!

STRUCTUUR:
🧭 Route: [Vertrek] → [Bestemming]
📏 Afstand: ±XXX km | ⏱️ Reistijd: ±X uur

🛑 1e Stop: [STAD] (na ±1u15 rijden)
➡️ [Reden om te stoppen]
- [Activiteit] - [Eet/drink tip]
🎒 Tip: [Doelgroep-specifieke tip]

🛑 2e Stop: [STAD] (na ±3u totaal)
[Zelfde structuur]

🛑 3e Stop: [STAD] (na ±5u totaal)
[Zelfde structuur]

🚗 Laatste stuk → [Bestemming]
🎉 AANKOMST!

🍱 Onderweg-tip: [Praktische tips]
🎯 Samenvatting: [Tabel met etappes]`,
        planning: `Je bent een professionele reisplanner. Maak NU DIRECT een complete {DAYS} dagplanning voor {DESTINATION}.

BELANGRIJK: Stel GEEN vragen. Genereer DIRECT een volledige dagplanning met:
- Dag 1, Dag 2, etc. als kopjes
- Voor elke dag: ochtend, middag, avond activiteiten met tijden (bijv. 09:00-12:00)
- Concrete bezienswaardigheden, restaurants en activiteiten met echte namen
- Praktische tips en vervoersadvies

Schrijf in {WRITING_STYLE} stijl voor {VACATION_TYPE} reizigers. Begin DIRECT met "Dag 1:" - geen inleiding of vragen!`,
    hotel: `Je bent een ervaren hotelexpert voor reisagenten. Geef DIRECT hotelsugesties - stel GEEN vragen.

BELANGRIJK: Stel GEEN vragen. Genereer DIRECT een lijst met 3-5 hotels die passen bij de opgegeven bestemming en kenmerken.

SCHRIJFSTIJL: {WRITING_STYLE}
DOELGROEP: {VACATION_TYPE} reizigers

VERBODEN:
- Stel NOOIT vragen terug aan de gebruiker
- Noem NOOIT booking.com, Expedia, Hotels.com of andere boekingssites
- Dit is een tool voor REISAGENTEN - zij gebruiken dit om hotels te vinden voor HUN klanten

STRUCTUUR voor elk hotel:
## 1. **Hotelnaam** - Locatie
**Waarom dit hotel past**: Korte uitleg waarom dit hotel matcht met de gevraagde kenmerken
**Highlights**: 3-5 belangrijkste voorzieningen
**Kamertypes**: Welke kamers geschikt zijn
**Ligging**: Afstand tot centrum, strand, bezienswaardigheden
**Prijsindicatie**: €/€€/€€€/€€€€
**Tip van de expert**: Insider tip

Begin DIRECT met "## 1. **Hotelnaam**" - geen inleiding of vragen!`,
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

    // For destination, planning, hotel, and route content types, ALWAYS use the hardcoded prompt to ensure correct output
    if (contentType === 'destination' || contentType === 'planning' || contentType === 'hotel' || contentType === 'route') {
      console.log(`[GPT] Using hardcoded prompt for ${contentType}`);
      // systemPrompt is already set correctly from getSystemPrompt()
    } else if (gptModel && gptModel.system_prompt) {
      console.log('[GPT] Using operator GPT instructions from database');
      systemPrompt = gptModel.system_prompt
        .replace('{WRITING_STYLE}', writingStyle)
        .replace('{VACATION_TYPE}', options.vacationType || 'algemene')
        .replace('{DESTINATION}', options.destination || '')
        .replace('{ROUTE_TYPE_INSTRUCTION}', getRouteInstruction(options.routeType || ''))
        .replace('{TIME_BUDGET}', options.days || '');
    } else {
      console.log('[GPT] No operator instructions found, using fallback prompt');
    }

    // Use model settings from database if available (except for destination which needs specific settings)
    if (gptModel && contentType !== 'destination') {
      if (gptModel.model) modelToUse = gptModel.model;
      if (gptModel.temperature) temperatureToUse = gptModel.temperature;
      if (gptModel.max_tokens) maxTokensToUse = gptModel.max_tokens;
    }

    console.log('[GPT] Model:', modelToUse);
    console.log('[GPT] Temperature:', temperatureToUse);
    console.log('[GPT] Max tokens:', maxTokensToUse);

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
    let content = data.choices[0].message.content;

    // For destination content type, parse the JSON and format as readable text
    if (contentType === 'destination') {
      try {
        // Remove markdown code blocks if present
        let jsonStr = content.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.slice(7);
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
          jsonStr = jsonStr.slice(0, -3);
        }
        jsonStr = jsonStr.trim();
        
        const parsedContent = JSON.parse(jsonStr);
        
        // Format JSON as readable text for chat display
        let formattedText = '';
        
        if (parsedContent.intro_text) {
          formattedText += `**${parsedContent.intro_text}**\n\n`;
        }
        
        if (parsedContent.description) {
          formattedText += `## Over dit land\n${parsedContent.description}\n\n`;
        }
        
        if (parsedContent.transportation) {
          formattedText += `## Vervoer & Rondreizen\n${parsedContent.transportation}\n\n`;
        }
        
        if (parsedContent.highlights && parsedContent.highlights.length > 0) {
          formattedText += `## Bezienswaardigheden\n`;
          parsedContent.highlights.forEach((h: any) => {
            formattedText += `- **${h.title}**: ${h.description}\n`;
          });
          formattedText += '\n';
        }
        
        if (parsedContent.cities && parsedContent.cities.length > 0) {
          formattedText += `## Populaire Steden\n`;
          parsedContent.cities.forEach((c: any) => {
            formattedText += `- **${c.name}**: ${c.description}\n`;
          });
          formattedText += '\n';
        }
        
        if (parsedContent.best_time_to_visit) {
          formattedText += `## Beste Reistijd\n${parsedContent.best_time_to_visit}\n\n`;
        }
        
        if (parsedContent.climate) {
          formattedText += `## Klimaat\n${parsedContent.climate}\n\n`;
        }
        
        if (parsedContent.fun_facts && parsedContent.fun_facts.length > 0) {
          formattedText += `## Leuke Weetjes\n`;
          parsedContent.fun_facts.forEach((f: string) => {
            formattedText += `- ${f}\n`;
          });
        }
        
        return new Response(
          JSON.stringify({ content: formattedText.trim() }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (parseError) {
        console.error('Failed to parse destination JSON:', parseError);
        // Return raw content if parsing fails
      }
    }

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