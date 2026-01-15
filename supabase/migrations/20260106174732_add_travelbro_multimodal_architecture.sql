/*
  # TravelBro Model A - Multimodal Architecture

  1. New Tables
    - `travel_message_attachments`
      - Stores user-uploaded images, audio, and video
      - Caches Vision and Whisper analysis results
      - Links to conversations for context

    - `travel_vision_logs`
      - Logs all GPT-4o Vision API calls
      - Tracks costs, performance, and confidence scores
      - Enables quality monitoring and debugging

    - `travel_tts_cache`
      - Caches generated TTS audio by text hash
      - Reduces costs through intelligent reuse
      - Tracks usage patterns and optimization

    - `travel_cost_tracking`
      - Daily cost aggregation per trip
      - Tracks Vision, TTS, Whisper costs separately
      - Enables budget monitoring and alerts

  2. Schema Changes
    - Extend `travel_conversations` with multimodal metadata
    - Add input_type, attachment flags, processing metrics
    - Store structured response format for AR/voice devices

  3. Storage Buckets
    - `travelbro-attachments`: User uploads (images, audio, video)
    - `travelbro-tts`: Generated TTS audio files

  4. Security
    - RLS policies for all tables
    - Authenticated users can only access their own trip data
    - Storage policies with file size and type validation
*/

-- =====================================================
-- 1. MESSAGE ATTACHMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS travel_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES travel_conversations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('image', 'audio', 'video')),
  file_path text NOT NULL,
  file_size_bytes integer NOT NULL,
  mime_type text NOT NULL,
  duration_seconds integer,

  -- Vision analysis cache (for images)
  vision_analysis jsonb,
  vision_detected_objects text[],
  vision_detected_text text,
  vision_detected_language text,
  vision_confidence_score float,

  -- Transcription cache (for audio)
  audio_transcription text,
  audio_language text,
  audio_confidence_score float,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_conversation
  ON travel_message_attachments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_attachments_type
  ON travel_message_attachments(type);
CREATE INDEX IF NOT EXISTS idx_attachments_created
  ON travel_message_attachments(created_at DESC);

-- Enable RLS
ALTER TABLE travel_message_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view attachments for their own trips
CREATE POLICY "Users can view own trip attachments"
  ON travel_message_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM travel_conversations tc
      JOIN travel_trips tt ON tc.trip_id = tt.id
      WHERE tc.id = conversation_id
      AND tt.brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can insert attachments for their own trips
CREATE POLICY "Users can insert own trip attachments"
  ON travel_message_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM travel_conversations tc
      JOIN travel_trips tt ON tc.trip_id = tt.id
      WHERE tc.id = conversation_id
      AND tt.brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Service role has full access (for edge functions)
CREATE POLICY "Service role full access to attachments"
  ON travel_message_attachments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 2. VISION ANALYSIS LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS travel_vision_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL,
  trip_id uuid REFERENCES travel_trips(id) ON DELETE CASCADE,
  attachment_id uuid REFERENCES travel_message_attachments(id) ON DELETE SET NULL,

  prompt_used text NOT NULL,
  vision_response text NOT NULL,
  confidence_score float,
  detected_categories text[],

  model_used text NOT NULL DEFAULT 'gpt-4o-vision',
  tokens_used integer,
  cost_eur numeric(10, 6),

  processing_time_ms integer,
  error_message text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vision_logs_trip
  ON travel_vision_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_vision_logs_attachment
  ON travel_vision_logs(attachment_id);
CREATE INDEX IF NOT EXISTS idx_vision_logs_created
  ON travel_vision_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vision_logs_session
  ON travel_vision_logs(session_token);

-- Enable RLS
ALTER TABLE travel_vision_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logs for their own trips
CREATE POLICY "Users can view own trip vision logs"
  ON travel_vision_logs FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM travel_trips
      WHERE brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Service role has full access
CREATE POLICY "Service role full access to vision logs"
  ON travel_vision_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 3. TTS CACHE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS travel_tts_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash text UNIQUE NOT NULL,
  text_content text NOT NULL,
  audio_url text NOT NULL,

  voice_model text NOT NULL DEFAULT 'tts-1',
  voice_name text NOT NULL DEFAULT 'alloy',
  language text NOT NULL DEFAULT 'nl',

  file_size_bytes integer,
  duration_seconds integer,

  usage_count integer DEFAULT 1,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tts_cache_hash
  ON travel_tts_cache(text_hash);
