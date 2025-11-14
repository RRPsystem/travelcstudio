/*
  # Add Social Media Subscription Tiers

  1. Changes to Tables
    - Add `social_media_tier` to brands table
      - Options: 'free', 'basic', 'professional', 'enterprise'
    
    - Add `api_tier` to social_media_accounts
      - Tracks if using free or paid API for that platform
      - Options: 'free', 'basic', 'business', 'enterprise'
    
    - Create `social_media_tier_limits` table
      - Defines limits per tier (posts per month, platforms, etc.)

  2. Features by Tier
    - Free: 10 posts/month, 2 platforms, basic features
    - Basic: 50 posts/month, 3 platforms, scheduling
    - Professional: 200 posts/month, all platforms, analytics
    - Enterprise: Unlimited posts, all platforms, advanced features
*/

-- Add social_media_tier to brands
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brands' AND column_name = 'social_media_tier'
  ) THEN
    ALTER TABLE brands ADD COLUMN social_media_tier text DEFAULT 'free' 
      CHECK (social_media_tier IN ('free', 'basic', 'professional', 'enterprise'));
  END IF;
END $$;

-- Add api_tier and usage tracking to social_media_accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_accounts' AND column_name = 'api_tier'
  ) THEN
    ALTER TABLE social_media_accounts ADD COLUMN api_tier text DEFAULT 'free'
      CHECK (api_tier IN ('free', 'basic', 'business', 'enterprise'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_accounts' AND column_name = 'monthly_post_count'
  ) THEN
    ALTER TABLE social_media_accounts ADD COLUMN monthly_post_count integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_accounts' AND column_name = 'last_reset_at'
  ) THEN
    ALTER TABLE social_media_accounts ADD COLUMN last_reset_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create tier limits configuration table
CREATE TABLE IF NOT EXISTS social_media_tier_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL UNIQUE CHECK (tier IN ('free', 'basic', 'professional', 'enterprise')),
  posts_per_month integer NOT NULL,
  max_platforms integer NOT NULL,
  can_schedule boolean DEFAULT false,
  can_use_analytics boolean DEFAULT false,
  can_bulk_post boolean DEFAULT false,
  ai_generations_per_month integer DEFAULT 10,
  price_per_month numeric(10,2) DEFAULT 0,
  features jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert tier limits
INSERT INTO social_media_tier_limits (tier, posts_per_month, max_platforms, can_schedule, can_use_analytics, can_bulk_post, ai_generations_per_month, price_per_month, features)
VALUES 
  ('free', 10, 2, false, false, false, 10, 0, 
   '["Basic posting", "2 platforms", "10 AI generations"]'::jsonb),
  ('basic', 50, 3, true, false, false, 50, 29.99,
   '["50 posts per month", "3 platforms", "Post scheduling", "50 AI generations"]'::jsonb),
  ('professional', 200, 5, true, true, true, 200, 79.99,
   '["200 posts per month", "5 platforms", "Scheduling", "Analytics", "Bulk posting", "200 AI generations"]'::jsonb),
  ('enterprise', 999999, 10, true, true, true, 999999, 199.99,
   '["Unlimited posts", "All platforms", "Full analytics", "Bulk operations", "Priority support", "Unlimited AI"]'::jsonb)
ON CONFLICT (tier) DO UPDATE SET
  posts_per_month = EXCLUDED.posts_per_month,
  max_platforms = EXCLUDED.max_platforms,
  can_schedule = EXCLUDED.can_schedule,
  can_use_analytics = EXCLUDED.can_use_analytics,
  can_bulk_post = EXCLUDED.can_bulk_post,
  ai_generations_per_month = EXCLUDED.ai_generations_per_month,
  price_per_month = EXCLUDED.price_per_month,
  features = EXCLUDED.features,
  updated_at = now();

-- Enable RLS on tier limits
ALTER TABLE social_media_tier_limits ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read tier limits (needed for signup/upgrade UI)
CREATE POLICY "Anyone can view tier limits"
  ON social_media_tier_limits FOR SELECT
  TO authenticated
  USING (true);

-- Add usage tracking to social_media_posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_media_posts' AND column_name = 'ai_generated'
  ) THEN
    ALTER TABLE social_media_posts ADD COLUMN ai_generated boolean DEFAULT false;
  END IF;
END $$;

-- Create function to check if brand can post
CREATE OR REPLACE FUNCTION can_brand_post(p_brand_id uuid)
RETURNS boolean AS $$
DECLARE
  v_tier text;
  v_limit integer;
  v_current_count integer;
BEGIN
  -- Get brand tier
  SELECT social_media_tier INTO v_tier
  FROM brands WHERE id = p_brand_id;
  
  -- Get tier limit
  SELECT posts_per_month INTO v_limit
  FROM social_media_tier_limits WHERE tier = v_tier;
  
  -- Count posts this month
  SELECT COUNT(*) INTO v_current_count
  FROM social_media_posts
  WHERE brand_id = p_brand_id
    AND created_at >= date_trunc('month', CURRENT_DATE)
    AND status IN ('published', 'scheduled');
  
  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if brand can use AI
CREATE OR REPLACE FUNCTION can_brand_use_ai(p_brand_id uuid)
RETURNS boolean AS $$
DECLARE
  v_tier text;
  v_limit integer;
  v_current_count integer;
BEGIN
  -- Get brand tier
  SELECT social_media_tier INTO v_tier
  FROM brands WHERE id = p_brand_id;
  
  -- Get tier limit
  SELECT ai_generations_per_month INTO v_limit
  FROM social_media_tier_limits WHERE tier = v_tier;
  
  -- Count AI generations this month
  SELECT COUNT(*) INTO v_current_count
  FROM social_media_posts
  WHERE brand_id = p_brand_id
    AND ai_generated = true
    AND created_at >= date_trunc('month', CURRENT_DATE);
  
  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_social_media_posts_month ON social_media_posts(brand_id, created_at);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_ai_generated ON social_media_posts(brand_id, ai_generated, created_at);
