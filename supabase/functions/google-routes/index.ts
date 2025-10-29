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
  'museum',
  'art_gallery',
  'cafe',
  'restaurant',
  'bakery',
  'beach',
  'garden',
  'playground',
  'campground',
  'hiking_area',
  'national_park',
  'visitor_center',
  'scenic_overlook'
];

const POI_BLACKLIST = [
  'hospital',
  'supermarket',
  'office',
  'wholesale_club',
  'shopping_mall',
  'gas_station',
  'atm',
  'bank',
  'store',
  'clothing_store',
  'convenience_store',
  'electronics_store',
  'furniture_store',
  'hardware_store',
  'home_goods_store',
  'jewelry_store',
  'shoe_store',
  'sporting_goods_store',
  'hotel',
  'lodging',
  'real_estate_agency',
  'car_dealer',
  'car_rental',
  'car_repair',
  'car_wash',
  'parking',
  'golf'
];

const EATERY_TYPES = ['restaurant', 'cafe', 'bakery', 'ice_cream_shop', 'fast_food'];
const KID_FRIENDLY_KEYWORDS = ['kids', 'kinder', 'child', 'family', 'enfant', 'playground', 'speelhoek', 'speeltuin', 'pizza', 'pancake', 'diner', 'ijs', 'ice cream', 'gelato'];

const MAJOR_ROAD_PATTERN = /\b(I-?\d+|US-?\d+|CA-?\d+|State Route \d+|Highway \d+|A\d+|D\d+|SS\d+|N\d+|M\d+|E\d+|Route \d+|Autoroute|Route nationale|Route départementale|Périphérique|Rocade)\b/i;
const MAX_DETOUR_MINUTES = 30;

function getRouteConstants(routeDistanceKm: number) {
  const minKmFromOrigin = 20;
  const minKmBeforeDestination = 20;

  const searchableDistance = routeDistanceKm - minKmFromOrigin - minKmBeforeDestination;

  let corridorIntervalKm = 30;
  let searchRadiusKm = 10;

  if (searchableDistance < 50) {
    corridorIntervalKm = 20;
  } else if (searchableDistance > 200) {
    corridorIntervalKm = 40;
  }

  return {
    minKmFromOrigin,
    minKmBeforeDestination,
    corridorIntervalKm,
    searchRadiusKm
  };
}

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

function calculatePolylineDistances(points: Array<{ lat: number; lng: number }>): Array<number> {
  const distances = [0];
  let cumulative = 0;

  for (let i = 1; i < points.length; i++) {
    const dist = haversineDistance(points[i - 1], points[i]);
    cumulative += dist;
    distances.push(cumulative);
  }

  return distances;
}

function projectPointOnPolyline(
  point: { lat: number; lng: number },
  polylinePoints: Array<{ lat: number; lng: number }>,
  distances: Array<number>
): { distanceKm: number; closestPointIndex: number } {
  let minDistance = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < polylinePoints.length; i++) {
    const dist = haversineDistance(point, polylinePoints[i]);
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }

  return {
    distanceKm: distances[closestIndex] / 1000,
    closestPointIndex: closestIndex
  };
}

function extractCorridorPoints(
  encodedPolyline: string,
  intervalKm: number,
  skipFirstKm: number,
  skipLastKm: number
): Array<{ lat: number; lng: number; corridorKm: number }> {
  const decodedPoints = decodePolyline(encodedPolyline);
  if (decodedPoints.length === 0) return [];

  const totalRouteDistance = calculatePolylineDistances(decodedPoints);
  const maxDistance = totalRouteDistance[totalRouteDistance.length - 1] / 1000;

  const searchableZoneEnd = maxDistance - skipLastKm;

  const points = [];
  let distanceAccumulated = 0;
  let totalDistance = 0;

  for (let i = 1; i < decodedPoints.length; i++) {
    const prev = decodedPoints[i - 1];
    const curr = decodedPoints[i];
    const segmentDistance = haversineDistance(prev, curr);
    distanceAccumulated += segmentDistance;
    totalDistance += segmentDistance;

    const currentKm = totalDistance / 1000;

    if (currentKm >= skipFirstKm && currentKm <= searchableZoneEnd && distanceAccumulated >= (intervalKm * 1000)) {
      points.push({
        lat: curr.lat,
        lng: curr.lng,
        corridorKm: currentKm
      });
      distanceAccumulated = 0;
    }
  }

  if (points.length === 0 && maxDistance > (skipFirstKm + skipLastKm)) {
    const midIndex = Math.floor(decodedPoints.length / 2);
    const midDistance = totalRouteDistance[midIndex] / 1000;
    if (midDistance >= skipFirstKm && midDistance <= searchableZoneEnd) {
      points.push({
        lat: decodedPoints[midIndex].lat,
        lng: decodedPoints[midIndex].lng,
        corridorKm: midDistance
      });
    }
  }

  return points;
}

