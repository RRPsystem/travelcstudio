import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

interface VisionAnalysis {
  response: string;
  detectedObjects: string[];
  detectedText?: string;
  detectedLanguage?: string;
  confidence: number;
  categories: string[];
}

export class VisionTool {
  private openaiApiKey: string;
  private supabase: SupabaseClient;
  private sessionToken: string;
  private tripId: string;

  constructor(
    openaiApiKey: string,
    supabase: SupabaseClient,
    sessionToken: string,
    tripId: string
  ) {
    this.openaiApiKey = openaiApiKey;
    this.supabase = supabase;
    this.sessionToken = sessionToken;
    this.tripId = tripId;
  }

  shouldAnalyze(message: string | undefined, hasImage: boolean): boolean {
    if (!hasImage) return false;

    if (!message || message.trim().length === 0) {
      return true;
    }

    const lower = message.toLowerCase();

    const explicitTriggers = [
      'wat zie je',
      'wat staat er',
      'lees dit',
      'vertaal dit',
      'translate',
      'what do you see',
      'kijk',
      'bekijk',
      'op de foto',
      'in de afbeelding',
      'op het menu',
      'wat is dit',
      'herken je',
      'waar is dit',
      'waar ben ik',
      'waar ligt dit',
      'waar ligt deze',
      'waar is deze',
      'welke plek',
      'welke plaats',
      'welke locatie',
      'where is this',
      'where am i',
      'identify location',
      'kun je zien',
      'kun je de foto',
      'herkennen',
      'deze plek',
      'deze plaats',
      'dit gebouw',
      'deze foto',
      'de foto',
    ];

    if (explicitTriggers.some(trigger => lower.includes(trigger))) {
      return true;
    }

    if (message.split(' ').length <= 5 && hasImage) {
      return true;
    }

    return false;
  }

  async analyze(
    imageUrl: string,
    userMessage: string,
    context: string
  ): Promise<VisionAnalysis> {
    const startTime = Date.now();

    const prompt = this.buildVisionPrompt(userMessage, context);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('GPT-4o Vision API error:', error);
        throw new Error(`Vision API failed: ${error}`);
      }

      const data = await response.json();
      const visionResponse = data.choices[0].message.content;
      const tokensUsed = data.usage?.total_tokens || 0;

      const costEur = 0.01;

      const analysis = this.parseVisionResponse(visionResponse);

      const processingTime = Date.now() - startTime;

      await this.logVisionCall({
        prompt,
        response: visionResponse,
        confidence: analysis.confidence,
        categories: analysis.categories,
        tokensUsed,
        costEur,
        processingTime,
        attachmentId: null,
      });

      await this.updateCostTracking(costEur);

      return analysis;
    } catch (error) {
      console.error('Vision analysis failed:', error);
      throw error;
    }
  }

  private buildVisionPrompt(userMessage: string, context: string): string {
    const basePrompt = `Je bent TravelBro, een AI reisassistent met geavanceerde vision en locatie-herkenning capabilities.

${context ? `REIS CONTEXT:\n${context}\n\n` : ''}

Analyseer deze afbeelding grondig en identificeer EXACT wat je ziet.

${userMessage ? `USER VRAAG: ${userMessage}\n\n` : ''}

KRITISCHE INSTRUCTIES:

🌍 **LOCATIE IDENTIFICATIE (HOOGSTE PRIORITEIT):**
- Als dit een bekend landmark, gebouw, monument of natuurgebied is: identificeer het EXACT met de VOLLEDIGE NAAM
- Vermeld ALTIJD de stad, regio EN land waar het zich bevindt
- Geef historische context en bekende feiten
- Bijvoorbeeld: "Dit is de Eiffeltoren (Tour Eiffel) in Parijs, Frankrijk. Een iconisch ijzeren monument gebouwd in 1889..."
- Bijvoorbeeld: "Dit zijn de Drakensbergen (Drakensberg Mountains/uKhahlamba) in Zuid-Afrika en Lesotho. Een UNESCO werelderfgoed..."

📸 **ALGEMENE ANALYSE:**
1. Beschrijf wat je ziet in de afbeelding
2. Menu: vertaal gerechten en prijzen naar Nederlands
3. Borden/tekst: vertaal en leg uit wat er staat
4. Architectuur: identificeer stijl, periode, architect indien bekend
5. Natuur: benoem bergketens, rivieren, specifieke formaties
6. Wees ALTIJD specifiek - geen vage antwoorden zoals "een mooi gebouw" of "bergen"

✅ **FORMAAT:**
- Begin met de volledige naam in **vet**
- Geef locatie (stad, land)
- Voeg interessante feiten toe
- Gebruik emojis voor leesbaarheid

Antwoord in het Nederlands. Wees precies en informatief!`;

    return basePrompt;
  }

  private parseVisionResponse(response: string): VisionAnalysis {
    const detectedObjects: string[] = [];
    const categories: string[] = [];

    const lower = response.toLowerCase();

    if (lower.includes('menu') || lower.includes('gerecht')) {
      categories.push('restaurant_menu');
      detectedObjects.push('menu');
    }
    if (lower.includes('bord') || lower.includes('sign') || lower.includes('tekst')) {
      categories.push('signage');
      detectedObjects.push('sign');
    }
    if (lower.includes('gebouw') || lower.includes('landmark') || lower.includes('monument')) {
      categories.push('landmark');
      detectedObjects.push('building');
    }
    if (lower.includes('kaart') || lower.includes('map')) {
      categories.push('map');
      detectedObjects.push('map');
    }

    const hasNumbers = /\d+/.test(response);
    const hasDetailedInfo = response.length > 200;
    const confidence = hasDetailedInfo ? 0.9 : hasNumbers ? 0.8 : 0.7;

    return {
      response,
      detectedObjects,
      detectedText: undefined,
      detectedLanguage: undefined,
      confidence,
      categories: categories.length > 0 ? categories : ['general'],
    };
  }

  private async logVisionCall(params: {
    prompt: string;
    response: string;
    confidence: number;
    categories: string[];
    tokensUsed: number;
    costEur: number;
    processingTime: number;
    attachmentId: string | null;
  }): Promise<void> {
    try {
      await this.supabase.from('travel_vision_logs').insert({
        session_token: this.sessionToken,
        trip_id: this.tripId,
        attachment_id: params.attachmentId,
        prompt_used: params.prompt,
        vision_response: params.response,
        confidence_score: params.confidence,
        detected_categories: params.categories,
        model_used: 'gpt-4o-vision',
        tokens_used: params.tokensUsed,
        cost_eur: params.costEur,
        processing_time_ms: params.processingTime,
      });
    } catch (error) {
      console.error('Failed to log vision call:', error);
    }
  }

  private async updateCostTracking(visionCost: number): Promise<void> {
    try {
      await this.supabase.rpc('update_travel_costs', {
        p_trip_id: this.tripId,
        p_vision_cost: visionCost,
      });
    } catch (error) {
      console.error('Failed to update cost tracking:', error);
    }
  }
}