CREATE INDEX IF NOT EXISTS idx_tts_cache_last_used
  ON travel_tts_cache(last_used_at DESC);

-- Enable RLS
ALTER TABLE travel_tts_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access (TTS cache is system-wide)
CREATE POLICY "Service role full access to tts cache"
  ON travel_tts_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can read cache
CREATE POLICY "Authenticated users can read tts cache"
  ON travel_tts_cache FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 4. COST TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS travel_cost_tracking (
  date date NOT NULL,
  trip_id uuid NOT NULL REFERENCES travel_trips(id) ON DELETE CASCADE,

  vision_calls integer DEFAULT 0,
  vision_cost_eur numeric(10, 6) DEFAULT 0,

  tts_calls integer DEFAULT 0,
  tts_cost_eur numeric(10, 6) DEFAULT 0,

  whisper_calls integer DEFAULT 0,
  whisper_cost_eur numeric(10, 6) DEFAULT 0,

  gpt_calls integer DEFAULT 0,
  gpt_cost_eur numeric(10, 6) DEFAULT 0,

  total_cost_eur numeric(10, 6) DEFAULT 0,

  PRIMARY KEY (date, trip_id)
);

CREATE INDEX IF NOT EXISTS idx_cost_tracking_trip
  ON travel_cost_tracking(trip_id);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_date
  ON travel_cost_tracking(date DESC);

-- Enable RLS
ALTER TABLE travel_cost_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view costs for their own trips
CREATE POLICY "Users can view own trip costs"
  ON travel_cost_tracking FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM travel_trips
      WHERE brand_id IN (
        SELECT brand_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Service role has full access
CREATE POLICY "Service role full access to cost tracking"
  ON travel_cost_tracking FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 5. EXTEND TRAVEL_CONVERSATIONS TABLE
-- =====================================================

DO $$
BEGIN
  -- Add input_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_conversations' AND column_name = 'input_type'
  ) THEN
    ALTER TABLE travel_conversations
    ADD COLUMN input_type text CHECK (input_type IN ('text', 'audio', 'image', 'multimodal'));
  END IF;

  -- Add has_attachments flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_conversations' AND column_name = 'has_attachments'
  ) THEN
    ALTER TABLE travel_conversations
    ADD COLUMN has_attachments boolean DEFAULT false;
  END IF;

  -- Add vision_triggered flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_conversations' AND column_name = 'vision_triggered'
  ) THEN
    ALTER TABLE travel_conversations
    ADD COLUMN vision_triggered boolean DEFAULT false;
  END IF;

  -- Add tts_generated flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_conversations' AND column_name = 'tts_generated'
  ) THEN
    ALTER TABLE travel_conversations
    ADD COLUMN tts_generated boolean DEFAULT false;
  END IF;

  -- Add response_format for structured responses
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_conversations' AND column_name = 'response_format'
  ) THEN
    ALTER TABLE travel_conversations
    ADD COLUMN response_format jsonb;
  END IF;

  -- Add processing_time_ms for performance monitoring
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_conversations' AND column_name = 'processing_time_ms'
  ) THEN
    ALTER TABLE travel_conversations
    ADD COLUMN processing_time_ms integer;
  END IF;

  -- Add device_type for context
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_conversations' AND column_name = 'device_type'
  ) THEN
    ALTER TABLE travel_conversations
    ADD COLUMN device_type text CHECK (device_type IN ('phone', 'ar_glasses', 'whatsapp', 'web'));
  END IF;
END $$;

-- =====================================================
-- 6. STORAGE BUCKETS
-- =====================================================

-- Create storage bucket for user attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'travelbro-attachments',
  'travelbro-attachments',
  false,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for TTS audio
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'travelbro-tts',
  'travelbro-tts',
  false,
  10485760,
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. STORAGE POLICIES
-- =====================================================

-- Attachments: Users can upload to their own trips
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload attachments for own trips'
  ) THEN
    CREATE POLICY "Users can upload attachments for own trips"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'travelbro-attachments' AND
        (storage.foldername(name))[1] IN (
          SELECT id::text FROM travel_trips
          WHERE brand_id IN (
            SELECT brand_id FROM users WHERE id = auth.uid()
          )
        )
      );
  END IF;
