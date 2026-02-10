import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TC_API_BASE = "https://online.travelcompositor.com/resources";

// Token cache per micrositeId
const tokenCache: Record<string, { token: string; expiresAt: number }> = {};

function getCredentialsForMicrosite(micrositeId: string): { username: string; password: string } {
  for (let i = 1; i <= 10; i++) {
    const msId = Deno.env.get(`TRAVEL_COMPOSITOR_MICROSITE_ID_${i}`);
    if (msId && msId === micrositeId) {
      const username = Deno.env.get(`TRAVEL_COMPOSITOR_USERNAME_${i}`);
      const password = Deno.env.get(`TRAVEL_COMPOSITOR_PASSWORD_${i}`);
      if (username && password) return { username, password };
    }
  }
  const fallbackUser = Deno.env.get("TC_API_USERNAME");
  const fallbackPass = Deno.env.get("TC_API_PASSWORD");
  if (fallbackUser && fallbackPass) return { username: fallbackUser, password: fallbackPass };
  throw new Error(`Geen TC credentials voor microsite "${micrositeId}"`);
}

function getConfiguredMicrosites(): string[] {
  const result: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const msId = Deno.env.get(`TRAVEL_COMPOSITOR_MICROSITE_ID_${i}`);
    if (msId) result.push(msId);
  }
  return result;
}

