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

    let contextualLocation = "";
    let currentHotel = "";

    if (conversationHistory && conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-5).map((c: any) => c.message.toLowerCase()).join(" ");

      const cities = ['johannesburg', 'tzaneen', 'graskop', 'piet retief', 'st. lucia', 'kwazulu-natal', 'umhlanga', 'durban', 'addo', 'knysna', 'swellendam', 'hermanus', 'kaapstad'];
      for (const city of cities) {
        if (recentMessages.includes(city)) {
          contextualLocation = city;
          console.log('🎯 Detected contextual location:', contextualLocation);
          break;
        }
      }

      const hotelMappings: { [key: string]: string } = {
        'johannesburg': 'City Lodge Johannesburg Airport',
        'tzaneen': 'Tamboti Lodge Guest House',
        'graskop': 'Westlodge at Graskop',
        'piet retief': 'Dusk to Dawn Guesthouse',
        'st. lucia': 'Ndiza Lodge & Cabanas',
        'kwazulu-natal': 'Rhino Ridge Safari Lodge',
        'umhlanga': 'Tesorino',
        'addo': 'Addo Dung Beetle Guest Farm',
        'knysna': 'Knysna Manor House',
        'swellendam': 'Aan de Oever Guesthouse',
        'hermanus': 'Whale Coast Ocean Villa'
      };

      if (contextualLocation && hotelMappings[contextualLocation]) {
        currentHotel = hotelMappings[contextualLocation];
        console.log('🏨 Current hotel:', currentHotel);
      }
    }

    let locationData = "";
    const locationKeywords = [
      'route', 'routes', 'hoe kom ik', 'afstand', 'reistijd', 'navigatie', 'rijden', 'waar is', 'waar ligt', 'adres', 'locatie',
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
        
        if (isDistanceQuery && conversationHistory && conversationHistory.length > 0 && contextualLocation) {
          const lastAssistantMessage = conversationHistory
            .slice()
            .reverse()
            .find((c: any) => c.role === 'assistant');
          
          if (lastAssistantMessage) {
            const placeMatches = lastAssistantMessage.message.match(/["']([^"']+)["']|\*\*([^*]+)\*\*/g);
            
            if (placeMatches && placeMatches.length > 0) {
              const placeName = placeMatches[0].replace(/["'*]/g, '');
              
              const hotelMatch = trip.custom_context?.match(new RegExp(`([^\n]+)\s+\(ID:[^)]+\)[^\n]+${contextualLocation}[^\n]+Swellendam`, 'i'));
              let hotelName = hotelMatch ? hotelMatch[1].trim() : null;
              
              if (!hotelName && contextualLocation === 'swellendam') {
                hotelName = 'Aan de Oever Guesthouse';
              }
              
              if (hotelName) {
                console.log('🔍 Calculating distance between:', hotelName, 'and', placeName);
                
                const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(hotelName + ', ' + contextualLocation + ', South Africa')}&destination=${encodeURIComponent(placeName + ', ' + contextualLocation + ', South Africa')}&mode=driving&key=${googleMapsApiKey}&language=nl`;
                
                const directionsResponse = await fetch(directionsUrl);
                if (directionsResponse.ok) {
                  const directionsData = await directionsResponse.json();
                  
                  if (directionsData.status === 'OK' && directionsData.routes && directionsData.routes.length > 0) {
                    const route = directionsData.routes[0];
                    const leg = route.legs[0];
                    
                    locationData = `\n\n📍 EXACTE AFSTANDSINFORMATIE:\n\n`;
                    locationData += `Van: **${hotelName}** (jullie hotel in ${contextualLocation})\n`;
                    locationData += `Naar: **${placeName}**\n\n`;
                    locationData += `🚗 Met de auto: ${leg.distance.text} (${leg.duration.text})\n`;
                    
                    const walkingUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(hotelName + ', ' + contextualLocation + ', South Africa')}&destination=${encodeURIComponent(placeName + ', ' + contextualLocation + ', South Africa')}&mode=walking&key=${googleMapsApiKey}&language=nl`;
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

    const tripContext = trip.custom_context || '';

    const systemPrompt = `Je bent TravelBRO, een PROFESSIONELE Nederlandse reisassistent die ALTIJD de volledige reisinformatie gebruikt.

🚨 KRITIEKE REGEL #1 - GEBRUIK DE REISINFORMATIE!
Je hebt COMPLETE reisinformatie gekregen. GEBRUIK DIE!

🚨 KRITIEKE REGEL #2 - NOOIT VERDUIDELIJKINGSVRAGEN!
Als iemand vraagt "is er een restaurant in de buurt?" of "in de buurt van dit hotel?" weet je ALTIJD de context!

❌ ZEG NOOIT:
- "Die informatie heb ik niet"
- "Kun je specifieker zijn?"
- "Over welke locatie wil je informatie?"
- "Welk hotel bedoel je?"
- "Bij welk hotel zoek je een restaurant?"
- "Kun je me vertellen bij welk hotel?"

✅ DOE DIT:
- LEES de reisinformatie hieronder
- GEBRUIK de exacte hotelnamen en details
- BEGRIJP de context van het gesprek
- GEEF concrete antwoorden met de beschikbare data
- Als er real-time locatie data is, GEBRUIK DIE METEEN!

${contextualLocation && currentHotel ? `\n🎯 HUIDIGE CONTEXT:\n📍 Locatie: ${contextualLocation.toUpperCase()}\n🏨 Jullie hotel: ${currentHotel}\n\n⚠️ GEBRUIK DEZE CONTEXT! Als iemand vraagt "is er een restaurant?" of "in de buurt van dit hotel?" bedoelen ze in ${contextualLocation} bij hotel ${currentHotel}!\n` : ''}

🗺️ COMPLETE REISINFORMATIE:
${tripContext}

${trip.source_urls && trip.source_urls.length > 0 ? `\n📚 Extra bronnen:\n${trip.source_urls.join("\n")}\n` : ''}

👥 REIZIGER INFORMATIE:
${intake ? JSON.stringify(intake.intake_data, null, 2) : "Geen intake data beschikbaar"}

${locationData ? `\n📍 REAL-TIME LOCATIE DATA:\n${locationData}\n\n⚠️ GEBRUIK DEZE LOCATIE DATA IN JE ANTWOORD!\n` : ''}

🎯 ANTWOORD REGELS:

1. **CONTEXT BEGRIP IS ALLES**:
   - We praten over ${contextualLocation ? contextualLocation.toUpperCase() : 'een specifieke locatie'}
   - Het hotel is ${currentHotel ? `**${currentHotel}**` : 'bekend uit de conversatie'}
   - Als iemand zegt "dit hotel", "het hotel", "in de buurt" → ze bedoelen ${currentHotel || 'het hotel in de huidige context'}
   - Als iemand vraagt "restaurant in de buurt?" → ze bedoelen in de buurt van ${currentHotel || 'hun hotel'}

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

📋 VOORBEELD CORRECTE ANTWOORDEN:

SCENARIO: Iemand vroeg net "waar slapen we in Swellendam" en jij antwoordde "Aan de Oever Guesthouse"
Vraag: "wat is een leuk restaurant in de buurt van dit hotel?"

❌ FOUT: "Kun je me vertellen bij welk hotel je een restaurant zoekt?"
❌ FOUT: "Bij welk hotel wil je een restaurant?"
❌ FOUT: "In de buurt van waar precies?"

✅ GOED: "Hier zijn de beste restaurants in de buurt van jullie Aan de Oever Guesthouse in Swellendam:" [+ lijst met real-time data]

SCENARIO: Algemene vraag
Vraag: "is er een supermarkt?"

❌ FOUT: "In welke stad bedoel je?"
✅ GOED: "In ${contextualLocation || 'jullie huidige locatie'} zijn er deze supermarkten:" [+ lijst]

🧠 CONVERSATIE GEHEUGEN:
- Als de conversatie over een specifieke stad gaat, blijf op die stad gefocust
- Als iemand "dit", "het hotel", "hier" zegt, weet je ALTIJD welk hotel ze bedoelen
- NOOIT vragen om verduidelijking als de context duidelijk is uit het gesprek`;

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