END $$;

-- Attachments: Users can view their own trip attachments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own trip attachments storage'
  ) THEN
    CREATE POLICY "Users can view own trip attachments storage"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'travelbro-attachments' AND
        (storage.foldername(name))[1] IN (
          SELECT id::text FROM travel_trips
          WHERE brand_id IN (
            SELECT brand_id FROM users WHERE id = auth.uid()
          )
        )
      );
  END IF;
END $$;

-- Attachments: Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to attachments storage'
  ) THEN
    CREATE POLICY "Service role full access to attachments storage"
      ON storage.objects FOR ALL
      TO service_role
      USING (bucket_id = 'travelbro-attachments')
      WITH CHECK (bucket_id = 'travelbro-attachments');
  END IF;
END $$;

-- TTS: Service role only (system-managed cache)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access to tts storage'
  ) THEN
    CREATE POLICY "Service role full access to tts storage"
      ON storage.objects FOR ALL
      TO service_role
      USING (bucket_id = 'travelbro-tts')
      WITH CHECK (bucket_id = 'travelbro-tts');
  END IF;
END $$;

-- TTS: Authenticated users can read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read tts storage'
  ) THEN
    CREATE POLICY "Authenticated users can read tts storage"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'travelbro-tts');
  END IF;
END $$;

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to update cost tracking (called by edge functions)
CREATE OR REPLACE FUNCTION update_travel_costs(
  p_trip_id uuid,
  p_vision_cost numeric DEFAULT 0,
  p_tts_cost numeric DEFAULT 0,
  p_whisper_cost numeric DEFAULT 0,
  p_gpt_cost numeric DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
BEGIN
  INSERT INTO travel_cost_tracking (
    date, trip_id,
    vision_calls, vision_cost_eur,
    tts_calls, tts_cost_eur,
    whisper_calls, whisper_cost_eur,
    gpt_calls, gpt_cost_eur,
    total_cost_eur
  )
  VALUES (
    v_today, p_trip_id,
    CASE WHEN p_vision_cost > 0 THEN 1 ELSE 0 END, p_vision_cost,
    CASE WHEN p_tts_cost > 0 THEN 1 ELSE 0 END, p_tts_cost,
    CASE WHEN p_whisper_cost > 0 THEN 1 ELSE 0 END, p_whisper_cost,
    CASE WHEN p_gpt_cost > 0 THEN 1 ELSE 0 END, p_gpt_cost,
    p_vision_cost + p_tts_cost + p_whisper_cost + p_gpt_cost
  )
  ON CONFLICT (date, trip_id) DO UPDATE SET
    vision_calls = travel_cost_tracking.vision_calls + CASE WHEN p_vision_cost > 0 THEN 1 ELSE 0 END,
    vision_cost_eur = travel_cost_tracking.vision_cost_eur + p_vision_cost,
    tts_calls = travel_cost_tracking.tts_calls + CASE WHEN p_tts_cost > 0 THEN 1 ELSE 0 END,
    tts_cost_eur = travel_cost_tracking.tts_cost_eur + p_tts_cost,
    whisper_calls = travel_cost_tracking.whisper_calls + CASE WHEN p_whisper_cost > 0 THEN 1 ELSE 0 END,
    whisper_cost_eur = travel_cost_tracking.whisper_cost_eur + p_whisper_cost,
    gpt_calls = travel_cost_tracking.gpt_calls + CASE WHEN p_gpt_cost > 0 THEN 1 ELSE 0 END,
    gpt_cost_eur = travel_cost_tracking.gpt_cost_eur + p_gpt_cost,
    total_cost_eur = travel_cost_tracking.total_cost_eur + p_vision_cost + p_tts_cost + p_whisper_cost + p_gpt_cost;
END;
$$;

-- Function to get or create TTS cache
CREATE OR REPLACE FUNCTION get_tts_cache(p_text_hash text)
RETURNS TABLE (
  id uuid,
  audio_url text,
  usage_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update usage count and return existing cache
  RETURN QUERY
  UPDATE travel_tts_cache
  SET
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE text_hash = p_text_hash
  RETURNING
    travel_tts_cache.id,
    travel_tts_cache.audio_url,
    travel_tts_cache.usage_count;
END;
$$;
