/*
  # Add Conversation State Management System
  
  1. New Tables
    - `conversation_slots` - Holds contextual state per conversation
      - `id` (uuid, primary key)
      - `session_token` (text, indexed)
      - `trip_id` (uuid, foreign key)
      - `current_destination` (text, nullable)
      - `current_hotel` (text, nullable)
      - `current_day` (integer, nullable)
      - `current_country` (text, nullable)
      - `last_intent` (text, nullable) - restaurants, route, hotelinfo, activiteiten
      - `metadata` (jsonb) - extra flexibele data
      - `updated_at` (timestamptz)
      
    - `conversation_logs` - Observability logging
      - `id` (uuid, primary key)
      - `session_token` (text, indexed)
      - `trip_id` (uuid, foreign key)
      - `message_id` (uuid) - links to travel_conversations
      - `slots_before` (jsonb)
      - `slots_after` (jsonb)
      - `rag_chunks_used` (jsonb) - array of {doc_name, snippet_id, content}
      - `tools_called` (jsonb) - array of {tool_name, params, response_summary}
      - `model_temperature` (numeric)
      - `tokens_used` (integer)
      - `response_time_ms` (integer)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Service role has full access
    - Brands can view their own trip logs
    - Operators can view all logs
*/

-- Create conversation_slots table
CREATE TABLE IF NOT EXISTS conversation_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL,
  trip_id uuid REFERENCES travel_trips(id) ON DELETE CASCADE,
  current_destination text,
  current_hotel text,
  current_day integer,
  current_country text,
  last_intent text CHECK (last_intent IN ('restaurants', 'route', 'hotelinfo', 'activiteiten', 'algemeen')),
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(session_token, trip_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_slots_session 
  ON conversation_slots(session_token);
  
CREATE INDEX IF NOT EXISTS idx_conversation_slots_trip 
  ON conversation_slots(trip_id);

-- Create conversation_logs table
CREATE TABLE IF NOT EXISTS conversation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL,
  trip_id uuid REFERENCES travel_trips(id) ON DELETE CASCADE,
  message_id uuid,
  slots_before jsonb DEFAULT '{}'::jsonb,
  slots_after jsonb DEFAULT '{}'::jsonb,
  rag_chunks_used jsonb DEFAULT '[]'::jsonb,
  tools_called jsonb DEFAULT '[]'::jsonb,
  model_temperature numeric DEFAULT 0.3,
  tokens_used integer,
  response_time_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_logs_session 
  ON conversation_logs(session_token);
  
CREATE INDEX IF NOT EXISTS idx_conversation_logs_trip 
  ON conversation_logs(trip_id);
  
CREATE INDEX IF NOT EXISTS idx_conversation_logs_created 
  ON conversation_logs(created_at DESC);

-- Enable RLS
ALTER TABLE conversation_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to slots"
  ON conversation_slots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to logs"
  ON conversation_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Brands can view their own trip slots
CREATE POLICY "Brands can view trip slots"
  ON conversation_slots
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT travel_trips.id
      FROM travel_trips
      WHERE travel_trips.brand_id IN (
        SELECT users.brand_id
        FROM users
        WHERE users.id = auth.uid()
      )
    )
  );

-- Brands can view their own trip logs
CREATE POLICY "Brands can view trip logs"
  ON conversation_logs
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT travel_trips.id
      FROM travel_trips
      WHERE travel_trips.brand_id IN (
        SELECT users.brand_id
        FROM users
        WHERE users.id = auth.uid()
      )
    )
  );

-- Operators can view all slots
CREATE POLICY "Operators can view all slots"
  ON conversation_slots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Operators can view all logs
CREATE POLICY "Operators can view all logs"
  ON conversation_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );
