import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { ConversationSlots } from "./state-manager.ts";

export interface ToolCall {
  tool_name: string;
  params: Record<string, any>;
  response_summary: string;
  success: boolean;
}

export interface RAGChunk {
  source: string;
  content: string;
  relevance_score: number;
}

export interface LogEntry {
  messageId: string | null;
  slotsBefore: ConversationSlots;
  slotsAfter: ConversationSlots;
  ragChunks: RAGChunk[];
  toolsCalled: ToolCall[];
  modelTemperature: number;
  tokensUsed: number;
}

export class ObservabilityLogger {
  constructor(
    private supabase: SupabaseClient,
    private sessionToken: string,
    private tripId: string
  ) {}

  async log(entry: LogEntry): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('conversation_logs')
        .insert({
          session_token: this.sessionToken,
          trip_id: this.tripId,
          message_id: entry.messageId,
          slots_before: entry.slotsBefore,
          slots_after: entry.slotsAfter,
          rag_chunks: entry.ragChunks,
          tools_called: entry.toolsCalled,
          model_temperature: entry.modelTemperature,
          tokens_used: entry.tokensUsed,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log conversation:', error);
      }
    } catch (error) {
      console.error('Error in observability logger:', error);
    }
  }
}