function compressStepsToMajorTransitions(steps: any[]): Array<{ instruction: string; distance: string; duration: string }> {
  const compressed = [];
  let lastRoadName = '';

  for (const step of steps) {
    const instruction = step.html_instructions?.replace(/<[^>]*>/g, '') || '';

    if (MAJOR_ROAD_PATTERN.test(instruction)) {
      const roadMatch = instruction.match(MAJOR_ROAD_PATTERN);
      const roadName = roadMatch ? roadMatch[0] : '';

      if (roadName && roadName !== lastRoadName) {
        compressed.push({
          instruction,
          distance: step.distance.text,
          duration: step.duration.text
        });
        lastRoadName = roadName;
      }
    }
  }

  if (compressed.length === 0 && steps.length > 0) {
    const firstInstruction = steps[0].html_instructions?.replace(/<[^>]*>/g, '') || 'Vertrek';
    compressed.push({
      instruction: firstInstruction,
      distance: steps[0].distance.text,
      duration: steps[0].duration.text
    });
  }

  const lastStep = steps[steps.length - 1];
  if (lastStep && compressed.length > 0) {
    const lastInstruction = lastStep.html_instructions?.replace(/<[^>]*>/g, '') || 'Aankomst bestemming';
    const lastEntry = compressed[compressed.length - 1];
    if (!lastInstruction.includes(lastEntry.instruction.substring(0, 20))) {
      compressed.push({
        instruction: lastInstruction,
        distance: lastStep.distance.text,
        duration: lastStep.duration.text
      });
    }
  }

  return compressed.slice(0, 6);
}

