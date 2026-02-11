import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Direct TC API (same as RBS-plugin uses)
const TC_API_BASE = "https://online.travelcompositor.com/resources";

// Cache tokens in memory per micrositeId (per Edge Function instance)
const tokenCache: Record<string, { token: string; expiresAt: number }> = {};

// Find credentials for a micrositeId by scanning numbered env vars
// Pattern: TRAVEL_COMPOSITOR_USERNAME_N, TRAVEL_COMPOSITOR_PASSWORD_N, TRAVEL_COMPOSITOR_MICROSITE_ID_N
function getCredentialsForMicrosite(micrositeId: string): { username: string; password: string } {
  // Scan numbered credential sets (1..10)
  for (let i = 1; i <= 10; i++) {
    const msId = Deno.env.get(`TRAVEL_COMPOSITOR_MICROSITE_ID_${i}`);
    if (msId && msId === micrositeId) {
      const username = Deno.env.get(`TRAVEL_COMPOSITOR_USERNAME_${i}`);
      const password = Deno.env.get(`TRAVEL_COMPOSITOR_PASSWORD_${i}`);
      if (username && password) {
        console.log(`[TC Auth] Found credentials set ${i} for microsite: ${micrositeId}`);
        return { username, password };
      }
    }
  }

  // Fallback: try simple TC_API_USERNAME / TC_API_PASSWORD
  const fallbackUser = Deno.env.get("TC_API_USERNAME");
  const fallbackPass = Deno.env.get("TC_API_PASSWORD");
  if (fallbackUser && fallbackPass) {
    console.log(`[TC Auth] Using fallback TC_API_USERNAME for microsite: ${micrositeId}`);
    return { username: fallbackUser, password: fallbackPass };
  }

  throw new Error(
    `Geen TC credentials gevonden voor microsite "${micrositeId}". ` +
    `Stel TRAVEL_COMPOSITOR_USERNAME_N, TRAVEL_COMPOSITOR_PASSWORD_N en TRAVEL_COMPOSITOR_MICROSITE_ID_N in als Supabase secrets.`
  );
}

// Get list of all configured microsites
function getConfiguredMicrosites(): Array<{ id: string; index: number }> {
  const result: Array<{ id: string; index: number }> = [];
  for (let i = 1; i <= 10; i++) {
    const msId = Deno.env.get(`TRAVEL_COMPOSITOR_MICROSITE_ID_${i}`);
    if (msId) {
      result.push({ id: msId, index: i });
    }
  }
  return result;
}

async function getTcToken(micrositeId: string): Promise<string> {
  // Return cached token if still valid (60s safety margin)
  const cached = tokenCache[micrositeId];
  if (cached && Date.now() / 1000 < cached.expiresAt - 60) {
    console.log(`[TC Auth] Using cached token for ${micrositeId} (expires in ${Math.round(cached.expiresAt - Date.now() / 1000)}s)`);
    return cached.token;
  }

  const { username, password } = getCredentialsForMicrosite(micrositeId);

  console.log(`[TC Auth] Fetching new token for microsite: ${micrositeId}`);
  const authUrl = `${TC_API_BASE}/authentication/authenticate`;
  const authResponse = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, micrositeId }),
  });

  if (!authResponse.ok) {
    const errText = await authResponse.text();
    console.error(`[TC Auth] Failed: ${authResponse.status}`, errText);
    throw new Error(`TC authenticatie mislukt voor ${micrositeId} (${authResponse.status}). Controleer credentials.`);
  }

  const authResult = await authResponse.json();
  if (!authResult.token) {
    throw new Error(`TC authenticatie voor ${micrositeId} gaf geen token terug`);
  }

  tokenCache[micrositeId] = {
    token: authResult.token,
    expiresAt: Date.now() / 1000 + (authResult.expirationInSeconds || 3600),
  };
  console.log(`[TC Auth] Token cached for ${micrositeId} (expires in ${authResult.expirationInSeconds}s)`);
  return authResult.token;
}

