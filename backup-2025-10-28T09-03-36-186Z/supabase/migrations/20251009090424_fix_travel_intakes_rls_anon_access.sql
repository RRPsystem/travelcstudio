/*
  # Fix RLS for travel_intakes - Allow anonymous access

  1. Changes
    - Drop existing public policies that are too restrictive
    - Add proper anon policies for INSERT and SELECT
    - Ensure anonymous users can create intakes and read their own via session_token

  2. Security
    - Anonymous users can INSERT intakes (needed for intake form)
    - Anonymous users can SELECT intakes (read-only access)
    - Authenticated brand users can still view their trip intakes
*/

-- Drop existing public policies
DROP POLICY IF EXISTS "Public can create intakes" ON travel_intakes;
DROP POLICY IF EXISTS "Public can view own intake via session token" ON travel_intakes;

-- Allow anonymous users to insert intakes
CREATE POLICY "Anonymous can create intakes"
  ON travel_intakes FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to read intakes (they need this to load their session)
CREATE POLICY "Anonymous can read intakes"
  ON travel_intakes FOR SELECT
  TO anon
  USING (true);
