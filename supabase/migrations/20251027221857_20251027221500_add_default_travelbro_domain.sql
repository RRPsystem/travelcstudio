/*
  # Add Default TravelBRO Domain Setting

  ## Overview
  Adds system-wide default TravelBRO domain setting that all brands use by default.

  ## Changes
  1. New API Setting
    - Provider: 'system'
    - Service: 'travelbro_domain'
    - API Key field stores the default domain (e.g., travelbro.nl)
    - All brands use this domain unless they configure their own

  ## Usage
  - Operators can set the default domain in API Settings
  - When generating share links, check brand's custom domain first
  - If no custom domain, use system default
  - If no system default, fall back to current application domain

  ## Notes
  - Brand-specific domains (brands.travelbro_domain) override this default
  - System default is used by all brands who don't set a custom domain
*/

-- Insert default TravelBRO domain setting
INSERT INTO api_settings (
  provider,
  service_name,
  api_key,
  is_active,
  test_status,
  metadata
)
VALUES (
  'system',
  'TravelBRO Domain',
  'travelbro.nl',
  true,
  'success',
  jsonb_build_object(
    'description', 'Standaard domeinnaam voor alle TravelBRO chat links',
    'type', 'domain',
    'example', 'travelbro.nl',
    'format', 'Alleen domeinnaam zonder https:// of paden'
  )
)
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE api_settings IS 'System-wide API and configuration settings including default TravelBRO domain';
