/*
  # Social Media Management System

  1. New Tables
    - `social_media_accounts`
      - `id` (uuid, primary key)
      - `brand_id` (uuid, foreign key to brands)
      - `platform` (text: facebook, instagram, twitter, linkedin, tiktok)
      - `platform_user_id` (text: user ID on that platform)
      - `platform_username` (text: display name)
      - `access_token` (text: encrypted token)
      - `refresh_token` (text: encrypted refresh token)
      - `token_expires_at` (timestamptz)
      - `is_active` (boolean)
      - `connected_at` (timestamptz)
      - `last_used_at` (timestamptz)
      - `metadata` (jsonb: platform-specific data)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `social_media_posts`
      - `id` (uuid, primary key)
      - `brand_id` (uuid, foreign key to brands)
      - `created_by` (uuid, foreign key to users)
      - `content` (text: post text)
      - `media_urls` (jsonb: array of media URLs)
      - `platforms` (jsonb: array of platform targets)
      - `status` (text: draft, scheduled, published, failed)
      - `scheduled_for` (timestamptz: when to publish)
      - `published_at` (timestamptz)
      - `platform_post_ids` (jsonb: {platform: post_id} mapping)
      - `error_message` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `brand_voice_settings`
      - `id` (uuid, primary key)
      - `brand_id` (uuid, foreign key to brands, unique)
      - `voice_prompt` (text: custom AI prompt for brand tone)
      - `writing_style` (text: formal, casual, professional, friendly, etc.)
      - `target_audience` (text)
      - `key_topics` (jsonb: array of topics)
      - `do_not_use` (text: words/phrases to avoid)
      - `always_include` (text: mandatory elements like hashtags)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Policies for brand members to manage their own accounts
*/

-- Create social_media_accounts table
CREATE TABLE IF NOT EXISTS social_media_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube')),
  platform_user_id text NOT NULL,
  platform_username text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  is_active boolean DEFAULT true,
  connected_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, platform, platform_user_id)
);

-- Create social_media_posts table
CREATE TABLE IF NOT EXISTS social_media_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  media_urls jsonb DEFAULT '[]',
  platforms jsonb DEFAULT '[]',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_for timestamptz,
  published_at timestamptz,
  platform_post_ids jsonb DEFAULT '{}',
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create brand_voice_settings table
CREATE TABLE IF NOT EXISTS brand_voice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE UNIQUE,
  voice_prompt text,
  writing_style text DEFAULT 'professional',
  target_audience text,
  key_topics jsonb DEFAULT '[]',
  do_not_use text,
  always_include text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE social_media_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_voice_settings ENABLE ROW LEVEL SECURITY;

-- Policies for social_media_accounts
CREATE POLICY "Brand members can view their social media accounts"
  ON social_media_accounts FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Brand admins can insert social media accounts"
  ON social_media_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'brand_admin')
    )
  );

CREATE POLICY "Brand admins can update social media accounts"
  ON social_media_accounts FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'brand_admin')
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'brand_admin')
    )
  );

CREATE POLICY "Brand admins can delete social media accounts"
  ON social_media_accounts FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'brand_admin')
    )
  );

-- Policies for social_media_posts
CREATE POLICY "Brand members can view their social media posts"
  ON social_media_posts FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Brand members can create social media posts"
  ON social_media_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Brand members can update their own posts"
  ON social_media_posts FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Brand members can delete their own posts"
  ON social_media_posts FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

-- Policies for brand_voice_settings
CREATE POLICY "Brand members can view their brand voice settings"
  ON brand_voice_settings FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Brand admins can insert brand voice settings"
  ON brand_voice_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'brand_admin')
    )
  );

CREATE POLICY "Brand admins can update brand voice settings"
  ON brand_voice_settings FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'brand_admin')
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT brand_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'brand_admin')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_media_accounts_brand_id ON social_media_accounts(brand_id);
CREATE INDEX IF NOT EXISTS idx_social_media_accounts_platform ON social_media_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_brand_id ON social_media_posts(brand_id);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_status ON social_media_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_scheduled_for ON social_media_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_brand_voice_settings_brand_id ON brand_voice_settings(brand_id);
