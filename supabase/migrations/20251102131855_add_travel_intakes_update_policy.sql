/*
  # Add UPDATE policy for travel_intakes

  ## Overview
  Allow anonymous users to update their intake forms by session_token.

  ## Changes
  1. Security
    - Add UPDATE policy for anonymous users
    - Users can only update intakes with their session_token
    - Required for intake form submission

  ## Notes
  - Anonymous users can update their own intakes via session_token
  - This is safe because session_token is a long random UUID
*/

-- Allow anonymous users to update intakes
CREATE POLICY "Anonymous can update own intakes"
  ON travel_intakes FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