// Fetch from TC API with auth token, try IDEAS endpoint first, then PACKAGE
async function tcApiFetch(micrositeId: string, path: string): Promise<any> {
  const token = await getTcToken(micrositeId);

  // Try IDEAS endpoint first
  const ideasUrl = `${TC_API_BASE}/travelidea/${micrositeId}${path}`;
  console.log(`[TC API] Trying IDEAS: ${ideasUrl}`);

  let response = await fetch(ideasUrl, {
    method: "GET",
    headers: { "auth-token": token },
  });

  let result = null;
  if (response.ok) {
    result = await response.json();
    // Check if IDEAS returned an error (status: NOT_FOUND)
    if (!result || result.error || result.status === "NOT_FOUND") {
      console.log(`[TC API] IDEAS returned error/not-found, trying PACKAGE`);
      result = null;
    } else {
      console.log(`[TC API] IDEAS succeeded`);
      return result;
    }
  } else {
    console.log(`[TC API] IDEAS failed (${response.status}), trying PACKAGE`);
  }

  // Fallback to PACKAGE endpoint
  const packageUrl = `${TC_API_BASE}/package/${micrositeId}${path}`;
  console.log(`[TC API] Trying PACKAGE: ${packageUrl}`);

  response = await fetch(packageUrl, {
    method: "GET",
    headers: { "auth-token": token },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[TC API] PACKAGE also failed (${response.status})`, errText);
    return null;
  }

  result = await response.json();
  if (!result || result.error || result.status === "NOT_FOUND") {
    console.log(`[TC API] PACKAGE returned error/not-found`);
    return null;
  }

  console.log(`[TC API] PACKAGE succeeded`);
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { travelId, micrositeId, skipGeocode, action } = body;
    const microsite = micrositeId || "rondreis-planner";

    // ACTION: list — return all ideas for a microsite
    if (action === "list") {
      const first = body.first || 0;
      const limit = body.limit || 500;
      console.log(`[Import TC] Listing ideas for ${microsite} (first=${first}, limit=${limit})`);

      const listResult = await tcApiFetch(microsite, `?first=${first}&limit=${limit}&lang=nl`);
      if (!listResult) {
        return new Response(
          JSON.stringify({ error: "Kon reizen niet ophalen van Travel Compositor" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // TC API returns { pagination: {...}, idea: [...] }
      const ideas = listResult.idea || listResult.ideas || [];
      const pagination = listResult.pagination || {};

      const travels = ideas.filter((i: any) => i !== null).map((idea: any) => ({
        id: String(idea.id),
        title: idea.title || idea.largeTitle || "",
        image: idea.imageUrl || null,
        destinations: idea.destinations || [],
        price: idea.totalPrice || idea.pricePerPerson || null,
        nights: idea.counters?.hotelNights || 0,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          micrositeId: microsite,
          count: pagination.totalResults || travels.length,
          pagination,
          travels,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: single idea — fetch info + details
    if (!travelId) {
      return new Response(
        JSON.stringify({ error: "travelId is required (of gebruik action: 'list')" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build list of microsites to try: requested one first, then all others
    const allMicrosites = getConfiguredMicrosites();
    const fallbackMsId = Deno.env.get("TRAVEL_COMPOSITOR_MICROSITE_ID");
    
    // Collect unique microsite IDs to try
    const micrositesToTry: string[] = [];
    // 1. The explicitly requested microsite
    if (microsite) micrositesToTry.push(microsite);
    // 2. All numbered microsites
    for (const ms of allMicrosites) {
      if (!micrositesToTry.includes(ms.id)) micrositesToTry.push(ms.id);
    }
    // 3. Fallback microsite
    if (fallbackMsId && !micrositesToTry.includes(fallbackMsId)) {
      micrositesToTry.push(fallbackMsId);
    }

    console.log(`[Import TC] Will try ${micrositesToTry.length} microsites for travel ${travelId}: ${micrositesToTry.join(', ')}`);

    let travelInfo = null;
    let travelDetails = null;
    let foundMicrosite = '';

    for (const msId of micrositesToTry) {
      try {
        console.log(`[Import TC] Trying microsite: ${msId}`);
        const [info, details] = await Promise.all([
          tcApiFetch(msId, `/info/${travelId}?lang=nl`),
          tcApiFetch(msId, `/${travelId}?lang=nl`),
        ]);

        if (info || details) {
          travelInfo = info;
          travelDetails = details;
          foundMicrosite = msId;
          console.log(`[Import TC] ✓ Found travel ${travelId} at microsite: ${msId}`);
          break;
        }
        console.log(`[Import TC] ✗ Not found at ${msId}`);
      } catch (err: any) {
        console.log(`[Import TC] ✗ Error at ${msId}: ${err.message}`);
        // Continue to next microsite
      }
    }

    if (!travelInfo && !travelDetails) {
      return new Response(
        JSON.stringify({
          error: `Reis ${travelId} niet gevonden`,
          message: `Reis ${travelId} kon niet worden opgehaald bij ${micrositesToTry.length} microsites. Controleer het reis-ID.`,
          triedMicrosites: micrositesToTry,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build combined data from info + details (matching builder API format)
    const info = travelInfo || {};
    const detail = travelDetails || {};

    const combinedData = buildTravelData(info, detail, travelId);
    const response = await processAndReturnTravel(combinedData, detail, travelId, skipGeocode);
    
    // Inject the found microsite into the response for reference
    if (foundMicrosite) {
      try {
        const respBody = await response.json();
        respBody.sourceMicrosite = foundMicrosite;
        return new Response(
          JSON.stringify(respBody),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (_) {
        return response;
      }
    }
    return response;

  } catch (error: any) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Import failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Build formatted travel data from TC info + details (like builder API used to do)
function buildTravelData(info: any, detail: any, travelId: string) {
  const destinations = (detail.destinations || []).map((d: any) => ({
    name: d.name || "",
    country: d.country || "",
    description: d.description || "",
    highlights: d.highlights || [],
    images: d.imageUrls || [],
    geolocation: d.geolocation || null,
  }));

  const hotels = (detail.hotels || []).map((h: any) => {
    const hd = h.hotelData || {};
    return {
      name: hd.name || "",
      category: hd.category || "",
      description: hd.description || "",
      shortDescription: hd.shortDescription || "",
      highlights: hd.highlights || [],
      address: hd.address || "",
      nights: h.nights || 0,
      roomAmenities: [],
      mealPlan: h.mealPlan || "",
      mealPlanDescription: h.mealPlan || "",
      mealsIncluded: [],
      facilities: hd.facilities || {},
      services: [],
      images: (hd.images || []).map((img: any) => typeof img === "string" ? img : img.url),
      price: h.priceBreakdown?.totalPrice?.microsite?.amount || 0,
      pricePerNight: h.nights > 0 ? Math.round((h.priceBreakdown?.totalPrice?.microsite?.amount || 0) / h.nights) : 0,
      checkInTime: hd.checkInTime || "",
      checkOutTime: hd.checkOutTime || "",
    };
  });

  const allImages: string[] = [];
  // Destination images
  destinations.forEach((d: any) => (d.images || []).forEach((img: string) => { if (!allImages.includes(img)) allImages.push(img); }));
  // Hotel images
  hotels.forEach((h: any) => (h.images || []).forEach((img: string) => { if (!allImages.includes(img)) allImages.push(img); }));

  const transports = (detail.transports || []).map((t: any) => ({
    type: t.transportType === "FLIGHT" ? "flight" : "transport",
    departureDate: t.departureDate || "",
    departureTime: t.departureTime || "",
    arrivalDate: t.arrivalDate || "",
    arrivalTime: t.arrivalTime || "",
    duration: t.duration || "",
    price: t.priceBreakdown?.totalPrice?.microsite?.amount || 0,
    company: t.company || "",
    transportNumber: t.transportNumber || "",
    fare: t.fare || "",
  }));

  const totalPrice = info.totalPrice?.amount || 0;
  const pricePerPerson = info.pricePerPerson?.amount || 0;

  return {
    tc_idea_id: String(info.id || travelId),
    title: info.title || info.largeTitle || `Reis ${travelId}`,
    description: info.description || "",
    intro_text: info.remarks || "",
    short_description: "",
    featured_image: info.imageUrl || allImages[0] || "",
    all_images: allImages,
    duration_days: (info.counters?.hotelNights || 0) + 1,
    duration_nights: info.counters?.hotelNights || 0,
    destinations,
    destination_names: destinations.map((d: any) => d.name),
    countries: [...new Set(destinations.map((d: any) => d.country).filter(Boolean))],
    hotels,
    flights: transports.filter((t: any) => t.type === "flight"),
    other_transports: transports.filter((t: any) => t.type !== "flight"),
    car_rentals: detail.cars || [],
    activities: detail.tickets || [],
    itinerary: info.itinerary || [],
    total_price: totalPrice,
    price_breakdown: {
      hotels: hotels.reduce((sum: number, h: any) => sum + (h.price || 0), 0),
      flights: transports.filter((t: any) => t.type === "flight").reduce((sum: number, t: any) => sum + (t.price || 0), 0),
      otherTransport: transports.filter((t: any) => t.type !== "flight").reduce((sum: number, t: any) => sum + (t.price || 0), 0),
      carRentals: 0,
      activities: 0,
      other: 0,
    },
    currency: info.totalPrice?.currency || "EUR",
    price_per_person: pricePerPerson,
    travelers: {
      adults: info.counters?.adults || 2,
      children: info.counters?.children || 0,
      infants: 0,
      childAges: [],
    },
    included: [],
    not_included: [],
    practical_info: {},
    trip_highlights: [],
    selling_points: [],
    ai_summary: `${info.title || ""} - ${(info.counters?.hotelNights || 0) + 1} dagen / ${info.counters?.hotelNights || 0} nachten\nBestemmingen: ${destinations.map((d: any) => d.name).join(", ")}\nLanden: ${[...new Set(destinations.map((d: any) => d.country).filter(Boolean))].join(", ")}\nTotaalprijs: €${totalPrice} (€${pricePerPerson} p.p.)`,
    all_texts: {
      trip_intro: info.remarks || "",
      trip_description: info.description || "",
      short_description: "",
      destination_descriptions: destinations.map((d: any) => ({ name: d.name, description: d.description })),
      hotel_descriptions: hotels.map((h: any) => ({ name: h.name, description: h.description, shortDescription: h.shortDescription, highlights: h.highlights })),
      day_descriptions: [],
    },
    language: "NL",
  };
}

// Helper function to strip HTML tags and decode entities
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Geocode a destination name using Nominatim (free, no API key)
async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TravelCStudio/1.0' }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
    return null;
  } catch (error) {
    console.error(`[Geocode] Error for "${address}":`, error);
    return null;
  }
}

// Geocode all destinations that don't have coordinates
async function geocodeDestinations(destinations: any[]): Promise<any[]> {
  if (!Array.isArray(destinations) || destinations.length === 0) return destinations;

  const results = [];
  for (const dest of destinations) {
    // Skip if already has valid coordinates
    if (dest.geolocation?.latitude && dest.geolocation?.longitude) {
      results.push(dest);
      continue;
    }

    const searchQuery = dest.country ? `${dest.name}, ${dest.country}` : dest.name;
    console.log(`[Geocode] Looking up: ${searchQuery}`);
    const coords = await geocodeAddress(searchQuery);

    if (coords) {
      console.log(`[Geocode] Found: ${searchQuery} → ${coords.latitude}, ${coords.longitude}`);
      results.push({ ...dest, geolocation: coords });
    } else {
      console.warn(`[Geocode] Not found: ${searchQuery}`);
      results.push(dest);
    }

    // Nominatim rate limit: 1 request per second
    await new Promise(resolve => setTimeout(resolve, 1100));
  }

  return results;
}

async function processAndReturnTravel(data: any, rawTcData: any, travelId: string, skipGeocode?: boolean) {
  // Log raw data for debugging
  console.log(`[Import TC] Formatted data keys:`, Object.keys(data));
  console.log(`[Import TC] Raw TC data keys:`, Object.keys(rawTcData));
  console.log(`[Import TC] Raw transports:`, rawTcData.transports?.length || 0);
  console.log(`[Import TC] Raw cars:`, rawTcData.cars?.length || 0);
  
  // Map builder API response to our format
  // Use formatted data for most fields, but raw TC data for transports/cars
  const travel = {
    id: data.tc_idea_id || data.id || travelId,
    title: data.title || data.name || `Reis ${travelId}`,
    description: stripHtml(data.description || data.long_description || ""),
    introText: stripHtml(data.intro_text || data.short_description || ""),
    numberOfNights: data.duration_nights || data.numberOfNights || 0,
    numberOfDays: data.duration_days || data.numberOfDays || 0,
    pricePerPerson: data.price_per_person || data.total_price || 0,
    priceDescription: data.price_description || "",
    heroImage: data.featured_image || data.imageUrl || data.all_images?.[0] || "",
    heroVideoUrl: data.video_url || data.heroVideoUrl || "",
    
    // All images
    images: data.all_images || data.images || [],
    
    // Destinations - from formatted data (has descriptions) - geocoded below
    destinations: data.destinations || rawTcData.destinations || [],
    destinationNames: data.destination_names || [],
    
    // Countries
    countries: data.countries || [],
    
    // Hotels with full details
    hotels: data.hotels || rawTcData.hotels || [],
    
    // Transports (all) - from RAW TC data
    transports: rawTcData.transports || [],
    
    // Flights - transportType === 'FLIGHT'
    flights: rawTcData.transports?.filter((t: any) => 
      t.transportType === 'FLIGHT'
    ) || data.flights || [],
    
    // Transfers - transportType !== 'FLIGHT' (e.g. CAR/DAYTRIP transfers)
    transfers: rawTcData.transports?.filter((t: any) => 
      t.transportType !== 'FLIGHT'
    ) || [],
    
    // Cruises - separate array in TC raw data
    cruises: rawTcData.cruises || [],
    
    // Car rentals - separate array in TC raw data
    carRentals: rawTcData.cars || data.car_rentals || [],
    
    // Tickets/Activities/Excursions - from TC tickets array
    activities: rawTcData.tickets || rawTcData.activities || data.activities || [],
    
    // Excursions (if separate)
    excursions: rawTcData.excursions || data.excursions || [],
    
    // Itinerary / day program
    itinerary: data.itinerary || data.day_by_day || [],
    
    // Included/Excluded
    included: data.included || [],
    excluded: data.not_included || data.excluded || [],
    
    // Highlights and selling points
    highlights: data.trip_highlights || data.highlights || [],
    sellingPoints: data.selling_points || [],
    
    // Practical info
    practicalInfo: data.practical_info || {},
    
    // Price breakdown
    priceBreakdown: data.price_breakdown || {},
    currency: data.currency || "EUR",
    
    // Travelers info
    travelers: data.travelers || {},
    
    // AI summary for quick reference
    aiSummary: data.ai_summary || "",
    
    // All texts bundled
    allTexts: data.all_texts || {},
    
    // Route map
    routeMapUrl: data.route_map_url || data.routeMapUrl || "",
    
    // Store raw TC data for reference
    rawTcData: rawTcData,
  };

  console.log(`[Import TC] Processed travel: ${travel.title}`);
  console.log(`[Import TC] Hotels: ${travel.hotels?.length || 0}, Flights: ${travel.flights?.length || 0}, Cars: ${travel.carRentals?.length || 0}, Images: ${travel.images?.length || 0}`);
  console.log(`[Import TC] Cruises: ${travel.cruises?.length || 0}, Transfers: ${travel.transfers?.length || 0}, Activities: ${travel.activities?.length || 0}`);
  console.log(`[Import TC] Destinations with descriptions: ${travel.destinations?.filter((d: any) => d.description)?.length || 0}`);

  // Geocode destinations server-side so the client gets lat/lng immediately
  // Skip geocoding during bulk imports to prevent timeouts
  if (!skipGeocode && travel.destinations && travel.destinations.length > 0) {
    console.log(`[Import TC] Geocoding ${travel.destinations.length} destinations...`);
    travel.destinations = await geocodeDestinations(travel.destinations);
    const geocoded = travel.destinations.filter((d: any) => d.geolocation?.latitude).length;
    console.log(`[Import TC] Geocoded ${geocoded}/${travel.destinations.length} destinations`);
  } else if (skipGeocode) {
    console.log(`[Import TC] Skipping geocoding (bulk import mode)`);
  }

  return new Response(
    JSON.stringify(travel),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function normalizeDestinations(destinations: any[]): any[] {
  if (!Array.isArray(destinations)) return [];
  
  return destinations.map((dest, index) => ({
    name: dest.name || dest.city || dest.title || `Bestemming ${index + 1}`,
    country: dest.country || dest.countryName || "",
    nights: dest.nights || dest.numberOfNights || 0,
    description: dest.description || "",
    imageUrls: dest.imageUrls || dest.images || (dest.imageUrl ? [dest.imageUrl] : []),
    order: dest.order || index,
  }));
}

function extractCountries(data: any): string[] {
  const countries = new Set<string>();
  
  if (data.countries && Array.isArray(data.countries)) {
    data.countries.forEach((c: any) => {
      if (typeof c === "string") countries.add(c);
      else if (c.name) countries.add(c.name);
    });
  }
  
  if (data.destinations && Array.isArray(data.destinations)) {
    data.destinations.forEach((d: any) => {
      if (d.country) countries.add(d.country);
      if (d.countryName) countries.add(d.countryName);
    });
  }
  
  return Array.from(countries);
}

function normalizeHotels(hotels: any[]): any[] {
  if (!Array.isArray(hotels)) return [];
  
  return hotels.map((hotel, index) => ({
    name: hotel.name || hotel.title || `Hotel ${index + 1}`,
    stars: hotel.stars || hotel.rating || hotel.category || 0,
    location: hotel.location || hotel.city || hotel.destination || "",
    description: hotel.description || "",
    imageUrl: hotel.imageUrl || hotel.image || hotel.images?.[0] || "",
    amenities: hotel.amenities || hotel.facilities || [],
  }));
}

function normalizeItinerary(itinerary: any[]): any[] {
  if (!Array.isArray(itinerary)) return [];
  
  return itinerary.map((day, index) => ({
    day: day.day || day.dayNumber || index + 1,
    title: day.title || day.name || `Dag ${index + 1}`,
    description: day.description || day.content || "",
    activities: day.activities || day.items || [],
    destination: day.destination || day.location || "",
    meals: day.meals || { breakfast: false, lunch: false, dinner: false },
    imageUrl: day.imageUrl || day.image || "",
  }));
}
