import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { tripId, sessionToken, message } = await req.json();

    if (!tripId || !sessionToken || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: apiSettings } = await supabase
      .from('api_settings')
      .select('provider, service_name, api_key, metadata, google_search_api_key, google_search_engine_id, google_places_api_key')
      .in('provider', ['OpenAI', 'Google', 'system'])
      .eq('is_active', true);

    let openaiApiKey = apiSettings?.find(s => s.provider === 'OpenAI')?.api_key;

    if (!openaiApiKey) {
      openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (openaiApiKey) {
        console.log('⚠️ Using system-wide OPENAI_API_KEY fallback');
      }
    }

    const googleMapsApiKey = apiSettings?.find(s => s.provider === 'Google' && s.service_name === 'Google Maps API')?.api_key;

    const systemSettings = apiSettings?.find(s => s.provider === 'system' && s.service_name === 'Twilio WhatsApp');
    const googleApiKey = systemSettings?.google_search_api_key;
    const googleCseId = systemSettings?.google_search_engine_id;

    const { data: trip, error: tripError } = await supabase
      .from("travel_trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      return new Response(
        JSON.stringify({ error: "Trip not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: intake } = await supabase
      .from("travel_intakes")
      .select("*")
      .eq("session_token", sessionToken)
      .single();

    const { data: conversationHistory } = await supabase
      .from("travel_conversations")
      .select("*")
      .eq("session_token", sessionToken)
      .order("created_at", { ascending: true })
      .limit(20);

    const tripContext = trip.custom_context || '';

    let structuredItinerary: any[] = [];
    let routeStops: string[] = [];
    let hotelMappings: { [key: string]: string } = {};
    let externalContent = '';

    if (trip.source_urls && Array.isArray(trip.source_urls) && trip.source_urls.length > 0) {
      console.log('🔗 Fetching external content from source URLs...');
      for (const url of trip.source_urls.slice(0, 3)) {
        try {
          const response = await fetch(url, {
            headers: { 'User-Agent': 'TravelBro/1.0' },
            signal: AbortSignal.timeout(5000)
          });

          if (response.ok) {
            const text = await response.text();
            const cleanText = text
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .substring(0, 2000);
            externalContent += `\n\n📄 Extra info van ${url}:\n${cleanText}\n`;
            console.log(`✅ Fetched ${cleanText.length} chars from ${url}`);
          }
        } catch (error) {
          console.log(`⚠️ Could not fetch ${url}:`, error);
        }
      }
    }

    if (trip.metadata && trip.metadata.itinerary && Array.isArray(trip.metadata.itinerary)) {
      console.log('✅ Using structured itinerary from metadata');
      structuredItinerary = trip.metadata.itinerary;

      const uniqueLocations = new Set<string>();
      structuredItinerary.forEach((day: any) => {
        const loc = day.location.toLowerCase();
        uniqueLocations.add(loc);
        if (day.hotel && day.hotel.name) {
          hotelMappings[loc] = day.hotel.name;
          const locWithoutDots = loc.replace(/\./g, '');
          if (locWithoutDots !== loc) {
            hotelMappings[locWithoutDots] = day.hotel.name;
          }
        }
      });
      routeStops = Array.from(uniqueLocations);
      console.log('📍 Structured route:', routeStops);
      console.log('🏨 Hotel mappings:', hotelMappings);
    } else {
      console.log('⚠️ No structured data, parsing custom_context');
      const tripRouteMatch = tripContext.match(/Reisroute:\s*\n([^\n]+)/);

      if (tripRouteMatch) {
        const routeLine = tripRouteMatch[1];
        routeStops = routeLine
          .split('→')
          .map(stop => stop.trim().toLowerCase())
          .filter(stop => stop.length > 0);
        console.log('📍 Parsed route stops:', routeStops);
      }

      hotelMappings = {
        'johannesburg': 'City Lodge Johannesburg Airport',
        'welgevonden game reserve': 'Welgevonden Game Reserve',
        'tzaneen': 'Tamboti Lodge Guest House',
        'graskop': 'Westlodge at Graskop',
        'piet retief': 'Dusk to Dawn Guesthouse',
        'st. lucia': 'Ndiza Lodge & Cabanas',
        'kwazulu-natal': 'Rhino Ridge Safari Lodge',
        'umhlanga': 'Tesorino',
        'durban': 'Durban Hotel',
        'port elizabeth': 'Port Elizabeth Airport',
        'addo elephant national park': 'Addo Dung Beetle Guest Farm',
        'addo': 'Addo Dung Beetle Guest Farm',
        'knysna': 'Knysna Manor House',
        'swellendam': 'Aan de Oever Guesthouse',
        'hermanus': 'Whale Coast Ocean Villa',
        'kaapstad': 'Cape Town Hotel'
      };
    }

    let contextualLocation = "";
    let currentHotel = "";

    if (conversationHistory && conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-10).map((c: any) => c.message.toLowerCase()).join(" ");

      for (const stop of routeStops) {
        if (recentMessages.includes(stop) || recentMessages.includes(stop.replace(' game reserve', '').replace(' national park', '').replace(' elephant', '').replace('.', ''))) {
          contextualLocation = stop;
          console.log('🎯 Detected contextual location:', contextualLocation);
          break;
        }
      }

      if (!contextualLocation) {
        const currentMessage = message.toLowerCase();
        for (const stop of routeStops) {
          const cleanStop = stop.replace('.', '');
          if (currentMessage.includes(cleanStop) || currentMessage.includes(stop.replace(' game reserve', '').replace(' national park', ''))) {
            contextualLocation = stop;
            console.log('🎯 Detected location in current message:', contextualLocation);
            break;
          }
        }
      }

      if (contextualLocation && hotelMappings[contextualLocation]) {
        currentHotel = hotelMappings[contextualLocation];
        console.log('🏨 Current hotel:', currentHotel);
      }
    }

    let searchData = "";
    const webSearchKeywords = [
      'weer', 'weather', 'temperatuur', 'climate', 'regen', 'zon', 'bewolkt',
      'nieuws', 'news', 'actueel', 'vandaag', 'nu', 'momenteel', 'latest',
      'events', 'evenementen', 'festivals', 'concerten', 'shows',
      'openingstijden', 'open', 'gesloten', 'open hours', 'hours',
      'prijzen', 'kosten', 'price', 'cost', 'tarief',
      'tips', 'aanbevelingen', 'recommendations', 'beste', 'must see', 'must visit'
    ];
    const isWebSearchQuery = webSearchKeywords.some(keyword => message.toLowerCase().includes(keyword));

    if (isWebSearchQuery && googleApiKey && googleCseId && contextualLocation) {
      try {
        console.log('🔍 Web search query detected');

        let searchQuery = `${message} ${contextualLocation} South Africa`;

        if (message.toLowerCase().includes('weer') || message.toLowerCase().includes('weather')) {
          searchQuery = `weather forecast ${contextualLocation} South Africa`;
        }

        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCseId}&q=${encodeURIComponent(searchQuery)}&num=3`;

        const searchResponse = await fetch(searchUrl);
        if (searchResponse.ok) {
          const searchResults = await searchResponse.json();

          if (searchResults.items && searchResults.items.length > 0) {
            searchData = `\n\n🌐 ACTUELE INFORMATIE VAN INTERNET:\n\n`;

            searchResults.items.slice(0, 3).forEach((item: any, index: number) => {
              searchData += `${index + 1}. **${item.title}**\n`;
              if (item.snippet) {
                searchData += `   ${item.snippet}\n`;
              }
              if (item.link) {
                searchData += `   🔗 ${item.link}\n`;
              }
              searchData += `\n`;
            });

            console.log('✅ Successfully fetched web search results');
          }
        }
      } catch (error) {
        console.error("Web search error:", error);
      }
    }

    let lastMentionedPlace = "";
    if (conversationHistory && conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-5);
      for (const msg of recentMessages.reverse()) {
        if (msg.role === 'assistant' && msg.message) {
          const placeMatch = msg.message.match(/(?:Tzaneen Dam|Agatha Crocodile Ranch|Tzaneen|Graskop|Kruger|Blyde River Canyon|God's Window|Bourke's Luck Potholes)/i);
          if (placeMatch) {
            lastMentionedPlace = placeMatch[0];
            console.log('🎯 Last mentioned place:', lastMentionedPlace);
            break;
          }
        }
      }
    }

    let locationData = "";
    const locationKeywords = [
      'route', 'routes', 'hoe kom ik', 'afstand', 'reistijd', 'navigatie', 'rijden', 'waar is', 'waar ligt', 'adres', 'locatie',
      'ver', 'dichtbij', 'nabij', 'kilometers', 'km', 'minuten', 'rijden naar', 'van ons hotel', 'van het hotel',
      'hotel', 'accommodatie', 'overnachten', 'slapen',
      'restaurant', 'eten', 'drinken', 'cafe', 'bar', 'bakker', 'bakkerij', 'supermarkt', 'winkel', 'boodschappen', 'brood', 'ontbijt', 'lunch', 'diner', 'koffie',
      'activiteiten', 'te doen', 'bezienswaardigheden', 'attractie', 'museum', 'park', 'doen', 'zien', 'bezichtigen', 'uitje', 'dagje uit',
      'dokter', 'arts', 'huisarts', 'ziekenhuis', 'apotheek', 'pharmacy', 'medisch', 'ehbo', 'tandarts',
      'taxi', 'bus', 'trein', 'station', 'vliegveld', 'airport', 'vervoer', 'openbaar vervoer', 'parkeren', 'fiets', 'fietsen', 'huren', 'autoverhuur', 'scooter',
      'bank', 'atm', 'pinautomaat', 'geld', 'wisselkantoor', 'benzinestation', 'tankstation', 'postkantoor', 'post',
      'winkelen', 'shoppen', 'winkelcentrum', 'mall', 'markt', 'kopen',
      'politie', 'brandweer', 'hulpdiensten', 'noodgeval',
      'zwembad', 'gym', 'fitness', 'sport', 'sporten', 'wandelen', 'hiken',
      'dichtbij', 'nabij', 'omgeving', 'buurt', 'in de buurt', 'ver', 'dichtbij', 'loopafstand', 'hoelang', 'hoe ver'
    ];
    const isLocationQuery = locationKeywords.some(keyword => message.toLowerCase().includes(keyword));

    if (isLocationQuery && googleMapsApiKey) {
      try {
        const distanceKeywords = ['ver', 'afstand', 'dichtbij', 'loopafstand', 'hoe ver', 'hoelang', 'kunnen we', 'lopen'];
        const isDistanceQuery = distanceKeywords.some(kw => message.toLowerCase().includes(kw));

        const routeKeywords = ['route', 'routebeschrijving', 'hoe komen we', 'hoe kom ik', 'navigatie'];
        const isRouteQuery = routeKeywords.some(kw => message.toLowerCase().includes(kw));

        if (isRouteQuery && contextualLocation && currentHotel) {
          console.log('🗺️ Route query detected');

          const currentIndex = routeStops.indexOf(contextualLocation);
          let fromCity = null;
          let fromHotel = null;

          if (currentIndex > 0) {
            fromCity = routeStops[currentIndex - 1];
            fromHotel = hotelMappings[fromCity];
            console.log(`🚗 Found previous stop: ${fromCity} (${fromHotel})`);

            if (fromHotel) {
              console.log(`🚗 Calculating route from ${fromCity} (${fromHotel}) to ${contextualLocation} (${currentHotel})`);

              const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(fromHotel + ', ' + fromCity + ', South Africa')}&destination=${encodeURIComponent(currentHotel + ', ' + contextualLocation + ', South Africa')}&mode=driving&key=${googleMapsApiKey}&language=nl`;

              const directionsResponse = await fetch(directionsUrl);
              if (directionsResponse.ok) {
                const directionsData = await directionsResponse.json();

                if (directionsData.status === 'OK' && directionsData.routes && directionsData.routes.length > 0) {
                  const route = directionsData.routes[0];
                  const leg = route.legs[0];

                  locationData = `\n\n🗺️ ROUTE INFORMATIE:\n\n`;
                  locationData += `📍 Van: **${fromHotel}** in ${fromCity.charAt(0).toUpperCase() + fromCity.slice(1)}\n`;
                  locationData += `📍 Naar: **${currentHotel}** in ${contextualLocation.charAt(0).toUpperCase() + contextualLocation.slice(1)}\n\n`;
                  locationData += `🚗 Afstand: ${leg.distance.text}\n`;
                  locationData += `⏱️ Rijdtijd: ${leg.duration.text}\n`;
                  locationData += `🛣️ Startadres: ${leg.start_address}\n`;
                  locationData += `🎯 Eindadres: ${leg.end_address}\n\n`;

                  if (route.summary) {
                    locationData += `📋 Route: ${route.summary}\n\n`;
                  }

                  if (leg.steps && leg.steps.length > 0) {
                    locationData += `🧭 BELANGRIJKSTE STAPPEN:\n\n`;
                    leg.steps.slice(0, 8).forEach((step: any, index: number) => {
                      const instruction = step.html_instructions.replace(/<[^>]*>/g, '');
                      locationData += `${index + 1}. ${instruction} (${step.distance.text})\n`;
                    });

                    if (leg.steps.length > 8) {
                      locationData += `\n... en nog ${leg.steps.length - 8} stappen\n`;
                    }
                  }

                  console.log('✅ Successfully calculated route');
                }
              }
            }
          }
        } else if (isDistanceQuery && contextualLocation && currentHotel) {
          console.log('📏 Distance query detected');

          let destinationPlace = lastMentionedPlace;

          if (!destinationPlace) {
            const placeKeywords = ['dam', 'ranch', 'canyon', 'kruger', 'graskop', 'blyde', 'god\'s window', 'bourke'];
            for (const keyword of placeKeywords) {
              if (message.toLowerCase().includes(keyword)) {
                if (keyword === 'dam' && contextualLocation.toLowerCase().includes('tzaneen')) {
                  destinationPlace = 'Tzaneen Dam';
                } else if (keyword === 'ranch') {
                  destinationPlace = 'Agatha Crocodile Ranch';
                } else if (keyword === 'canyon' || keyword === 'blyde') {
                  destinationPlace = 'Blyde River Canyon';
                } else if (keyword === 'god') {
                  destinationPlace = "God's Window";
                } else if (keyword === 'bourke') {
                  destinationPlace = "Bourke's Luck Potholes";
                }
                break;
              }
            }
          }

          if (destinationPlace) {
            console.log(`🔍 Calculating distance from ${currentHotel} to ${destinationPlace}`);

            const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(currentHotel + ', ' + contextualLocation + ', South Africa')}&destination=${encodeURIComponent(destinationPlace + ', ' + contextualLocation + ', South Africa')}&mode=driving&key=${googleMapsApiKey}&language=nl`;

            const directionsResponse = await fetch(directionsUrl);
            if (directionsResponse.ok) {
              const directionsData = await directionsResponse.json();

              if (directionsData.status === 'OK' && directionsData.routes && directionsData.routes.length > 0) {
                const route = directionsData.routes[0];
                const leg = route.legs[0];

                locationData = `\n\n📍 EXACTE AFSTANDSINFORMATIE:\n\n`;
                locationData += `Van: **${currentHotel}** (jullie hotel in ${contextualLocation})\n`;
                locationData += `Naar: **${destinationPlace}**\n\n`;
                locationData += `🚗 Met de auto: ${leg.distance.text} (${leg.duration.text})\n`;

                const walkingUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(currentHotel + ', ' + contextualLocation + ', South Africa')}&destination=${encodeURIComponent(destinationPlace + ', ' + contextualLocation + ', South Africa')}&mode=walking&key=${googleMapsApiKey}&language=nl`;
                const walkingResponse = await fetch(walkingUrl);

                if (walkingResponse.ok) {
                  const walkingData = await walkingResponse.json();
                  if (walkingData.status === 'OK' && walkingData.routes && walkingData.routes.length > 0) {
                    const walkLeg = walkingData.routes[0].legs[0];
                    locationData += `🚶 Lopen: ${walkLeg.distance.text} (${walkLeg.duration.text})\n\n`;

                    const distanceKm = parseFloat(walkLeg.distance.text.replace(',', '.'));
                    if (distanceKm < 2) {
                      locationData += `✅ Dit is prima te lopen!\n`;
                    } else if (distanceKm < 5) {
                      locationData += `⚠️ Redelijk stuk lopen, misschien beter met de auto.\n`;
                    } else {
                      locationData += `❌ Te ver om te lopen, neem de auto.\n`;
                    }
                  }
                }

                console.log('✅ Successfully calculated distance');
              }
            }
          }
        }

        if (!locationData && contextualLocation) {
          const serviceMappings: { [key: string]: { types: string[], emoji: string, label: string } } = {
            'restaurant|eten': { types: ['restaurant'], emoji: '🍽️', label: 'Restaurants' },
            'dokter|arts|huisarts|medisch|ehbo': { types: ['doctor', 'hospital'], emoji: '🏥', label: 'Medische voorzieningen' },
            'ziekenhuis': { types: ['hospital'], emoji: '🏥', label: 'Ziekenhuizen' },
            'apotheek|pharmacy': { types: ['pharmacy'], emoji: '💊', label: 'Apotheken' },
            'tandarts': { types: ['dentist'], emoji: '🦷', label: 'Tandartsen' },
            'supermarkt|boodschappen': { types: ['supermarket', 'grocery_or_supermarket'], emoji: '🛒', label: 'Supermarkten' },
            'bakker|bakkerij|brood': { types: ['bakery'], emoji: '🥖', label: 'Bakkerijen' },
            'cafe|koffie': { types: ['cafe'], emoji: '☕', label: 'Cafés' },
            'bar|drinken': { types: ['bar'], emoji: '🍺', label: 'Bars' },
            'bank|atm|pinautomaat|geld': { types: ['bank', 'atm'], emoji: '🏦', label: 'Banken & Geldautomaten' },
            'benzine|tankstation': { types: ['gas_station'], emoji: '⛽', label: 'Tankstations' },
            'fiets|fietsen huren': { types: ['bicycle_store'], emoji: '🚲', label: 'Fietsverhuur' },
            'taxi': { types: ['taxi_stand'], emoji: '🚕', label: 'Taxi standplaatsen' },
          };

          let selectedService: { types: string[], emoji: string, label: string } | null = null;
          const messageLower = message.toLowerCase();

          for (const [keywords, service] of Object.entries(serviceMappings)) {
            const keywordList = keywords.split('|');
            if (keywordList.some(kw => messageLower.includes(kw))) {
              selectedService = service;
              break;
            }
          }

          if (selectedService) {
            let searchCoordinates = null;

            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(contextualLocation + ', South Africa')}&key=${googleMapsApiKey}&language=nl`;
            const geocodeResponse = await fetch(geocodeUrl);

            if (geocodeResponse.ok) {
              const geocodeData = await geocodeResponse.json();
              if (geocodeData.status === 'OK' && geocodeData.results && geocodeData.results.length > 0) {
                searchCoordinates = geocodeData.results[0].geometry.location;
              }
            }

            if (searchCoordinates) {
              const radius = 10000;
              const primaryType = selectedService.types[0];

              const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${searchCoordinates.lat},${searchCoordinates.lng}&radius=${radius}&type=${primaryType}&key=${googleMapsApiKey}&language=nl`;

              const nearbyResponse = await fetch(nearbyUrl);
              if (nearbyResponse.ok) {
                const nearbyData = await nearbyResponse.json();

                if (nearbyData.status === 'OK' && nearbyData.results && nearbyData.results.length > 0) {
                  locationData = `\n\n${selectedService.emoji} ${selectedService.label} in de buurt van ${contextualLocation}:\n\n`;

                  const sortedResults = nearbyData.results
                    .sort((a: any, b: any) => {
                      if (a.opening_hours?.open_now !== b.opening_hours?.open_now) {
                        return (b.opening_hours?.open_now ? 1 : 0) - (a.opening_hours?.open_now ? 1 : 0);
                      }
                      return (b.rating || 0) - (a.rating || 0);
                    })
                    .slice(0, 6);

                  sortedResults.forEach((place: any, index: number) => {
                    locationData += `${index + 1}. **${place.name}**\n`;

                    if (place.rating) {
                      locationData += `   ⭐ ${place.rating}/5`;
                      if (place.user_ratings_total) {
                        locationData += ` (${place.user_ratings_total} reviews)`;
                      }
                      locationData += `\n`;
                    }

                    locationData += `   📍 ${place.vicinity}\n`;

                    if (place.opening_hours) {
                      locationData += `   ${place.opening_hours.open_now ? '✅ Nu open' : '❌ Gesloten'}\n`;
                    }

                    if (place.geometry?.location) {
                      const lat1 = searchCoordinates.lat;
                      const lon1 = searchCoordinates.lng;
                      const lat2 = place.geometry.location.lat;
                      const lon2 = place.geometry.location.lng;

                      const R = 6371;
                      const dLat = (lat2 - lat1) * Math.PI / 180;
                      const dLon = (lon2 - lon1) * Math.PI / 180;
                      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                                Math.sin(dLon/2) * Math.sin(dLon/2);
                      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                      const distance = R * c;

                      if (distance < 1) {
                        locationData += `   🚶 ${Math.round(distance * 1000)}m lopen (ca. ${Math.round(distance * 12)} min)\n`;
                      } else {
                        locationData += `   🚗 ${distance.toFixed(1)}km rijden (ca. ${Math.round(distance * 2)} min)\n`;
                      }
                    }

                    locationData += `\n`;
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Location data error:", error);
      }
    }

    const routeOverview = routeStops.length > 0
      ? `🗺️ ROUTE VOLGORDE:\n${routeStops.map((stop, i) => `${i + 1}. ${stop.toUpperCase()}`).join(' → ')}\n\n`
      : '';

    const systemPrompt = `Je bent TravelBRO, een PROFESSIONELE Nederlandse reisassistent die ALTIJD de volledige reisinformatie EN persoonlijke voorkeuren gebruikt.

${routeOverview}⚠️ Bij route vragen: Als er REAL-TIME LOCATIE DATA met route-info beschikbaar is, gebruik die DIRECT! Nooit vragen om het vertrekpunt.

🚨 KRITIEKE REGEL #1 - GEBRUIK DE REISINFORMATIE!
Je hebt COMPLETE reisinformatie gekregen. GEBRUIK DIE!

🚨 KRITIEKE REGEL #2 - NOOIT VERDUIDELIJKINGSVRAGEN!
Als iemand vraagt "is er een restaurant in de buurt?" of "in de buurt van dit hotel?" weet je ALTIJD de context!

🚨 KRITIEKE REGEL #3 - NOOIT GENERIEKE ANTWOORDEN!
GEEN algemene info over Zuid-Afrika. ALTIJD specifiek over de locatie waar ze het over hebben!

🚨 KRITIEKE REGEL #4 - GEBRUIK INTAKE DATA!
De reizigers hebben persoonlijke voorkeuren ingevuld. GEBRUIK DIE in je antwoorden!

🚨 KRITIEKE REGEL #5 - AUTOMATISCHE ROUTE HERKENNING!
Als iemand vraagt "hoe komen we naar X" - de REAL-TIME LOCATIE DATA hierboven bevat AUTOMATISCH de complete route van de vorige stop! Als er real-time route data is: GEBRUIK DIE DIRECT in je antwoord!

❌ ZEG NOOIT - DEZE ANTWOORDEN ZIJN VERBODEN:
- "Die informatie heb ik niet" (Als er ACTUELE INTERNET INFO of LOCATIE DATA beschikbaar is, GEBRUIK DIE!)
- "Ik heb geen informatie over het weer" (Als er web search results zijn, GEBRUIK DIE!)
- "Raadpleeg een weerwebsite" (JE HEBT die info al via internet search!)
- "Kun je specifieker zijn?"
- "Over welke locatie wil je informatie?"
- "Welk hotel bedoel je?"
- "Bij welk hotel zoek je een restaurant?"
- "Kun je me vertellen bij welk hotel?"
- "Stuur me even je vertrekpunt" (JE WEET het vertrekpunt uit de reisvolgorde!)
- "Waar heb je precies informatie over nodig?" (Ze hebben het NET gezegd!)
- "Het hangt af van welke bestemming je bedoelt" (JE WEET de bestemming uit de context!)
- "van welk hotel vertrek je?" (JE WEET HET - zie reisinformatie!)
- "welke dam bedoel je?" (de dam die ZIJ NET noemden, of JIJ net hebt voorgesteld!)
- "geef me de details" (JE HEBT DE DETAILS!)
- "ik heb geen specifieke informatie over" (DAN ZOEK JE HET OP met Google Routes!)
- "naar welke dam wil je precies?" (CONTEXT! Als JIJ Tzaneen Dam noemde, dan bedoelen ZIJ die!)
- "Om je beter te helpen" gevolgd door vragen om info die je al hebt
- Generieke lijstjes van verschillende steden (focus op ÉÉN stad!)

✅ DOE DIT:
- LEES de reisinformatie hieronder
- GEBRUIK de exacte hotelnamen en details
- BEGRIJP de context van het gesprek: "daar" = de laatst genoemde plaats
- GEEF concrete, SPECIFIEKE antwoorden over die ene locatie
- Als er real-time locatie data is, GEBRUIK DIE METEEN!
- Als er actuele internet info is, GEBRUIK DIE METEEN!
- PERSONALISEER antwoorden met hun intake data (interesses, budget, reistijl)

📚 VOORBEELD CONVERSATIES - ZO MOET HET:

❌ FOUT:
Reiziger: "Wat is er te doen in Tzaneen?"
Jij: "4. Tzaneen Dam - perfect voor watersport"
Reiziger: "is de dam ver van ons hotel?"
Jij: "Van welk hotel vertrek je en welke dam bedoel je?"
❌ DIT IS TOTAAL VERKEERD! Je weet ALLES: Tamboti Lodge Guest House + Tzaneen Dam!

✅ GOED:
Reiziger: "Wat is er te doen in Tzaneen?"
Jij: "4. Tzaneen Dam - perfect voor watersport"
Reiziger: "is de dam ver van ons hotel?"
Jij: "Tzaneen Dam ligt ongeveer 8 km van jullie hotel Tamboti Lodge Guest House. Met de auto is het 12 minuten rijden. Een heerlijk plekje voor een dagje uit!"

${structuredItinerary.length > 0 ? `\n📅 GESTRUCTUREERD REISSCHEMA (GEBRUIK DIT!):\n\n${structuredItinerary.map(day => `Dag ${day.day} (${day.date}) - ${day.location}:\n  🏨 Hotel: ${day.hotel.name}${day.hotel.has_restaurant ? ' ✅ Heeft restaurant!' : ''}${day.hotel.amenities ? `\n  ✨ Faciliteiten: ${day.hotel.amenities.join(', ')}` : ''}\n  📍 Activiteiten: ${day.activities.join(', ')}`).join('\n\n')}\n\n⚠️ JE WEET PRECIES WELK HOTEL BIJ WELKE LOCATIE HOORT! GEBRUIK DIT!\n` : ''}

${contextualLocation && currentHotel ? `\n🎯 HUIDIGE CONTEXT:\n📍 Locatie: ${contextualLocation.toUpperCase()}\n🏨 Jullie hotel: ${currentHotel}${structuredItinerary.find((d: any) => d.location.toLowerCase() === contextualLocation.toLowerCase())?.hotel?.has_restaurant ? ' ✅ Dit hotel HEEFT een restaurant!' : ' ⚠️ Dit hotel heeft GEEN restaurant'}${structuredItinerary.find((d: any) => d.location.toLowerCase() === contextualLocation.toLowerCase())?.hotel?.amenities ? `\n✨ Faciliteiten: ${structuredItinerary.find((d: any) => d.location.toLowerCase() === contextualLocation.toLowerCase())?.hotel?.amenities?.join(', ')}` : ''}\n\n⚠️ GEBRUIK DEZE CONTEXT - DIT IS SUPER BELANGRIJK!\n- "daar" = ${contextualLocation}\n- "het hotel" = ${currentHotel}\n- "in de buurt" = in de buurt van ${currentHotel} in ${contextualLocation}\n- Als ze vragen "is het daar leuk?" bedoelen ze ${contextualLocation}!\n- Als ze vragen "heeft het hotel een restaurant?" zie je hierboven het antwoord!\n- Als ze vragen "is er een restaurant in de buurt?" → Check EERST of ${currentHotel} zelf een restaurant heeft (zie hierboven!)\n- Als ze vragen over faciliteiten "in de buurt" → Begin met de faciliteiten van ${currentHotel}!\n- Geef SPECIFIEKE info over ${contextualLocation}, NIET over heel Zuid-Afrika!\n- NOOIT vragen "over welke locatie wil je meer weten?" - je WEET dat het over ${contextualLocation} gaat!\n` : ''}

🗺️ COMPLETE REISINFORMATIE:
${tripContext}

${externalContent ? `\n${externalContent}\n⚠️ GEBRUIK DEZE EXTERNE INFO IN JE ANTWOORDEN!\n` : ''}

${trip.source_urls && trip.source_urls.length > 0 ? `\n📚 Extra bronnen:\n${trip.source_urls.join("\n")}\n` : ''}

👥 PERSOONLIJKE REIZIGER VOORKEUREN (GEBRUIK DIT!):
${intake ? JSON.stringify(intake.intake_data, null, 2) : "Geen intake data beschikbaar"}

⚠️ Gebruik deze voorkeuren om antwoorden te personaliseren:
- Als ze van avontuur houden → suggereer actieve dingen
- Als ze relaxed zijn → focus op ontspanning
- Budget niveau → pas aanbevelingen aan
- Interesses → gebruik dit bij suggesties

${lastMentionedPlace ? `\n🎯 LAATST GENOEMDE PLAATS: ${lastMentionedPlace}\n⚠️ Als ze vragen over "de dam", "daar", "die plaats" bedoelen ze: ${lastMentionedPlace}!\n` : ''}

${locationData ? `\n📍 REAL-TIME LOCATIE DATA:\n${locationData}\n\n⚠️ GEBRUIK DEZE LOCATIE DATA IN JE ANTWOORD!\n` : ''}

${searchData ? `\n${searchData}\n⚠️ GEBRUIK DEZE ACTUELE INTERNET INFO IN JE ANTWOORD! Geef de reiziger concrete, up-to-date informatie.\n` : ''}

🎯 ANTWOORD REGELS:

1. **CONTEXT BEGRIP IS ALLES**:
   - We praten over ${contextualLocation ? contextualLocation.toUpperCase() : 'een specifieke locatie'}
   - Het hotel is ${currentHotel ? `**${currentHotel}**` : 'bekend uit de conversatie'}
   - Als iemand zegt "dit hotel", "het hotel", "in de buurt" → ze bedoelen ${currentHotel || 'het hotel in de huidige context'}
   - Als iemand vraagt "restaurant in de buurt?" → KIJK EERST naar de HUIDIGE CONTEXT hierboven! Als daar staat dat het hotel een restaurant heeft, zeg dat dan DIRECT! Bijvoorbeeld: "Ja! ${currentHotel || 'Jullie hotel'} heeft zelf een restaurant!" ${currentHotel && structuredItinerary.find((d: any) => d.location.toLowerCase() === contextualLocation?.toLowerCase())?.hotel?.has_restaurant ? `(En JA, ${currentHotel} HEEFT een restaurant!)` : ''}

2. **GEBRUIK EXACTE DATA**:
   - Hotelname: ALTIJD de volledige naam uit de reisinformatie
   - Locatie: De exacte plaats (Johannesburg, Tzaneen, Graskop, etc.)
   - Faciliteiten: Zwembad, wifi, etc. zoals vermeld
   - Maaltijden: BED AND BREAKFAST, FULL BOARD, ROOM ONLY

3. **WEES SPECIFIEK**:
   - Geen algemene tips
   - Gebruik namen, adressen, details
   - Als er real-time locatie data beschikbaar is (hierboven), GEBRUIK DIE!
   - Als er real-time data is, begin dan DIRECT met die restaurants

4. **EMOJI'S**: Maak antwoorden levendig en prettig leesbaar

🧠 CONVERSATIE GEHEUGEN:
- Als de conversatie over een specifieke stad gaat, blijf op die stad gefocust
- "daar", "het", "die plek" = de stad die net genoemd werd
- Als iemand "dit", "het hotel", "hier" zegt, weet je ALTIJD welk hotel ze bedoelen
- NOOIT vragen om verduidelijking als de context duidelijk is uit het gesprek
- NOOIT generieke lijstjes van verschillende steden - focus op DE stad uit de context!`;

    let conversationContext = "";
    if (conversationHistory && conversationHistory.length > 0) {
      const recent = conversationHistory.slice(-5);
      conversationContext = "\n\n💬 RECENTE CONVERSATIE:\n";

      recent.forEach((conv: any) => {
        const roleLabel = conv.role === 'user' ? '👤 Reiziger' : '🤖 Jij';
        conversationContext += `${roleLabel}: ${conv.message}\n\n`;
      });

      conversationContext += "\n🎯 Gebruik deze context om slimme antwoorden te geven!\n";
    }

    const messages = [
      { role: "system", content: systemPrompt + conversationContext },
    ];

    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((conv: any) => {
        messages.push({
          role: conv.role,
          content: conv.message,
        });
      });
    }

    messages.push({ role: "user", content: message });

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: trip.gpt_model || "gpt-4o",
        messages,
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error("OpenAI API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get AI response", details: error }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content;

    await supabase.from("travel_conversations").insert([
      {
        session_token: sessionToken,
        trip_id: tripId,
        role: "user",
        message: message,
      },
      {
        session_token: sessionToken,
        trip_id: tripId,
        role: "assistant",
        message: aiResponse,
      },
    ]);

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in travelbro-chat:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
