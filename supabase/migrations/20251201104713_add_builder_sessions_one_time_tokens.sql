/*
  # Builder Sessions - One-Time Token System
  
  1. New Tables
    - `builder_sessions`
      - `id` (uuid, primary key) - Session ID
      - `brand_id` (uuid, references brands) - Brand owning the session
      - `user_id` (uuid, references auth.users) - User who created the session
      - `page_id` (uuid, references pages) - Page being edited
      - `initial_token_used` (boolean) - Whether the one-time URL token has been consumed
      - `session_token` (text) - Active session token (after initial exchange)
      - `expires_at` (timestamptz) - When the session expires
      - `created_at` (timestamptz) - When created
      - `last_activity_at` (timestamptz) - Last activity timestamp
      
  2. Security
    - Enable RLS on `builder_sessions` table
    - Only authenticated users can manage their sessions
    - Service role can create sessions (for JWT generation)
    
  3. Purpose
    - Track builder sessions with one-time URL tokens
    - Initial JWT in URL can only be used once to establish a session
    - After first use, client gets a new session token
    - Prevents URL sharing abuse
*/

-- Create builder sessions table
CREATE TABLE IF NOT EXISTS builder_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  initial_token_used boolean DEFAULT false,
  session_token text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_builder_sessions_brand_id ON builder_sessions(brand_id);
CREATE INDEX IF NOT EXISTS idx_builder_sessions_user_id ON builder_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_builder_sessions_expires_at ON builder_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_builder_sessions_session_token ON builder_sessions(session_token);

-- Enable RLS
ALTER TABLE builder_sessions ENABLE ROW LEVEL SECURITY;

-- Service role can do anything (for JWT generation)
CREATE POLICY "Service role has full access to builder_sessions"
  ON builder_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can view their own sessions
CREATE POLICY "Users can view own builder sessions"
  ON builder_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can update their own sessions
CREATE POLICY "Users can update own builder sessions"
  ON builder_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to clean up expired sessions (can be called via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_builder_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM builder_sessions
  WHERE expires_at < now();
END;
$$;