/*
  # Create Debug Logs Table for TravelBro Debugging

  1. Purpose
    - Capture exact errors from travelbro-chat edge function
    - Help diagnose WhatsApp integration issues
    - Temporary table for debugging

  2. Changes
    - Create debug_logs table
    - Service role can insert logs
    - Operators can view logs
*/

CREATE TABLE IF NOT EXISTS debug_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  error_message text,
  request_payload jsonb,
  response_status int,
  response_body text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Service role can insert
CREATE POLICY "Service role can insert debug logs"
  ON debug_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Operators can view
CREATE POLICY "Operators can view debug logs"
  ON debug_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at 
  ON debug_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_debug_logs_function_name 
  ON debug_logs(function_name);
