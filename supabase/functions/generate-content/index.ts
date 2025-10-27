import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GenerateContentRequest {
  contentType: string;
  prompt: string;
  writingStyle?: string;
  additionalContext?: string;
  options?: {
    vacationType?: string;
    vacationTypeDescription?: string;
    routeType?: string;
    routeTypeDescription?: string;
    days?: string;
    daysDescription?: string;
    destination?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
    systemPrompt?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get ALL API keys from database
    const { data: allSettings, error: settingsError } = await supabaseClient
      .from('api_settings')
      .select('provider, api_key, additional_config');

    if (settingsError) {
      console.error('Error fetching API settings:', settingsError);
      throw new Error('Failed to load API settings');
    }

    const openaiSettings = allSettings?.find(s => s.provider === 'OpenAI');
    const googleSearchSettings = allSettings?.find(s => s.provider === 'Google Search');
    const googleMapsSettings = allSettings?.find(s => s.provider === 'Google Maps');

    if (!openaiSettings?.api_key || !openaiSettings.api_key.startsWith('sk-')) {
      throw new Error('OpenAI API key not configured');
    }

    const openaiApiKey = openaiSettings.api_key;
    const googleSearchApiKey = googleSearchSettings?.api_key;
    const googleSearchEngineId = googleSearchSettings?.additional_config?.search_engine_id;
    const googleMapsApiKey = googleMapsSettings?.api_key;

    // Parse request body
    const body: GenerateContentRequest = await req.json();
    const { contentType, prompt, writingStyle = 'professional', additionalContext = '', options = {} } = body;

    // Get GPT configuration from database
    const { data: gptConfig, error: gptError } = await supabaseClient
      .from('gpt_models')
      .select('*')
      .eq('content_type', contentType)
      .eq('is_active', true)
      .maybeSingle();

    if (gptError) {
      console.error('Error fetching GPT config:', gptError);
    }

    // Build system prompt with route instruction helper
    const getRouteInstruction = (routeType: string) => {
      switch (routeType) {
        case 'snelle-route': return 'Focus op de snelste route met minimale reistijd.';
        case 'toeristische-route': return 'Kies de mooiste route met bezienswaardigheden onderweg.';
        case 'binnendoor-weggetjes': return 'Gebruik kleinere wegen en ontdek verborgen parels.';
        case 'gemengd': return 'Combineer snelheid met mooie bezienswaardigheden.';
        default: return '';
      }
    };

    // Use GPT config if available, otherwise use defaults
    let systemPrompt = gptConfig?.system_prompt || options.systemPrompt || `Je bent een professionele reisschrijver die boeiende bestemmingsteksten schrijft over {DESTINATION}. Schrijf in {WRITING_STYLE} stijl voor {VACATION_TYPE} reizigers.`;

    // Build context descriptions
    const vacationTypeContext = options.vacationTypeDescription
      ? `${options.vacationType} (${options.vacationTypeDescription})`
      : options.vacationType || 'algemene';

    const routeTypeContext = options.routeTypeDescription
      ? `${options.routeType} (${options.routeTypeDescription})`
      : options.routeType || '';

    const daysContext = options.daysDescription
      ? `${options.days} (${options.daysDescription})`
      : options.days || '';

    // Replace variables in system prompt
    systemPrompt = systemPrompt
      .replace(/{WRITING_STYLE}/g, writingStyle)
      .replace(/{VACATION_TYPE}/g, vacationTypeContext)
      .replace(/{ROUTE_TYPE}/g, routeTypeContext)
      .replace(/{ROUTE_TYPE_INSTRUCTION}/g, getRouteInstruction(options.routeType || ''))
      .replace(/{DAYS}/g, daysContext)
      .replace(/{DESTINATION}/g, options.destination || '');

    // Helper: Fetch Google Search results
    const fetchGoogleSearch = async (query: string): Promise<string> => {
      if (!googleSearchApiKey || !googleSearchEngineId) {
        console.log('⚠️ Google Search not configured');
        return '';
      }

      try {
        const response = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${googleSearchApiKey}&cx=${googleSearchEngineId}&q=${encodeURIComponent(query)}&num=3`
        );

        if (!response.ok) {
          console.error('Google Search API error:', response.status);
          return '';
        }

        const data = await response.json();
        const results = data.items?.slice(0, 3).map((item: any) =>
          `${item.title}: ${item.snippet}`
        ).join('\n\n') || '';

        console.log(`✅ Google Search results fetched for: ${query}`);
        return results;
      } catch (error) {
        console.error('Google Search error:', error);
        return '';
      }
    };

    // Helper: Fetch Google Maps directions
    const fetchGoogleMapsRoute = async (origin: string, destination: string): Promise<string> => {
      if (!googleMapsApiKey) {
        console.log('⚠️ Google Maps not configured');
        return '';
      }

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${googleMapsApiKey}&language=nl`
        );

        if (!response.ok) {
          console.error('Google Maps API error:', response.status);
          return '';
        }

        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs[0];
          const steps = leg.steps.slice(0, 10).map((step: any) =>
            step.html_instructions.replace(/<[^>]*>/g, '')
          ).join('\n');

          const routeInfo = `
Afstand: ${leg.distance.text}
Reistijd: ${leg.duration.text}
Start: ${leg.start_address}
Einde: ${leg.end_address}

Route stappen:
${steps}
          `;

          console.log(`✅ Google Maps route fetched: ${origin} to ${destination}`);
          return routeInfo;
        }

        return '';
      } catch (error) {
        console.error('Google Maps error:', error);
        return '';
      }
    };

    // Fetch real-time data based on content type
    let realTimeContext = '';

    if (contentType === 'destination') {
      const searchQuery = `${prompt} travel guide tips 2024`;
      realTimeContext = await fetchGoogleSearch(searchQuery);
    } else if (contentType === 'route') {
      const routeMatch = prompt.match(/van\s+(.+?)\s+naar\s+(.+)/i) || prompt.match(/from\s+(.+?)\s+to\s+(.+)/i);
      if (routeMatch) {
        const origin = routeMatch[1].trim();
        const destination = routeMatch[2].trim();
        realTimeContext = await fetchGoogleMapsRoute(origin, destination);

        const searchQuery = `route ${origin} ${destination} bezienswaardigheden`;
        const searchResults = await fetchGoogleSearch(searchQuery);
        if (searchResults) {
          realTimeContext += `\n\nBezienswaardigheden onderweg:\n${searchResults}`;
        }
      }
    } else if (contentType === 'planning') {
      const searchQuery = `${prompt} dagplanning activiteiten 2024`;
      realTimeContext = await fetchGoogleSearch(searchQuery);
    } else if (contentType === 'hotel') {
      const searchQuery = `${prompt} hotels accommodatie 2024`;
      realTimeContext = await fetchGoogleSearch(searchQuery);
    }

    // Build comprehensive user prompt based on content type
    let userPrompt = prompt;

    if (contentType === 'destination') {
      userPrompt = `Schrijf een volledige bestemmingstekst over: ${prompt}`;
    } else if (contentType === 'route') {
      userPrompt = `Schrijf een volledige routebeschrijving voor: ${prompt}`;
    } else if (contentType === 'planning') {
      userPrompt = `Maak een volledige dagplanning voor: ${prompt}`;
    } else if (contentType === 'hotel') {
      userPrompt = `Geef een volledig hotel overzicht voor: ${prompt}`;
    }

    if (realTimeContext) {
      userPrompt += `\n\n=== ACTUELE INFORMATIE (Gebruik deze data!) ===\n${realTimeContext}\n=== EINDE ACTUELE INFORMATIE ===`;
    }

    if (additionalContext) {
      userPrompt += `\n\nExtra context: ${additionalContext}`;
    }

    // Use GPT config settings or provided options
    const modelToUse = options.model || gptConfig?.model || 'gpt-3.5-turbo';
    const maxTokens = options.maxTokens || gptConfig?.max_tokens || 1500;
    const temperature = options.temperature !== undefined ? options.temperature : (gptConfig?.temperature || 0.7);

    console.log(`Using GPT config: ${gptConfig?.name || 'default'} (${modelToUse})`);
    console.log(`Writing Style: "${writingStyle}"`);
    console.log(`Vacation Type: "${vacationTypeContext}"`);
    console.log(`Days: "${daysContext}"`);
    console.log(`Route Type: "${routeTypeContext}"`);
    console.log(`\n🌐 Google APIs Status:`);
    console.log(`  - Google Search: ${googleSearchApiKey ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`  - Google Maps: ${googleMapsApiKey ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`  - Real-time context fetched: ${realTimeContext ? `✅ Yes (${realTimeContext.length} chars)` : '❌ No'}`);
    console.log(`User Prompt: "${userPrompt}"`);
    console.log(`\n=== FULL SYSTEM PROMPT ===\n${systemPrompt}\n=== END SYSTEM PROMPT ===\n`);

    // Update usage count
    if (gptConfig) {
      await supabaseClient
        .from('gpt_models')
        .update({
          usage_count: (gptConfig.usage_count || 0) + 1,
          last_used: new Date().toISOString()
        })
        .eq('id', gptConfig.id);
    }

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API Error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    const content = data.choices[0]?.message?.content || 'Geen response ontvangen van OpenAI';

    return new Response(
      JSON.stringify({ content }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in generate-content function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
