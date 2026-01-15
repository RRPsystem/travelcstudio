export interface DisplayCard {
  type: 'restaurant' | 'route' | 'info' | 'image' | 'weather' | 'hotel' | 'activity';
  title: string;
  data: any;
  priority: number;
}

export interface Action {
  type: 'navigate' | 'call' | 'save' | 'share' | 'open_url';
  label: string;
  data: any;
}

export interface TravelBroResponse {
  text: string;
  speech_text: string;
  display_cards: DisplayCard[];
  actions: Action[];
  requires_clarification: boolean;
  vision_used: boolean;
  audio_url?: string;
  metadata: {
    processing_time_ms: number;
    tokens_used: number;
    cost_eur: number;
  };
}

export class ResponseFormatter {
  formatResponse(params: {
    aiResponse: string;
    visionUsed: boolean;
    toolsCalled: any[];
    processingTimeMs: number;
    tokensUsed: number;
    costEur: number;
    currentLocation?: { lat: number; lng: number };
  }): TravelBroResponse {
    const speechText = this.generateSpeechText(params.aiResponse);
    const displayCards = this.extractDisplayCards(params.aiResponse, params.toolsCalled);
    const actions = this.extractActions(params.toolsCalled, params.currentLocation);
    const requiresClarification = this.detectClarificationNeeded(params.aiResponse);

    return {
      text: params.aiResponse,
      speech_text: speechText,
      display_cards: displayCards,
      actions: actions,
      requires_clarification: requiresClarification,
      vision_used: params.visionUsed,
      metadata: {
        processing_time_ms: params.processingTimeMs,
        tokens_used: params.tokensUsed,
        cost_eur: params.costEur,
      },
    };
  }

  private generateSpeechText(fullText: string): string {
    let speechText = fullText;

    speechText = speechText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    speechText = speechText.replace(/[📍🍴🗺️✅❌⭐🎯🔍🏨]/g, '');
    speechText = speechText.replace(/\*\*/g, '');
    speechText = speechText.replace(/\n{3,}/g, '\n\n');

    const sentences = speechText.split(/[.!?]\s+/);
    if (sentences.length > 3) {
      speechText = sentences.slice(0, 3).join('. ') + '.';
    }

    if (speechText.length > 300) {
      speechText = speechText.substring(0, 297) + '...';
    }

    return speechText.trim();
  }

  private extractDisplayCards(aiResponse: string, toolsCalled: any[]): DisplayCard[] {
    const cards: DisplayCard[] = [];

    toolsCalled.forEach((tool) => {
      if (tool.tool_name === 'google_places' && tool.success) {
        const restaurantMatches = aiResponse.matchAll(/\d+\.\s+\*\*([^*]+)\*\*[\s\S]*?Adres:\s+([^\n]+)[\s\S]*?Afstand:\s+(\d+)m/g);

        for (const match of restaurantMatches) {
          cards.push({
            type: 'restaurant',
            title: match[1],
            data: {
              address: match[2],
              distance_meters: parseInt(match[3]),
            },
            priority: 10,
          });
        }
      }

      if (tool.tool_name === 'google_directions' && tool.success) {
        const routeMatch = aiResponse.match(/Afstand:\s+([0-9.]+)\s+km[\s\S]*?Reistijd:\s+(\d+)\s+minuten/);
        if (routeMatch) {
          cards.push({
            type: 'route',
            title: `Route: ${tool.params.origin} → ${tool.params.destination}`,
            data: {
              distance_km: parseFloat(routeMatch[1]),
              duration_minutes: parseInt(routeMatch[2]),
              origin: tool.params.origin,
              destination: tool.params.destination,
            },
            priority: 9,
          });
        }
      }

      if (tool.tool_name === 'google_search' && tool.success) {
        cards.push({
          type: 'info',
          title: 'Actuele informatie',
          data: {
            source: 'Google Search',
            result_count: tool.response_summary,
          },
          priority: 5,
          });
      }
    });

    return cards.sort((a, b) => b.priority - a.priority);
  }

  private extractActions(toolsCalled: any[], currentLocation?: { lat: number; lng: number }): Action[] {
    const actions: Action[] = [];

    toolsCalled.forEach((tool) => {
      if (tool.tool_name === 'google_places' && tool.success) {
        actions.push({
          type: 'navigate',
          label: 'Navigeer naar restaurant',
          data: {
            location: tool.params.location,
          },
        });
      }

      if (tool.tool_name === 'google_directions' && tool.success) {
        actions.push({
          type: 'navigate',
          label: 'Start navigatie',
          data: {
            origin: tool.params.origin,
            destination: tool.params.destination,
          },
        });
      }
    });

    actions.push({
      type: 'share',
      label: 'Deel dit antwoord',
      data: {},
    });

    return actions;
  }

  private detectClarificationNeeded(aiResponse: string): boolean {
    const clarificationPhrases = [
      'welke',
      'wat bedoel je',
      'kun je specificeren',
      'meer informatie',
      'waar bedoel je',
      'welk hotel',
      'welke bestemming',
    ];

    const lower = aiResponse.toLowerCase();
    return clarificationPhrases.some(phrase => lower.includes(phrase)) &&
           aiResponse.includes('?');
  }
}
