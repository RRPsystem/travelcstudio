/*
  # Simplify Social Media Account Management

  1. Changes
    - Remove brand subscription tiers (they don't pay us)
    - Focus on platform account management (they manage their own accounts)
    - Each account tracks what tier THEY have with that platform
    - Remove tier limits table (not needed)
    
  2. How it Works
    - Brands connect their own Facebook Business, Twitter Pro, etc.
    - Each account stores their platform's tier (free/business/enterprise)
    - Limits are based on what THEY pay to the platform, not us
    - We just help them manage it all in one place
*/

-- Remove social_media_tier from brands (they don't pay us)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brands' AND column_name = 'social_media_tier'
  ) THEN
    ALTER TABLE brands DROP COLUMN social_media_tier;
  END IF;
END $$;

-- Keep api_tier in social_media_accounts (this is THEIR platform account tier)
-- This stays because it tracks what plan THEY have with Facebook, Twitter, etc.

-- Add platform_account_type for more details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_accounts' AND column_name = 'platform_account_type'
  ) THEN
    ALTER TABLE social_media_accounts ADD COLUMN platform_account_type text;
  END IF;
END $$;

-- Add notes field so they can track their own account details
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_accounts' AND column_name = 'account_notes'
  ) THEN
    ALTER TABLE social_media_accounts ADD COLUMN account_notes text;
  END IF;
END $$;

-- Drop tier limits table (not needed anymore)
DROP TABLE IF EXISTS social_media_tier_limits CASCADE;

-- Drop functions that checked brand limits
DROP FUNCTION IF EXISTS can_brand_post(uuid);
DROP FUNCTION IF EXISTS can_brand_use_ai(uuid);

-- Update comments on social_media_accounts
COMMENT ON COLUMN social_media_accounts.api_tier IS 'The tier the brand has with this platform (free/basic/business/enterprise) - e.g., Twitter Free vs Twitter Pro';
COMMENT ON COLUMN social_media_accounts.platform_account_type IS 'Additional account type info, e.g., "Meta Business Suite", "Twitter API Pro"';
COMMENT ON COLUMN social_media_accounts.account_notes IS 'Notes about this account - limits, features, renewal dates, etc.';

-- Remove ai_generated and tracking columns (no limits to track)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_posts' AND column_name = 'ai_generated'
  ) THEN
    ALTER TABLE social_media_posts DROP COLUMN ai_generated;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_accounts' AND column_name = 'monthly_post_count'
  ) THEN
    ALTER TABLE social_media_accounts DROP COLUMN monthly_post_count;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_accounts' AND column_name = 'last_reset_at'
  ) THEN
    ALTER TABLE social_media_accounts DROP COLUMN last_reset_at;
  END IF;
END $$;
