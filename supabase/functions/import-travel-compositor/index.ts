import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use the builder API endpoint that has TC credentials configured
const BUILDER_API_URL = "https://www.ai-websitestudio.nl/api/travelbro/get-travel";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { travelId } = await req.json();

    if (!travelId) {
      return new Response(
        JSON.stringify({ error: "travelId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Import TC] Importing travel from TC via builder API: ${travelId}`);

    // Call the builder API which has TC credentials
    const response = await fetch(BUILDER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: travelId,
        micrositeId: "rondreis-planner",
        language: "NL"
      })
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

    const travelData = result.data;
    return processAndReturnTravel(travelData, travelId);

  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Import failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function processAndReturnTravel(data: any, travelId: string) {
  // Normalize the response to our format
  const travel = {
    id: data.id || travelId,
    title: data.title || data.name || `Reis ${travelId}`,
    description: data.description || data.longDescription || "",
    introText: data.introText || data.shortDescription || data.intro || "",
    numberOfNights: data.numberOfNights || data.nights || data.counters?.nights || 0,
    numberOfDays: data.numberOfDays || data.days || (data.numberOfNights ? data.numberOfNights + 1 : 0),
    pricePerPerson: data.pricePerPerson || data.price || data.startingPrice || 0,
    priceDescription: data.priceDescription || data.priceInfo || "",
    heroImage: data.imageUrl || data.heroImage || data.mainImage || data.images?.[0] || "",
    heroVideoUrl: data.videoUrl || data.heroVideoUrl || "",
    
    // Destinations
    destinations: normalizeDestinations(data.destinations || data.cities || data.stops || []),
    
    // Countries
    countries: extractCountries(data),
    
    // Hotels
    hotels: normalizeHotels(data.hotels || data.accommodations || []),
    
    // Images
    images: data.images || data.gallery || [],
    
    // Itinerary
    itinerary: normalizeItinerary(data.itinerary || data.days || data.program || []),
    
    // Included/Excluded
    included: data.included || data.inclusions || [],
    excluded: data.excluded || data.exclusions || [],
    
    // Highlights
    highlights: data.highlights || data.features || [],
    
    // Practical info
    practicalInfo: {
      bestTimeToVisit: data.bestTimeToVisit || data.bestSeason || "",
      climate: data.climate || "",
      visaInfo: data.visaInfo || data.visa || "",
      currency: data.currency || "",
      language: data.language || "",
    },
    
    // Route map
    routeMapUrl: data.routeMapUrl || data.mapUrl || "",
  };

  console.log(`Successfully processed travel: ${travel.title}`);

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
