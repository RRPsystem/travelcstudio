import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const POI_WHITELIST = [
  'tourist_attraction',
  'park',
  'natural_feature',
  'museum',
  'art_gallery',
  'viewpoint',
  'landmark',
  'point_of_interest',
  'cafe',
  'restaurant',
  'bakery',
  'lake',
  'beach',
  'waterfall',
  'castle',
  'garden',
  'playground'
];

const POI_BLACKLIST = [
  'hospital',
  'supermarket',
  'office',
  'wholesale_club',
  'shopping_mall',
  'gas_station',
  'atm',
  'bank'
];

const MAJOR_ROAD_PATTERN = /\b(I-\d+|US-\d+|CA-\d+|State Route \d+|Highway \d+|A\d+|D\d+|SS\d+|N\d+|M\d+|E\d+|Route \d+)\b/i;

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

function extractCorridorPoints(encodedPolyline: string, intervalMeters: number = 30000): Array<{ lat: number; lng: number }> {
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

  points.push(decodedPoints[decodedPoints.length - 1]);

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

function compressStepsToMajorTransitions(steps: any[]): Array<{ instruction: string; distance: string; duration: string }> {
  const compressed = [];

  for (const step of steps) {
    const instruction = step.html_instructions?.replace(/<[^>]*>/g, '') || '';

    if (MAJOR_ROAD_PATTERN.test(instruction)) {
      compressed.push({
        instruction,
        distance: step.distance.text,
        duration: step.duration.text
      });
    }
  }

  if (compressed.length === 0 && steps.length > 0) {
    compressed.push({
      instruction: steps[0].html_instructions?.replace(/<[^>]*>/g, '') || 'Vertrek',
      distance: steps[0].distance.text,
      duration: steps[0].duration.text
    });
  }

  const lastStep = steps[steps.length - 1];
  if (lastStep) {
    compressed.push({
      instruction: lastStep.html_instructions?.replace(/<[^>]*>/g, '') || 'Aankomst bestemming',
      distance: lastStep.distance.text,
      duration: lastStep.duration.text
    });
  }

  return compressed.slice(0, 6);
}

function scorePOI(poi: any, routePoint: { lat: number; lng: number }, previousTypes: string[]): number {
  let score = 0;

  const types = poi.types || [];
  const primaryTypes = types.filter((t: string) => POI_WHITELIST.includes(t));

  if (primaryTypes.length > 0) {
    score += 0.5;
  }

  const distance = haversineDistance(
    routePoint,
    { lat: poi.location?.latitude || 0, lng: poi.location?.longitude || 0 }
  );
  const detourPenalty = Math.min(distance / 1000, 10) / 10;
  score -= detourPenalty * 0.3;

  if (poi.rating) {
    score += (poi.rating / 5) * 0.2;
  }

  const typeOverlap = primaryTypes.filter((t: string) => previousTypes.includes(t)).length;
  if (typeOverlap > 0) {
    score -= 0.2;
  }

  return score;
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

    console.log(`🗺️ Computing ${routeType || 'default'} route: ${from} → ${to}`);
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

    console.log(`✅ Route found: ${leg.distance.text}, ${leg.duration.text}`);

    const compressedSteps = compressStepsToMajorTransitions(leg.steps);
    console.log(`📋 Compressed ${leg.steps.length} steps → ${compressedSteps.length} major transitions`);

    let waypoints = [];
    if (includeWaypoints && routeType === 'toeristische-route') {
      console.log('🔍 Searching POIs along corridor...');

      const polyline = route.overview_polyline?.points;
      if (!polyline) {
        console.error('❌ No polyline in route response');
        return new Response(
          JSON.stringify({ success: false, error: 'No route polyline available' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const placesSearchUrl = 'https://places.googleapis.com/v1/places:searchText';
      const searchRadius = 6000;

      const corridorPoints = extractCorridorPoints(polyline, 30000);
      console.log(`📍 Extracted ${corridorPoints.length} corridor points (30km intervals)`);

      const allCandidates = [];
      const usedTypes: string[] = [];

      for (const point of corridorPoints) {
        try {
          const searchBody = {
            textQuery: "scenic viewpoint tourist attraction park museum landmark nature cafe restaurant",
            locationBias: {
              circle: {
                center: {
                  latitude: point.lat,
                  longitude: point.lng
                },
                radius: searchRadius
              }
            },
            maxResultCount: 5,
            languageCode: "nl"
          };

          const response = await fetch(placesSearchUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': googleMapsApiKey,
              'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id,places.types,places.rating'
            },
            body: JSON.stringify(searchBody)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Places API error: ${response.status} ${errorText}`);
            continue;
          }

          const data = await response.json();
          if (data.places && data.places.length > 0) {
            for (const place of data.places) {
              const types = place.types || [];
              const hasBlacklisted = types.some((t: string) => POI_BLACKLIST.includes(t));
              const hasWhitelisted = types.some((t: string) => POI_WHITELIST.includes(t));

              if (!hasBlacklisted && hasWhitelisted) {
                const score = scorePOI(place, point, usedTypes);
                allCandidates.push({
                  name: place.displayName?.text || 'Unknown',
                  location: {
                    lat: place.location?.latitude,
                    lng: place.location?.longitude
                  },
                  placeId: place.id,
                  description: place.formattedAddress || '',
                  score,
                  types
                });
              }
            }
          }
        } catch (error) {
          console.error(`❌ Error searching corridor point:`, error);
        }
      }

      const uniqueCandidates = Array.from(
        new Map(allCandidates.map(poi => [poi.placeId, poi])).values()
      );

      const sortedPOIs = uniqueCandidates.sort((a, b) => b.score - a.score);

      const maxStops = Math.min(4, sortedPOIs.length);
      waypoints = sortedPOIs.slice(0, maxStops).map(poi => {
        if (poi.types) {
          poi.types.forEach((t: string) => {
            if (POI_WHITELIST.includes(t) && !usedTypes.includes(t)) {
              usedTypes.push(t);
            }
          });
        }
        return {
          name: poi.name,
          location: poi.location,
          placeId: poi.placeId,
          description: poi.description
        };
      });

      console.log(`✅ Selected ${waypoints.length} corridor POIs (scored & deduplicated)`);
    }

    const response: RouteResponse = {
      success: true,
      route: {
        distance: leg.distance.text,
        duration: leg.duration.text,
        steps: compressedSteps,
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