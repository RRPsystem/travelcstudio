/*
  # Fix API Settings Security

  ## Changes
  - Remove policies that allow all authenticated users to read API keys
  - Remove anon access to api_settings
  - API keys should ONLY be accessible via Edge Functions using service_role key
  - Frontend should NOT have direct access to api_keys

  ## Security
  - Drop all existing insecure policies
  - Only service_role (Edge Functions) can read api_settings
  - Operators can manage settings but frontend will use Edge Functions
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can view API settings" ON api_settings;
DROP POLICY IF EXISTS "Service role can read api settings" ON api_settings;
DROP POLICY IF EXISTS "Brands can view api settings" ON api_settings;
DROP POLICY IF EXISTS "Brands can manage own api settings" ON api_settings;
DROP POLICY IF EXISTS "Operators can manage all api settings" ON api_settings;
DROP POLICY IF EXISTS "Only operators can insert API settings" ON api_settings;
DROP POLICY IF EXISTS "Only operators can update API settings" ON api_settings;
DROP POLICY IF EXISTS "Only operators can delete API settings" ON api_settings;

-- Revoke all public access
REVOKE ALL ON api_settings FROM anon;
REVOKE ALL ON api_settings FROM authenticated;

-- Only service_role (used by Edge Functions) can access this table
-- No policies needed as service_role bypasses RLS

-- Enable RLS to block all other access
ALTER TABLE api_settings ENABLE ROW LEVEL SECURITY;