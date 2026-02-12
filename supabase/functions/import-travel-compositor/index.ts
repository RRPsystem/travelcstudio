import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Direct TC API (same as RBS-plugin uses)
const TC_API_BASE = "https://online.travelcompositor.com/resources";

// Cache tokens in memory per micrositeId (per Edge Function instance)
const tokenCache: Record<string, { token: string; expiresAt: number }> = {};

// Cache DB credentials in memory (refreshed per cold start)
let dbCredentialsCache: Array<{ microsite_id: string; username: string; password: string; name: string }> | null = null;
let dbCredentialsCacheTime = 0;
const DB_CACHE_TTL = 300_000; // 5 minutes

// Create Supabase service-role client for reading tc_microsites
function getServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey);
}

// Load all active TC credentials from database
async function loadDbCredentials(): Promise<Array<{ microsite_id: string; username: string; password: string; name: string }>> {
  if (dbCredentialsCache && Date.now() - dbCredentialsCacheTime < DB_CACHE_TTL) {
    return dbCredentialsCache;
  }
  try {
    const sb = getServiceClient();
    const { data, error } = await sb
      .from("tc_microsites")
      .select("microsite_id, username, password, name")
      .eq("is_active", true);
    if (error) {
      console.error("[TC Auth] Error loading tc_microsites:", error.message);
      return dbCredentialsCache || [];
    }
    dbCredentialsCache = data || [];
    dbCredentialsCacheTime = Date.now();
    console.log(`[TC Auth] Loaded ${dbCredentialsCache.length} microsites from database`);
    return dbCredentialsCache;
  } catch (err: any) {
    console.error("[TC Auth] Failed to load tc_microsites:", err.message);
    return dbCredentialsCache || [];
  }
}

// Find credentials: database first, then env vars fallback
async function getCredentialsForMicrosite(micrositeId: string): Promise<{ username: string; password: string }> {
  // 1. Try database (tc_microsites table)
  const dbCreds = await loadDbCredentials();
  const dbMatch = dbCreds.find(c => c.microsite_id === micrositeId);
  if (dbMatch) {
    console.log(`[TC Auth] Found credentials in database for microsite: ${micrositeId} (${dbMatch.name})`);
    return { username: dbMatch.username, password: dbMatch.password };
  }

  // 2. Fallback: scan numbered env vars (legacy)
  for (let i = 1; i <= 10; i++) {
    const msId = Deno.env.get(`TRAVEL_COMPOSITOR_MICROSITE_ID_${i}`);
    if (msId && msId === micrositeId) {
      const username = Deno.env.get(`TRAVEL_COMPOSITOR_USERNAME_${i}`);
      const password = Deno.env.get(`TRAVEL_COMPOSITOR_PASSWORD_${i}`);
      if (username && password) {
        console.log(`[TC Auth] Found credentials in env set ${i} for microsite: ${micrositeId}`);
        return { username, password };
      }
    }
  }

  // 3. Fallback: simple TC_API_USERNAME / TC_API_PASSWORD
  const fallbackUser = Deno.env.get("TC_API_USERNAME");
  const fallbackPass = Deno.env.get("TC_API_PASSWORD");
  if (fallbackUser && fallbackPass) {
    console.log(`[TC Auth] Using fallback TC_API_USERNAME for microsite: ${micrositeId}`);
    return { username: fallbackUser, password: fallbackPass };
  }

  throw new Error(
    `Geen TC credentials gevonden voor microsite "${micrositeId}". ` +
    `Voeg credentials toe in Brand Instellingen > Travel Compositor.`
  );
}

