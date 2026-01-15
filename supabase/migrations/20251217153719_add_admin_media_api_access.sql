/*
  # Add Admin Access to Media API Keys

  1. Changes
    - Allow admins to read Unsplash and YouTube API keys for the media selector
    - Admins can only READ these specific providers, not write/update/delete
    - Maintains security while enabling media selector functionality

  2. Security
    - Read-only access
    - Only for specific providers (Unsplash, YouTube)
    - Admins still cannot modify API settings
*/

-- Allow admins to read Unsplash and YouTube API keys for media selector
CREATE POLICY "Admins can read media API keys"
  ON api_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    AND provider IN ('Unsplash', 'YouTube')
  );
