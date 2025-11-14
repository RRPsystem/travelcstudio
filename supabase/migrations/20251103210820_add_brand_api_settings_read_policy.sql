/*
  # Add Brand Read Access to API Settings
  
  1. Changes
    - Add SELECT policy for brands to read their own settings
    - Add SELECT policy for brands to read system-wide settings
    - Brands can only READ, not write (operators manage settings)
  
  2. Security
    - Brands can read api_settings where brand_id matches their brand
    - Brands can read api_settings where provider='system' (system-wide settings like Twilio)
    - Brands cannot insert, update, or delete api_settings
    - This allows TravelBro setup to check if WhatsApp is configured
*/

-- Policy for brands to read their own settings
CREATE POLICY "Brands can read own api_settings"
  ON api_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'brand'
      AND users.brand_id = api_settings.brand_id
    )
  );

-- Policy for brands to read system-wide settings (like Twilio)
CREATE POLICY "Brands can read system api_settings"
  ON api_settings
  FOR SELECT
  TO authenticated
  USING (
    provider = 'system' AND
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'brand'
    )
  );
