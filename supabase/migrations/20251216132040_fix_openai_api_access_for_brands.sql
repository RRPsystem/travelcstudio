/*
  # Fix OpenAI API Access voor Brands

  1. Probleem
    - Brands kunnen OpenAI API settings niet lezen
    - Hierdoor werkt de Afbeelding Generator niet
    - Error: "OpenAI API key not configured"

  2. Oplossing
    - Voeg RLS policy toe voor brands om OpenAI settings te lezen
    - Net zoals bestaande policy voor Google API settings

  3. Security
    - Brands kunnen alleen READ access
    - Alleen voor OpenAI provider
    - Alleen system-wide settings (brand_id IS NULL)
*/

-- Voeg policy toe voor brands om OpenAI settings te lezen
CREATE POLICY "Brands can read shared OpenAI API settings"
  ON api_settings
  FOR SELECT
  TO authenticated
  USING (
    provider = 'OpenAI'
    AND brand_id IS NULL
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'brand'
    )
  );