async function calculateDetourMinutes(
  poi: { lat: number; lng: number },
  routePoint: { lat: number; lng: number },
  apiKey: string
): Promise<number> {
  try {
    const detourUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${routePoint.lat},${routePoint.lng}&destination=${poi.lat},${poi.lng}&mode=driving&key=${apiKey}`;

    const response = await fetch(detourUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.routes?.[0]?.legs?.[0]) {
      return Math.round(data.routes[0].legs[0].duration.value / 60);
    }
  } catch (error) {
    console.error('Detour calculation error:', error);
  }

  return 999;
}

function isKidFriendly(place: any): boolean {
  const name = (place.displayName?.text || '').toLowerCase();
  const description = (place.editorialSummary?.text || '').toLowerCase();
  const combinedText = `${name} ${description}`;

  return KID_FRIENDLY_KEYWORDS.some(keyword => combinedText.includes(keyword.toLowerCase()));
}

function scoreEatery(eatery: any, detourMinutes: number, usedCuisines: string[]): number {
  const rating = eatery.rating || 3.0;
  const kidFriendly = isKidFriendly(eatery);
  const cuisine = eatery.types?.[0] || 'restaurant';
  const isNewCuisine = !usedCuisines.includes(cuisine);

  let score = 0;
  score -= detourMinutes * 0.5;
  score += rating * 0.3;
  score += kidFriendly ? 0.2 : 0;
  score += isNewCuisine ? 0.15 : 0;

  return score;
}

function calculateTourismScore(types: string[], rating?: number): number {
  const HIGH_VALUE = ['tourist_attraction', 'museum', 'art_gallery', 'park', 'national_park', 'beach', 'garden', 'playground', 'campground', 'hiking_area', 'visitor_center'];
  const MEDIUM_VALUE = ['cafe', 'restaurant', 'bakery'];

  let score = 0;

  for (const type of types) {
    if (HIGH_VALUE.includes(type)) score += 3;
    else if (MEDIUM_VALUE.includes(type)) score += 1;
  }

  if (rating && rating >= 4.5) score += 3;
  else if (rating && rating >= 4.0) score += 2;
  else if (rating && rating >= 3.5) score += 1;

  return score;
}

function scorePOI(poi: any, detourMinutes: number, previousTypes: string[]): number {
  const types = poi.types || [];
  const primaryTypes = types.filter((t: string) => POI_WHITELIST.includes(t));

  const tourismScore = calculateTourismScore(types, poi.rating);

  if (tourismScore < 3) {
    return 0;
  }

  let score = tourismScore * 0.4;

  score -= (detourMinutes / MAX_DETOUR_MINUTES) * 0.3;

  const newTypes = primaryTypes.filter((t: string) => !previousTypes.includes(t));
  if (newTypes.length > 0) {
    score += newTypes.length * 0.25;
  }

  const hasTopAttraction = types.includes('tourist_attraction');
  if (hasTopAttraction) {
    score += 0.5;
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
      corridorKm?: number;
      detourMinutes?: number;
    }>;
    eateriesOnRoute?: any[];
    eateriesAtArrival?: any[];
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
    let eateriesOnRoute: any[] = [];
    let eateriesAtArrival: any[] = [];

    if (includeWaypoints) {
      const polyline = route.overview_polyline?.points;
      if (!polyline) {
        console.error('❌ No polyline in route response');
        return new Response(
          JSON.stringify({ success: false, error: 'No route polyline available' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const routeDistanceKm = leg.distance.value / 1000;
      const routeConfig = getRouteConstants(routeDistanceKm);

      console.log(`🔍 Route: ${routeDistanceKm.toFixed(0)}km | Searching between km ${routeConfig.minKmFromOrigin}-${(routeDistanceKm - routeConfig.minKmBeforeDestination).toFixed(0)} (interval=${routeConfig.corridorIntervalKm}km, radius=${routeConfig.searchRadiusKm}km)`);

      const decodedPolyline = decodePolyline(polyline);
      const polylineDistances = calculatePolylineDistances(decodedPolyline);
      const originPoint = decodedPolyline[0];

      const corridorPoints = extractCorridorPoints(
        polyline,
        routeConfig.corridorIntervalKm,
        routeConfig.minKmFromOrigin,
        routeConfig.minKmBeforeDestination
      );

      const corridorKms = corridorPoints.map(p => `${p.corridorKm.toFixed(0)}km`).join(', ');
      console.log(`📍 Corridor points: ${corridorKms}`);

      const placesSearchUrl = 'https://places.googleapis.com/v1/places:searchNearby';
      const searchRadius = routeConfig.searchRadiusKm * 1000;

      const allCandidates = [];
      const usedTypes: string[] = [];

      for (const point of corridorPoints) {
        try {
          console.log(`🔎 Searching near km ${point.corridorKm.toFixed(0)} (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})`);

          const searchBody = {
            includedTypes: [
              'tourist_attraction',
              'park',
              'museum',
              'art_gallery',
              'cafe',
              'restaurant',
              'bakery',
              'beach',
              'garden',
              'playground',
              'campground',
              'hiking_area',
              'national_park',
              'visitor_center'
            ],
            locationRestriction: {
              circle: {
                center: {
                  latitude: point.lat,
                  longitude: point.lng
                },
                radius: searchRadius
              }
            },
            maxResultCount: 20,
            languageCode: 'nl'
          };

          const response = await fetch(placesSearchUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': googleMapsApiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types'
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
            console.log(`  Found ${data.places.length} places near km ${point.corridorKm.toFixed(0)}`);
            for (const place of data.places) {
              const types = place.types || [];
              const hasBlacklisted = types.some((t: string) => POI_BLACKLIST.includes(t));
              const hasWhitelisted = types.some((t: string) => POI_WHITELIST.includes(t));

              if (!hasBlacklisted && hasWhitelisted) {
                const poiLocation = {
                  lat: place.location?.latitude || 0,
                  lng: place.location?.longitude || 0
                };

                const distanceFromCorridorPoint = haversineDistance(poiLocation, point) / 1000;
                const distanceFromOrigin = haversineDistance(poiLocation, originPoint) / 1000;
                const projectedPosition = projectPointOnPolyline(poiLocation, decodedPolyline, polylineDistances);

                if (distanceFromCorridorPoint <= routeConfig.searchRadiusKm &&
                    distanceFromOrigin >= routeConfig.minKmFromOrigin &&
                    projectedPosition.distanceKm >= routeConfig.minKmFromOrigin) {
                  const detourMinutes = await calculateDetourMinutes(
                    poiLocation,
                    point,
                    googleMapsApiKey
                  );

                  if (detourMinutes <= MAX_DETOUR_MINUTES) {
                    const score = scorePOI(place, detourMinutes, usedTypes);
                    allCandidates.push({
                      name: place.displayName?.text || 'Unknown',
                      location: poiLocation,
                      placeId: place.id,
                      description: place.formattedAddress || '',
                      score,
                      types,
                      corridorKm: point.corridorKm,
                      detourMinutes
                    });
                    console.log(`    ✅ Added: ${place.displayName?.text} (km ${point.corridorKm.toFixed(0)}, detour ${detourMinutes}min)`);
                  } else {
                    console.log(`    ❌ Rejected ${place.displayName?.text}: detour ${detourMinutes}min > ${MAX_DETOUR_MINUTES}min`);
                  }
                } else {
                  console.log(`    ❌ Rejected ${place.displayName?.text}: ${distanceFromCorridorPoint.toFixed(1)}km > ${routeConfig.searchRadiusKm}km from corridor`);
                }
              }
            }
          } else {
            console.log(`  No places found near km ${point.corridorKm.toFixed(0)}`);
          }
        } catch (error) {
          console.error(`❌ Error searching corridor point:`, error);
        }
      }

      const clusterRadius = 0.15;
      const clusteredCandidates: any[] = [];
      const processed = new Set<string>();

      for (const candidate of allCandidates) {
        if (processed.has(candidate.placeId)) continue;

        const cluster = allCandidates.filter(other => {
          if (processed.has(other.placeId)) return false;
          const distance = haversineDistance(candidate.location, other.location) / 1000;
          return distance <= clusterRadius;
        });

        const bestInCluster = cluster.reduce((best, current) =>
          current.score > best.score ? current : best
        );

        clusteredCandidates.push(bestInCluster);
        cluster.forEach(poi => processed.add(poi.placeId));
      }

      const uniqueCandidates = clusteredCandidates;

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
          description: poi.description,
          corridorKm: Math.round(poi.corridorKm),
          detourMinutes: poi.detourMinutes
        };
      });

      console.log(`✅ Selected ${waypoints.length} corridor POIs (all between km ${routeConfig.minKmFromOrigin}-${(routeDistanceKm - routeConfig.minKmBeforeDestination).toFixed(0)}, detour ≤${MAX_DETOUR_MINUTES}min)`);

      console.log('\n🍽️ Searching for eateries...');

      const allEateries: any[] = [];
      const usedCuisines: string[] = [];

      const eateryPoints = corridorPoints.filter((_, idx) => idx % 2 === 0);

      for (const point of eateryPoints) {
        try {
          const searchBody = {
            includedTypes: EATERY_TYPES,
            locationRestriction: {
              circle: {
                center: { latitude: point.lat, longitude: point.lng },
                radius: routeConfig.searchRadiusKm * 1000
              }
            },
            maxResultCount: 10,
            languageCode: 'nl'
          };

          const response = await fetch(placesSearchUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': googleMapsApiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.location,places.rating,places.priceLevel,places.editorialSummary'
            },
            body: JSON.stringify(searchBody)
          });

          if (response.ok) {
            const data = await response.json();
            const places = data.places || [];

            for (const place of places) {
              const poiLocation = { lat: place.location?.latitude || 0, lng: place.location?.longitude || 0 };
              const distanceFromOrigin = haversineDistance(poiLocation, originPoint) / 1000;

              if (distanceFromOrigin >= routeConfig.minKmFromOrigin) {
                const detourMinutes = await calculateDetourMinutes(poiLocation, point, googleMapsApiKey);

                if (detourMinutes <= MAX_DETOUR_MINUTES) {
                  allEateries.push({
                    name: place.displayName?.text || 'Unknown',
                    address: place.formattedAddress || '',
                    type: place.types?.[0] || 'restaurant',
                    location: poiLocation,
                    detourMinutes,
                    kidFriendly: isKidFriendly(place),
                    priceLevel: place.priceLevel || 2,
                    rating: place.rating || 3.0,
                    placeId: place.id
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ Eatery search error:', error);
        }
      }

      const uniqueEateries = Array.from(new Map(allEateries.map(e => [e.placeId, e])).values());
      const scoredEateries = uniqueEateries.map(e => ({
        ...e,
        score: scoreEatery(e, e.detourMinutes, usedCuisines)
      })).sort((a, b) => b.score - a.score);

      eateriesOnRoute = scoredEateries.slice(0, 3).map(e => {
        usedCuisines.push(e.type);
        return {
          name: e.name,
          address: e.address,
          type: e.type,
          detour_minutes: e.detourMinutes,
          kid_friendly: e.kidFriendly,
          price_level: e.priceLevel,
          rating: e.rating,
          note: e.kidFriendly ? 'Geschikt voor kinderen' : ''
        };
      });

      try {
        const arrivalLocation = decodedPolyline[decodedPolyline.length - 1];
        const arrivalSearchBody = {
          includedTypes: EATERY_TYPES,
          locationRestriction: {
            circle: {
              center: { latitude: arrivalLocation.lat, longitude: arrivalLocation.lng },
              radius: 1000
            }
          },
          maxResultCount: 10,
          languageCode: 'nl'
        };

        const response = await fetch(placesSearchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleMapsApiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.location,places.rating,places.priceLevel,places.editorialSummary'
          },
          body: JSON.stringify(arrivalSearchBody)
        });

        if (response.ok) {
          const data = await response.json();
          const places = data.places || [];

          eateriesAtArrival = places.slice(0, 3).map((place: any) => ({
            name: place.displayName?.text || 'Unknown',
            address: place.formattedAddress || '',
            type: place.types?.[0] || 'restaurant',
            distance_m: Math.round(haversineDistance(
              { lat: place.location?.latitude || 0, lng: place.location?.longitude || 0 },
              arrivalLocation
            )),
            kid_friendly: isKidFriendly(place),
            price_level: place.priceLevel || 2,
            rating: place.rating || 3.0,
            note: 'In centrum nabij aankomst'
          }));
        }
      } catch (error) {
        console.error('❌ Arrival eatery search error:', error);
      }

      console.log(`✅ Found ${eateriesOnRoute.length} eateries on route, ${eateriesAtArrival.length} at arrival`);
      console.log('📊 Eateries on route:', JSON.stringify(eateriesOnRoute, null, 2));
      console.log('📊 Eateries at arrival:', JSON.stringify(eateriesAtArrival, null, 2));
    }

    console.log('📦 Building response with:', {
      waypoints: waypoints.length,
      eateriesOnRoute: eateriesOnRoute.length,
      eateriesAtArrival: eateriesAtArrival.length
    });

    const response: RouteResponse = {
      success: true,
      route: {
        distance: leg.distance.text,
        duration: leg.duration.text,
        steps: compressedSteps,
        waypoints: waypoints.length > 0 ? waypoints : undefined,
        eateriesOnRoute: eateriesOnRoute.length > 0 ? eateriesOnRoute : undefined,
        eateriesAtArrival: eateriesAtArrival.length > 0 ? eateriesAtArrival : undefined,
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