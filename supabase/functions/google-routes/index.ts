import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RouteRequest {
  from: string;
  to: string;
  routeType?: 'snelle-route' | 'toeristische-route' | 'gemengd';
  includeWaypoints?: boolean;
}

interface RouteResponse {
  success: boolean;
  route?: {
    distance: string;
    duration: string;
    steps: Array<{
      instruction: string;
      distance: string;
      duration: string;
    }>;
    waypoints?: Array<{
      name: string;
      location: { lat: number; lng: number };
      placeId?: string;
      description?: string;
    }>;
    overview: {
      summary: string;
      distanceMeters: number;
      durationSeconds: number;
    };
  };
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { from, to, routeType, includeWaypoints }: RouteRequest = await req.json();

    if (!from || !to) {
      return new Response(
        JSON.stringify({ success: false, error: 'From and To locations are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Google Maps API key from database
    const { data: apiSettings, error: dbError } = await supabase
      .from('api_settings')
      .select('api_key')
      .eq('service_name', 'Google Maps API')
      .eq('is_active', true)
      .maybeSingle();

    if (dbError || !apiSettings?.api_key) {
      console.error('Google Maps API key not found in database:', dbError);
      return new Response(
        JSON.stringify({ success: false, error: 'Google Maps API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleMapsApiKey = apiSettings.api_key;

    // Determine travel mode and route preferences based on routeType
    let travelMode = 'DRIVE';
    let avoid = [];
    
    if (routeType === 'snelle-route') {
      // Prefer fastest route - don't avoid anything
      avoid = [];
    } else if (routeType === 'toeristische-route') {
      // Prefer scenic routes - avoid highways
      avoid = ['highways'];
    }

    // Build Directions API URL
    let directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&mode=driving&key=${googleMapsApiKey}&language=nl`;
    
    if (avoid.length > 0) {
      directionsUrl += `&avoid=${avoid.join('|')}`;
    }
    
    console.log('Fetching directions from:', from, 'to:', to, 'type:', routeType);
    const directionsResponse = await fetch(directionsUrl);
    const directionsData = await directionsResponse.json();

    if (directionsData.status !== 'OK' || !directionsData.routes || directionsData.routes.length === 0) {
      console.error('Directions API error:', directionsData.status, directionsData.error_message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Directions API error: ${directionsData.status}`,
          details: directionsData.error_message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const route = directionsData.routes[0];
    const leg = route.legs[0];

    console.log('✅ Route found:', leg.distance.text, leg.duration.text);

    // Get waypoints/points of interest along the route if requested
    let waypoints = [];
    if (includeWaypoints && routeType === 'toeristische-route') {
      // Get midpoint for places search
      const midLat = (leg.start_location.lat + leg.end_location.lat) / 2;
      const midLng = (leg.start_location.lng + leg.end_location.lng) / 2;

      // Search for tourist attractions near the route
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${midLat},${midLng}&radius=20000&type=tourist_attraction&key=${googleMapsApiKey}&language=nl`;
      
      console.log('Searching for tourist attractions along route...');
      const placesResponse = await fetch(placesUrl);
      const placesData = await placesResponse.json();

      if (placesData.status === 'OK' && placesData.results) {
        waypoints = placesData.results.slice(0, 5).map((place: any) => ({
          name: place.name,
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
          placeId: place.place_id,
          description: place.vicinity
        }));
        console.log(`✅ Found ${waypoints.length} tourist attractions`);
      }
    }

    // Format the response
    const response: RouteResponse = {
      success: true,
      route: {
        distance: leg.distance.text,
        duration: leg.duration.text,
        steps: leg.steps.map((step: any) => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
          distance: step.distance.text,
          duration: step.duration.text
        })),
        waypoints: waypoints.length > 0 ? waypoints : undefined,
        overview: {
          summary: route.summary || `Route van ${from} naar ${to}`,
          distanceMeters: leg.distance.value,
          durationSeconds: leg.duration.value
        }
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in google-routes function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
