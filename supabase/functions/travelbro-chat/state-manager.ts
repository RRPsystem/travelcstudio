import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface ConversationSlots {
  current_destination: string | null;
  current_hotel: string | null;
  current_day: number | null;
  current_country: string | null;
  last_intent: 'restaurants' | 'route' | 'hotelinfo' | 'activiteiten' | 'websearch' | 'algemeen' | null;
  metadata: Record<string, any>;
}

export class StateManager {
  constructor(
    private supabase: SupabaseClient,
    private sessionToken: string,
    private tripId: string
  ) {}

  async getSlots(): Promise<ConversationSlots> {
    const { data, error } = await this.supabase
      .from('conversation_slots')
      .select('*')
      .eq('session_token', this.sessionToken)
      .eq('trip_id', this.tripId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching slots:', error);
      return this.emptySlots();
    }

    if (!data) {
      return this.emptySlots();
    }

    return {
      current_destination: data.current_destination,
      current_hotel: data.current_hotel,
      current_day: data.current_day,
      current_country: data.current_country,
      last_intent: data.last_intent,
      metadata: data.metadata || {}
    };
  }

  async updateSlots(updates: Partial<ConversationSlots>): Promise<void> {
    const currentSlots = await this.getSlots();

    const updatedSlots = {
      session_token: this.sessionToken,
      trip_id: this.tripId,
      current_destination: updates.current_destination ?? currentSlots.current_destination,
      current_hotel: updates.current_hotel ?? currentSlots.current_hotel,
      current_day: updates.current_day ?? currentSlots.current_day,
      current_country: updates.current_country ?? currentSlots.current_country,
      last_intent: updates.last_intent ?? currentSlots.last_intent,
      metadata: { ...currentSlots.metadata, ...updates.metadata },
      updated_at: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('conversation_slots')
      .upsert(updatedSlots, {
        onConflict: 'session_token,trip_id'
      });

    if (error) {
      console.error('Error updating slots:', error);
      throw error;
    }
  }

  extractSlotsFromMessage(
    message: string,
    aiResponse: string,
    tripData: any
  ): Partial<ConversationSlots> {
    const updates: Partial<ConversationSlots> = {};
    const lowerMessage = message.toLowerCase();
    const lowerResponse = aiResponse.toLowerCase();

    if (!tripData?.metadata?.itinerary) {
      return updates;
    }

    const itinerary = tripData.metadata.itinerary;

    for (const day of itinerary) {
      const location = day.location.toLowerCase();
      const hotelName = day.hotel?.name?.toLowerCase();

      const mentionsLocation = lowerMessage.includes(location) || lowerResponse.includes(location);
      const mentionsHotel = hotelName && (lowerMessage.includes(hotelName) || lowerResponse.includes(hotelName));

      if (mentionsLocation || mentionsHotel) {
        updates.current_destination = day.location;

        if (day.hotel?.name) {
          updates.current_hotel = day.hotel.name;
        }

        if (day.day) {
          updates.current_day = day.day;
        }

        break;
      }
    }

    if (lowerMessage.includes('restaurant') || lowerMessage.includes('eten')) {
      updates.last_intent = 'restaurants';
    } else if (lowerMessage.includes('route') || lowerMessage.includes('afstand')) {
      updates.last_intent = 'route';
    } else if (lowerMessage.includes('hotel') || lowerMessage.includes('overnachting') || lowerMessage.includes('slapen')) {
      updates.last_intent = 'hotelinfo';
    } else if (lowerMessage.includes('activiteit') || lowerMessage.includes('doen')) {
      updates.last_intent = 'activiteiten';
    }

    return updates;
  }

  private emptySlots(): ConversationSlots {
    return {
      current_destination: null,
      current_hotel: null,
      current_day: null,
      current_country: null,
      last_intent: null,
      metadata: {}
    };
  }

  formatSlotsForPrompt(slots: ConversationSlots): string {
    if (!slots.current_destination && !slots.current_hotel) {
      return '';
    }

    const parts: string[] = ['HUIDIGE CONTEXT:'];

    if (slots.current_destination) {
      parts.push(`- Bestemming: ${slots.current_destination}`);
    }

    if (slots.current_hotel) {
      parts.push(`- Hotel: ${slots.current_hotel}`);
    }

    if (slots.current_day) {
      parts.push(`- Reisdag: ${slots.current_day}`);
    }

    if (slots.last_intent) {
      parts.push(`- Laatste onderwerp: ${slots.last_intent}`);
    }

    return parts.join('\n');
  }
}