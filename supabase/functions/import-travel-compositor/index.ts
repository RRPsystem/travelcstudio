import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use the builder API endpoint that has TC credentials configured
// GET endpoint: only fetches data (doesn't save to Supabase)
const BUILDER_API_BASE = "https://www.ai-websitestudio.nl/api/travelbro/get-travel";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { travelId, micrositeId } = await req.json();

    if (!travelId) {
      return new Response(
        JSON.stringify({ error: "travelId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use provided micrositeId or default to rondreis-planner
    const microsite = micrositeId || "rondreis-planner";
    
    // Build GET URL with query parameters
    const apiUrl = `${BUILDER_API_BASE}?id=${encodeURIComponent(travelId)}&micrositeId=${encodeURIComponent(microsite)}&language=NL`;
    
    console.log(`[Import TC] Fetching from: ${apiUrl}`);

    // Call the builder API which has TC credentials (GET request)
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Import TC] Builder API error: ${response.status}`, errorText);
      return new Response(
        JSON.stringify({ 
          error: `API error: ${response.status}`,
          message: "Kon reis niet ophalen. Controleer of het Travel Compositor ID correct is."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log(`[Import TC] Received data:`, JSON.stringify(result).substring(0, 500));

    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          error: result.error || "Import failed",
          message: "Kon reis niet ophalen van Travel Compositor"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Builder API returns both formatted data AND raw TC data
    // We need both: data for formatted fields, raw.detail for transports/cars
    const travelData = result.data;
    const rawTcData = result.raw?.detail || {};
    
    return processAndReturnTravel(travelData, rawTcData, travelId);

  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Import failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function processAndReturnTravel(data: any, rawTcData: any, travelId: string) {
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
    description: data.description || data.long_description || "",
    introText: data.intro_text || data.short_description || "",
    numberOfNights: data.duration_nights || data.numberOfNights || 0,
    numberOfDays: data.duration_days || data.numberOfDays || 0,
    pricePerPerson: data.price_per_person || data.total_price || 0,
    priceDescription: data.price_description || "",
    heroImage: data.featured_image || data.imageUrl || data.all_images?.[0] || "",
    heroVideoUrl: data.video_url || data.heroVideoUrl || "",
    
    // All images
    images: data.all_images || data.images || [],
    
    // Destinations - from formatted data (has descriptions)
    destinations: data.destinations || rawTcData.destinations || [],
    destinationNames: data.destination_names || [],
    
    // Countries
    countries: data.countries || [],
    
    // Hotels with full details
    hotels: data.hotels || rawTcData.hotels || [],
    
    // Transports (flights) - from RAW TC data (not in formatted data)
    transports: rawTcData.transports || [],
    
    // Flights - extract from transports or use formatted flights
    flights: data.flights || rawTcData.transports?.filter((t: any) => 
      t.type === 'FLIGHT' || t.type === 'flight' || t.transportType === 'FLIGHT'
    ) || [],
    
    // Other transports (trains, ferries, etc.)
    otherTransports: data.other_transports || rawTcData.transports?.filter((t: any) => 
      t.type !== 'FLIGHT' && t.type !== 'flight' && t.transportType !== 'FLIGHT'
    ) || [],
    
    // Car rentals - from RAW TC data
    carRentals: rawTcData.cars || data.car_rentals || [],
    
    // Activities
    activities: data.activities || [],
    
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
  console.log(`[Import TC] Destinations with descriptions: ${travel.destinations?.filter((d: any) => d.description)?.length || 0}`);

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
