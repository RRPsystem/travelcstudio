/*
  # Add enabled_for_brands to social_media_posts

  This allows Admin to create posts that can be activated by brands.

  ## Changes
  1. Add enabled_for_brands column to social_media_posts
  2. Add enabled_for_agents column to social_media_posts
*/

-- Add enabled_for_brands column
ALTER TABLE social_media_posts
ADD COLUMN IF NOT EXISTS enabled_for_brands boolean DEFAULT false;

-- Add enabled_for_agents column
ALTER TABLE social_media_posts
ADD COLUMN IF NOT EXISTS enabled_for_agents boolean DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_social_media_posts_enabled_for_brands 
ON social_media_posts(enabled_for_brands) WHERE enabled_for_brands = true;

CREATE INDEX IF NOT EXISTS idx_social_media_posts_enabled_for_agents 
ON social_media_posts(enabled_for_agents) WHERE enabled_for_agents = true;