// Get list of all configured microsites: database + env vars
async function getConfiguredMicrosites(): Promise<Array<{ id: string; index: number }>> {
  const result: Array<{ id: string; index: number }> = [];
  const seen = new Set<string>();

  // 1. Database microsites
  const dbCreds = await loadDbCredentials();
  dbCreds.forEach((c, i) => {
    if (!seen.has(c.microsite_id)) {
      result.push({ id: c.microsite_id, index: 100 + i });
      seen.add(c.microsite_id);
    }
  });

  // 2. Env var microsites (legacy fallback)
  for (let i = 1; i <= 10; i++) {
    const msId = Deno.env.get(`TRAVEL_COMPOSITOR_MICROSITE_ID_${i}`);
    if (msId && !seen.has(msId)) {
      result.push({ id: msId, index: i });
      seen.add(msId);
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

  const { username, password } = await getCredentialsForMicrosite(micrositeId);

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
    const allMicrosites = await getConfiguredMicrosites();
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
    fromDay: d.fromDay || 0,
    toDay: d.toDay || 0,
    type: d.type || "",
  }));

  // Log ALL raw hotel keys for debugging
  if (detail.hotels?.[0]) {
    console.log(`[BuildTravel] Raw hotel[0] ALL keys: ${Object.keys(detail.hotels[0]).join(', ')}`);
    console.log(`[BuildTravel] Raw hotel[0] full: ${JSON.stringify(detail.hotels[0]).substring(0, 1500)}`);
    if (detail.hotels[0].hotelData) {
      console.log(`[BuildTravel] Raw hotel[0].hotelData keys: ${Object.keys(detail.hotels[0].hotelData).join(', ')}`);
    }
  }

  const hotels = (detail.hotels || []).map((h: any, idx: number) => {
    const hd = h.hotelData || {};
    return {
      name: hd.name || "",
      category: hd.category || "",
      description: hd.description || "",
      shortDescription: hd.shortDescription || "",
      highlights: hd.highlights || [],
      address: hd.address || "",
      city: hd.city || (typeof h.destination === 'object' ? h.destination?.name : h.destination) || h.city || (typeof hd.destination === 'object' ? hd.destination?.name : hd.destination) || "",
      destination: (typeof h.destination === 'object' ? h.destination?.name : h.destination) || (typeof hd.destination === 'object' ? hd.destination?.name : hd.destination) || "",
      nights: h.nights || 0,
      day: h.day || 0, // Which day of the trip this hotel starts
      roomAmenities: [],
      mealPlan: h.mealPlan || h.mealPlanDescription || "",
      mealPlanDescription: h.mealPlan || h.mealPlanDescription || "",
      mealsIncluded: [],
      roomType: h.roomTypes || h.roomDescription || h.roomType || h.room || "",
      checkIn: h.checkInDate || h.checkIn || h.startDate || h.dateFrom || "",
      checkOut: h.checkOutDate || h.checkOut || h.endDate || h.dateTo || "",
      facilities: hd.facilities || {},
      services: [],
      images: (hd.images || []).map((img: any) => typeof img === "string" ? img : img.url),
      price: h.priceBreakdown?.totalPrice?.microsite?.amount || 0,
      pricePerNight: h.nights > 0 ? Math.round((h.priceBreakdown?.totalPrice?.microsite?.amount || 0) / h.nights) : 0,
      checkInTime: hd.checkInTime || "",
      checkOutTime: hd.checkOutTime || "",
      // ALL raw keys for debugging
      _rawKeys: Object.keys(h).join(', '),
    };
  });

  const allImages: string[] = [];
  // Destination images
  destinations.forEach((d: any) => (d.images || []).forEach((img: string) => { if (!allImages.includes(img)) allImages.push(img); }));
  // Hotel images
  hotels.forEach((h: any) => (h.images || []).forEach((img: string) => { if (!allImages.includes(img)) allImages.push(img); }));

  const transports = (detail.transports || []).map((t: any) => ({
    type: t.transportType === "FLIGHT" ? "flight" : "transport",
    day: t.day || 0,
    departureDate: t.departureDate || "",
    departureTime: t.departureTime || "",
    arrivalDate: t.arrivalDate || "",
    arrivalTime: t.arrivalTime || "",
    duration: t.duration || "",
    price: t.priceBreakdown?.totalPrice?.microsite?.amount || 0,
    company: t.company || "",
    transportNumber: t.transportNumber || "",
    fare: t.fare || "",
    originCode: t.originCode || "",
    targetCode: t.targetCode || "",
    originDestinationCode: t.originDestinationCode || "",
    targetDestinationCode: t.targetDestinationCode || "",
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
    
    // Cruises (CruiseDataSheetVO) - NO dates, only ports/nights/ship info
    cruises: rawTcData.cruises || [],
    
    // ClosedTours (IdeaClosedTourVO) - HAS dates (startDate/endDate), may contain cruises
    closedTours: rawTcData.closedTours || [],
    
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
