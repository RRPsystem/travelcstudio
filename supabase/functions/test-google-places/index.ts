import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TestResult {
  success: boolean;
  apiKeyFound: boolean;
  test: string;
  result?: any;
  error?: string;
  details?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { test } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: apiSettings, error: dbError } = await supabase
      .from('api_settings')
      .select('api_key, service_name')
      .eq('service_name', 'Google Maps API')
      .eq('is_active', true)
      .maybeSingle();

    if (dbError || !apiSettings?.api_key) {
      return new Response(
        JSON.stringify({
          success: false,
          apiKeyFound: false,
          test,
          error: 'Google Maps API key not found in database',
          details: dbError
        } as TestResult),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = apiSettings.api_key;
    console.log('\u2705 Google Maps API key found, length:', apiKey.length);

    let response: Response;
    let testDescription = '';

    switch (test) {
      case 'places-search': {
        testDescription = 'Places API (New) - Text Search for Eiffel Tower';
        console.log(`\ud83e\uddea Testing: ${testDescription}`);

        response = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location'
          },
          body: JSON.stringify({
            textQuery: 'Eiffel Tower Paris',
            languageCode: 'nl'
          })
        });
        break;
      }

      case 'places-nearby': {
        testDescription = 'Places API (New) - Nearby Search Amsterdam';
        console.log(`\ud83e\uddea Testing: ${testDescription}`);

        response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.types'
          },
          body: JSON.stringify({
            includedTypes: ['tourist_attraction'],
            maxResultCount: 5,
            locationRestriction: {
              circle: {
                center: {
                  latitude: 52.3676,
                  longitude: 4.9041
                },
                radius: 5000.0
              }
            },
            languageCode: 'nl'
          })
        });
        break;
      }

      case 'geocoding': {
        testDescription = 'Geocoding API - Geocoding Amsterdam';
        console.log(`\ud83e\uddea Testing: ${testDescription}`);

        response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=Amsterdam,Netherlands&key=${apiKey}`
        );
        break;
      }

      case 'directions': {
        testDescription = 'Routes API - Route Amsterdam to Paris';
        console.log(`\ud83e\uddea Testing: ${testDescription}`);

        response = await fetch(
          `https://routes.googleapis.com/directions/v2:computeRoutes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
            },
            body: JSON.stringify({
              origin: {
                address: 'Amsterdam, Netherlands'
              },
              destination: {
                address: 'Paris, France'
              },
              travelMode: 'DRIVE',
              languageCode: 'nl',
              units: 'METRIC'
            })
          }
        );
        break;
      }

      default: {
        testDescription = 'Places API (New) - Text Search Amsterdam';
        console.log(`\ud83e\uddea Testing: ${testDescription}`);

        response = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.displayName,places.formattedAddress'
          },
          body: JSON.stringify({
            textQuery: 'Amsterdam',
            languageCode: 'nl'
          })
        });
      }
    }

    const data = await response.json();

    console.log('\ud83d\udcca Response status:', response.status);
    console.log('\ud83d\udcca Response:', JSON.stringify(data).substring(0, 500));

    if (response.ok) {
      let resultsCount = 0;
      let firstResult = null;
      let summary = 'Success';

      if (data.places) {
        resultsCount = data.places.length;
        firstResult = data.places[0];
        summary = `Found ${resultsCount} places`;
      } else if (data.routes) {
        resultsCount = data.routes.length;
        firstResult = data.routes[0];
        const route = data.routes[0];
        const duration = route?.duration ? `${Math.round(parseInt(route.duration.replace('s', '')) / 60)} min` : 'unknown';
        const distance = route?.distanceMeters ? `${Math.round(route.distanceMeters / 1000)} km` : 'unknown';
        summary = `Found ${resultsCount} routes (${duration}, ${distance})`;
      } else if (data.results) {
        resultsCount = data.results.length;
        firstResult = data.results[0];
        summary = `Found ${resultsCount} results`;
      }

      return new Response(
        JSON.stringify({
          success: true,
          apiKeyFound: true,
          test: testDescription,
          result: {
            status: 'OK',
            resultsCount,
            firstResult,
            summary
          }
        } as TestResult),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const errorMessage = data.error?.message || data.error_message || 'Unknown error';
      const errorStatus = data.error?.status || data.status || 'UNKNOWN';

      return new Response(
        JSON.stringify({
          success: false,
          apiKeyFound: true,
          test: testDescription,
          error: `API returned error: ${errorStatus}`,
          details: {
            status: errorStatus,
            error_message: errorMessage,
            fullResponse: data
          }
        } as TestResult),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('\u274c Test error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        apiKeyFound: false,
        test: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      } as TestResult),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
