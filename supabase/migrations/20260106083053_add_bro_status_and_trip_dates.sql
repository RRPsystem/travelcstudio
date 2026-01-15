/*
  # Add Bro Status, Trip Dates and Auto-Expiry System

  1. Changes to `trips` table
    - Add `trip_start_date` date column
    - Add `trip_end_date` date column
    - Add `bro_status` column (active, stopped, expired)
    - Add `stopped_at` timestamp
    - Add `stopped_by` user reference
    - Add `stopped_reason` text
    - Add `auto_expire_days` integer (default 7)

  2. Changes to `travel_conversations` table
    - Add `input_tokens` integer
    - Add `output_tokens` integer
    - Add `total_tokens` integer
    - Add `openai_cost_eur` numeric

  3. Security
    - Operators can update bro_status and trip dates
    - When bro_status = 'stopped' or 'expired', travelbro-chat should reject requests

  4. Notes
    - Auto-expiry: trip_end_date + auto_expire_days
    - Manual stop: operator can stop with reason
    - Stopped Bros don't accept new messages
    - Only applies to trip_type = 'roadbook' (TravelBro trips)
*/

-- Add trip dates and status columns to trips
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'trip_start_date'
  ) THEN
    ALTER TABLE trips ADD COLUMN trip_start_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'trip_end_date'
  ) THEN
    ALTER TABLE trips ADD COLUMN trip_end_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'bro_status'
  ) THEN
    ALTER TABLE trips ADD COLUMN bro_status text DEFAULT 'active' CHECK (bro_status IN ('active', 'stopped', 'expired'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'stopped_at'
  ) THEN
    ALTER TABLE trips ADD COLUMN stopped_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'stopped_by'
  ) THEN
    ALTER TABLE trips ADD COLUMN stopped_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'stopped_reason'
  ) THEN
    ALTER TABLE trips ADD COLUMN stopped_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'auto_expire_days'
  ) THEN
    ALTER TABLE trips ADD COLUMN auto_expire_days integer DEFAULT 7;
  END IF;
END $$;

-- Add cost tracking to travel_conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_conversations' AND column_name = 'input_tokens'
  ) THEN
    ALTER TABLE travel_conversations ADD COLUMN input_tokens integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_conversations' AND column_name = 'output_tokens'
  ) THEN
    ALTER TABLE travel_conversations ADD COLUMN output_tokens integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_conversations' AND column_name = 'total_tokens'
  ) THEN
    ALTER TABLE travel_conversations ADD COLUMN total_tokens integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_conversations' AND column_name = 'openai_cost_eur'
  ) THEN
    ALTER TABLE travel_conversations ADD COLUMN openai_cost_eur numeric(10,4) DEFAULT 0;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trips_bro_status ON trips(bro_status) WHERE bro_status = 'active';
CREATE INDEX IF NOT EXISTS idx_trips_end_date ON trips(trip_end_date) WHERE bro_status = 'active';
CREATE INDEX IF NOT EXISTS idx_travel_conversations_trip_id ON travel_conversations(trip_id);

-- Function to check if a Bro should be expired
CREATE OR REPLACE FUNCTION check_bro_expiry(trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trip_record record;
  expire_date date;
BEGIN
  SELECT trip_end_date, auto_expire_days, bro_status
  INTO trip_record
  FROM trips
  WHERE id = trip_id;

  -- If not found or already stopped/expired, return false
  IF NOT FOUND OR trip_record.bro_status != 'active' THEN
    RETURN false;
  END IF;

  -- If no end date set, can't expire
  IF trip_record.trip_end_date IS NULL THEN
    RETURN false;
  END IF;

  -- Calculate expiry date
  expire_date := trip_record.trip_end_date + trip_record.auto_expire_days;

  -- Check if expired
  IF CURRENT_DATE > expire_date THEN
    -- Auto-expire the trip
    UPDATE trips
    SET bro_status = 'expired',
        stopped_at = now(),
        stopped_reason = 'Automatisch gestopt: ' || trip_record.auto_expire_days || ' dagen na terugkomst'
    WHERE id = trip_id;
    
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Drop view if exists
DROP VIEW IF EXISTS bro_monitoring_view;

-- Create a view for Bro monitoring that includes expiry status
CREATE VIEW bro_monitoring_view AS
SELECT 
  t.id,
  t.title,
  t.trip_start_date,
  t.trip_end_date,
  t.bro_status,
  t.stopped_at,
  t.stopped_reason,
  t.auto_expire_days,
  CASE 
    WHEN t.trip_end_date IS NOT NULL 
    THEN t.trip_end_date + t.auto_expire_days
    ELSE NULL
  END as expires_at,
  CASE 
    WHEN t.bro_status = 'active' AND t.trip_end_date IS NOT NULL AND CURRENT_DATE > (t.trip_end_date + t.auto_expire_days) THEN 'expired_pending'
    ELSE t.bro_status
  END as current_status,
  u.email as stopped_by_email,
  COUNT(DISTINCT tc.id) as total_messages,
  COALESCE(SUM(tc.total_tokens), 0) as total_tokens,
  COALESCE(SUM(tc.input_tokens), 0) as total_input_tokens,
  COALESCE(SUM(tc.output_tokens), 0) as total_output_tokens,
  COALESCE(SUM(tc.openai_cost_eur), 0) as total_openai_cost,
  10.0 as revenue_eur,
  10.0 - COALESCE(SUM(tc.openai_cost_eur), 0) as profit_eur,
  CASE 
    WHEN COALESCE(SUM(tc.openai_cost_eur), 0) > 0 
    THEN ((10.0 - COALESCE(SUM(tc.openai_cost_eur), 0)) / 10.0 * 100)
    ELSE 100
  END as profit_margin_pct
FROM trips t
LEFT JOIN travel_conversations tc ON tc.trip_id = t.id
LEFT JOIN auth.users u ON u.id = t.stopped_by
WHERE t.trip_type = 'roadbook'
GROUP BY t.id, t.title, t.trip_start_date, t.trip_end_date, t.bro_status, t.stopped_at, t.stopped_reason, t.auto_expire_days, u.email;

-- Grant access to operators
GRANT SELECT ON bro_monitoring_view TO authenticated;