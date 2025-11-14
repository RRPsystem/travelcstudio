/*
  # Create OAuth Settings and Credentials Tables

  1. New Tables
    - `oauth_settings`
      - Platform-specific OAuth app credentials (client_id, client_secret)
      - Managed by operators/admins
      - One row per platform (facebook, twitter, linkedin, etc.)
    
    - `social_media_credentials`
      - User/brand specific access tokens and refresh tokens
      - Links to social_media_accounts
      - Stores encrypted tokens for API access
  
  2. Security
    - Enable RLS on both tables
    - oauth_settings: Only operators can read/write
    - social_media_credentials: Users can only see their own
    - Tokens are sensitive - store securely
  
  3. Notes
    - Operators configure OAuth apps once per platform
    - Users connect their accounts which creates credentials
    - Tokens need periodic refresh (platform dependent)
*/

-- OAuth Settings (platform app credentials)
CREATE TABLE IF NOT EXISTS oauth_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text UNIQUE NOT NULL,
  client_id text NOT NULL,
  client_secret text NOT NULL,
  redirect_uri text NOT NULL,
  scopes text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE oauth_settings ENABLE ROW LEVEL SECURITY;

-- Only operators can manage OAuth settings
CREATE POLICY "Operators can manage OAuth settings"
  ON oauth_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Social Media Credentials (user tokens)
CREATE TABLE IF NOT EXISTS social_media_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES social_media_accounts(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE social_media_credentials ENABLE ROW LEVEL SECURITY;

-- Users can only access credentials for their own brand's accounts
CREATE POLICY "Users can view own brand credentials"
  ON social_media_credentials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM social_media_accounts sma
      JOIN users u ON u.brand_id = sma.brand_id
      WHERE sma.id = social_media_credentials.account_id
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can update own brand credentials"
  ON social_media_credentials
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM social_media_accounts sma
      JOIN users u ON u.brand_id = sma.brand_id
      WHERE sma.id = social_media_credentials.account_id
      AND u.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM social_media_accounts sma
      JOIN users u ON u.brand_id = sma.brand_id
      WHERE sma.id = social_media_credentials.account_id
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "System can insert credentials"
  ON social_media_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Operators can see all credentials for debugging
CREATE POLICY "Operators can view all credentials"
  ON social_media_credentials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_settings_platform ON oauth_settings(platform);
CREATE INDEX IF NOT EXISTS idx_social_media_credentials_account ON social_media_credentials(account_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_oauth_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_oauth_settings_updated_at
      BEFORE UPDATE ON oauth_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_social_media_credentials_updated_at'
  ) THEN
    CREATE TRIGGER update_social_media_credentials_updated_at
      BEFORE UPDATE ON social_media_credentials
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE oauth_settings IS 'Platform OAuth app credentials - managed by operators';
COMMENT ON TABLE social_media_credentials IS 'User-specific access tokens for social media platforms';
COMMENT ON COLUMN social_media_credentials.access_token IS 'Encrypted access token for API calls';
COMMENT ON COLUMN social_media_credentials.refresh_token IS 'Encrypted refresh token to get new access tokens';
