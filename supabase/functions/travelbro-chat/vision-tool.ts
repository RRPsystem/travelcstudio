import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

interface VisionAnalysis {
  response: string;
  detectedObjects: string[];
  detectedText?: string;
  detectedLanguage?: string;
  confidence: number;
  categories: string[];
  locationName?: string;
  locationCity?: string;
  locationCountry?: string;
}

interface VisionJsonResponse {
  user_message: string;
  identified_location?: {
    name: string;
    city: string;
    country: string;
    description: string;
  };
  detected_objects: string[];
  categories: string[];
  confidence_level: number;
  uncertainty_note?: string;
}

export class VisionTool {
  private openaiApiKey: string;
  private supabase: SupabaseClient;
  private sessionToken: string;
  private tripId: string;

  // OpenAI GPT-4o pricing per 1M tokens (EUR conversion: 1 USD ≈ 0.92 EUR)
  private static readonly PRICING = {
    INPUT_PER_1M_TOKENS: 2.50 * 0.92,  // EUR
    OUTPUT_PER_1M_TOKENS: 10.0 * 0.92, // EUR
    IMAGE_LOW_TOKENS: 85,
    IMAGE_HIGH_BASE_TOKENS: 170, // per 512x512 tile
  };

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

  /**
   * Determine detail level based on intent
   * - 'high': menu, signs, text (needs OCR precision)
   * - 'auto': landmarks, general scenes (cost-efficient)
   */
  private getDetailLevel(message: string): 'high' | 'auto' {
    const lower = message.toLowerCase();
    const needsHighDetail = [
      'menu',
      'lees',
      'vertaal',
      'wat staat er',
      'tekst',
      'bord',
      'sign',
      'kaart',
    ];

    return needsHighDetail.some(keyword => lower.includes(keyword)) ? 'high' : 'auto';
  }

  async analyze(
    imageUrl: string,
    userMessage: string,
    context: string,
    attachmentId?: string | null
  ): Promise<VisionAnalysis> {
    const startTime = Date.now();

    const detailLevel = this.getDetailLevel(userMessage);
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
                    detail: detailLevel,
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('GPT-4o Vision API error:', error);
        throw new Error(`Vision API failed: ${error}`);
      }

      const data = await response.json();
      const visionJsonString = data.choices[0].message.content;
      const tokensUsed = data.usage?.total_tokens || 0;
      const inputTokens = data.usage?.prompt_tokens || 0;
      const outputTokens = data.usage?.completion_tokens || 0;

      // Calculate actual cost based on token usage
      const costEur = this.calculateCost(inputTokens, outputTokens);

      let visionJson: VisionJsonResponse;
      try {
        visionJson = JSON.parse(visionJsonString);
      } catch {
        console.error('Failed to parse vision JSON response');
        visionJson = {
          user_message: visionJsonString,
          detected_objects: [],
          categories: ['general'],
          confidence_level: 0.5,
        };
      }

      const analysis = this.parseStructuredResponse(visionJson);
      const processingTime = Date.now() - startTime;

      await this.logVisionCall({
        prompt,
        response: visionJsonString,
        confidence: analysis.confidence,
        categories: analysis.categories,
        tokensUsed,
        costEur,
        processingTime,
        attachmentId: attachmentId || null,
      });

      await this.updateCostTracking(costEur);

      return analysis;
    } catch (error) {
      console.error('Vision analysis failed:', error);
      throw error;
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * VisionTool.PRICING.INPUT_PER_1M_TOKENS;
    const outputCost = (outputTokens / 1_000_000) * VisionTool.PRICING.OUTPUT_PER_1M_TOKENS;
    return inputCost + outputCost;
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

⚠️ **ANTI-HALLUCINATIE REGEL:**
Als je NIET ZEKER bent over de identificatie van een locatie (confidence < 70%):
- Begin je antwoord met: "Ik zie [beschrijving], maar ik ben niet 100% zeker..."
- Vraag om extra info: "Kun je me meer context geven, zoals waar je ongeveer bent?"
- Geef alternatieve mogelijkheden indien relevant

✅ **OUTPUT FORMAAT (STRICT JSON):**
{
  "user_message": "Volledig Nederlands antwoord met emoji's voor de gebruiker",
  "identified_location": {
    "name": "Volledige naam van locatie (indien bekend)",
    "city": "Stad/regio",
    "country": "Land",
    "description": "Korte beschrijving"
  },
  "detected_objects": ["lijst", "van", "objecten"],
  "categories": ["landmark" | "menu" | "signage" | "map" | "nature" | "general"],
  "confidence_level": 0.9,
  "uncertainty_note": "Optionele notitie bij lage zekerheid"
}

Antwoord ALLEEN in valid JSON format. Geen extra tekst!`;

    return basePrompt;
  }

  private parseStructuredResponse(json: VisionJsonResponse): VisionAnalysis {
    const userMessage = json.user_message || 'Geen analyse beschikbaar.';

    // Add uncertainty note to user message if present
    const finalMessage = json.uncertainty_note
      ? `${userMessage}\n\n⚠️ ${json.uncertainty_note}`
      : userMessage;

    return {
      response: finalMessage,
      detectedObjects: json.detected_objects || [],
      confidence: json.confidence_level || 0.5,
      categories: json.categories || ['general'],
      locationName: json.identified_location?.name,
      locationCity: json.identified_location?.city,
      locationCountry: json.identified_location?.country,
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
        model_used: 'gpt-4o',
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
