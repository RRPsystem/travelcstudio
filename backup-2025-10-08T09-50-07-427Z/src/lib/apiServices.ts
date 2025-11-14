// API Services for OpenAI, Google Search, and Google Maps
import { supabase } from './supabase';

// Types
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

export interface GoogleMapsPlace {
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  photos?: Array<{
    photo_reference: string;
  }>;
}

// OpenAI Service
export class OpenAIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    const isPlaceholder = this.apiKey === 'your-openai-api-key' || this.apiKey.startsWith('your-openai');
    const hasValidKey = this.apiKey && this.apiKey.startsWith('sk-') && !isPlaceholder;
  }

  async generateContent(
    contentType: string,
    prompt: string,
    writingStyle: string = 'professional',
    additionalContext: string = '',
    options: {
      vacationType?: string;
      routeType?: string;
      days?: string;
      destination?: string;
      temperature?: number;
      maxTokens?: number;
      model?: string;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!this.apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format. Key should start with "sk-"');
    }

    // Get route type instruction
    const getRouteInstruction = (routeType: string) => {
      switch (routeType) {
        case 'snelle-route': return 'Focus op de snelste route met minimale reistijd.';
        case 'toeristische-route': return 'Kies de mooiste route met bezienswaardigheden onderweg.';
        case 'binnendoor-weggetjes': return 'Gebruik kleinere wegen en ontdek verborgen parels.';
        case 'gemengd': return 'Combineer snelheid met mooie bezienswaardigheden.';
        default: return '';
      }
    };

    // Dynamic system prompts with variable replacement
    const getSystemPrompt = (contentType: string) => {
      const basePrompts = {
        destination: `Je bent een professionele reisschrijver die boeiende bestemmingsteksten schrijft over {DESTINATION}. Schrijf in {WRITING_STYLE} stijl voor {VACATION_TYPE} reizigers. Gebruik actuele informatie en maak de tekst aantrekkelijk.`,
        route: `Je bent een routeplanner die gedetailleerde routebeschrijvingen maakt. {ROUTE_TYPE_INSTRUCTION} Geef praktische informatie over de route, bezienswaardigheden onderweg, en reistips. Schrijf in {WRITING_STYLE} stijl voor {VACATION_TYPE} reizigers.`,
        planning: `Je bent een reisplanner die {DAYS} dagplanningen maakt voor {DESTINATION}. Geef een praktische planning met tijden, activiteiten, en tips. Schrijf in {WRITING_STYLE} stijl voor {VACATION_TYPE} reizigers.`,
        hotel: `Je bent een hotelexpert die hotelzoekresultaten presenteert voor {VACATION_TYPE} reizigers. Geef gedetailleerde informatie over hotels, voorzieningen, en boekingsadvies. Schrijf in {WRITING_STYLE} stijl.`,
        image: `Je bent een AI die afbeeldingsbeschrijvingen genereert voor DALL-E. Maak een gedetailleerde, visuele beschrijving voor een {VACATION_TYPE} reisafbeelding in {WRITING_STYLE} stijl.`
      };

      let systemPrompt = basePrompts[contentType as keyof typeof basePrompts] || basePrompts.destination;
      
      // Replace variables
      systemPrompt = systemPrompt
        .replace('{WRITING_STYLE}', writingStyle)
        .replace('{VACATION_TYPE}', options.vacationType || 'algemene')
        .replace('{ROUTE_TYPE}', options.routeType || '')
        .replace('{ROUTE_TYPE_INSTRUCTION}', getRouteInstruction(options.routeType || ''))
        .replace('{DAYS}', options.days || '')
        .replace('{DESTINATION}', options.destination || '');

      return systemPrompt;
    };

    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: options.systemPrompt || getSystemPrompt(contentType)
      },
      {
        role: 'user',
        content: `${prompt}${additionalContext ? `\n\nExtra context: ${additionalContext}` : ''}`
      }
    ];

    try {
      console.log('Making OpenAI API request to:', `${this.baseUrl}/chat/completions`);
      console.log('Request payload:', {
        model: 'gpt-4',
        messages: messages.map(m => ({ role: m.role, content: m.content.substring(0, 100) + '...' })),
        max_tokens: 1500,
        temperature: 0.7,
      });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model || 'gpt-3.5-turbo',
          messages,
          max_tokens: options.maxTokens || 1500,
          temperature: options.temperature || 0.7,
        }),
      });

      console.log('OpenAI API Response status:', response.status);
      console.log('OpenAI API Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error Response:', errorText);
        
        if (response.status === 403) {
          throw new Error(`OpenAI API 403 Forbidden: Check your API key permissions. Response: ${errorText}`);
        } else if (response.status === 401) {
          throw new Error(`OpenAI API 401 Unauthorized: Invalid API key. Response: ${errorText}`);
        } else if (response.status === 429) {
          throw new Error(`OpenAI API 429 Rate Limited: Too many requests. Response: ${errorText}`);
        } else {
          throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('OpenAI API Success response:', data);
      return data.choices[0]?.message?.content || 'Geen response ontvangen van OpenAI';
    } catch (error) {
      console.error('OpenAI API Error:', error);
      if (error instanceof Error) {
        throw error; // Re-throw the original error with detailed message
      } else {
        throw new Error(`OpenAI onbekende fout: ${error}`);
      }
    }
  }

  async generateContentWithCustomGPT(
    prompt: string,
    writingStyle: string = 'professional',
    additionalContext: string = '',
    options: {
      vacationType?: string;
      routeType?: string;
      days?: string;
      destination?: string;
      temperature?: number;
      maxTokens?: number;
      model?: string;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!this.apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format. Key should start with "sk-"');
    }

    // Replace variables in system prompt
    let systemPrompt = options.systemPrompt || '';

    console.log('🔧 Replacing variables in prompt:');
    console.log('  WRITING_STYLE:', writingStyle);
    console.log('  VACATION_TYPE:', options.vacationType || 'algemene');
    console.log('  DESTINATION:', options.destination);
    console.log('  DAYS:', options.days);
    console.log('  ROUTE_TYPE:', options.routeType);

    systemPrompt = systemPrompt
      .replace(/{WRITING_STYLE}/g, writingStyle)
      .replace(/{VACATION_TYPE}/g, options.vacationType || 'algemene')
      .replace(/{ROUTE_TYPE}/g, options.routeType || '')
      .replace(/{DAYS}/g, options.days || '')
      .replace(/{DESTINATION}/g, options.destination || '');

    console.log('📝 System prompt preview:', systemPrompt.substring(0, 300) + '...');

    // Add route type instruction
    const getRouteInstruction = (routeType: string) => {
      switch (routeType) {
        case 'snelle-route': return 'Focus op de snelste route met minimale reistijd.';
        case 'toeristische-route': return 'Kies de mooiste route met bezienswaardigheden onderweg.';
        case 'binnendoor-weggetjes': return 'Gebruik kleinere wegen en ontdek verborgen parels.';
        case 'gemengd': return 'Combineer snelheid met mooie bezienswaardigheden.';
        default: return '';
      }
    };

    systemPrompt = systemPrompt.replace(/{ROUTE_TYPE_INSTRUCTION}/g, getRouteInstruction(options.routeType || ''));

    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `${prompt}${additionalContext ? `\n\nExtra context: ${additionalContext}` : ''}`
      }
    ];

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model || 'gpt-3.5-turbo',
          messages,
          max_tokens: options.maxTokens || 1500,
          temperature: options.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error Response:', errorText);
        
        if (response.status === 403) {
          throw new Error(`OpenAI API 403 Forbidden: Check your API key permissions. Response: ${errorText}`);
        } else if (response.status === 401) {
          throw new Error(`OpenAI API 401 Unauthorized: Invalid API key. Response: ${errorText}`);
        } else if (response.status === 429) {
          throw new Error(`OpenAI API 429 Rate Limited: Too many requests. Response: ${errorText}`);
        } else {
          throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
        }
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Geen response ontvangen van OpenAI';
    } catch (error) {
      console.error('OpenAI API Error:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`OpenAI onbekende fout: ${error}`);
      }
    }
  }

  async generateImage(prompt: string): Promise<string> {
    const isPlaceholder = this.apiKey === 'your-openai-api-key' || this.apiKey.startsWith('your-openai');
    if (!this.apiKey || isPlaceholder) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `Travel photography: ${prompt}. High quality, professional travel photo style.`,
          size: '1024x1024',
          quality: 'standard',
          n: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI Images API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0]?.url || '';
    } catch (error) {
      console.error('OpenAI Images API Error:', error);
      throw new Error(`Afbeelding generatie fout: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    }
  }
}

// Google Search Service
export class GoogleSearchService {
  private apiKey: string;
  private searchEngineId: string;
  private baseUrl = 'https://www.googleapis.com/customsearch/v1';

  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY || '';
    this.searchEngineId = import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID || '';
    const isPlaceholderKey = this.apiKey === 'your-google-search-api-key' || this.apiKey.startsWith('your-google');
    const isPlaceholderEngineId = this.searchEngineId === 'your-search-engine-id' || this.searchEngineId.startsWith('your-search');
  }

  async searchTravel(query: string, location?: string): Promise<GoogleSearchResult[]> {
    const isPlaceholderKey = this.apiKey === 'your-google-search-api-key' || this.apiKey.startsWith('your-google');
    const isPlaceholderEngineId = this.searchEngineId === 'your-search-engine-id' || this.searchEngineId.startsWith('your-search');
    
    if (!this.apiKey || !this.searchEngineId || isPlaceholderKey || isPlaceholderEngineId) {
      console.log('⚠️ Google Search API not configured, skipping search');
      return [];
    }

    const searchQuery = location ? `${query} ${location} travel guide tips` : `${query} travel guide tips`;

    try {
      const response = await fetch(
        `${this.baseUrl}?key=${this.apiKey}&cx=${this.searchEngineId}&q=${encodeURIComponent(searchQuery)}&num=5`
      );

      if (!response.ok) {
        throw new Error(`Google Search API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.items?.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        displayLink: item.displayLink,
      })) || [];
    } catch (error) {
      console.error('Google Search API Error:', error);
      throw new Error(`Google Search fout: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    }
  }

  async getLatestTravelInfo(destination: string): Promise<string> {
    try {
      const results = await this.searchTravel(`latest travel information ${destination} 2024`);
      
      if (results.length === 0) {
        return 'Google Search API niet geconfigureerd - gebruik alleen OpenAI data.';
      }

      const context = results
        .slice(0, 3)
        .map(result => `${result.title}: ${result.snippet}`)
        .join('\n\n');

      return context;
    } catch (error) {
      console.error('Error getting travel info:', error);
      return 'Google Search API niet beschikbaar - gebruik alleen OpenAI data.';
    }
  }
}

// Google Maps Service
export class GoogleMapsService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    const isPlaceholder = this.apiKey === 'your-google-maps-api-key' || this.apiKey.startsWith('your-google');
  }

  async searchPlaces(query: string, location?: string): Promise<GoogleMapsPlace[]> {
    const isPlaceholder = this.apiKey === 'your-google-maps-api-key' || this.apiKey.startsWith('your-google');
    
    if (!this.apiKey || isPlaceholder) {
      console.log('⚠️ Google Maps API not configured, skipping places search');
      return [];
    }

    const searchQuery = location ? `${query} in ${location}` : query;

    try {
      const response = await fetch(
        `${this.baseUrl}/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.results?.slice(0, 5).map((place: any) => ({
        name: place.name,
        formatted_address: place.formatted_address,
        geometry: place.geometry,
        rating: place.rating,
        photos: place.photos,
      })) || [];
    } catch (error) {
      console.error('Google Maps API Error:', error);
      throw new Error(`Google Maps fout: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    }
  }

  async getDirections(origin: string, destination: string, routeType: string = 'driving'): Promise<any> {
    const isPlaceholder = this.apiKey === 'your-google-maps-api-key' || this.apiKey.startsWith('your-google');
    
    if (!this.apiKey || isPlaceholder) {
      console.log('⚠️ Google Maps API not configured, skipping directions');
      return { routes: [] };
    }

    const travelMode = routeType === 'snelle-route' ? 'driving' : 'driving';
    const avoidOptions = routeType === 'toeristische-route' ? '' : '&avoid=tolls';

    try {
      const response = await fetch(
        `${this.baseUrl}/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${travelMode}${avoidOptions}&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Google Directions API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Google Directions API Error:', error);
      throw new Error(`Route berekening fout: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
    }
  }

  getStaticMapUrl(center: string, zoom: number = 13, size: string = '400x300'): string {
    const isPlaceholder = this.apiKey === 'your-google-maps-api-key' || this.apiKey.startsWith('your-google');
    
    if (!this.apiKey || isPlaceholder) {
      return '';
    }

    return `${this.baseUrl}/staticmap?center=${encodeURIComponent(center)}&zoom=${zoom}&size=${size}&key=${this.apiKey}`;
  }
}

// Combined AI Travel Service
export class AITravelService {
  private openai: OpenAIService;
  private googleSearch: GoogleSearchService;
  private googleMaps: GoogleMapsService;

  constructor() {
    this.openai = new OpenAIService();
    this.googleSearch = new GoogleSearchService();
    this.googleMaps = new GoogleMapsService();
  }

  async getActiveGPTModel(contentType: string): Promise<any | null> {
    try {
      const { db } = await import('./supabase');
      const gptModels = await db.getGPTModels();
      return gptModels?.find(gpt => gpt.content_type === contentType && gpt.is_active) || null;
    } catch (error) {
      console.log('Could not load GPT models from database, using default');
      return null;
    }
  }

  async generateEnhancedContent(
    contentType: string,
    prompt: string,
    writingStyle: string = 'professional',
    additionalData: any = {},
    options: {
      vacationType?: string;
      routeType?: string;
      days?: string;
      destination?: string;
    } = {}
  ): Promise<string> {
    let enhancedPrompt = prompt;
    let additionalContext = '';

    // Try to get custom GPT model for this content type
    const customGPT = await this.getActiveGPTModel(contentType);
    
    // Try to get real-time data based on content type, but continue if it fails
    try {
      if (contentType === 'destination') {
        const travelInfo = await this.googleSearch.getLatestTravelInfo(prompt);
        const places = await this.googleMaps.searchPlaces(`tourist attractions ${prompt}`);
        
        if (travelInfo && !travelInfo.includes('niet geconfigureerd')) {
          additionalContext += `Actuele informatie: ${travelInfo}\n\n`;
        }
        if (places.length > 0) {
          additionalContext += `Bezienswaardigheden: ${places.map(p => p.name).join(', ')}`;
        }
      } else if (contentType === 'route' && additionalData.from && additionalData.to) {
        const directions = await this.googleMaps.getDirections(additionalData.from, additionalData.to, additionalData.routeType);
        
        if (directions && directions.routes && directions.routes.length > 0) {
          const route = directions.routes[0];
          additionalContext = `Route informatie: ${route.summary || ''}\nAfstand: ${route.legs[0]?.distance?.text || ''}\nReistijd: ${route.legs[0]?.duration?.text || ''}`;
        }
      } else if (contentType === 'hotel') {
        const hotels = await this.googleMaps.searchPlaces(prompt);
        if (hotels.length > 0) {
          additionalContext = `Gevonden hotels: ${hotels.map(h => `${h.name} (${h.rating || 'N/A'} sterren)`).join(', ')}`;
        }
      }
    } catch (googleError) {
      console.log('⚠️ Google APIs not available, using OpenAI only:', googleError);
      // Continue with OpenAI generation without Google data
    }

    try {
      // Generate content with OpenAI (using custom GPT if available)
      if (customGPT) {
        // Use custom GPT model configuration
        const customOptions = {
          ...options,
          temperature: typeof customGPT.temperature === 'string' ? parseFloat(customGPT.temperature) : customGPT.temperature,
          maxTokens: customGPT.max_tokens,
          model: customGPT.model,
          systemPrompt: customGPT.system_prompt
        };
        
        // Increment usage count
        try {
          const { db } = await import('./supabase');
          await db.incrementGPTUsage(customGPT.id);
        } catch (error) {
          console.log('Could not increment GPT usage:', error);
        }
        
        return await this.openai.generateContentWithCustomGPT(enhancedPrompt, writingStyle, additionalContext, customOptions);
      } else {
        // Use default content generation
        return await this.openai.generateContent(contentType, enhancedPrompt, writingStyle, additionalContext, options);
      }
    } catch (error) {
      console.error('Enhanced content generation error:', error);
      throw error;
    }
  }

  async generateImage(prompt: string): Promise<string> {
    return await this.openai.generateImage(prompt);
  }
}

// Export singleton instance
export const aiTravelService = new AITravelService();