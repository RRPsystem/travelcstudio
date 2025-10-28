import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points = [];
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

    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5
    });
  }

  return points;
}

function extractPointsAlongRoute(encodedPolyline: string, intervalMeters: number): Array<{ lat: number; lng: number }> {
  const decodedPoints = decodePolyline(encodedPolyline);
  if (decodedPoints.length === 0) return [];

  const points = [decodedPoints[0]];
  let distanceAccumulated = 0;

  for (let i = 1; i < decodedPoints.length; i++) {
    const prev = decodedPoints[i - 1];
    const curr = decodedPoints[i];
    const segmentDistance = haversineDistance(prev, curr);
    distanceAccumulated += segmentDistance;

    if (distanceAccumulated >= intervalMeters) {
      points.push(curr);
      distanceAccumulated = 0;
    }
  }

  if (points.length < 2) {
    points.push(decodedPoints[Math.floor(decodedPoints.length / 2)]);
  }

  return points;
}

function haversineDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    let travelMode = 'DRIVE';
    let avoid = [];
    
    if (routeType === 'snelle-route') {
      avoid = [];
    } else if (routeType === 'toeristische-route') {
      avoid = ['highways'];
    }

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

    let waypoints = [];
    if (includeWaypoints && routeType === 'toeristische-route') {
      console.log('🔍 Searching for scenic stops along route...');

      const polyline = route.overview_polyline?.points;
      if (!polyline) {
        console.error('❌ No polyline in route response');
        return new Response(
          JSON.stringify({ success: false, error: 'No route polyline available' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const placesSearchUrl = 'https://places.googleapis.com/v1/places:searchText';
      const searchRadius = 5000;

      const supportedTypes = [
        'tourist_attraction',
        'park',
        'museum',
        'art_gallery',
        'natural_feature',
        'point_of_interest'
      ];

      const routePoints = extractPointsAlongRoute(polyline, 50000);
      console.log(`📍 Extracted ${routePoints.length} search points along route`);

      const allStops = [];
      for (const point of routePoints) {
        try {
          const searchBody = {
            textQuery: "scenic viewpoint tourist attraction park museum",
            locationBias: {
              circle: {
                center: {
                  latitude: point.lat,
                  longitude: point.lng
                },
                radius: searchRadius
              }
            },
            includedTypes: supportedTypes,
            maxResultCount: 5,
            languageCode: "nl"
          };

          console.log(`🔎 Searching near ${point.lat.toFixed(2)},${point.lng.toFixed(2)}...`);

          const response = await fetch(placesSearchUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': googleMapsApiKey,
              'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id,places.types'
            },
            body: JSON.stringify(searchBody)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Places API error at point ${point.lat},${point.lng}: ${response.status} ${errorText}\n`);
            continue;
          }

          const data = await response.json();
          if (data.places && data.places.length > 0) {
            console.log(`✅ Found ${data.places.length} places near ${point.lat.toFixed(2)},${point.lng.toFixed(2)}`);
            for (const place of data.places) {
              allStops.push({
                name: place.displayName?.text || 'Unknown',
                location: {
                  lat: place.location?.latitude,
                  lng: place.location?.longitude
                },
                placeId: place.id,
                description: place.formattedAddress || ''
              });
            }
          } else {
            console.log(`⚠️ No places found near ${point.lat.toFixed(2)},${point.lng.toFixed(2)}`);
          }
        } catch (error) {
          console.error(`❌ Error searching point ${point.lat},${point.lng}:`, error);
        }
      }

      const uniqueStops = Array.from(
        new Map(allStops.map(stop => [stop.placeId, stop])).values()
      );
      waypoints = uniqueStops.slice(0, 10);

      console.log(`\n📊 FINAL RESULTS:`);
      console.log(`   - Search points: ${routePoints.length}`);
      console.log(`   - Total stops found: ${allStops.length}`);
      console.log(`   - Unique stops: ${uniqueStops.length}`);
      console.log(`   - Returning: ${waypoints.length} stops\n`);

      if (waypoints.length === 0) {
        console.error('❌ NO STOPS FOUND! This is the problem.\n');
      }
    }

    const response: RouteResponse = {
      success: true,
      route: {
        distance: leg.distance.text,
        duration: leg.duration.text,
        steps: leg.steps.map((step: any) => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
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