async function getTcToken(micrositeId: string): Promise<string> {
  const cached = tokenCache[micrositeId];
  if (cached && Date.now() / 1000 < cached.expiresAt - 60) return cached.token;

  const { username, password } = getCredentialsForMicrosite(micrositeId);
  const authResponse = await fetch(`${TC_API_BASE}/authentication/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, micrositeId }),
  });

  if (!authResponse.ok) throw new Error(`TC auth failed (${authResponse.status})`);
  const authResult = await authResponse.json();
  if (!authResult.token) throw new Error("TC auth returned no token");

  tokenCache[micrositeId] = {
    token: authResult.token,
    expiresAt: Date.now() / 1000 + (authResult.expirationInSeconds || 3600),
  };
  return authResult.token;
}

// ============================================================
// ACCOMMODATION SEARCH
// ============================================================
// Resolve a free-text destination query to a TC destination ID
async function resolveDestinationId(token: string, micrositeId: string, query: string): Promise<string | null> {
  try {
    const response = await fetch(`${TC_API_BASE}/destination/${micrositeId}?lang=NL`, {
      headers: { "auth-token": token },
    });
    if (!response.ok) return null;
    const result = await response.json();
    const destinations = result.destinations || result.destination || [];
    
    const q = query.toLowerCase();
    // Try exact match first, then partial match
    const exact = destinations.find((d: any) => d.name?.toLowerCase() === q);
    if (exact) return exact.id || exact.code;
    
    const partial = destinations.find((d: any) => 
      d.name?.toLowerCase().includes(q) || q.includes(d.name?.toLowerCase())
    );
    if (partial) return partial.id || partial.code;
    
    // Try country match
    const countryMatch = destinations.find((d: any) => 
      d.country?.toLowerCase().includes(q) || d.countryName?.toLowerCase().includes(q)
    );
    if (countryMatch) return countryMatch.id || countryMatch.code;
    
    console.log(`[TC Search] No destination match for "${query}" among ${destinations.length} destinations`);
    return null;
  } catch (e) {
    console.warn(`[TC Search] Destination resolve failed:`, e);
    return null;
  }
}

async function searchAccommodations(micrositeId: string, params: any) {
  const token = await getTcToken(micrositeId);
  const { destination, checkIn, checkOut, adults, children, childAges } = params;

  // Build persons array
  const persons: any[] = [];
  for (let i = 0; i < (adults || 2); i++) persons.push({ age: 30 });
  if (children && childAges) {
    for (const age of childAges) persons.push({ age });
  }

  // Resolve destination name to TC destination ID
  let destinationId: string | null = null;
  if (destination) {
    destinationId = await resolveDestinationId(token, micrositeId, destination);
    console.log(`[TC Search] Resolved "${destination}" → destinationId: ${destinationId}`);
  }

  // Try preferred hotels first (static content, no dates needed)
  // This works even without a valid destinationId
  try {
    let prefUrl = `${TC_API_BASE}/accommodations/preferred/${micrositeId}?first=0&limit=20&lang=NL`;
    if (destinationId) prefUrl += `&destinationId=${destinationId}`;
    
    console.log(`[TC Search] Trying preferred hotels: ${prefUrl}`);
    const prefResponse = await fetch(prefUrl, { headers: { "auth-token": token } });
    
    if (prefResponse.ok) {
      const prefResult = await prefResponse.json();
      const hotels = prefResult.hotels || prefResult.accommodations || [];
      
      if (hotels.length > 0) {
        console.log(`[TC Search] Found ${hotels.length} preferred hotels`);
        // Filter by search query if no destinationId match
        const q = (destination || "").toLowerCase();
        const filtered = destinationId ? hotels : hotels.filter((h: any) => 
          h.name?.toLowerCase().includes(q) || 
          h.destinationName?.toLowerCase().includes(q) ||
          h.city?.toLowerCase().includes(q) ||
          h.country?.toLowerCase().includes(q)
        );
        
        return filtered.map((acc: any) => ({
          type: "hotel",
          id: acc.code || acc.accommodationId || acc.id,
          name: acc.name || "Onbekend hotel",
          stars: acc.category ? parseInt(acc.category) : 0,
          location: acc.destinationName || acc.city || "",
          country: acc.country || "",
          description: "",
          images: acc.imageUrls || acc.images || [],
          price: 0,
          currency: "EUR",
          roomType: "",
          mealPlan: "",
          geolocation: acc.geolocation || null,
          provider: "",
        }));
      }
    }
  } catch (e) {
    console.warn(`[TC Search] Preferred hotels failed, trying quote:`, e);
  }

  // Fallback: try the quote endpoint (needs valid dates + destinationId)
  if (!destinationId) {
    console.log(`[TC Search] No destinationId and no preferred hotels, returning empty`);
    return [];
  }

  const quoteBody: any = {
    checkIn,
    checkOut,
    persons,
    language: "NL",
    bestCombinations: true,
    destinationId,
  };

  console.log(`[TC Search] Accommodation quote:`, JSON.stringify(quoteBody));

  const response = await fetch(`${TC_API_BASE}/booking/accommodations/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "auth-token": token },
    body: JSON.stringify(quoteBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[TC Search] Accommodation quote failed (${response.status}):`, errText);
    // Don't throw - return empty instead
    return [];
  }

  const result = await response.json();
  const accommodations = result.accommodations || [];

  // Fetch datasheets for first 20 results to get photos/descriptions
  const accommodationIds = accommodations.slice(0, 20).map((a: any) => a.accommodationId).filter(Boolean);
  let datasheets: Record<string, any> = {};

  if (accommodationIds.length > 0) {
    try {
      const dsParams = accommodationIds.map((id: string) => `accommodationId=${id}`).join("&");
      const dsResponse = await fetch(`${TC_API_BASE}/accommodations/datasheet?${dsParams}&lang=NL`, {
        headers: { "auth-token": token },
      });
      if (dsResponse.ok) {
        const dsResult = await dsResponse.json();
        const sheets = dsResult.accommodations || dsResult.dataSheets || [];
        for (const ds of sheets) {
          if (ds.code || ds.accommodationId) {
            datasheets[ds.code || ds.accommodationId] = ds;
          }
        }
      }
    } catch (e) {
      console.warn("[TC Search] Datasheet fetch failed, continuing without:", e);
    }
  }

  // Map results
  return accommodations.map((acc: any) => {
    const ds = datasheets[acc.accommodationId] || {};
    const dsLang = ds.datasheets?.NL || ds.datasheets?.EN || Object.values(ds.datasheets || {})[0] || {};
    const bestCombo = acc.combinations?.[0];
    const price = bestCombo?.price?.amount || acc.fromPrice?.amount || 0;

    return {
      type: "hotel",
      id: acc.accommodationId,
      name: acc.name || ds.name || "Onbekend hotel",
      stars: acc.category ? parseInt(acc.category) : (ds.category ? parseInt(ds.category) : 0),
      location: acc.destinationName || ds.city || "",
      country: ds.country || "",
      description: dsLang.description || dsLang.shortDescription || "",
      images: ds.imageUrls || ds.images || [],
      price: price,
      currency: bestCombo?.price?.currency || "EUR",
      pricePerNight: 0,
      roomType: bestCombo?.rooms?.[0]?.roomName || "",
      mealPlan: bestCombo?.rooms?.[0]?.boardName || "",
      geolocation: ds.geolocation || null,
      combinationKey: bestCombo?.combinationKey || null,
      provider: acc.provider || "",
    };
  });
}

// ============================================================
// ACCOMMODATION LIST (static content, no dates needed)
// ============================================================
async function listAccommodations(micrositeId: string, params: any) {
  const token = await getTcToken(micrositeId);
  const { first, limit, destination, country } = params;

  // Use preferred hotels endpoint if available
  let url = `${TC_API_BASE}/accommodations/preferred/${micrositeId}?first=${first || 0}&limit=${limit || 20}&lang=NL`;
  if (destination) url += `&destinationId=${destination}`;
  if (country) url += `&countryCode=${country}`;

  const response = await fetch(url, {
    headers: { "auth-token": token },
  });

  if (!response.ok) {
    // Fallback to all accommodations
    const fallbackUrl = `${TC_API_BASE}/accommodations?first=${first || 0}&limit=${limit || 20}`;
    const fallbackResponse = await fetch(fallbackUrl, {
      headers: { "auth-token": token },
    });
    if (!fallbackResponse.ok) throw new Error(`Hotels ophalen mislukt`);
    const fallbackResult = await fallbackResponse.json();
    return (fallbackResult.accommodations || []).map(mapAccommodationListItem);
  }

  const result = await response.json();
  return (result.hotels || result.accommodations || []).map(mapAccommodationListItem);
}

function mapAccommodationListItem(acc: any) {
  return {
    type: "hotel",
    id: acc.code || acc.accommodationId || acc.id,
    name: acc.name || "Onbekend hotel",
    stars: acc.category ? parseInt(acc.category) : 0,
    location: acc.destinationName || acc.city || "",
    country: acc.country || "",
    images: acc.imageUrls || acc.images || [],
    geolocation: acc.geolocation || null,
  };
}

// ============================================================
// TRANSPORT SEARCH (flights)
// ============================================================
async function searchTransports(micrositeId: string, params: any) {
  const token = await getTcToken(micrositeId);
  const { departure, departureType, arrival, arrivalType, departureDate, returnDate, adults, children, childAges, tripType } = params;

  const persons: any[] = [];
  for (let i = 0; i < (adults || 2); i++) persons.push({ age: 30 });
  if (children && childAges) {
    for (const age of childAges) persons.push({ age });
  }

  const journeys: any[] = [{
    departureDate,
    departure: departure,
    departureType: departureType || "TRANSPORT_BASE",
    arrival: arrival,
    arrivalType: arrivalType || "TRANSPORT_BASE",
  }];

  if (returnDate) {
    journeys.push({
      departureDate: returnDate,
      departure: arrival,
      departureType: arrivalType || "TRANSPORT_BASE",
      arrival: departure,
      arrivalType: departureType || "TRANSPORT_BASE",
    });
  }

  const quoteBody = {
    journeys,
    persons,
    language: "NL",
    tripType: tripType || (returnDate ? "RT" : "OW"),
    filter: {},
  };

  console.log(`[TC Search] Transport quote:`, JSON.stringify(quoteBody));

  const response = await fetch(`${TC_API_BASE}/booking/transports/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "auth-token": token },
    body: JSON.stringify(quoteBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[TC Search] Transport quote failed (${response.status}):`, errText);
    throw new Error(`Vlucht zoeken mislukt (${response.status})`);
  }

  const result = await response.json();
  const services = result.services || [];
  const recommendations = result.recommendations || [];

  return recommendations.map((rec: any) => {
    const outbound = services.find((s: any) => s.ref === rec.outboundRef);
    const inbound = services.find((s: any) => s.ref === rec.inboundRef);

    return {
      type: "flight",
      id: rec.recommendationKey,
      name: `${outbound?.departure || departure} → ${outbound?.arrival || arrival}`,
      subtitle: inbound ? `Retour: ${inbound.departure} → ${inbound.arrival}` : "Enkele reis",
      price: rec.priceBreakdown?.totalPrice?.amount || 0,
      currency: rec.priceBreakdown?.totalPrice?.currency || "EUR",
      provider: rec.provider || "",
      fare: rec.fare || "",
      lowcost: rec.lowcost || false,
      outbound: outbound ? {
        departure: outbound.departure,
        arrival: outbound.arrival,
        departureTime: outbound.departureDateTime,
        arrivalTime: outbound.arrivalDateTime,
        duration: outbound.duration,
        segments: outbound.segments || [],
      } : null,
      inbound: inbound ? {
        departure: inbound.departure,
        arrival: inbound.arrival,
        departureTime: inbound.departureDateTime,
        arrivalTime: inbound.arrivalDateTime,
        duration: inbound.duration,
        segments: inbound.segments || [],
      } : null,
      recommendationKey: rec.recommendationKey,
    };
  });
}

// ============================================================
// TRANSFER SEARCH
// ============================================================
async function searchTransfers(micrositeId: string, params: any) {
  const token = await getTcToken(micrositeId);
  const { from, to, pickupDateTime, adults, children, childAges } = params;

  const persons: any[] = [];
  for (let i = 0; i < (adults || 2); i++) persons.push({ age: 30 });
  if (children && childAges) {
    for (const age of childAges) persons.push({ age });
  }

  const quoteBody: any = {
    persons,
    language: "NL",
    pickupDateTime,
    filter: {},
  };

  if (from) quoteBody.from = from;
  if (to) quoteBody.to = to;

  const response = await fetch(`${TC_API_BASE}/booking/transfers/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "auth-token": token },
    body: JSON.stringify(quoteBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[TC Search] Transfer quote failed (${response.status}):`, errText);
    throw new Error(`Transfer zoeken mislukt (${response.status})`);
  }

  const result = await response.json();
  return (result.transfers || []).map((t: any) => ({
    type: "transfer",
    id: t.transferKey,
    name: `${result.from?.name || ""} → ${result.to?.name || ""}`,
    subtitle: t.vehicleDescriptionText || "",
    price: t.price?.amount || 0,
    currency: t.price?.currency || "EUR",
    provider: t.provider || "",
    vehicleType: t.transferType || "",
    productType: t.productType || "",
    serviceType: t.serviceType || "",
    pickupInfo: t.pickupInformation || "",
    characteristics: t.characteristics || [],
    image: t.image || "",
    transferKey: t.transferKey,
  }));
}

// ============================================================
// TICKET/ACTIVITY SEARCH
// ============================================================
async function searchTickets(micrositeId: string, params: any) {
  const token = await getTcToken(micrositeId);
  const { destination, checkIn, checkOut, adults, children, childAges } = params;

  const persons: any[] = [];
  for (let i = 0; i < (adults || 2); i++) persons.push({ age: 30 });
  if (children && childAges) {
    for (const age of childAges) persons.push({ age });
  }

  const quoteBody: any = {
    checkIn,
    checkOut,
    persons,
    language: "NL",
    filter: {},
  };

  if (destination) quoteBody.destinationId = destination;

  const response = await fetch(`${TC_API_BASE}/booking/tickets/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "auth-token": token },
    body: JSON.stringify(quoteBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[TC Search] Ticket quote failed (${response.status}):`, errText);
    throw new Error(`Activiteit zoeken mislukt (${response.status})`);
  }

  const result = await response.json();
  const tickets = result.tickets || [];

  // Fetch datasheets for ticket details (photos, descriptions)
  const ticketIds = tickets.slice(0, 20).map((t: any) => t.ticketId).filter(Boolean);
  let ticketData: Record<string, any> = {};

  if (ticketIds.length > 0) {
    try {
      // Fetch individual ticket datasheets
      const dsPromises = ticketIds.slice(0, 10).map(async (id: string) => {
        try {
          const dsResp = await fetch(`${TC_API_BASE}/tickets/${id}/datasheet?lang=NL`, {
            headers: { "auth-token": token },
          });
          if (dsResp.ok) {
            const ds = await dsResp.json();
            ticketData[id] = ds;
          }
        } catch (e) {
          // ignore individual failures
        }
      });
      await Promise.all(dsPromises);
    } catch (e) {
      console.warn("[TC Search] Ticket datasheet fetch failed:", e);
    }
  }

  return tickets.map((t: any) => {
    const ds = ticketData[t.ticketId] || {};
    const dsLang = ds.datasheets?.NL || ds.datasheets?.EN || Object.values(ds.datasheets || {})[0] || {};

    return {
      type: "activity",
      id: t.ticketId,
      name: t.name || ds.name || "Onbekende activiteit",
      description: dsLang.description || "",
      images: ds.imageUrls || [],
      price: t.fromPrice?.amount || 0,
      currency: t.fromPrice?.currency || "EUR",
      provider: t.provider || "",
      location: ds.city || "",
      duration: ds.duration || null,
      durationType: ds.durationType || null,
      includes: dsLang.includes || [],
      excludes: dsLang.excludes || [],
      geolocation: ds.geolocation || null,
    };
  });
}

// ============================================================
// DESTINATIONS LIST (for search autocomplete)
// ============================================================
async function listDestinations(micrositeId: string) {
  const token = await getTcToken(micrositeId);

  const response = await fetch(`${TC_API_BASE}/destination/${micrositeId}?lang=NL`, {
    headers: { "auth-token": token },
  });

  if (!response.ok) {
    console.warn(`[TC Search] Destinations list failed (${response.status})`);
    return [];
  }

  const result = await response.json();
  return (result.destinations || result.destination || []).map((d: any) => ({
    id: d.id || d.code,
    name: d.name || "",
    country: d.country || d.countryName || "",
    countryCode: d.countryCode || "",
  }));
}

// ============================================================
// TRANSPORT BASES (airports) LIST
// ============================================================
async function listTransportBases(micrositeId: string, params: any) {
  const token = await getTcToken(micrositeId);
  const { first, limit } = params;

  const response = await fetch(`${TC_API_BASE}/transportbase?first=${first || 0}&limit=${limit || 100}`, {
    headers: { "auth-token": token },
  });

  if (!response.ok) return [];

  const result = await response.json();
  return (result.transportbase || []).map((tb: any) => ({
    code: tb.code,
    name: tb.name,
    city: tb.cityName || "",
    country: tb.country || "",
    type: tb.type || "",
  }));
}

// ============================================================
// MAIN HANDLER
// ============================================================
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, micrositeId } = body;
    const microsite = micrositeId || getConfiguredMicrosites()[0] || "rondreis-planner";

    console.log(`[TC Search] Action: ${action}, Microsite: ${microsite}`);

    let results: any;

    switch (action) {
      case "search-accommodations":
        results = await searchAccommodations(microsite, body);
        break;

      case "list-accommodations":
        results = await listAccommodations(microsite, body);
        break;

      case "search-transports":
        results = await searchTransports(microsite, body);
        break;

      case "search-transfers":
        results = await searchTransfers(microsite, body);
        break;

      case "search-tickets":
        results = await searchTickets(microsite, body);
        break;

      case "list-destinations":
        results = await listDestinations(microsite);
        break;

      case "list-transport-bases":
        results = await listTransportBases(microsite, body);
        break;

      case "list-microsites":
        results = getConfiguredMicrosites().map(id => ({ id }));
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Onbekende actie: ${action}. Gebruik: search-accommodations, search-transports, search-transfers, search-tickets, list-destinations, list-transport-bases, list-microsites` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, action, micrositeId: microsite, count: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[TC Search] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Search failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
