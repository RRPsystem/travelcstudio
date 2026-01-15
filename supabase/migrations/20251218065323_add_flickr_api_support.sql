/*
  # Voeg Flickr Pro API Support Toe
  
  1. Wijzigingen
    - Voeg Flickr Pro provider toe aan api_settings voor foto zoeken/selecteren
    - Flickr API key voor toegang tot Flickr Pro accounts
    - Metadata voor user_id (Flickr user ID) en andere Flickr-specifieke settings
  
  2. Security
    - Admins kunnen Flickr API key lezen voor de media selector
    - Operators kunnen de API key beheren
*/

-- Insert Flickr API settings als die nog niet bestaat
INSERT INTO api_settings (provider, service_name, api_key, is_active, endpoints, metadata)
VALUES (
  'Flickr',
  'Flickr Pro Photo API',
  '',
  false,
  '["https://api.flickr.com/services/rest/"]'::jsonb,
  '{
    "api_key_label": "Flickr API Key",
    "api_secret_label": "Flickr API Secret (optioneel)",
    "user_id_label": "Flickr User ID (voor Pro account)",
    "photoset_id_label": "Photoset/Album ID (optioneel)",
    "search_params": {
      "per_page": 20,
      "sort": "date-posted-desc",
      "extras": "url_m,url_z,url_l,url_o,description,date_taken,owner_name"
    }
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- Allow admins to read Flickr API keys for media selector
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can read media API keys" ON api_settings;
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
      AND provider IN ('Unsplash', 'YouTube', 'Flickr')
    );
END $$;

COMMENT ON TABLE api_settings IS 'API keys voor externe services zoals OpenAI, Google, Unsplash, YouTube en Flickr';
